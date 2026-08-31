import { RawScrapedEvent } from "./types";

export interface JsonSourceConfig {
  // Dot path to the array of events within the response body.
  // Omit (or "") if the response body itself is the array.
  eventsPath?: string;
  fields: {
    externalId: string;
    title: string;
    startDateTime: string;
    description?: string;
    endDateTime?: string;
    location?: string;
    registrationUrl?: string;
  };
}

function getPath(obj: unknown, path?: string): unknown {
  if (!path) return obj;
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc == null || typeof acc !== "object") return undefined;
    return (acc as Record<string, unknown>)[key];
  }, obj);
}

function toIsoString(value: unknown): string | undefined {
  if (value == null) return undefined;
  const date = new Date(value as string | number);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

export function parseJsonSourceConfig(raw: string | null): JsonSourceConfig {
  if (!raw) {
    throw new Error('JSON source is missing "config" (field mapping) — see README');
  }
  const config = JSON.parse(raw) as Partial<JsonSourceConfig>;
  if (!config.fields?.externalId || !config.fields?.title || !config.fields?.startDateTime) {
    throw new Error(
      'JSON source config.fields must include at least "externalId", "title", "startDateTime"',
    );
  }
  return config as JsonSourceConfig;
}

/**
 * Fetches a JSON events API and maps it onto our shape using the field
 * paths in `configRaw` (see JsonSourceConfig). This is deliberately
 * generic rather than hardcoded to e.g. Eventbrite's schema, so it works
 * against any organisation's custom events API too.
 */
export async function fetchJsonEvents(
  url: string,
  configRaw: string | null,
): Promise<RawScrapedEvent[]> {
  const config = parseJsonSourceConfig(configRaw);

  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
  const body = (await res.json()) as unknown;

  const list = getPath(body, config.eventsPath);
  if (!Array.isArray(list)) {
    throw new Error(
      `config.eventsPath ("${config.eventsPath ?? "<root>"}") did not resolve to an array`,
    );
  }

  return list.map((item, i): RawScrapedEvent => {
    const externalId = getPath(item, config.fields.externalId);
    return {
      externalId: externalId != null ? String(externalId) : `index-${i}`,
      title: getPath(item, config.fields.title) as string | undefined,
      description: config.fields.description
        ? (getPath(item, config.fields.description) as string | undefined)
        : undefined,
      startDateTime: toIsoString(getPath(item, config.fields.startDateTime)),
      endDateTime: config.fields.endDateTime
        ? toIsoString(getPath(item, config.fields.endDateTime))
        : undefined,
      location: config.fields.location
        ? (getPath(item, config.fields.location) as string | undefined)
        : undefined,
      registrationUrl: config.fields.registrationUrl
        ? (getPath(item, config.fields.registrationUrl) as string | undefined)
        : undefined,
    };
  });
}
