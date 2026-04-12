import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { SteamClient } from "@/lib/integrations/steam/steamClient";
import { mapSteamGameToDb } from "@/lib/integrations/steam/steamMapper";
import { upsertFromSync } from "@/lib/repositories/gameRepository";

export async function POST() {
  const account = await prisma.platformAccount.findUnique({ where: { platform: "steam" } });

  const steamId = account?.accountId || process.env.STEAM_USER_ID;
  const apiKey = account?.apiKey || process.env.STEAM_API_KEY;

  if (!steamId || !apiKey) {
    return NextResponse.json(
      { error: "Steam credentials not configured. Set them in Settings > Integrations." },
      { status: 400 }
    );
  }

  const job = await prisma.syncJob.create({ data: { platform: "steam" } });

  try {
    if (account) {
      await prisma.platformAccount.update({ where: { platform: "steam" }, data: { syncStatus: "syncing" } });
    }

    const client = new SteamClient();
    const externalGames = await client.fetchOwnedGames(steamId, apiKey);

    let synced = 0;
    let updated = 0;

    for (const ext of externalGames) {
      const mapped = mapSteamGameToDb(ext);
      const existing = await prisma.game.findUnique({ where: { steamAppId: mapped.steamAppId } });
      await upsertFromSync(mapped);
      if (existing) updated++;
      else synced++;
    }

    await prisma.syncJob.update({
      where: { id: job.id },
      data: { status: "success", syncedCount: synced, updatedCount: updated, finishedAt: new Date() },
    });

    if (account) {
      await prisma.platformAccount.update({
        where: { platform: "steam" },
        data: { syncStatus: "idle", lastSyncAt: new Date() },
      });
    }

    return NextResponse.json({ jobId: job.id, syncedCount: synced, updatedCount: updated, failedCount: 0 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);

    await prisma.syncJob.update({
      where: { id: job.id },
      data: { status: "failed", message: msg, finishedAt: new Date() },
    });

    if (account) {
      await prisma.platformAccount.update({ where: { platform: "steam" }, data: { syncStatus: "error" } });
    }

    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
