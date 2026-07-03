-- Align the checked-in migration history with the current runtime schema and
-- add private credential metadata used by the local sync center.

ALTER TABLE "Game" ADD COLUMN "externalId" TEXT;

CREATE UNIQUE INDEX "Game_platform_externalId_key" ON "Game"("platform", "externalId");

ALTER TABLE "PlatformAccount" ADD COLUMN "credentialJson" TEXT;
ALTER TABLE "PlatformAccount" ADD COLUMN "credentialStatus" TEXT NOT NULL DEFAULT 'unknown';
ALTER TABLE "PlatformAccount" ADD COLUMN "tokenExpiresAt" DATETIME;
ALTER TABLE "PlatformAccount" ADD COLUMN "lastCheckedAt" DATETIME;
ALTER TABLE "PlatformAccount" ADD COLUMN "lastError" TEXT;
