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

// How far ahead to expand recurring events, and a hard cap on instances
// per rule — protects against a mis-tagged daily/hourly feed flooding the
// site with hundreds of rows.
const RECURRENCE_WINDOW_MONTHS = 6;
const MAX_INSTANCES_PER_EVENT = 60;

function toRawEvent(
  externalId: string,
  start: Date | undefined,
  end: Date | undefined,
  base: ical.VEvent,
): RawScrapedEvent {
  return {
    externalId,
    title: textValue(base.summary),
    description: textValue(base.description),
    startDateTime: start ? start.toISOString() : undefined,
    endDateTime: end ? end.toISOString() : undefined,
    location: textValue(base.location),
    registrationUrl: base.url,
  };
}

/**
 * Fetches and parses an ICS calendar feed (Meetup, Luma, Google Calendar,
 * Eventbrite, etc. all export these).
 *
 * Non-recurring events dedup on their VEVENT UID. Recurring events
 * (RRULE) are expanded into individual occurrences within the next
 * RECURRENCE_WINDOW_MONTHS — each occurrence dedups on `UID::start`, so a
 * weekly meetup gets one listing per upcoming week rather than just its
 * first occurrence, and re-scraping still doesn't duplicate them.
 */
export async function fetchIcsEvents(url: string): Promise<RawScrapedEvent[]> {
  const parsed = await ical.async.fromURL(url);

  const events: RawScrapedEvent[] = [];
  for (const item of Object.values(parsed)) {
    if (!item || item.type !== "VEVENT") continue;

    if (item.rrule) {
      const from = new Date();
      const to = new Date();
      to.setMonth(to.getMonth() + RECURRENCE_WINDOW_MONTHS);

      const instances = ical
        .expandRecurringEvent(item, { from, to })
        .slice(0, MAX_INSTANCES_PER_EVENT);

      for (const instance of instances) {
        events.push(
          toRawEvent(
            `${item.uid}::${instance.start.toISOString()}`,
            instance.start,
            instance.end,
            instance.event,
          ),
        );
      }
      continue;
    }

    events.push(
      toRawEvent(
        item.uid,
        item.start ? new Date(item.start) : undefined,
        item.end ? new Date(item.end) : undefined,
        item,
      ),
    );
  }

  return events;
}
