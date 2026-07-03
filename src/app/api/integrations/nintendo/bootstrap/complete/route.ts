import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  exchangeNintendoSessionToken,
  parseCredentialJson,
  type NintendoCredential,
} from "@/lib/integrations/credentials";

export async function POST(req: NextRequest) {
  const { redirectUrl } = await req.json();
  const account = await prisma.platformAccount.findUnique({ where: { platform: "nintendo" } });
  const credential = parseCredentialJson<NintendoCredential>(account);

  if (!credential.pendingCodeVerifier) {
    return NextResponse.json({ error: "请先启动 Nintendo 授权流程。" }, { status: 400 });
  }

  try {
    const sessionToken = await exchangeNintendoSessionToken({
      clientId: "5c38e31cd085304b",
      codeVerifier: credential.pendingCodeVerifier,
      redirectUrl: String(redirectUrl ?? ""),
    });

    await prisma.platformAccount.upsert({
      where: { platform: "nintendo" },
      update: {
        accountId: "me",
        apiKey: sessionToken,
        credentialJson: JSON.stringify({ sessionToken } satisfies NintendoCredential),
        credentialStatus: "unknown",
        lastError: null,
      },
      create: {
        platform: "nintendo",
        accountId: "me",
        apiKey: sessionToken,
        credentialJson: JSON.stringify({ sessionToken } satisfies NintendoCredential),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await prisma.platformAccount.update({
      where: { platform: "nintendo" },
      data: { lastError: message, credentialStatus: "invalid" },
    });
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
