# Melbourne Events

A shareable site for finding networking events, workshops, and talks. Every
listing links straight out to the organiser's own registration or info page
— this site doesn't handle registration itself, it's just an index.

## What's here (v1)

- **Public site** — browse events, filter by type/organisation/date, search
  by keyword, click through to an event's registration page.
- **Insertion tooling** — two CLI scripts to add events from JSON files:
  one event at a time, or a whole batch for one organisation at once.
- **Automatic scraping** — register a "source" (an organisation's ICS
  calendar, events JSON API, or plain event page) and the site pulls new
  events from it on its own, on a schedule, and keeps existing ones
  up to date. Recurring (RRULE) ICS events get one listing per upcoming
  occurrence.
- **Review queue** — events scraped from a plain page via an LLM start
  hidden until approved at `/admin/review`; everything else (structured
  feeds, manual inserts) publishes immediately.

This is a first pass meant to be fine-tuned. Ideas for what's next are at
the bottom.

## Stack

Next.js (App Router) + TypeScript + Tailwind CSS, Prisma + SQLite for
storage.

## Getting started

```bash
npm install
cp .env.example .env        # DATABASE_URL="file:./dev.db"; see below for the optional vars
npx prisma migrate dev      # creates prisma/dev.db and the Event/Organisation/Source tables
npm run seed                # optional: adds a few sample events so the site isn't empty
npm run dev                 # http://localhost:3000
```

The optional env vars: `ANTHROPIC_API_KEY` (only needed for `html`
sources), `SCRAPE_CRON_SECRET` (protects `/api/scrape` in production),
and `ADMIN_USERNAME` / `ADMIN_PASSWORD` (enables `/admin/review`, the
review queue for `html`-sourced events — see below).

## Adding events

Events always belong to an organisation (created automatically the first
time you use its name — no separate signup step).

### One event at a time

```bash
npm run add-event -- data/examples/single-event.json
```

```json
{
  "organisation": {
    "name": "Melbourne Tech Founders",
    "website": "https://example.com/melbourne-tech-founders"
  },
  "event": {
    "title": "Founders Networking Night",
    "description": "An informal evening for early-stage founders to meet, swap notes, and find collaborators over drinks.",
    "type": "networking",
    "startDateTime": "2026-09-18T18:30:00+10:00",
    "endDateTime": "2026-09-18T21:00:00+10:00",
    "location": "The Boatbuilders Yard, South Wharf",
    "isOnline": false,
    "registrationUrl": "https://example.com/events/founders-networking-night",
    "tags": ["startups", "founders", "networking"]
  }
}
```

### A whole organisation's events at once

```bash
npm run import-org -- data/examples/organisation-events.json
```

Same shape, but `"events"` is an array. See
`data/examples/organisation-events.json` for a full example.

**Every event in a batch is validated before anything is written.** If one
event has a typo or a missing field, the whole import is rejected and
nothing is inserted — no half-imported batches to clean up.

### Field reference

| Field             | Required | Notes                                                              |
| ----------------- | -------- | -------------------------------------------------------------------- |
| `title`           | yes      |                                                                        |
| `description`     | yes      |                                                                        |
| `type`            | yes      | one of: `networking`, `workshop`, `talk`, `conference`, `meetup`, `other` (add more in `src/lib/eventTypes.ts`) |
| `startDateTime`   | yes      | ISO 8601, e.g. `2026-09-18T18:30:00+10:00`                            |
| `endDateTime`     | no       | ISO 8601                                                               |
| `location`        | yes      | free text, e.g. a venue address or "Online"                          |
| `isOnline`        | no       | defaults to `false`                                                   |
| `registrationUrl` | yes      | must be a valid `http(s)` URL — this is the link the site shows       |
| `tags`            | no       | array of strings, or a comma-separated string                        |

`organisation.name` is required; `website` and `logoUrl` are optional.

## Automatic scraping (Sources)

Instead of hand-writing JSON for an organisation's events, register a
**Source** — a feed the site re-fetches on its own. There are three kinds,
in order of preference:

| Type   | What it needs                          | Reliability                          | Cost              |
| ------ | --------------------------------------- | ------------------------------------- | ----------------- |
| `ics`  | A calendar feed URL (Meetup, Luma, Google Calendar, Eventbrite all export these) | High — parses structured data | Free |
| `json` | An events API URL + a field-mapping config | High — parses structured data | Free |
| `html` | Just the event page's URL | Best-effort — an LLM reads the page | Costs an API call per scrape |

