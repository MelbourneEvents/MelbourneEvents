-- CreateTable
CREATE TABLE "Organisation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "website" TEXT,
    "logoUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Event" (
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
    "organisationId" TEXT NOT NULL,
    CONSTRAINT "Event_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Organisation_name_key" ON "Organisation"("name");

-- CreateIndex
CREATE INDEX "Event_startDateTime_idx" ON "Event"("startDateTime");

-- CreateIndex
CREATE INDEX "Event_type_idx" ON "Event"("type");

-- CreateIndex
CREATE INDEX "Event_organisationId_idx" ON "Event"("organisationId");
