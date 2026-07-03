ALTER TABLE "Game" ADD COLUMN "recentPlaytimeMinutes" INTEGER;
ALTER TABLE "Game" ADD COLUMN "recentPlaytimeSource" TEXT;
ALTER TABLE "Game" ADD COLUMN "recentPlaytimeUpdatedAt" DATETIME;

CREATE INDEX "Game_recentPlaytimeMinutes_idx" ON "Game"("recentPlaytimeMinutes");
