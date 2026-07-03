import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSteamCredential, maskedCredential, normalizeCredentialForSave } from "@/lib/integrations/credentials";

export async function GET() {
  const account = await prisma.platformAccount.findUnique({ where: { platform: "steam" } });
  const credential = getSteamCredential(account);
  if (!account) {
    return NextResponse.json({
      steamId: credential.steamId ? "configured" : "",
      apiKey: credential.apiKey ? "configured" : "",
      maskedCredential: credential.apiKey ? "环境变量已配置" : "未配置",
      syncStatus: "idle",
      lastSyncAt: null,
    });
  }
  return NextResponse.json({
    steamId: account.accountId ? "configured" : "",
    apiKey: account.apiKey ? "configured" : "",
    maskedCredential: maskedCredential("steam", account),
    syncStatus: account.syncStatus,
    lastSyncAt: account.lastSyncAt,
  });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const credential = normalizeCredentialForSave("steam", body);

  const account = await prisma.platformAccount.upsert({
    where: { platform: "steam" },
    update: {
      accountId: credential.accountId,
      apiKey: credential.apiKey,
      credentialJson: credential.credentialJson,
      credentialStatus: "unknown",
      lastError: null,
    },
    create: { platform: "steam", ...credential },
  });

  return NextResponse.json({ ok: true, id: account.id });
}
