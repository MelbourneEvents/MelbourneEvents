// The set of event categories the site currently understands. Add to this
// list (and to LABELS below) to introduce a new category — no migration
// needed since Event.type is a plain string column.
export const ALLOWED_EVENT_TYPES = [
  "networking",
  "workshop",
  "talk",
  "conference",
  "meetup",
  "other",
] as const;

export type EventType = (typeof ALLOWED_EVENT_TYPES)[number];

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  networking: "Networking",
  workshop: "Workshop",
  talk: "Talk",
  conference: "Conference",
  meetup: "Meetup",
  other: "Other",
};

export function isValidEventType(value: string): value is EventType {
  return (ALLOWED_EVENT_TYPES as readonly string[]).includes(value);
}
