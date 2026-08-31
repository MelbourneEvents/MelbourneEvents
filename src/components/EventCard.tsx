import Link from "next/link";
import { EVENT_TYPE_LABELS, EventType } from "@/lib/eventTypes";
import { parseTags } from "@/lib/events";

export interface EventCardData {
  id: string;
  title: string;
  type: string;
  startDateTime: Date;
  location: string;
  isOnline: boolean;
  registrationUrl: string;
  tags: string;
  organisation: { name: string };
}

const dateFormatter = new Intl.DateTimeFormat("en-AU", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Australia/Melbourne",
});

export function EventCard({ event }: { event: EventCardData }) {
  const typeLabel = EVENT_TYPE_LABELS[event.type as EventType] ?? event.type;
  const tags = parseTags(event.tags);

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">
          {typeLabel}
        </span>
        {event.isOnline && (
          <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
            Online
          </span>
        )}
      </div>

      <div>
        <Link href={`/events/${event.id}`} className="text-lg font-semibold text-slate-900 hover:text-brand-700">
          {event.title}
        </Link>
        <p className="text-sm text-slate-500">{event.organisation.name}</p>
      </div>

      <div className="text-sm text-slate-600">
        <p>{dateFormatter.format(event.startDateTime)}</p>
        <p>{event.location}</p>
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
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
        className="mt-auto inline-flex items-center justify-center rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
      >
        Register / info →
      </a>
    </div>
  );
}
