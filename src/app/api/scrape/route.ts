import { NextResponse } from "next/server";
import { scrapeAllSources } from "@/lib/scrapeSource";

export const dynamic = "force-dynamic";

// Hit by a scheduler (Vercel Cron, GitHub Actions, plain cron + curl — see
// README) to keep events fresh without anyone re-running the CLI by hand.
// Set SCRAPE_CRON_SECRET in production so this isn't a public trigger.
export async function GET(request: Request) {
  const secret = process.env.SCRAPE_CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const results = await scrapeAllSources();
  const hadError = results.some((r) => "error" in r);

  return NextResponse.json({ results }, { status: hadError ? 207 : 200 });
}
