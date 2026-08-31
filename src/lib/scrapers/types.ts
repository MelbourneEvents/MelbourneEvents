// A source-agnostic event as pulled off a feed, before it's mapped onto
// the Event table. Optional fields are filled in from the Source's
// defaults (see scrapeSource.ts) when the feed itself doesn't carry them.
export interface RawScrapedEvent {
  externalId: string;
  title?: string;
  description?: string;
  type?: string;
  startDateTime?: string; // ISO 8601
  endDateTime?: string; // ISO 8601
  location?: string;
  registrationUrl?: string;
  isOnline?: boolean;
}
