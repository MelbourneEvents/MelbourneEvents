import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { ALLOWED_EVENT_TYPES } from "../eventTypes";
import { RawScrapedEvent } from "./types";

const ExtractedEventSchema = z.object({
  title: z.string(),
  description: z.string(),
  type: z.enum(ALLOWED_EVENT_TYPES),
  startDateTime: z
    .string()
    .describe(
      "ISO 8601 date-time with a timezone offset. If the page gives no timezone, assume Australia/Melbourne (+10:00 or +11:00 depending on DST).",
    ),
  endDateTime: z.string().nullable(),
  location: z.string(),
  isOnline: z.boolean(),
  registrationUrl: z
    .string()
    .describe("Absolute URL to this specific event's own registration or info page."),
});

const ExtractionSchema = z.object({
  events: z.array(ExtractedEventSchema),
});

const MAX_HTML_CHARS = 60_000;

function cleanHtml(html: string, baseUrl: string): string {
  let cleaned = html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(script|style|noscript|svg)[\s\S]*?<\/\1>/gi, "");

  // Resolve relative hrefs to absolute — Claude never sees the page's
  // <base> URL otherwise, and registration links are usually relative.
  cleaned = cleaned.replace(/href=(["'])(.*?)\1/gi, (match, quote: string, href: string) => {
    try {
      return `href=${quote}${new URL(href, baseUrl).toString()}${quote}`;
    } catch {
      return match;
    }
  });

  cleaned = cleaned.replace(/\s+/g, " ").trim();

  return cleaned.length > MAX_HTML_CHARS ? cleaned.slice(0, MAX_HTML_CHARS) : cleaned;
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function isHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Fetches a generic event page and asks Claude to read it and extract a
 * structured list of events — for organisations that don't publish an
 * ICS/JSON feed. Costs an API call per scrape, so this is meaningfully
 * more expensive and slower than the ics/json adapters; use it as a
 * fallback, not the default.
 *
 * Dedup key is a slug of the title + the event's date (day granularity),
 * since HTML pages carry no stable event ID the way ICS/JSON do. Wording
 * changes on the source page can occasionally cause a duplicate listing
 * on the next scrape — the ics/json adapters don't have this limitation.
 */
export async function fetchHtmlEvents(url: string): Promise<RawScrapedEvent[]> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "HTML sources need an LLM to read the page — set ANTHROPIC_API_KEY to enable them.",
    );
  }

  const res = await fetch(url, {
    headers: {
      "User-Agent": "MelbourneEventsBot/1.0 (+https://github.com/MelbourneEvents/MelbourneEvents)",
      Accept: "text/html",
    },
  });
  if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
  const html = cleanHtml(await res.text(), url);

  const client = new Anthropic();
  const today = new Date().toISOString().slice(0, 10);

  const response = await client.messages.parse({
    model: "claude-opus-5",
    max_tokens: 16000,
    system:
      `You extract event listings from an organisation's own event page for a community events index. ` +
      `Today's date is ${today}. Only extract events that are clearly individual upcoming events — ` +
      `skip navigation links, past events, and unrelated content. Pick the closest "type" match from ` +
      `the fixed set given to you. If a field genuinely isn't on the page, make your best reasonable ` +
      `inference from context rather than inventing specifics. If the page lists no events, return an empty array.`,
    messages: [
      {
        role: "user",
        content: `Source URL: ${url}\n\nPage HTML (cleaned):\n${html}`,
      },
    ],
    output_config: { format: zodOutputFormat(ExtractionSchema) },
  });

  if (!response.parsed_output) {
    throw new Error("Claude did not return parseable structured output for this page");
  }

  return response.parsed_output.events.map((event): RawScrapedEvent => {
    const registrationUrl = isHttpUrl(event.registrationUrl) ? event.registrationUrl : url;
    return {
      externalId: `${slugify(event.title)}::${event.startDateTime.slice(0, 10)}`,
      title: event.title,
      description: event.description,
      type: event.type,
      startDateTime: event.startDateTime,
      endDateTime: event.endDateTime ?? undefined,
      location: event.location,
      isOnline: event.isOnline,
      registrationUrl,
    };
  });
}
