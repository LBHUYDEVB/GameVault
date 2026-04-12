import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const account = await prisma.platformAccount.findUnique({ where: { platform: "playstation" } });
  if (!account) {
    return NextResponse.json({ npsso: "", syncStatus: "idle", lastSyncAt: null });
  }
  return NextResponse.json({
    npsso: account.apiKey ?? "",
    syncStatus: account.syncStatus,
    lastSyncAt: account.lastSyncAt,
  });
}

export async function PUT(req: NextRequest) {
  const { npsso } = await req.json();

  await prisma.platformAccount.upsert({
    where: { platform: "playstation" },
    update: { apiKey: npsso },
    create: { platform: "playstation", accountId: "me", apiKey: npsso },
  });

  return NextResponse.json({ ok: true });
}
