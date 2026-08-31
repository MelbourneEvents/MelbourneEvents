import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { EVENT_STATUS } from "./eventStatus";

export interface EventFilters {
  type?: string;
  organisationId?: string;
  search?: string;
  when?: "upcoming" | "past" | "all";
}

// Every public query is scoped to published events — pending_review
// (awaiting moderation) and rejected events never appear on the site,
// including via a direct /events/[id] link. src/app/admin/review queries
// pending events itself, unfiltered.
export async function listEvents(filters: EventFilters) {
  const where: Prisma.EventWhereInput = { status: EVENT_STATUS.published };

  if (filters.type) where.type = filters.type;
  if (filters.organisationId) where.organisationId = filters.organisationId;

  const when = filters.when ?? "upcoming";
  if (when === "upcoming") where.startDateTime = { gte: new Date() };
  if (when === "past") where.startDateTime = { lt: new Date() };

  if (filters.search) {
    const q = filters.search;
    where.OR = [
      { title: { contains: q } },
      { description: { contains: q } },
      { tags: { contains: q } },
      { location: { contains: q } },
      { organisation: { name: { contains: q } } },
    ];
  }

  return prisma.event.findMany({
    where,
    include: { organisation: true },
    orderBy: { startDateTime: when === "past" ? "desc" : "asc" },
  });
}

export async function listOrganisations() {
  return prisma.organisation.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { events: true } } },
  });
}

export async function getEventById(id: string) {
  return prisma.event.findFirst({
    where: { id, status: EVENT_STATUS.published },
    include: { organisation: true },
  });
}
