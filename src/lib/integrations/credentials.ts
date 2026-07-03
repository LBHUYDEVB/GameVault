import crypto from "node:crypto";
import type { PlatformAccount } from "@/generated/prisma/client";
import type { Platform } from "./platforms";

export interface SteamCredential {
  steamId?: string;
  apiKey?: string;
}

export interface PlayStationCredential {
  npsso?: string;
  refreshToken?: string;
  accessToken?: string;
  accessTokenExpiresAt?: string;
  refreshTokenExpiresAt?: string;
}

export interface NintendoCredential {
  sessionToken?: string;
  pendingCodeVerifier?: string;
  pendingState?: string;
}

export type PlatformCredential = SteamCredential | PlayStationCredential | NintendoCredential;

export function parseCredentialJson<T extends PlatformCredential>(account?: PlatformAccount | null): T {
  if (!account?.credentialJson) return {} as T;
  try {
    const parsed = JSON.parse(account.credentialJson);
    return parsed && typeof parsed === "object" ? (parsed as T) : ({} as T);
  } catch {
    return {} as T;
  }
}

export function getSteamCredential(account?: PlatformAccount | null): SteamCredential {
  const credential = parseCredentialJson<SteamCredential>(account);
  return {
    steamId: credential.steamId || account?.accountId || process.env.STEAM_USER_ID || "",
    apiKey: credential.apiKey || account?.apiKey || process.env.STEAM_API_KEY || "",
  };
}

export function getPlayStationCredential(account?: PlatformAccount | null): PlayStationCredential {
  const credential = parseCredentialJson<PlayStationCredential>(account);
  return {
    npsso: credential.npsso || account?.apiKey || "",
    refreshToken: credential.refreshToken || "",
    accessToken: credential.accessToken || "",
    accessTokenExpiresAt: credential.accessTokenExpiresAt,
    refreshTokenExpiresAt: credential.refreshTokenExpiresAt,
  };
}

export function getNintendoCredential(account?: PlatformAccount | null): NintendoCredential {
  const credential = parseCredentialJson<NintendoCredential>(account);
  return {
    sessionToken: credential.sessionToken || account?.apiKey || "",
    pendingCodeVerifier: credential.pendingCodeVerifier,
    pendingState: credential.pendingState,
  };
}

export function isCredentialConfigured(platform: Platform, account?: PlatformAccount | null): boolean {
  if (platform === "steam") {
    const credential = getSteamCredential(account);
    return Boolean(credential.steamId && credential.apiKey);
  }
  if (platform === "playstation") {
    const credential = getPlayStationCredential(account);
    return Boolean(credential.npsso || credential.refreshToken);
  }
  const credential = getNintendoCredential(account);
  return Boolean(credential.sessionToken);
}

export function maskedCredential(platform: Platform, account?: PlatformAccount | null): string {
  if (!isCredentialConfigured(platform, account)) return "未配置";
  if (platform === "steam") {
    const credential = getSteamCredential(account);
    return `Steam ID ${credential.steamId || "已保存"}，API Key 已保存`;
  }
  if (platform === "playstation") {
    const credential = getPlayStationCredential(account);
    if (credential.refreshToken) return "Refresh token 已保存";
    return `NPSSO 已保存，${credential.npsso?.length ?? 0} 字符`;
  }
  const credential = getNintendoCredential(account);
  return `Session token 已保存，${credential.sessionToken?.length ?? 0} 字符`;
}

export function normalizeCredentialForSave(platform: Platform, input: Record<string, unknown>) {
  if (platform === "steam") {
    const steamId = String(input.steamId ?? input.accountId ?? "").trim();
    const apiKey = String(input.apiKey ?? "").trim();
    return {
      accountId: steamId,
      apiKey,
      credentialJson: JSON.stringify({ steamId, apiKey } satisfies SteamCredential),
    };
  }

  if (platform === "playstation") {
    const npsso = String(input.npsso ?? input.apiKey ?? "").trim();
    const refreshToken = String(input.refreshToken ?? "").trim();
    return {
      accountId: "me",
      apiKey: npsso,
      credentialJson: JSON.stringify({
        ...(npsso ? { npsso } : {}),
        ...(refreshToken ? { refreshToken } : {}),
      } satisfies PlayStationCredential),
    };
  }

  const sessionToken = String(input.sessionToken ?? input.apiKey ?? "").trim();
  return {
    accountId: "me",
    apiKey: sessionToken,
    credentialJson: JSON.stringify({ sessionToken } satisfies NintendoCredential),
  };
}

export function createNintendoAuthFlow() {
  const clientId = "5c38e31cd085304b";
  const codeVerifier = crypto.randomBytes(32).toString("base64url");
  const codeChallenge = crypto.createHash("sha256").update(codeVerifier).digest("base64url");
  const state = crypto.randomBytes(16).toString("hex");
  const params = new URLSearchParams({
    state,
    redirect_uri: `npf${clientId}://auth`,
    client_id: clientId,
    scope: "openid user user.mii user.email user.links[].id",
    response_type: "session_token_code",
    session_token_code_challenge: codeChallenge,
    session_token_code_challenge_method: "S256",
    theme: "login_form",
  });

  return {
    clientId,
    codeVerifier,
    state,
    authUrl: `https://accounts.nintendo.com/connect/1.0.0/authorize?${params}`,
  };
}

export async function exchangeNintendoSessionToken(input: {
  clientId: string;
  codeVerifier: string;
  redirectUrl: string;
}) {
  const code = input.redirectUrl.match(/session_token_code=([^&]+)/)?.[1];
  if (!code) throw new Error("没有在链接中找到 session_token_code。");

  const response = await fetch("https://accounts.nintendo.com/connect/1.0.0/api/session_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "com.nintendo.znej/1.13.0 (Android/7.1.2)",
    },
    body: new URLSearchParams({
      client_id: input.clientId,
      session_token_code: code,
      session_token_code_verifier: input.codeVerifier,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Nintendo session token 换取失败: HTTP ${response.status}. ${text.slice(0, 240)}`);
  }

  const data = await response.json();
  if (!data.session_token) throw new Error("Nintendo 没有返回 session_token。");
  return String(data.session_token);
}
