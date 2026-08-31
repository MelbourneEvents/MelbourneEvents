-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Event" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "startDateTime" DATETIME NOT NULL,
    "endDateTime" DATETIME,
    "location" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "registrationUrl" TEXT NOT NULL,
    "tags" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'published',
    "organisationId" TEXT NOT NULL,
    "sourceId" TEXT,
    "externalId" TEXT,
    CONSTRAINT "Event_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Event_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Event" ("createdAt", "description", "endDateTime", "externalId", "id", "isOnline", "location", "organisationId", "registrationUrl", "sourceId", "startDateTime", "tags", "title", "type", "updatedAt") SELECT "createdAt", "description", "endDateTime", "externalId", "id", "isOnline", "location", "organisationId", "registrationUrl", "sourceId", "startDateTime", "tags", "title", "type", "updatedAt" FROM "Event";
DROP TABLE "Event";
ALTER TABLE "new_Event" RENAME TO "Event";
CREATE INDEX "Event_startDateTime_idx" ON "Event"("startDateTime");
CREATE INDEX "Event_type_idx" ON "Event"("type");
CREATE INDEX "Event_organisationId_idx" ON "Event"("organisationId");
CREATE INDEX "Event_status_idx" ON "Event"("status");
CREATE UNIQUE INDEX "Event_sourceId_externalId_key" ON "Event"("sourceId", "externalId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
