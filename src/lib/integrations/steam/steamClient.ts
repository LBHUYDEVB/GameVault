import { IntegrationPort, ExternalGame, IntegrationStatus } from "../types";
import { HttpsProxyAgent } from "https-proxy-agent";

const STEAM_API_BASE = "https://api.steampowered.com";
const TIMEOUT_MS = 30_000;

function getProxyAgent(): HttpsProxyAgent<string> | undefined {
  const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || process.env.ALL_PROXY;
  if (!proxyUrl) return undefined;
  return new HttpsProxyAgent(proxyUrl);
}

async function fetchWithTimeout(url: string, timeoutMs = TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const agent = getProxyAgent();
  const options: RequestInit & { agent?: unknown } = { signal: controller.signal };
  if (agent) {
    (options as Record<string, unknown>).agent = agent;
  }

  try {
    const res = await fetch(url, options);
    return res;
  } finally {
    clearTimeout(timer);
  }
}

interface SteamOwnedGame {
  appid: number;
  name: string;
  playtime_forever: number;
  img_icon_url?: string;
}

export class SteamClient implements IntegrationPort {
  readonly platform = "steam";

  async fetchOwnedGames(steamId: string, apiKey?: string): Promise<ExternalGame[]> {
    if (!apiKey) throw new Error("Steam API key is required");

    const url = `${STEAM_API_BASE}/IPlayerService/GetOwnedGames/v0001/?key=${apiKey}&steamid=${steamId}&include_appinfo=true&include_played_free_games=true&format=json`;

    console.log(`[Steam] Fetching owned games for steamId=${steamId}...`);

    let res: Response;
    try {
      res = await fetchWithTimeout(url);
    } catch (e: unknown) {
      if (e instanceof DOMException && e.name === "AbortError") {
        throw new Error(
          `连接 Steam API 超时 (${TIMEOUT_MS / 1000}s)。如果你在国内，请在 .env 中设置 HTTPS_PROXY（例如 HTTPS_PROXY=http://127.0.0.1:7890）后重启服务。`
        );
      }
      const msg = e instanceof Error ? e.message : String(e);
      throw new Error(`连接 Steam API 失败: ${msg}。请检查网络连接或设置代理。`);
    }

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Steam API 返回错误: HTTP ${res.status} ${res.statusText}。${body ? `响应: ${body.slice(0, 200)}` : ""}`);
    }

    const data = await res.json();
    const games: SteamOwnedGame[] = data?.response?.games ?? [];

    console.log(`[Steam] Got ${games.length} games`);

    return games.map((g) => ({
      externalId: String(g.appid),
      title: g.name,
      playtimeMinutes: g.playtime_forever,
      coverUrl: `https://cdn.akamai.steamstatic.com/steam/apps/${g.appid}/header.jpg`,
    }));
  }

  async healthcheck(): Promise<IntegrationStatus> {
    try {
      const res = await fetchWithTimeout(
        `${STEAM_API_BASE}/ISteamWebAPIUtil/GetSupportedAPIList/v0001/`,
        10_000
      );
      return res.ok
        ? { ok: true, platform: this.platform }
        : { ok: false, platform: this.platform, reason: `HTTP ${res.status}` };
    } catch (e) {
      return { ok: false, platform: this.platform, reason: String(e) };
    }
  }
}
