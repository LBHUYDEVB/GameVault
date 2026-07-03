import { prisma } from "@/lib/db";

function nullableText(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function positiveMinutes(value: unknown) {
  const minutes = Number(value ?? 0);
  if (!Number.isFinite(minutes) || minutes < 0) return 0;
  return Math.round(minutes);
}

function dateOrNow(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return new Date();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function boolValue(value: unknown, fallback = true) {
  return typeof value === "boolean" ? value : fallback;
}

function positionValue(value: unknown, fallback = 0) {
  const position = Number(value ?? fallback);
  if (!Number.isFinite(position)) return fallback;
  return Math.max(0, Math.round(position));
}

export async function listGameLogs(gameId: string) {
  return prisma.gameLog.findMany({
    where: { gameId },
    orderBy: [{ playedAt: "desc" }, { createdAt: "desc" }],
  });
}

export async function createGameLog(gameId: string, body: Record<string, unknown>) {
  return prisma.gameLog.create({
    data: {
      gameId,
      playedAt: dateOrNow(body.playedAt),
      minutes: positiveMinutes(body.minutes),
      note: nullableText(body.note),
      tags: nullableText(body.tags),
    },
  });
}

export async function updateGameLog(id: string, body: Record<string, unknown>) {
  return prisma.gameLog.update({
    where: { id },
    data: {
      ...(body.playedAt !== undefined ? { playedAt: dateOrNow(body.playedAt) } : {}),
      ...(body.minutes !== undefined ? { minutes: positiveMinutes(body.minutes) } : {}),
      ...(body.note !== undefined ? { note: nullableText(body.note) } : {}),
      ...(body.tags !== undefined ? { tags: nullableText(body.tags) } : {}),
    },
  });
}

export async function deleteGameLog(id: string) {
  await prisma.gameLog.delete({ where: { id } });
}

export async function listGameLists() {
  return prisma.gameList.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      items: {
        orderBy: { position: "asc" },
        include: { game: true },
      },
    },
  });
}

export async function getGameList(id: string) {
  return prisma.gameList.findUnique({
    where: { id },
    include: {
      items: {
        orderBy: { position: "asc" },
        include: { game: true },
      },
    },
  });
}

export async function createGameList(body: Record<string, unknown>) {
  const title = nullableText(body.title);
  if (!title) throw new Error("榜单需要标题。");

  return prisma.gameList.create({
    data: {
      title,
      description: nullableText(body.description),
      ranked: boolValue(body.ranked, true),
    },
  });
}

export async function updateGameList(id: string, body: Record<string, unknown>) {
  return prisma.gameList.update({
    where: { id },
    data: {
      ...(body.title !== undefined ? { title: nullableText(body.title) ?? "未命名榜单" } : {}),
      ...(body.description !== undefined ? { description: nullableText(body.description) } : {}),
      ...(body.ranked !== undefined ? { ranked: boolValue(body.ranked) } : {}),
    },
  });
}

export async function deleteGameList(id: string) {
  await prisma.gameList.delete({ where: { id } });
}

export async function addGameListItem(listId: string, body: Record<string, unknown>) {
  const gameId = nullableText(body.gameId);
  if (!gameId) throw new Error("缺少 gameId。");

  const maxPosition = await prisma.gameListItem.aggregate({
    where: { listId },
    _max: { position: true },
  });
  const position = body.position === undefined
    ? (maxPosition._max.position ?? -1) + 1
    : positionValue(body.position);

  return prisma.gameListItem.upsert({
    where: { listId_gameId: { listId, gameId } },
    update: {
      position,
      note: nullableText(body.note),
    },
    create: {
      listId,
      gameId,
      position,
      note: nullableText(body.note),
    },
    include: { game: true },
  });
}

export async function updateGameListItem(listId: string, body: Record<string, unknown>) {
  const itemId = nullableText(body.itemId);
  if (!itemId) throw new Error("缺少 itemId。");

  const item = await prisma.gameListItem.findFirst({ where: { id: itemId, listId } });
  if (!item) throw new Error("榜单条目不存在。");

  return prisma.gameListItem.update({
    where: { id: itemId },
    data: {
      ...(body.position !== undefined ? { position: positionValue(body.position) } : {}),
      ...(body.note !== undefined ? { note: nullableText(body.note) } : {}),
    },
    include: { game: true },
  });
}

export async function deleteGameListItem(listId: string, body: Record<string, unknown>) {
  const itemId = nullableText(body.itemId);
  if (!itemId) throw new Error("缺少 itemId。");

  await prisma.gameListItem.deleteMany({ where: { id: itemId, listId } });
}
