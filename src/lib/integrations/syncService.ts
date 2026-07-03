import { prisma } from "@/lib/db";
import { upsertFromSync } from "@/lib/repositories/gameRepository";
import { NintendoClient } from "./nintendo/nintendoClient";
import { PlayStationClient } from "./playstation/playstationClient";
import { SteamClient } from "./steam/steamClient";
import { mapSteamGameToDb } from "./steam/steamMapper";
import {
  getNintendoCredential,
  getPlayStationCredential,
  getSteamCredential,
  parseCredentialJson,
  type PlayStationCredential,
} from "./credentials";
import { PLATFORMS, type Platform } from "./platforms";
import type { ExternalGame } from "./types";

export interface SyncPlatformResult {
  platform: Platform;
  ok: boolean;
  syncedCount: number;
  updatedCount: number;
  failedCount: number;
  message: string | null;
}

function tokenExpiryFromNow(seconds?: number) {
  if (!seconds) return null;
  return new Date(Date.now() + seconds * 1000);
}

async function updateAccountState(
  platform: Platform,
  data: {
    syncStatus?: string;
    credentialStatus?: string;
    lastCheckedAt?: Date | null;
    lastError?: string | null;
    lastSyncAt?: Date | null;
    tokenExpiresAt?: Date | null;
    credentialJson?: string;
  }
) {
  const existing = await prisma.platformAccount.findUnique({ where: { platform } });
  if (!existing) return;
  await prisma.platformAccount.update({ where: { platform }, data });
}

async function existingGame(platform: Platform, ext: ExternalGame) {
  if (platform === "steam") {
    return prisma.game.findUnique({ where: { steamAppId: ext.externalId } });
  }

  return prisma.game.findFirst({
    where: { platform, externalId: ext.externalId },
  });
}

async function fetchExternalGames(platform: Platform) {
  const account = await prisma.platformAccount.findUnique({ where: { platform } });

  if (platform === "steam") {
    const credential = getSteamCredential(account);
    if (!credential.steamId || !credential.apiKey) throw new Error("Steam credentials not configured.");
    const client = new SteamClient();
    const games = await client.fetchOwnedGames(credential.steamId, credential.apiKey);
    return { games, credentialPatch: null, tokenExpiresAt: null };
  }

  if (platform === "playstation") {
    const credential = getPlayStationCredential(account);
    if (!credential.npsso && !credential.refreshToken) throw new Error("PlayStation credential not configured.");
    const client = new PlayStationClient();
    const result = await client.fetchOwnedGamesWithCredential(credential);
    const nextCredential: PlayStationCredential = {
      ...parseCredentialJson<PlayStationCredential>(account),
      npsso: credential.npsso,
      refreshToken: result.tokens.refreshToken,
      accessToken: result.tokens.accessToken,
      accessTokenExpiresAt: tokenExpiryFromNow(result.tokens.expiresIn)?.toISOString(),
      refreshTokenExpiresAt: tokenExpiryFromNow(result.tokens.refreshTokenExpiresIn)?.toISOString(),
    };
    return {
      games: result.games,
      credentialPatch: JSON.stringify(nextCredential),
      tokenExpiresAt: tokenExpiryFromNow(result.tokens.refreshTokenExpiresIn),
    };
  }

  const credential = getNintendoCredential(account);
  if (!credential.sessionToken) throw new Error("Nintendo session_token not configured.");
  const client = new NintendoClient();
  const games = await client.fetchOwnedGames("me", credential.sessionToken);
  return { games, credentialPatch: null, tokenExpiresAt: null };
}

export async function validatePlatform(platform: Platform) {
  try {
    const { games, credentialPatch, tokenExpiresAt } = await fetchExternalGames(platform);
    await updateAccountState(platform, {
      credentialStatus: "valid",
      lastCheckedAt: new Date(),
      lastError: null,
      ...(credentialPatch ? { credentialJson: credentialPatch } : {}),
      ...(tokenExpiresAt ? { tokenExpiresAt } : {}),
    });
    return { platform, ok: true, count: games.length, message: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await updateAccountState(platform, {
      credentialStatus: "invalid",
      lastCheckedAt: new Date(),
      lastError: message,
    });
    return { platform, ok: false, count: 0, message };
  }
}

export async function syncPlatform(platform: Platform): Promise<SyncPlatformResult> {
  const job = await prisma.syncJob.create({ data: { platform } });
  await updateAccountState(platform, { syncStatus: "syncing", lastError: null });

  try {
    const { games, credentialPatch, tokenExpiresAt } = await fetchExternalGames(platform);
    let syncedCount = 0;
    let updatedCount = 0;

    for (const externalGame of games) {
      const existing = await existingGame(platform, externalGame);
      if (platform === "steam") {
        await upsertFromSync(mapSteamGameToDb(externalGame));
      } else {
        await upsertFromSync({
          externalId: externalGame.externalId,
          title: externalGame.title,
          platform,
          playtimeMinutes: externalGame.playtimeMinutes,
          recentPlaytimeMinutes: externalGame.recentPlaytimeMinutes,
          recentPlaytimeSource: externalGame.recentPlaytimeSource,
          coverUrl: externalGame.coverUrl ?? null,
        });
      }
      if (existing) updatedCount++;
      else syncedCount++;
    }

    await prisma.syncJob.update({
      where: { id: job.id },
      data: {
        status: "success",
        syncedCount,
        updatedCount,
        failedCount: 0,
        finishedAt: new Date(),
      },
    });

    await updateAccountState(platform, {
      syncStatus: "idle",
      credentialStatus: "valid",
      lastSyncAt: new Date(),
      lastCheckedAt: new Date(),
      lastError: null,
      ...(credentialPatch ? { credentialJson: credentialPatch } : {}),
      ...(tokenExpiresAt ? { tokenExpiresAt } : {}),
    });

    return { platform, ok: true, syncedCount, updatedCount, failedCount: 0, message: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    await prisma.syncJob.update({
      where: { id: job.id },
      data: { status: "failed", message, failedCount: 1, finishedAt: new Date() },
    });

    await updateAccountState(platform, {
      syncStatus: "error",
      credentialStatus: "invalid",
      lastCheckedAt: new Date(),
      lastError: message,
    });

    return { platform, ok: false, syncedCount: 0, updatedCount: 0, failedCount: 1, message };
  }
}

export async function syncAllPlatforms() {
  const results: SyncPlatformResult[] = [];
  for (const platform of PLATFORMS) {
    results.push(await syncPlatform(platform));
  }
  return results;
}
