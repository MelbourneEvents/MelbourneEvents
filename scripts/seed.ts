/**
 * Loads a handful of sample events so the site has content to look at
 * right after setup. Safe to re-run — organisations are upserted by
 * name, and events are only created (running seed twice will duplicate
 * events, but not organisations).
 */
import { insertSingleEvent, insertOrganisationEvents } from "../src/lib/events";
import { prisma } from "../src/lib/db";

async function main() {
  await insertOrganisationEvents({
    organisation: {
      name: "Melbourne Data Science Meetup",
      website: "https://example.com/melbourne-data-science",
    },
    events: [
      {
        title: "Intro to Vector Databases",
        description:
          "A hands-on workshop covering embeddings, indexing strategies, and when you actually need a vector database.",
        type: "workshop",
        startDateTime: "2026-09-05T17:30:00+10:00",
        endDateTime: "2026-09-05T19:30:00+10:00",
        location: "RMIT Building 80, Melbourne CBD",
        isOnline: false,
        registrationUrl: "https://example.com/events/vector-db-workshop",
        tags: ["data science", "workshop", "databases"],
      },
      {
        title: "Talk: Evaluating LLMs in Production",
        description:
          "A practitioner's guide to building evaluation harnesses for LLM-powered features, with real war stories.",
        type: "talk",
        startDateTime: "2026-09-12T18:00:00+10:00",
        endDateTime: "2026-09-12T19:00:00+10:00",
        location: "Online",
        isOnline: true,
        registrationUrl: "https://example.com/events/evaluating-llms-talk",
        tags: ["llm", "ai", "talk"],
      },
    ],
  });

  await insertSingleEvent({
    organisation: {
      name: "Melbourne Tech Founders",
      website: "https://example.com/melbourne-tech-founders",
    },
    event: {
      title: "Founders Networking Night",
      description:
        "An informal evening for early-stage founders to meet, swap notes, and find collaborators over drinks.",
      type: "networking",
      startDateTime: "2026-09-18T18:30:00+10:00",
      endDateTime: "2026-09-18T21:00:00+10:00",
      location: "The Boatbuilders Yard, South Wharf",
      isOnline: false,
      registrationUrl: "https://example.com/events/founders-networking-night",
      tags: ["startups", "founders", "networking"],
    },
  });

  await insertSingleEvent({
    organisation: {
      name: "Women in Product Melbourne",
      website: "https://example.com/women-in-product-melbourne",
    },
    event: {
      title: "Product Career Panel",
      description:
        "A panel of senior product leaders share how they navigated career transitions, followed by Q&A and networking.",
      type: "talk",
      startDateTime: "2026-09-24T17:30:00+10:00",
      endDateTime: "2026-09-24T19:30:00+10:00",
      location: "Cliftons Melbourne, 440 Collins St",
      isOnline: false,
      registrationUrl: "https://example.com/events/product-career-panel",
      tags: ["product", "career", "panel"],
    },
  });

  console.log("✔ Seed complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
