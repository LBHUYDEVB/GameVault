import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const account = await prisma.platformAccount.findUnique({ where: { platform: "steam" } });
  if (!account) {
    return NextResponse.json({
      steamId: process.env.STEAM_USER_ID ?? "",
      apiKey: process.env.STEAM_API_KEY ?? "",
      syncStatus: "idle",
      lastSyncAt: null,
    });
  }
  return NextResponse.json({
    steamId: account.accountId,
    apiKey: account.apiKey ?? "",
    syncStatus: account.syncStatus,
    lastSyncAt: account.lastSyncAt,
  });
}

export async function PUT(req: NextRequest) {
  const { steamId, apiKey } = await req.json();

  const account = await prisma.platformAccount.upsert({
    where: { platform: "steam" },
    update: { accountId: steamId, apiKey },
    create: { platform: "steam", accountId: steamId, apiKey },
  });

  return NextResponse.json({ ok: true, id: account.id });
}
