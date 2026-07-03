import type { ExternalGame } from "../types";

export function mapSteamGameToDb(ext: ExternalGame) {
  return {
    steamAppId: ext.externalId,
    title: ext.title,
    platform: "steam" as const,
    playtimeMinutes: ext.playtimeMinutes,
    recentPlaytimeMinutes: ext.recentPlaytimeMinutes ?? null,
    recentPlaytimeSource: ext.recentPlaytimeSource ?? null,
    coverUrl: ext.coverUrl ?? null,
  };
}
