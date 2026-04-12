"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { StatCard } from "@/components/StatCard";
import { PlatformBadge } from "@/components/PlatformBadge";
import { RatingDisplay } from "@/components/RatingDisplay";
import { minutesToHours, playtimeColorClass, fuzzyMatch } from "@/lib/utils";

interface Game {
  id: string;
  title: string;
  platform: string;
  playtimeMinutes: number;
  userRating: number | null;
  coverUrl: string | null;
  lastSyncedAt: string | null;
}

interface GamesResponse {
  games: Game[];
  summary: { totalPlaytimeMinutes: number; totalGames: number };
}

type SortField = "playtimeMinutes" | "userRating";
type SortOrder = "asc" | "desc";

export default function DashboardPage() {
  const [data, setData] = useState<GamesResponse | null>(null);
  const [sortBy, setSortBy] = useState<SortField>("playtimeMinutes");
  const [order, setOrder] = useState<SortOrder>("desc");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchGames = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/games?sortBy=${sortBy}&order=${order}`);
    const json = await res.json();
    setData(json);
    setLoading(false);
  }, [sortBy, order]);

  useEffect(() => {
    fetchGames();
  }, [fetchGames]);

  const toggleSort = (field: SortField) => {
    if (sortBy === field) {
      setOrder((o) => (o === "desc" ? "asc" : "desc"));
    } else {
      setSortBy(field);
      setOrder("desc");
    }
  };

  const sortIndicator = (field: SortField) => {
    if (sortBy !== field) return "  ↕";
    return order === "desc" ? " ↓" : " ↑";
  };

  const filteredGames = useMemo(() => {
    if (!data) return [];
    if (!search.trim()) return data.games;
    return data.games.filter((g) => fuzzyMatch(g.title, search));
  }, [data, search]);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold font-mono tracking-wide neon-text">DASHBOARD</h1>
        <p className="text-text-secondary text-sm mt-1">全平台游戏总览</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard
          label="总游玩时长"
          value={data ? minutesToHours(data.summary.totalPlaytimeMinutes) : "—"}
          accent="cyan"
        />
        <StatCard
          label="游戏总数"
          value={data?.summary.totalGames ?? "—"}
          unit="款"
          accent="magenta"
        />
        <StatCard
          label="已评分"
          value={data ? data.games.filter((g) => g.userRating != null).length : "—"}
          unit="款"
          accent="purple"
        />
      </div>

      {/* Search Bar */}
      <div className="mb-4 relative">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted text-sm pointer-events-none">⌕</span>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜索游戏名称（支持模糊匹配）..."
          className="w-full pl-9 pr-4 py-2.5 rounded-md border border-border bg-[var(--bg-input)] text-foreground font-mono text-sm focus:border-neon-cyan focus:outline-none transition-colors placeholder:text-text-muted"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-foreground text-sm font-mono cursor-pointer"
          >
            ✕
          </button>
        )}
      </div>

      {/* Search result count */}
      {search && data && (
        <p className="text-xs text-text-secondary font-mono mb-3">
          找到 <span className="text-neon-cyan">{filteredGames.length}</span> / {data.games.length} 款游戏
        </p>
      )}

      {/* Game List */}
      <div className="neon-card overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-[1fr_100px_120px_80px_80px] gap-4 px-5 py-3 border-b border-border text-xs font-mono uppercase tracking-wider text-text-secondary">
          <span>游戏</span>
          <span>平台</span>
          <button onClick={() => toggleSort("playtimeMinutes")} className="text-left hover:text-neon-cyan transition-colors cursor-pointer">
            时长{sortIndicator("playtimeMinutes")}
          </button>
          <button onClick={() => toggleSort("userRating")} className="text-left hover:text-neon-cyan transition-colors cursor-pointer">
            评分{sortIndicator("userRating")}
          </button>
          <span>操作</span>
        </div>

        {/* Rows */}
        {loading ? (
          <div className="px-5 py-12 text-center text-text-muted font-mono text-sm">
            <span className="animate-pulse">▓ LOADING DATA... ▓</span>
          </div>
        ) : filteredGames.length > 0 ? (
          filteredGames.map((game) => (
            <div
              key={game.id}
              className="grid grid-cols-[1fr_100px_120px_80px_80px] gap-4 px-5 py-3.5 border-b border-border/50 hover:bg-card-hover transition-colors duration-150 relative scanlines"
            >
              <div className="flex items-center gap-3 min-w-0">
                {game.coverUrl && (
                  <img src={game.coverUrl} alt="" className="w-10 h-10 rounded object-cover border border-border shrink-0" />
                )}
                <span className="font-medium truncate">{game.title}</span>
              </div>
              <div className="flex items-center">
                <PlatformBadge platform={game.platform} />
              </div>
              <div className={`flex items-center font-mono text-sm font-semibold ${playtimeColorClass(game.playtimeMinutes)}`}>
                {minutesToHours(game.playtimeMinutes)}
              </div>
              <div className="flex items-center">
                <RatingDisplay rating={game.userRating} />
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/games/${game.id}`}
                  className="text-xs font-mono text-neon-cyan hover:underline"
                >
                  详情
                </Link>
              </div>
            </div>
          ))
        ) : (
          <div className="px-5 py-16 text-center">
            {search ? (
              <p className="text-text-muted font-mono text-sm">░░ 没有匹配「{search}」的游戏 ░░</p>
            ) : (
              <>
                <p className="text-text-muted font-mono text-sm mb-4">░░ 暂无游戏数据 ░░</p>
                <Link
                  href="/settings/integrations"
                  className="inline-flex items-center px-4 py-2 rounded-md border border-neon-cyan/40 text-neon-cyan text-sm font-mono hover:bg-neon-cyan/10 transition-colors"
                >
                  前往配置 Steam 同步
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
