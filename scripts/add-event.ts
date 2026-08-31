/**
 * Insert a single event.
 *
 * Usage:
 *   npm run add-event -- data/examples/single-event.json
 *
 * Input file shape:
 *   {
 *     "organisation": { "name": "...", "website": "..." },
 *     "event": { "title": "...", "description": "...", "type": "networking", ... }
 *   }
 *
 * See data/examples/single-event.json for a full example.
 */
import { readFile } from "node:fs/promises";
import { insertSingleEvent, ValidationError, EventInput, OrganisationInput } from "../src/lib/events";
import { prisma } from "../src/lib/db";

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("Usage: npm run add-event -- <path-to-event.json>");
    process.exit(1);
  }

  const raw = await readFile(filePath, "utf-8");
  const payload = JSON.parse(raw) as { organisation: OrganisationInput; event: EventInput };

  try {
    const { organisation, event } = await insertSingleEvent(payload);
    console.log(`✔ Added "${event.title}" under "${organisation.name}" (event id: ${event.id})`);
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
