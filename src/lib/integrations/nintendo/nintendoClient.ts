import { IntegrationPort, ExternalGame, IntegrationStatus } from "../types";
import { HttpsProxyAgent } from "https-proxy-agent";

const NINTENDO_TOKEN_URL = "https://accounts.nintendo.com/connect/1.0.0/api/token";
const NINTENDO_PLAY_HISTORY_URL = "https://mypage-api.entry.nintendo.co.jp/api/v1/users/me/play_histories";
const NINTENDO_PLAY_HISTORY_URL_ALT = "https://app-api.znej.nintendo.com/api/v2.0/users/me/play_histories";
const CLIENT_ID = "5c38e31cd085304b";
const UA = "com.nintendo.znej/1.13.0 (Android/7.1.2)";
const TIMEOUT_MS = 30_000;

function getProxyAgent(): HttpsProxyAgent<string> | undefined {
  const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || process.env.ALL_PROXY;
  if (!proxyUrl) return undefined;
  return new HttpsProxyAgent(proxyUrl);
}

async function fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs = TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const agent = getProxyAgent();
  const options: RequestInit & { agent?: unknown } = { ...init, signal: controller.signal };
  if (agent) (options as Record<string, unknown>).agent = agent;
  try {
    return await fetch(url, options);
  } finally {
    clearTimeout(timer);
  }
}

interface NintendoPlayHistory {
  titleId: string;
  titleName: string;
  deviceType: string;
  imageUrl: string;
  lastUpdatedAt: string;
  firstPlayedAt: string;
  lastPlayedAt: string;
  totalPlayedDays: number;
  totalPlayedMinutes: number;
}

interface PlayHistoryResponse {
  playHistories: NintendoPlayHistory[];
  recentPlayHistories: unknown[];
  lastUpdatedAt: string;
}

export class NintendoClient implements IntegrationPort {
  readonly platform = "nintendo";

  private async getAccessToken(sessionToken: string): Promise<{ access_token: string; token_type: string }> {
    const body = JSON.stringify({
      client_id: CLIENT_ID,
      session_token: sessionToken,
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer-session-token",
    });

    console.log("[Nintendo] Requesting access_token...");
    const res = await fetchWithTimeout(NINTENDO_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": UA },
      body,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Nintendo token 换取失败: HTTP ${res.status}. ${text.slice(0, 300)}`);
    }

    return res.json();
  }

  async fetchOwnedGames(accountId: string, sessionToken?: string): Promise<ExternalGame[]> {
    if (!sessionToken) throw new Error("Nintendo session_token is required");

    const tokenData = await this.getAccessToken(sessionToken);
    const headers = {
      Authorization: `${tokenData.token_type} ${tokenData.access_token}`,
      "User-Agent": UA,
      "gentry-locale": "en-US",
    };

    let data: PlayHistoryResponse | null = null;

    // 先尝试主 URL，失败则尝试备用 URL
    for (const url of [NINTENDO_PLAY_HISTORY_URL_ALT, NINTENDO_PLAY_HISTORY_URL]) {
      try {
        console.log(`[Nintendo] Trying ${url}...`);
        const res = await fetchWithTimeout(url, { headers });

        if (res.ok) {
          data = await res.json();
          console.log(`[Nintendo] Success from ${url}`);
          break;
        }

        const text = await res.text();
        console.log(`[Nintendo] ${url} returned HTTP ${res.status}: ${text.slice(0, 100)}`);
      } catch (e) {
        console.log(`[Nintendo] ${url} failed: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    if (!data) {
      throw new Error(
        "Nintendo 两个 API 地址均无法访问。如果你在国内，请在 .env 中设置 HTTPS_PROXY 后重启服务。"
      );
    }

    console.log(`[Nintendo] Got ${data.playHistories.length} games`);

    return data.playHistories.map((g) => ({
      externalId: g.titleId,
      title: g.titleName,
      playtimeMinutes: g.totalPlayedMinutes,
      coverUrl: g.imageUrl,
    }));
  }

  async healthcheck(): Promise<IntegrationStatus> {
    return { ok: true, platform: this.platform };
  }
}
