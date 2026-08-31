# Melbourne Events

A shareable site for finding networking events, workshops, and talks. Every
listing links straight out to the organiser's own registration or info page
— this site doesn't handle registration itself, it's just an index.

## What's here (v1)

- **Public site** — browse events, filter by type/organisation/date, search
  by keyword, click through to an event's registration page.
- **Insertion tooling** — two CLI scripts to add events from JSON files:
  one event at a time, or a whole batch for one organisation at once.

This is a first pass meant to be fine-tuned. Ideas for what's next are at
the bottom.

## Stack

Next.js (App Router) + TypeScript + Tailwind CSS, Prisma + SQLite for
storage.

## Getting started

```bash
npm install
cp .env.example .env        # DATABASE_URL="file:./dev.db"
npx prisma migrate dev      # creates prisma/dev.db and the Event/Organisation tables
npm run seed                # optional: adds a few sample events so the site isn't empty
npm run dev                 # http://localhost:3000
```

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

## Project layout

```
prisma/schema.prisma        Organisation + Event data model
src/lib/events.ts           validation + insert logic (shared by scripts and, later, an admin UI)
src/lib/queryEvents.ts      read-side queries used by the site (filters, search)
src/app/                    the public site (Next.js App Router)
scripts/add-event.ts        CLI: insert one event
scripts/import-org-events.ts CLI: bulk-insert one organisation's events
scripts/seed.ts             sample data
data/examples/              example JSON matching the schema above
```

## Possible next steps

Nothing below is built yet — flagging these as directions to fine-tune
toward, not a roadmap:

- An admin UI (web form) for inserting events instead of hand-editing JSON.
- Auto-discovery: periodically scraping/pulling events from organisations'
  own event pages or APIs instead of manual JSON files.
- Auth so multiple organisers can manage their own events.
- Recurring events, event images, and a "save/follow" feature for visitors.
- Deploying somewhere with persistent storage (SQLite's local file won't
  survive a typical serverless deploy — Postgres would be the swap).
