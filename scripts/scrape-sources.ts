/**
 * Runs every active source (or just one organisation's), pulling in new
 * events and updating existing ones. This is what a cron job / the
 * /api/scrape route calls in production; run it by hand locally to test
 * a source you just registered.
 *
 * Usage:
 *   npm run scrape
 *   npm run scrape -- --org <organisationId>
 */
import { scrapeAllSources } from "../src/lib/scrapeSource";
import { prisma } from "../src/lib/db";

async function main() {
  const orgFlagIndex = process.argv.indexOf("--org");
  const organisationId = orgFlagIndex !== -1 ? process.argv[orgFlagIndex + 1] : undefined;

  const results = await scrapeAllSources(organisationId);

  if (results.length === 0) {
    console.log("No active sources to scrape.");
    return;
  }

  let hadError = false;
  for (const r of results) {
    if ("error" in r) {
      hadError = true;
      console.error(`✘ Source ${r.sourceId}: ${r.error}`);
      continue;
    }
    console.log(
      `✔ ${r.organisationName}: ${r.created} new, ${r.updated} updated` +
        (r.skipped.length ? `, ${r.skipped.length} skipped` : ""),
    );
    for (const s of r.skipped) console.log(`    - skipped ${s.externalId}: ${s.reason}`);
  }

  if (hadError) process.exitCode = 1;
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
