import { listEvents, listOrganisations } from "@/lib/queryEvents";
import { EventCard } from "@/components/EventCard";
import { FilterBar } from "@/components/FilterBar";

export const dynamic = "force-dynamic";

interface HomeProps {
  searchParams: Promise<{
    type?: string;
    organisationId?: string;
    search?: string;
    when?: "upcoming" | "past" | "all";
  }>;
}

export default async function Home({ searchParams }: HomeProps) {
  const resolvedSearchParams = await searchParams;
  const [events, organisations] = await Promise.all([
    listEvents(resolvedSearchParams),
    listOrganisations(),
  ]);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Find your next event</h1>
        <p className="mt-1 text-slate-500">
          Networking events, workshops, and talks from Melbourne organisations. Every listing
          links straight to the organiser&apos;s registration or info page.
        </p>
      </div>

      <FilterBar organisations={organisations} />

      {events.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-slate-500">
          No events match your filters yet.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}
