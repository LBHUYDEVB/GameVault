import {
  exchangeNpssoForAccessCode,
  exchangeAccessCodeForAuthTokens,
  exchangeRefreshTokenForAuthTokens,
  getUserPlayedGames,
} from "psn-api";
import type { AuthTokensResponse, AuthorizationPayload } from "psn-api";
import { IntegrationPort, ExternalGame, IntegrationStatus } from "../types";

function parsePTDuration(pt: string): number {
  const match = pt.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || "0", 10);
  const minutes = parseInt(match[2] || "0", 10);
  return hours * 60 + minutes;
}

export class PlayStationClient implements IntegrationPort {
  readonly platform = "playstation";

  private async authenticate(npsso: string): Promise<AuthTokensResponse> {
    const accessCode = await exchangeNpssoForAccessCode(npsso);
    const auth = await exchangeAccessCodeForAuthTokens(accessCode);
    return auth;
  }

  private async authenticateWithCredential(credential: {
    npsso?: string;
    refreshToken?: string;
  }): Promise<AuthTokensResponse> {
    if (credential.refreshToken) {
      try {
        return await exchangeRefreshTokenForAuthTokens(credential.refreshToken);
      } catch {
        if (!credential.npsso) throw new Error("PlayStation refresh token 已失效，请重新授权 NPSSO。");
      }
    }

    if (!credential.npsso) throw new Error("PlayStation NPSSO token is required");
    return this.authenticate(credential.npsso);
  }

  private async fetchPlayedGames(auth: AuthorizationPayload): Promise<ExternalGame[]> {
    console.log("[PSN] Fetching played games...");
    const allGames: ExternalGame[] = [];
    let offset = 0;
    const limit = 100;

    while (true) {
      const response = await getUserPlayedGames(auth, "me", {
        limit,
        offset,
        categories: "ps4_game,ps5_native_game",
      });

      for (const title of response.titles) {
        allGames.push({
          externalId: title.titleId,
          title: title.name,
          playtimeMinutes: parsePTDuration(title.playDuration ?? ""),
          coverUrl: title.imageUrl,
        });
      }

      if (response.titles.length < limit || offset + limit >= response.totalItemCount) {
        break;
      }
      offset += limit;
    }

    console.log(`[PSN] Got ${allGames.length} games`);
    return allGames;
  }

  async fetchOwnedGames(accountId: string, npsso?: string): Promise<ExternalGame[]> {
    if (!npsso) throw new Error("PlayStation NPSSO token is required");

    console.log("[PSN] Authenticating...");
    const auth = await this.authenticate(npsso);
    return this.fetchPlayedGames(auth);
  }

  async fetchOwnedGamesWithCredential(credential: {
    npsso?: string;
    refreshToken?: string;
  }): Promise<{ games: ExternalGame[]; tokens: AuthTokensResponse }> {
    console.log("[PSN] Authenticating...");
    const tokens = await this.authenticateWithCredential(credential);
    const games = await this.fetchPlayedGames(tokens);
    return { games, tokens };
  }

  async healthcheck(): Promise<IntegrationStatus> {
    return { ok: true, platform: this.platform };
  }
}
