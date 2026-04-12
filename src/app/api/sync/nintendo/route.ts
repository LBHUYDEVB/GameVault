import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { NintendoClient } from "@/lib/integrations/nintendo/nintendoClient";
import { upsertFromSync } from "@/lib/repositories/gameRepository";

export async function POST() {
  const account = await prisma.platformAccount.findUnique({ where: { platform: "nintendo" } });
  const sessionToken = account?.apiKey;

  if (!sessionToken) {
    return NextResponse.json(
      { error: "Nintendo session_token 未配置。请在「平台接入」页面填入。" },
      { status: 400 }
    );
  }

  const job = await prisma.syncJob.create({ data: { platform: "nintendo" } });

  try {
    await prisma.platformAccount.update({ where: { platform: "nintendo" }, data: { syncStatus: "syncing" } });

    const client = new NintendoClient();
    const externalGames = await client.fetchOwnedGames("me", sessionToken);

    let synced = 0;
    let updated = 0;

    for (const ext of externalGames) {
      const existing = await prisma.game.findFirst({
        where: { platform: "nintendo", externalId: ext.externalId },
      });

      await upsertFromSync({
        externalId: ext.externalId,
        title: ext.title,
        platform: "nintendo",
        playtimeMinutes: ext.playtimeMinutes,
        coverUrl: ext.coverUrl ?? null,
      });

      if (existing) updated++;
      else synced++;
    }

    await prisma.syncJob.update({
      where: { id: job.id },
      data: { status: "success", syncedCount: synced, updatedCount: updated, finishedAt: new Date() },
    });

    await prisma.platformAccount.update({
      where: { platform: "nintendo" },
      data: { syncStatus: "idle", lastSyncAt: new Date() },
    });

    return NextResponse.json({ jobId: job.id, syncedCount: synced, updatedCount: updated, failedCount: 0 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);

    await prisma.syncJob.update({
      where: { id: job.id },
      data: { status: "failed", message: msg, finishedAt: new Date() },
    });

    if (account) {
      await prisma.platformAccount.update({ where: { platform: "nintendo" }, data: { syncStatus: "error" } });
    }

    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
