import { prisma } from "@/lib/db";
import { normalizeGameStatus } from "@/lib/gameStatus";
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
  return prisma.game.findUnique({
    where: { id },
    include: {
      logs: {
        orderBy: [{ playedAt: "desc" }, { createdAt: "desc" }],
      },
      listItems: {
        orderBy: { position: "asc" },
        include: { list: true },
      },
    },
  });
}

export async function upsertFromSync(data: {
  steamAppId?: string;
  externalId?: string;
  title: string;
  platform: string;
  playtimeMinutes: number;
  recentPlaytimeMinutes?: number | null;
  recentPlaytimeSource?: string | null;
  coverUrl: string | null;
}) {
  const now = new Date();
  const recentPatch = data.recentPlaytimeMinutes === undefined
    ? {}
    : {
        recentPlaytimeMinutes: data.recentPlaytimeMinutes,
        recentPlaytimeSource: data.recentPlaytimeSource ?? null,
        recentPlaytimeUpdatedAt: now,
      };

  if (data.platform === "steam" && data.steamAppId) {
    return prisma.game.upsert({
      where: { steamAppId: data.steamAppId },
      update: {
        title: data.title,
        playtimeMinutes: data.playtimeMinutes,
        ...recentPatch,
        coverUrl: data.coverUrl,
        lastSyncedAt: now,
      },
      create: { ...data, ...recentPatch, lastSyncedAt: now },
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
        ...recentPatch,
        coverUrl: data.coverUrl,
        lastSyncedAt: now,
      },
      create: { ...data, ...recentPatch, lastSyncedAt: now },
    });
  }

  return prisma.game.create({ data: { ...data, lastSyncedAt: now } });
}

export async function updateGameReview(
  id: string,
  data: { userRating?: number | null; reviewRichText?: string | null; status?: string | null }
) {
  return prisma.game.update({
    where: { id },
    data: {
      ...(data.userRating !== undefined ? { userRating: data.userRating } : {}),
      ...(data.reviewRichText !== undefined ? { reviewRichText: data.reviewRichText } : {}),
      ...(data.status !== undefined ? { status: normalizeGameStatus(data.status) } : {}),
    },
  });
}

export async function createManualGame(data: {
  title: string;
  platform: string;
  playtimeMinutes?: number;
  userRating?: number;
  coverUrl?: string;
  status?: string;
}) {
  return prisma.game.create({
    data: {
      ...data,
      status: normalizeGameStatus(data.status),
    },
  });
}

export async function deleteGame(id: string) {
  return prisma.game.delete({ where: { id } });
}
