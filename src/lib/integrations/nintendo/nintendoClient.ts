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

function objectValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function stringField(value: Record<string, unknown>, names: string[]) {
  for (const name of names) {
    const field = value[name];
    if (typeof field === "string" && field.trim()) return field;
  }
  return null;
}

function numberField(value: Record<string, unknown>, names: string[]) {
  for (const name of names) {
    const field = value[name];
    if (typeof field === "number" && Number.isFinite(field)) return field;
    if (typeof field === "string" && field.trim() && Number.isFinite(Number(field))) return Number(field);
  }
  return null;
}

function parseRecentNintendoPlaytime(recentPlayHistories: unknown[], titleId: string) {
  const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
  let minutes = 0;
  let matched = false;
  const seen = new Set<string>();

  const visit = (value: unknown) => {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }

    const item = objectValue(value);
    if (!item) return;

    const itemTitleId = stringField(item, ["titleId", "gameTitleId", "applicationId", "programId"]);
    const dateValue = stringField(item, ["playedAt", "playedDate", "date", "startTime", "lastPlayedAt"]);
    const minuteValue = numberField(item, ["playedMinutes", "playMinutes", "minutes", "durationMinutes", "totalPlayedMinutes"]);

    if (itemTitleId === titleId && dateValue && minuteValue != null) {
      const timestamp = new Date(dateValue).getTime();
      if (!Number.isNaN(timestamp) && timestamp >= twoWeeksAgo) {
        const key = `${itemTitleId}:${dateValue}:${minuteValue}`;
        if (!seen.has(key)) {
          seen.add(key);
          minutes += Math.max(0, Math.round(minuteValue));
          matched = true;
        }
      }
    }

    for (const child of Object.values(item)) {
      if (typeof child === "object" && child !== null) visit(child);
    }
  };

  visit(recentPlayHistories);
  return matched ? minutes : null;
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

    return data.playHistories.map((g) => {
      const recentPlaytimeMinutes = parseRecentNintendoPlaytime(data.recentPlayHistories ?? [], g.titleId);
      return {
        externalId: g.titleId,
        title: g.titleName,
        playtimeMinutes: g.totalPlayedMinutes,
        recentPlaytimeMinutes,
        recentPlaytimeSource: recentPlaytimeMinutes == null ? null : "nintendo:recentPlayHistories",
        coverUrl: g.imageUrl,
      };
    });
  }

  async healthcheck(): Promise<IntegrationStatus> {
    return { ok: true, platform: this.platform };
  }
}
