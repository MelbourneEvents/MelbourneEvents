/**
 * Bulk-insert a set of events that all belong to one organisation.
 *
 * Usage:
 *   npm run import-org -- data/examples/organisation-events.json
 *
 * Input file shape:
 *   {
 *     "organisation": { "name": "...", "website": "..." },
 *     "events": [ { "title": "...", ... }, { "title": "...", ... } ]
 *   }
 *
 * Every event is validated before anything is written — if one event in
 * the batch is invalid, the whole import is rejected and nothing is
 * inserted, so partial/bad batches never end up on the site.
 *
 * See data/examples/organisation-events.json for a full example.
 */
import { readFile } from "node:fs/promises";
import { insertOrganisationEvents, ValidationError, EventInput, OrganisationInput } from "../src/lib/events";
import { prisma } from "../src/lib/db";

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("Usage: npm run import-org -- <path-to-organisation-events.json>");
    process.exit(1);
  }

  const raw = await readFile(filePath, "utf-8");
  const payload = JSON.parse(raw) as { organisation: OrganisationInput; events: EventInput[] };

  try {
    const { organisation, events } = await insertOrganisationEvents(payload);
    console.log(`✔ Added ${events.length} event(s) under "${organisation.name}":`);
    for (const event of events) console.log(`  - ${event.title} (${event.id})`);
  } catch (err) {
    if (err instanceof ValidationError) {
      console.error(`✘ ${err.message}:`);
      for (const detail of err.details) console.error(`  - ${detail}`);
      process.exit(1);
    }
    throw err;
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
