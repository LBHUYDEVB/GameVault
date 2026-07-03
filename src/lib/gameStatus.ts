export const GAME_STATUSES = [
  "playing",
  "played",
  "completed",
  "backlog",
  "wishlist",
  "shelved",
  "abandoned",
  "retired",
] as const;

export type GameStatus = (typeof GAME_STATUSES)[number];

export const STATUS_LABELS: Record<GameStatus, string> = {
  playing: "正在玩",
  played: "玩过",
  completed: "已通关",
  backlog: "待补",
  wishlist: "愿望单",
  shelved: "搁置",
  abandoned: "弃坑",
  retired: "退役",
};

export const STATUS_DESCRIPTIONS: Record<GameStatus, string> = {
  playing: "现在还在推进",
  played: "已经留下记录",
  completed: "完整打完或达成目标",
  backlog: "拥有但还没认真开始",
  wishlist: "想玩但还没入库",
  shelved: "暂时放下，以后可能回来",
  abandoned: "基本不会再继续",
  retired: "曾经投入很多，现在封存",
};

export function normalizeGameStatus(value: unknown): GameStatus {
  if (value === "dropped") return "abandoned";
  if (typeof value === "string" && GAME_STATUSES.includes(value as GameStatus)) {
    return value as GameStatus;
  }
  return "played";
}

export function statusLabel(value: string | null | undefined) {
  const status = normalizeGameStatus(value);
  return STATUS_LABELS[status];
}
