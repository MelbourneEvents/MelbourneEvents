import * as ical from "node-ical";
import { RawScrapedEvent } from "./types";

// summary/description/location can come back as a plain string or as
// { val, params } when the ICS property carries parameters (LANGUAGE etc).
function textValue(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "val" in value) {
    return String((value as { val: unknown }).val);
  }
  return undefined;
}

/**
 * Fetches and parses an ICS calendar feed (Meetup, Luma, Google Calendar,
 * Eventbrite, etc. all export these). Each VEVENT's UID is used as the
 * dedup key.
 *
 * Recurring events (RRULE) are read as their first occurrence only — full
 * recurrence expansion isn't implemented. Re-scraping won't create
 * duplicates, but a weekly meetup's future occurrences won't each get
 * their own listing.
 */
export async function fetchIcsEvents(url: string): Promise<RawScrapedEvent[]> {
  const parsed = await ical.async.fromURL(url);

  const events: RawScrapedEvent[] = [];
  for (const item of Object.values(parsed)) {
    if (!item || item.type !== "VEVENT") continue;

    events.push({
      externalId: item.uid,
      title: textValue(item.summary),
      description: textValue(item.description),
      startDateTime: item.start ? new Date(item.start).toISOString() : undefined,
      endDateTime: item.end ? new Date(item.end).toISOString() : undefined,
      location: textValue(item.location),
      registrationUrl: item.url,
    });
  }

  return events;
}
