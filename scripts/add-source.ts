/**
 * Register a scrape source for an organisation — a feed the site will
 * periodically re-fetch to pull in new events automatically, instead of
 * someone hand-writing JSON every time.
 *
 * Usage:
 *   npm run add-source -- data/examples/ics-source.json
 *   npm run add-source -- data/examples/json-source.json
 *   npm run add-source -- data/examples/html-source.json
 *
 * Input file shape:
 *   {
 *     "organisation": { "name": "...", "website": "..." },
 *     "source": {
 *       "url": "...",
 *       "type": "ics" | "json" | "html",
 *       "config": { ... },        // required for "json", see README
 *       "defaultType": "meetup",  // fallback category, defaults to "other"
 *       "defaultTags": ["..."]
 *     }
 *   }
 *
 * Registering a source doesn't scrape it — run `npm run scrape` (or
 * `npm run scrape -- --org <organisationId>`) afterwards.
 */
import { readFile } from "node:fs/promises";
import { upsertOrganisation, OrganisationInput } from "../src/lib/events";
import { isValidEventType, ALLOWED_EVENT_TYPES } from "../src/lib/eventTypes";
import { prisma } from "../src/lib/db";

interface SourceInput {
  url: string;
  type: "ics" | "json" | "html";
  config?: unknown;
  defaultType?: string;
  defaultTags?: string[] | string;
}

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("Usage: npm run add-source -- <path-to-source.json>");
    process.exit(1);
  }

  const raw = await readFile(filePath, "utf-8");
  const payload = JSON.parse(raw) as { organisation: OrganisationInput; source: SourceInput };

  const errors: string[] = [];
  if (!payload.organisation?.name) errors.push('"organisation.name" is required');
  if (!payload.source?.url) errors.push('"source.url" is required');
  if (!["ics", "json", "html"].includes(payload.source?.type)) {
    errors.push('"source.type" must be "ics", "json", or "html"');
  }
  const defaultType = payload.source?.defaultType ?? "other";
  if (!isValidEventType(defaultType)) {
    errors.push(`"source.defaultType" must be one of: ${ALLOWED_EVENT_TYPES.join(", ")}`);
  }
  if (payload.source?.type === "json" && !payload.source.config) {
    errors.push('"source.config" is required for type "json" — see README for the field-mapping shape');
  }

  if (errors.length > 0) {
    console.error("✘ Source failed validation:");
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }

  const organisation = await upsertOrganisation(payload.organisation);

  const defaultTags = Array.isArray(payload.source.defaultTags)
    ? payload.source.defaultTags.join(",")
    : payload.source.defaultTags ?? "";

  const source = await prisma.source.upsert({
    where: { organisationId_url: { organisationId: organisation.id, url: payload.source.url } },
    update: {
      type: payload.source.type,
      config: payload.source.config ? JSON.stringify(payload.source.config) : null,
      defaultType,
      defaultTags,
      active: true,
    },
    create: {
      organisationId: organisation.id,
      url: payload.source.url,
      type: payload.source.type,
      config: payload.source.config ? JSON.stringify(payload.source.config) : null,
      defaultType,
      defaultTags,
    },
  });

  console.log(`✔ Registered ${source.type} source for "${organisation.name}": ${source.url}`);
  console.log(`  Run "npm run scrape" to pull events from it.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
