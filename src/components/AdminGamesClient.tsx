"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { GameCover } from "@/components/GameCover";
import { PlatformBadge } from "@/components/PlatformBadge";
import { QuickRating } from "@/components/QuickRating";
import { fuzzyMatch, minutesToHours } from "@/lib/utils";

interface AdminGame {
  id: string;
  title: string;
  platform: string;
  playtimeMinutes: number;
  recentPlaytimeMinutes: number | null;
  recentPlaytimeSource: string | null;
  userRating: number | null;
  coverUrl: string | null;
}

type SortMode = "platform" | "recent" | "total" | "rating";
type SortDirection = "desc" | "asc";

const sortLabels: Record<SortMode, string> = {
  platform: "平台",
  recent: "近两周游玩时长",
  total: "总时长",
  rating: "评分",
};

const sortModes: SortMode[] = ["platform", "recent", "total", "rating"];

const platformOrder: Record<string, number> = {
  steam: 0,
  playstation: 1,
  nintendo: 2,
  other: 3,
};

const platformAliases: Record<string, string[]> = {
  steam: ["steam", "蒸汽"],
  playstation: ["playstation", "play station", "ps", "psn", "ps4", "ps5", "sony", "索尼"],
  nintendo: ["nintendo", "switch", "ns", "任天堂"],
  other: ["other", "其他"],
};

function compareNullableNumber(a: number | null, b: number | null, direction: SortDirection) {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return direction === "desc" ? b - a : a - b;
}

function platformRank(platform: string) {
  return platformOrder[platform.toLowerCase()] ?? 99;
}

function comparePlatform(a: AdminGame, b: AdminGame, direction: SortDirection) {
  const rankDiff = platformRank(a.platform) - platformRank(b.platform);
  const platformDiff = rankDiff !== 0 ? rankDiff : a.platform.localeCompare(b.platform);
  return direction === "desc" ? -platformDiff : platformDiff;
}

function sortGames(games: AdminGame[], sortMode: SortMode, direction: SortDirection) {
  return [...games].sort((a, b) => {
    if (sortMode === "platform") {
      const platformDiff = comparePlatform(a, b, direction);
      if (platformDiff !== 0) return platformDiff;
      return a.title.localeCompare(b.title);
    }

    if (sortMode === "recent") {
      const recentDiff = compareNullableNumber(a.recentPlaytimeMinutes, b.recentPlaytimeMinutes, direction);
      if (recentDiff !== 0) return recentDiff;
    }

    if (sortMode === "rating") {
      const ratingDiff = compareNullableNumber(a.userRating, b.userRating, direction);
      if (ratingDiff !== 0) return ratingDiff;
    }

    const totalDiff = direction === "desc"
      ? b.playtimeMinutes - a.playtimeMinutes
      : a.playtimeMinutes - b.playtimeMinutes;
    if (totalDiff !== 0) return totalDiff;

    return a.title.localeCompare(b.title);
  });
}

function matchesPlatform(platform: string, query: string) {
  const aliases = platformAliases[platform.toLowerCase()] ?? [platform.toLowerCase()];
  return aliases.some((alias) => alias.includes(query) || query.includes(alias));
}

function matchesGame(game: AdminGame, rawQuery: string) {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return true;
  return fuzzyMatch(game.title, query) || matchesPlatform(game.platform, query);
}

function formatRecentPlaytime(game: AdminGame) {
  if (game.recentPlaytimeMinutes == null) return "无 API 数据";
  return minutesToHours(game.recentPlaytimeMinutes);
}

function sourceLabel(source: string | null) {
  if (!source) return "";
  if (source.startsWith("steam:")) return "Steam API";
  if (source.startsWith("nintendo:")) return "Nintendo API";
  return source;
}

function SortControl({
  mode,
  sortMode,
  sortDirection,
  onSort,
  mobile = false,
}: {
  mode: SortMode;
  sortMode: SortMode;
  sortDirection: SortDirection;
  onSort: (mode: SortMode) => void;
  mobile?: boolean;
}) {
  const active = mode === sortMode;
  const icon = sortDirection === "desc" ? "↓" : "↑";

  return (
    <button
      type="button"
      onClick={() => onSort(mode)}
      aria-pressed={active}
      className={`inline-flex items-center gap-1.5 whitespace-nowrap text-left transition-colors ${
        mobile
          ? `rounded px-3 py-2 text-xs font-semibold ${
              active ? "bg-neon-cyan text-black" : "text-text-secondary hover:bg-white/5 hover:text-foreground"
            }`
          : `${active ? "text-neon-cyan" : "text-text-muted hover:text-foreground"}`
      }`}
    >
      <span>{sortLabels[mode]}</span>
      <span className={`inline-flex w-3 justify-center ${active ? "opacity-100" : "opacity-0"}`}>{icon}</span>
    </button>
  );
}

