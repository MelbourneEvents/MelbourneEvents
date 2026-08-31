import { notFound } from "next/navigation";
import Link from "next/link";
import { getEventById } from "@/lib/queryEvents";
import { EVENT_TYPE_LABELS, EventType } from "@/lib/eventTypes";
import { parseTags } from "@/lib/events";

export const dynamic = "force-dynamic";

const dateFormatter = new Intl.DateTimeFormat("en-AU", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Australia/Melbourne",
});

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await getEventById(id);
  if (!event) notFound();

  const typeLabel = EVENT_TYPE_LABELS[event.type as EventType] ?? event.type;
  const tags = parseTags(event.tags);

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/" className="text-sm text-brand-600 hover:underline">
        ← All events
      </Link>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">
          {typeLabel}
        </span>
        {event.isOnline && (
          <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
            Online
          </span>
        )}
      </div>

      <h1 className="mt-3 text-3xl font-bold text-slate-900">{event.title}</h1>
      <p className="mt-1 text-slate-500">
        Hosted by{" "}
        {event.organisation.website ? (
          <a href={event.organisation.website} className="text-brand-600 hover:underline" target="_blank" rel="noopener noreferrer">
            {event.organisation.name}
          </a>
        ) : (
          event.organisation.name
        )}
      </p>

      <div className="mt-6 space-y-1 text-slate-700">
        <p>
          <span className="font-medium">When:</span> {dateFormatter.format(event.startDateTime)}
          {event.endDateTime &&
            ` – ${dateFormatter.format(event.endDateTime)}`}
        </p>
        <p>
          <span className="font-medium">Where:</span> {event.location}
        </p>
      </div>

      <p className="mt-6 whitespace-pre-wrap text-slate-700">{event.description}</p>

      {tags.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span key={tag} className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
              {tag}
            </span>
          ))}
        </div>
      )}

      <a
        href={event.registrationUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-8 inline-flex items-center justify-center rounded-md bg-brand-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-brand-700"
      >
        Register / info →
      </a>
    </div>
  );
}
