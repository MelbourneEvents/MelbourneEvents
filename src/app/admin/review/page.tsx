import { prisma } from "@/lib/db";
import { EVENT_STATUS } from "@/lib/eventStatus";
import { EVENT_TYPE_LABELS, EventType } from "@/lib/eventTypes";
import { approveEvent, rejectEvent } from "./actions";

export const dynamic = "force-dynamic";

const dateFormatter = new Intl.DateTimeFormat("en-AU", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Australia/Melbourne",
});

export default async function ReviewPage() {
  const pending = await prisma.event.findMany({
    where: { status: EVENT_STATUS.pendingReview },
    include: { organisation: true, source: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold text-slate-900">Review queue</h1>
      <p className="mt-1 text-slate-500">
        Events an <code>html</code> source's LLM read pulled in. Approve to publish them on the
        site, or reject to keep them hidden — rejecting sticks even if the source is scraped again.
      </p>

      {pending.length === 0 ? (
        <p className="mt-8 rounded-lg border border-dashed border-slate-300 p-8 text-center text-slate-500">
          Nothing waiting on review.
        </p>
      ) : (
        <ul className="mt-6 space-y-4">
          {pending.map((event) => (
            <li key={event.id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="rounded-full bg-brand-50 px-2.5 py-0.5 font-medium text-brand-700">
                  {EVENT_TYPE_LABELS[event.type as EventType] ?? event.type}
                </span>
                <span>{event.organisation.name}</span>
                <span>·</span>
                <span>from {event.source?.url}</span>
              </div>

              <h2 className="mt-2 text-lg font-semibold text-slate-900">{event.title}</h2>
              <p className="mt-1 text-sm text-slate-600">
                {dateFormatter.format(event.startDateTime)}
                {event.endDateTime && ` – ${dateFormatter.format(event.endDateTime)}`} ·{" "}
                {event.location}
                {event.isOnline && " · Online"}
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{event.description}</p>
              <a
                href={event.registrationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block text-sm text-brand-600 hover:underline"
              >
                {event.registrationUrl} ↗
              </a>

              <div className="mt-4 flex gap-2">
                <form action={approveEvent.bind(null, event.id)}>
                  <button
                    type="submit"
                    className="rounded-md bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
                  >
                    Approve
                  </button>
                </form>
                <form action={rejectEvent.bind(null, event.id)}>
                  <button
                    type="submit"
                    className="rounded-md bg-slate-200 px-4 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-300"
                  >
                    Reject
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
