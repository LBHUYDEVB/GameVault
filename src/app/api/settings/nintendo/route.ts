import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const account = await prisma.platformAccount.findUnique({ where: { platform: "nintendo" } });
  if (!account) {
    return NextResponse.json({ sessionToken: "", syncStatus: "idle", lastSyncAt: null });
  }
  return NextResponse.json({
    sessionToken: account.apiKey ?? "",
    syncStatus: account.syncStatus,
    lastSyncAt: account.lastSyncAt,
  });
}

export async function PUT(req: NextRequest) {
  const { sessionToken } = await req.json();

  await prisma.platformAccount.upsert({
    where: { platform: "nintendo" },
    update: { apiKey: sessionToken },
    create: { platform: "nintendo", accountId: "me", apiKey: sessionToken },
  });

  return NextResponse.json({ ok: true });
}