Use `ics` or `json` whenever the organisation has one — they're free, fast,
and exact, and their events publish immediately. Reach for `html` only
when neither exists; it needs `ANTHROPIC_API_KEY` set (get one at
[console.anthropic.com](https://console.anthropic.com)), costs a Claude
API call every time that source is scraped, its dedup key is a guess
(title + date) rather than a real ID, so it can very occasionally
duplicate a listing if the page's wording drifts between scrapes, and —
because it's an LLM's best-effort read of a page rather than parsed data
— its events don't go live automatically; see **Review queue** below.

### Registering a source

```bash
npm run add-source -- data/examples/ics-source.json
npm run add-source -- data/examples/json-source.json
npm run add-source -- data/examples/html-source.json
```

```json
{
  "organisation": { "name": "Melbourne JS Meetup", "website": "https://example.com" },
  "source": {
    "url": "https://www.meetup.com/melbourne-js/events/ical/",
    "type": "ics",
    "defaultType": "meetup",
    "defaultTags": ["javascript", "meetup"]
  }
}
```

- `defaultType` / `defaultTags` are applied to every event pulled from that
  source, since feeds rarely carry our own category vocabulary (`html`
  sources classify `type` themselves per event; `defaultType` is only
  their fallback).
- `json` sources also need `config`, telling the scraper where to find
  things in the response body — see `data/examples/json-source.json`:
  `eventsPath` is a dot-path to the array of events (omit it if the
  response body itself is the array), and `fields` maps each of our
  fields to a dot-path within one event object. Only `externalId`,
  `title`, and `startDateTime` are required.

Registering a source doesn't scrape it — that's a separate step.

### Running the scrape

```bash
npm run scrape                    # every active source
npm run scrape -- --org <id>      # just one organisation's sources
```

Each run fetches every active source, creates new events, and **updates**
events it already inserted (matched by the source's own event ID) rather
than duplicating them — safe to run as often as you like. One bad event
in a feed is skipped and reported; it doesn't block the rest of that
source (unlike a manual `import-org` batch, which is all-or-nothing by
design since a human wrote it and a typo there is worth stopping for).

### Running it automatically

`GET /api/scrape` runs the same thing over HTTP, for a scheduler to call.
Set `SCRAPE_CRON_SECRET` in production and have the scheduler send
`Authorization: Bearer <that value>` — without it the endpoint is open to
anyone. On Vercel, add a `vercel.json`:

```json
{ "crons": [{ "path": "/api/scrape", "schedule": "0 */6 * * *" }] }
```

(Vercel Cron sends its own auth automatically.) Elsewhere, any scheduler
that can hit a URL works — a GitHub Actions workflow on a `schedule`
trigger, or plain `cron` + `curl` on a server you control.

### Recurring events

A recurring `ics` event (an RRULE, e.g. a weekly meetup) is expanded into
one row per upcoming occurrence — not just its first — within the next 6
months, capped at 60 occurrences per rule so a mis-tagged daily/hourly
feed can't flood the site. Re-scraping updates each occurrence in place
rather than duplicating it.

### Review queue

`ics`/`json` events and anything you insert yourself (`add-event`,
`import-org`) publish immediately — they're either parsed structured data
or something a human wrote. `html`-sourced events are different: they're
an LLM's read of a page, so a newly-created one starts out
**pending review** and doesn't appear on the public site or its direct
`/events/[id]` link until approved.

Approve or reject them at **`/admin/review`**, gated by HTTP Basic Auth —
set `ADMIN_USERNAME` and `ADMIN_PASSWORD` to enable it (without both set,
every `/admin/*` route refuses all requests rather than being left open).
This is a single shared password, not real multi-user auth — good enough
for one operator, not for organisers self-managing their own events (see
**Possible next steps**).

Rejecting an event sticks: re-scraping the same source later won't
resurface it as pending again, and approving/rejecting never touches an
event that's already been through review, so you're not re-moderating
the same listing on every scrape.

## Project layout

```
prisma/schema.prisma          Organisation + Event + Source data model
src/lib/events.ts             validation + insert logic (shared by scripts and, later, an admin UI)
src/lib/eventStatus.ts        published / pending_review / rejected constants
src/lib/queryEvents.ts        read-side queries used by the public site — always scoped to published
src/lib/scrapeSource.ts       runs one/all Sources: fetch, dedup, upsert, status tracking
src/lib/scrapers/             one adapter per source type — ics.ts, json.ts, html.ts
src/middleware.ts             HTTP Basic Auth gate for /admin/*
src/app/                      the public site (Next.js App Router)
src/app/admin/review/         review queue UI (approve/reject pending html-sourced events)
src/app/api/scrape/route.ts   HTTP endpoint a scheduler calls to run all sources
scripts/add-event.ts          CLI: insert one event
scripts/import-org-events.ts  CLI: bulk-insert one organisation's events
scripts/add-source.ts         CLI: register a scrape source
scripts/scrape-sources.ts     CLI: run scrape sources
scripts/seed.ts               sample data
data/examples/                example JSON matching the schemas above
```

## Possible next steps

Nothing below is built yet — flagging these as directions to fine-tune
toward, not a roadmap:

- A web form for inserting events and managing sources instead of
  hand-editing JSON (the review queue at `/admin/review` is the first
  piece of an admin UI, but registering sources and inserting one-off
  events are still CLI-only).
- Real multi-user auth (accounts, per-organiser permissions) so
  organisers can manage their own events and sources — `/admin/review`'s
  single shared password is a stopgap for one operator.
- Event images and a "save/follow" feature for visitors.
- Deploying somewhere with persistent storage (SQLite's local file won't
  survive a typical serverless deploy — Postgres would be the swap; it's
  also where a real Vercel/GitHub Actions cron would run `/api/scrape`
  against, rather than local `npm run scrape`).