export function AdminGamesClient({ initialGames }: { initialGames: AdminGame[] }) {
  const [games, setGames] = useState(initialGames);
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("total");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newGame, setNewGame] = useState({ title: "", platform: "steam", playtimeMinutes: 0 });
  const [isPending, startTransition] = useTransition();

  const filteredGames = useMemo(() => {
    const result = query.trim() ? games.filter((game) => matchesGame(game, query)) : games;
    return sortGames(result, sortMode, sortDirection);
  }, [games, query, sortDirection, sortMode]);

  const handleSort = (mode: SortMode) => {
    if (mode === sortMode) {
      setSortDirection((value) => (value === "desc" ? "asc" : "desc"));
      return;
    }

    setSortMode(mode);
    setSortDirection(mode === "platform" ? "asc" : "desc");
  };

  const handleRatingChange = (id: string, rating: number | null) => {
    setGames((current) => current.map((game) => (game.id === id ? { ...game, userRating: rating } : game)));
  };

  const handleAdd = () => {
    if (!newGame.title.trim()) return;
    startTransition(async () => {
      const response = await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newGame),
      });
      const created = await response.json();
      setGames((current) => [{ ...created, recentPlaytimeMinutes: null, recentPlaytimeSource: null }, ...current]);
      setNewGame({ title: "", platform: "steam", playtimeMinutes: 0 });
      setShowAddForm(false);
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("确定删除这条游戏记录？")) return;
    startTransition(async () => {
      await fetch(`/api/games/${id}`, { method: "DELETE" });
      setGames((current) => current.filter((game) => game.id !== id));
    });
  };

  return (
    <section className="space-y-5">
      <div className="rounded-lg border border-border bg-[var(--bg-card)] p-4">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="搜索游戏"
          className="w-full rounded-md border border-border bg-[var(--bg-input)] px-3 py-2 text-sm outline-none focus:border-neon-cyan"
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2 overflow-x-auto rounded-lg border border-border bg-[var(--bg-card)] p-1 lg:hidden">
          {sortModes.map((mode) => (
            <SortControl
              key={mode}
              mode={mode}
              sortMode={sortMode}
              sortDirection={sortDirection}
              onSort={handleSort}
              mobile
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => setShowAddForm((value) => !value)}
          className="self-start rounded-md bg-neon-cyan px-4 py-2 text-sm font-semibold text-black sm:ml-auto"
        >
          {showAddForm ? "收起" : "手动添加"}
        </button>
      </div>

      {showAddForm && (
        <div className="rounded-lg border border-border bg-[var(--bg-card)] p-5">
          <div className="grid gap-4 md:grid-cols-3">
            <label className="space-y-2 text-sm text-text-secondary">
              <span>游戏名称</span>
              <input
                value={newGame.title}
                onChange={(event) => setNewGame((game) => ({ ...game, title: event.target.value }))}
                className="w-full rounded-md border border-border bg-[var(--bg-input)] px-3 py-2 text-foreground outline-none focus:border-neon-cyan"
              />
            </label>
            <label className="space-y-2 text-sm text-text-secondary">
              <span>平台</span>
              <select
                value={newGame.platform}
                onChange={(event) => setNewGame((game) => ({ ...game, platform: event.target.value }))}
                className="w-full rounded-md border border-border bg-[var(--bg-input)] px-3 py-2 text-foreground outline-none focus:border-neon-cyan"
              >
                <option value="steam">Steam</option>
                <option value="playstation">PlayStation</option>
                <option value="nintendo">Nintendo</option>
                <option value="other">其他</option>
              </select>
            </label>
            <label className="space-y-2 text-sm text-text-secondary">
              <span>游玩分钟</span>
              <input
                type="number"
                min="0"
                value={newGame.playtimeMinutes}
                onChange={(event) => setNewGame((game) => ({ ...game, playtimeMinutes: Number(event.target.value) }))}
                className="w-full rounded-md border border-border bg-[var(--bg-input)] px-3 py-2 text-foreground outline-none focus:border-neon-cyan"
              />
            </label>
          </div>
          <button
            type="button"
            onClick={handleAdd}
            disabled={isPending}
            className="mt-4 rounded-md border border-neon-cyan bg-neon-cyan px-4 py-2 text-sm font-semibold text-black disabled:opacity-60"
          >
            {isPending ? "保存中" : "确认添加"}
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-border bg-[var(--bg-card)]">
        <div className="hidden grid-cols-[minmax(220px,1fr)_118px_160px_110px_110px_120px] gap-4 border-b border-border px-5 py-3 text-xs uppercase tracking-[0.18em] text-text-muted lg:grid">
          <span>游戏</span>
          <SortControl mode="platform" sortMode={sortMode} sortDirection={sortDirection} onSort={handleSort} />
          <SortControl mode="recent" sortMode={sortMode} sortDirection={sortDirection} onSort={handleSort} />
          <SortControl mode="total" sortMode={sortMode} sortDirection={sortDirection} onSort={handleSort} />
          <SortControl mode="rating" sortMode={sortMode} sortDirection={sortDirection} onSort={handleSort} />
          <span>动作</span>
        </div>
        <div className="divide-y divide-border/70">
          {filteredGames.map((game) => (
            <div key={game.id} className="grid gap-3 p-4 lg:grid-cols-[minmax(220px,1fr)_118px_160px_110px_110px_120px] lg:items-center lg:px-5">
              <div className="flex min-w-0 items-center gap-3">
                <GameCover src={game.coverUrl} title={game.title} className="h-14 w-20 shrink-0" />
                <span className="truncate font-medium">{game.title}</span>
              </div>
              <PlatformBadge platform={game.platform} />
              <span className={`font-mono text-sm ${game.recentPlaytimeMinutes == null ? "text-text-muted" : "text-neon-cyan"}`} title={sourceLabel(game.recentPlaytimeSource)}>
                {formatRecentPlaytime(game)}
              </span>
              <span className="font-mono text-sm text-text-secondary">{minutesToHours(game.playtimeMinutes)}</span>
              <QuickRating
                gameId={game.id}
                initialRating={game.userRating}
                compact
                onChange={(rating) => handleRatingChange(game.id, rating)}
              />
              <div className="flex items-center gap-3">
                <Link href={`/admin/games/${game.id}`} className="text-sm text-neon-cyan hover:underline">
                  编辑
                </Link>
                <button type="button" onClick={() => handleDelete(game.id)} className="text-sm text-[var(--color-error)] hover:underline">
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
