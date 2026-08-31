import { prisma } from "./db";
import { isValidEventType, ALLOWED_EVENT_TYPES } from "./eventTypes";

export interface OrganisationInput {
  name: string;
  website?: string;
  logoUrl?: string;
}

export interface EventInput {
  title: string;
  description: string;
  type: string;
  startDateTime: string; // ISO 8601
  endDateTime?: string; // ISO 8601
  location: string;
  isOnline?: boolean;
  registrationUrl: string;
  tags?: string[] | string;
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public details: string[] = [],
  ) {
    super(message);
    this.name = "ValidationError";
  }
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function normaliseTags(tags: EventInput["tags"]): string {
  if (!tags) return "";
  const list = Array.isArray(tags) ? tags : tags.split(",");
  return list
    .map((t) => t.trim())
    .filter(Boolean)
    .join(",");
}

/**
 * Validates a single event input and returns a list of human-readable
 * problems. An empty list means the event is valid.
 */
export function validateEventInput(input: Partial<EventInput>, index?: number): string[] {
  const prefix = index !== undefined ? `Event #${index + 1}: ` : "";
  const errors: string[] = [];

  if (!isNonEmptyString(input.title)) errors.push(`${prefix}"title" is required`);
  if (!isNonEmptyString(input.description)) errors.push(`${prefix}"description" is required`);

  if (!isNonEmptyString(input.type)) {
    errors.push(`${prefix}"type" is required`);
  } else if (!isValidEventType(input.type)) {
    errors.push(
      `${prefix}"type" must be one of: ${ALLOWED_EVENT_TYPES.join(", ")} (got "${input.type}")`,
    );
  }

  if (!isNonEmptyString(input.startDateTime)) {
    errors.push(`${prefix}"startDateTime" is required (ISO 8601, e.g. 2026-03-14T18:30:00+11:00)`);
  } else if (Number.isNaN(Date.parse(input.startDateTime))) {
    errors.push(`${prefix}"startDateTime" is not a valid date: "${input.startDateTime}"`);
  }

  if (input.endDateTime && Number.isNaN(Date.parse(input.endDateTime))) {
    errors.push(`${prefix}"endDateTime" is not a valid date: "${input.endDateTime}"`);
  }

  if (!isNonEmptyString(input.location)) errors.push(`${prefix}"location" is required`);

  if (!isNonEmptyString(input.registrationUrl)) {
    errors.push(`${prefix}"registrationUrl" is required`);
  } else if (!isValidUrl(input.registrationUrl)) {
    errors.push(`${prefix}"registrationUrl" must be a valid http(s) URL: "${input.registrationUrl}"`);
  }

  return errors;
}

export function validateOrganisationInput(input: Partial<OrganisationInput>): string[] {
  const errors: string[] = [];
  if (!isNonEmptyString(input.name)) errors.push('Organisation "name" is required');
  if (input.website && !isValidUrl(input.website)) {
    errors.push(`Organisation "website" must be a valid http(s) URL: "${input.website}"`);
  }
  return errors;
}

/** Finds an existing organisation by name, or creates it. */
export async function upsertOrganisation(input: OrganisationInput) {
  return prisma.organisation.upsert({
    where: { name: input.name },
    update: {
      website: input.website,
      logoUrl: input.logoUrl,
    },
    create: {
      name: input.name,
      website: input.website,
      logoUrl: input.logoUrl,
    },
  });
}

/** Inserts a single event under a (possibly new) organisation. */
export async function insertSingleEvent(payload: {
  organisation: OrganisationInput;
  event: EventInput;
}) {
  const orgErrors = validateOrganisationInput(payload.organisation);
  const eventErrors = validateEventInput(payload.event);
  const errors = [...orgErrors, ...eventErrors];
  if (errors.length > 0) {
    throw new ValidationError("Event failed validation", errors);
  }

  const organisation = await upsertOrganisation(payload.organisation);

  const event = await prisma.event.create({
    data: {
      title: payload.event.title,
      description: payload.event.description,
      type: payload.event.type,
      startDateTime: new Date(payload.event.startDateTime),
      endDateTime: payload.event.endDateTime ? new Date(payload.event.endDateTime) : null,
      location: payload.event.location,
      isOnline: payload.event.isOnline ?? false,
      registrationUrl: payload.event.registrationUrl,
      tags: normaliseTags(payload.event.tags),
      organisationId: organisation.id,
    },
  });

  return { organisation, event };
}

/**
 * Inserts a batch of events that all belong to one organisation.
 * Validates every event up front — if any is invalid, nothing is
 * inserted, so a typo in event #8 can't leave a half-imported batch.
 */
export async function insertOrganisationEvents(payload: {
  organisation: OrganisationInput;
  events: EventInput[];
}) {
  const orgErrors = validateOrganisationInput(payload.organisation);
  const eventErrors = payload.events.flatMap((e, i) => validateEventInput(e, i));
  const errors = [...orgErrors, ...eventErrors];

  if (payload.events.length === 0) {
    errors.push('"events" must contain at least one event');
  }

  if (errors.length > 0) {
    throw new ValidationError("Batch failed validation — nothing was inserted", errors);
  }

  const organisation = await upsertOrganisation(payload.organisation);

  const events = await prisma.$transaction(
    payload.events.map((event) =>
      prisma.event.create({
        data: {
          title: event.title,
          description: event.description,
          type: event.type,
          startDateTime: new Date(event.startDateTime),
          endDateTime: event.endDateTime ? new Date(event.endDateTime) : null,
          location: event.location,
          isOnline: event.isOnline ?? false,
          registrationUrl: event.registrationUrl,
          tags: normaliseTags(event.tags),
          organisationId: organisation.id,
        },
      }),
    ),
  );

  return { organisation, events };
}

export function parseTags(tags: string): string[] {
  return tags
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}
