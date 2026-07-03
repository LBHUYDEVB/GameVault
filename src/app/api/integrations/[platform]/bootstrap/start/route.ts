import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  createNintendoAuthFlow,
  parseCredentialJson,
  type NintendoCredential,
} from "@/lib/integrations/credentials";
import { isPlatform } from "@/lib/integrations/platforms";

export async function POST(_req: Request, ctx: RouteContext<"/api/integrations/[platform]/bootstrap/start">) {
  const { platform } = await ctx.params;
  if (!isPlatform(platform)) {
    return NextResponse.json({ error: "Unsupported platform" }, { status: 404 });
  }

  if (platform === "steam") {
    const url = "https://steamcommunity.com/dev/apikey";
    return NextResponse.json({
      platform,
      mode: "external-page",
      url,
      message: "已打开 Steam Web API Key 页面。登录后复制 key，回到本页替换凭证。",
    });
  }

  if (platform === "playstation") {
    const url = "https://ca.account.sony.com/api/v1/ssocookie";
    return NextResponse.json({
      platform,
      mode: "external-page",
      url,
      message: "已打开 Sony NPSSO 页面。登录后复制返回 JSON 中的 npsso 值，回到本页替换凭证。",
    });
  }

  const flow = createNintendoAuthFlow();
  const account = await prisma.platformAccount.findUnique({ where: { platform: "nintendo" } });
  const credential = parseCredentialJson<NintendoCredential>(account);
  await prisma.platformAccount.upsert({
    where: { platform: "nintendo" },
    update: {
      accountId: "me",
      credentialJson: JSON.stringify({
        ...credential,
        pendingCodeVerifier: flow.codeVerifier,
        pendingState: flow.state,
      }),
      lastError: null,
    },
    create: {
      platform: "nintendo",
      accountId: "me",
      credentialJson: JSON.stringify({
        pendingCodeVerifier: flow.codeVerifier,
        pendingState: flow.state,
      } satisfies NintendoCredential),
    },
  });

  return NextResponse.json({
    platform,
    mode: "oauth-link",
    url: flow.authUrl,
    message: "已生成 Nintendo 授权链接。登录后复制 Select this account 的链接，回到本页完成换取。",
  });
}
