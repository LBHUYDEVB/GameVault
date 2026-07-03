import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { maskedCredential, normalizeCredentialForSave } from "@/lib/integrations/credentials";

export async function GET() {
  const account = await prisma.platformAccount.findUnique({ where: { platform: "playstation" } });
  if (!account) {
    return NextResponse.json({ npsso: "", maskedCredential: "未配置", syncStatus: "idle", lastSyncAt: null });
  }
  return NextResponse.json({
    npsso: account.apiKey ? "configured" : "",
    maskedCredential: maskedCredential("playstation", account),
    syncStatus: account.syncStatus,
    lastSyncAt: account.lastSyncAt,
  });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const credential = normalizeCredentialForSave("playstation", body);

  await prisma.platformAccount.upsert({
    where: { platform: "playstation" },
    update: {
      accountId: credential.accountId,
      apiKey: credential.apiKey,
      credentialJson: credential.credentialJson,
      credentialStatus: "unknown",
      lastError: null,
    },
    create: { platform: "playstation", ...credential },
  });

  return NextResponse.json({ ok: true });
}
