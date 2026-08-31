import { prisma } from "./db";
import { isValidEventType } from "./eventTypes";
import { EVENT_STATUS } from "./eventStatus";
import { fetchIcsEvents } from "./scrapers/ics";
import { fetchJsonEvents } from "./scrapers/json";
import { fetchHtmlEvents } from "./scrapers/html";
import { RawScrapedEvent } from "./scrapers/types";

const ONLINE_PATTERN = /\b(online|zoom|virtual|webinar|livestream)\b/i;

function isHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export interface ScrapeResult {
  sourceId: string;
  organisationName: string;
  created: number;
  updated: number;
  pendingReview: number;
  skipped: { externalId: string; reason: string }[];
}

async function fetchRawEvents(source: {
  type: string;
  url: string;
  config: string | null;
}): Promise<RawScrapedEvent[]> {
  switch (source.type) {
    case "ics":
      return fetchIcsEvents(source.url);
    case "json":
      return fetchJsonEvents(source.url, source.config);
    case "html":
      return fetchHtmlEvents(source.url);
    default:
      throw new Error(`Unknown source type "${source.type}"`);
  }
}

/** Runs one Source: fetches its feed, upserts events, records status. */
export async function scrapeSource(sourceId: string): Promise<ScrapeResult> {
  const source = await prisma.source.findUniqueOrThrow({
    where: { id: sourceId },
    include: { organisation: true },
  });

  const result: ScrapeResult = {
    sourceId: source.id,
    organisationName: source.organisation.name,
    created: 0,
    updated: 0,
    pendingReview: 0,
    skipped: [],
  };

  let raw: RawScrapedEvent[];
  try {
    raw = await fetchRawEvents(source);
  } catch (err) {
    await prisma.source.update({
      where: { id: source.id },
      data: {
        lastScrapedAt: new Date(),
        lastStatus: "error",
        lastError: err instanceof Error ? err.message : String(err),
      },
    });
    throw err;
  }

  for (const item of raw) {
    if (!item.title || !item.startDateTime) {
      result.skipped.push({ externalId: item.externalId, reason: "missing title or start date" });
      continue;
    }

    const type = item.type && isValidEventType(item.type) ? item.type : source.defaultType;
    const location = item.location?.trim() || "See event page";
    const registrationUrl =
      item.registrationUrl && isHttpUrl(item.registrationUrl) ? item.registrationUrl : source.url;

    const data = {
      title: item.title.trim(),
      description: item.description?.trim() || item.title.trim(),
      type,
      startDateTime: new Date(item.startDateTime),
      endDateTime: item.endDateTime ? new Date(item.endDateTime) : null,
      location,
      isOnline: item.isOnline ?? ONLINE_PATTERN.test(location),
      registrationUrl,
      tags: source.defaultTags,
      organisationId: source.organisationId,
      sourceId: source.id,
      externalId: item.externalId,
    };

    const existing = await prisma.event.findUnique({
      where: { sourceId_externalId: { sourceId: source.id, externalId: item.externalId } },
    });

    if (existing) {
      // Deliberately don't touch `status` here — an already-approved or
      // -rejected html event stays that way across re-scrapes, so
      // moderation isn't redone every time the source is polled again.
      await prisma.event.update({ where: { id: existing.id }, data });
      result.updated++;
    } else {
      const status = source.type === "html" ? EVENT_STATUS.pendingReview : EVENT_STATUS.published;
      await prisma.event.create({ data: { ...data, status } });
      result.created++;
      if (status === EVENT_STATUS.pendingReview) result.pendingReview++;
    }
  }

  await prisma.source.update({
    where: { id: source.id },
    data: {
      lastScrapedAt: new Date(),
      lastStatus: "ok",
      lastError: null,
      lastEventCount: raw.length,
    },
  });

  return result;
}

export type ScrapeAllResult = ScrapeResult | { sourceId: string; error: string };

/** Runs every active Source (optionally scoped to one organisation). */
export async function scrapeAllSources(organisationId?: string): Promise<ScrapeAllResult[]> {
  const sources = await prisma.source.findMany({
    where: { active: true, ...(organisationId ? { organisationId } : {}) },
  });

  const results: ScrapeAllResult[] = [];
  for (const source of sources) {
    try {
      results.push(await scrapeSource(source.id));
    } catch (err) {
      results.push({ sourceId: source.id, error: err instanceof Error ? err.message : String(err) });
    }
  }
  return results;
}
