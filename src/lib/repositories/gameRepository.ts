import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

type SortField = "userRating" | "playtimeMinutes";
type SortOrder = "asc" | "desc";

interface ListOptions {
  sortBy?: SortField;
  order?: SortOrder;
  platform?: string;
}

export async function listGames(opts: ListOptions = {}) {
  const { sortBy = "playtimeMinutes", order = "desc", platform } = opts;

  const where: Prisma.GameWhereInput = platform ? { platform } : {};

  const games = await prisma.game.findMany({
    where,
    orderBy: { [sortBy]: order },
  });

  const agg = await prisma.game.aggregate({
    where,
    _sum: { playtimeMinutes: true },
    _count: true,
  });

  return {
    games,
    summary: {
      totalPlaytimeMinutes: agg._sum.playtimeMinutes ?? 0,
      totalGames: agg._count,
    },
  };
}

export async function getGame(id: string) {
  return prisma.game.findUnique({ where: { id } });
}

export async function upsertFromSync(data: {
  steamAppId?: string;
  externalId?: string;
  title: string;
  platform: string;
  playtimeMinutes: number;
  coverUrl: string | null;
}) {
  const now = new Date();

  if (data.platform === "steam" && data.steamAppId) {
    return prisma.game.upsert({
      where: { steamAppId: data.steamAppId },
      update: {
        title: data.title,
        playtimeMinutes: data.playtimeMinutes,
        coverUrl: data.coverUrl,
        lastSyncedAt: now,
      },
      create: { ...data, lastSyncedAt: now },
    });
  }

  if (data.externalId) {
    return prisma.game.upsert({
      where: {
        platform_externalId: {
          platform: data.platform,
          externalId: data.externalId,
        },
      },
      update: {
        title: data.title,
        playtimeMinutes: data.playtimeMinutes,
        coverUrl: data.coverUrl,
        lastSyncedAt: now,
      },
      create: { ...data, lastSyncedAt: now },
    });
  }

  return prisma.game.create({ data: { ...data, lastSyncedAt: now } });
}

export async function updateGameReview(
  id: string,
  data: { userRating?: number | null; reviewRichText?: string | null }
) {
  return prisma.game.update({ where: { id }, data });
}

export async function createManualGame(data: {
  title: string;
  platform: string;
  playtimeMinutes?: number;
  userRating?: number;
  coverUrl?: string;
}) {
  return prisma.game.create({ data });
}

export async function deleteGame(id: string) {
  return prisma.game.delete({ where: { id } });
}
