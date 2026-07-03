"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { GameCover } from "@/components/GameCover";
import { PlatformBadge } from "@/components/PlatformBadge";
import { QuickRating } from "@/components/QuickRating";
import { StatusQuickSwitch } from "@/components/StatusQuickSwitch";
import { GAME_STATUSES, STATUS_LABELS, normalizeGameStatus, statusLabel } from "@/lib/gameStatus";
import { fuzzyMatch, minutesToHours, playtimeColorClass } from "@/lib/utils";

gsap.registerPlugin(ScrollTrigger);

export interface LibraryGame {
  id: string;
  title: string;
  platform: string;
  status: string;
  playtimeMinutes: number;
  userRating: number | null;
  hasReview: boolean;
  coverUrl: string | null;
  lastSyncedAt?: Date | string | null;
  updatedAt?: Date | string | null;
}

type SortMode = "playtime" | "rating" | "recent" | "title" | "reviewed";
type ViewMode = "grid" | "table";
type RatingFilter = "all" | "rated" | "unrated";
type ReviewFilter = "all" | "reviewed" | "unreviewed";

function sortGames(games: LibraryGame[], sortMode: SortMode) {
  const copy = [...games];
  copy.sort((a, b) => {
    if (sortMode === "rating") return (b.userRating ?? -1) - (a.userRating ?? -1);
    if (sortMode === "recent") return new Date(b.updatedAt ?? 0).getTime() - new Date(a.updatedAt ?? 0).getTime();
    if (sortMode === "title") return a.title.localeCompare(b.title);
    if (sortMode === "reviewed") return Number(b.hasReview) - Number(a.hasReview) || (b.userRating ?? -1) - (a.userRating ?? -1);
    return b.playtimeMinutes - a.playtimeMinutes;
  });
  return copy;
}

export function GameLibraryView({ games }: { games: LibraryGame[] }) {
  const [query, setQuery] = useState("");
  const [platform, setPlatform] = useState("all");
  const [status, setStatus] = useState("all");
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>("all");
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("playtime");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const root = useRef<HTMLDivElement>(null);

  const filteredGames = useMemo(() => {
    const normalizedStatus = status === "all" ? "all" : normalizeGameStatus(status);
    const result = games.filter((game) => {
      if (platform !== "all" && game.platform !== platform) return false;
      if (normalizedStatus !== "all" && normalizeGameStatus(game.status) !== normalizedStatus) return false;
      if (ratingFilter === "rated" && game.userRating == null) return false;
      if (ratingFilter === "unrated" && game.userRating != null) return false;
      if (reviewFilter === "reviewed" && !game.hasReview) return false;
      if (reviewFilter === "unreviewed" && game.hasReview) return false;
      if (query.trim() && !fuzzyMatch(game.title, query)) return false;
      return true;
    });
    return sortGames(result, sortMode);
  }, [games, platform, query, ratingFilter, reviewFilter, sortMode, status]);

  useGSAP(
    () => {
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduceMotion) return;

      const cards = gsap.utils.toArray<HTMLElement>("[data-library-card]");
      cards.forEach((card, index) => {
        gsap.fromTo(
          card,
          { opacity: 0.2, scale: 0.9, y: 30 },
          {
            opacity: 1,
            scale: 1,
            y: 0,
            duration: 0.75,
            ease: "power3.out",
            scrollTrigger: {
              trigger: card,
              start: "top 92%",
              end: "bottom 18%",
              scrub: index % 4 === 0 ? 0.45 : false,
            },
          }
        );
      });
    },
    { scope: root, dependencies: [filteredGames.length, viewMode] }
  );

  const platforms = ["all", ...Array.from(new Set(games.map((game) => game.platform)))];

  return (
    <section ref={root} className="space-y-6">
      <div className="rounded-xl border border-border bg-[var(--bg-card)]/80 p-4 shadow-2xl backdrop-blur">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0">
            <h2 className="text-2xl font-semibold">游戏库</h2>
            <p className="mt-1 text-sm text-text-secondary">
              当前显示 {filteredGames.length} / {games.length} 款游戏
            </p>
          </div>
          <div className="grid gap-2 md:grid-cols-3 xl:min-w-[820px] xl:grid-cols-[1.4fr_repeat(5,auto)]">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索游戏"
              className="rounded-md border border-border bg-[var(--bg-input)] px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-text-muted focus:border-neon-cyan"
            />
            <select value={platform} onChange={(event) => setPlatform(event.target.value)} className="rounded-md border border-border bg-[var(--bg-input)] px-3 py-2 text-sm text-foreground outline-none focus:border-neon-cyan">
              {platforms.map((item) => (
                <option key={item} value={item}>{item === "all" ? "全部平台" : item}</option>
              ))}
            </select>
            <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-md border border-border bg-[var(--bg-input)] px-3 py-2 text-sm text-foreground outline-none focus:border-neon-cyan">
              <option value="all">全部状态</option>
              {GAME_STATUSES.map((item) => (
                <option key={item} value={item}>{STATUS_LABELS[item]}</option>
              ))}
            </select>
            <select value={ratingFilter} onChange={(event) => setRatingFilter(event.target.value as RatingFilter)} className="rounded-md border border-border bg-[var(--bg-input)] px-3 py-2 text-sm text-foreground outline-none focus:border-neon-cyan">
              <option value="all">全部评分</option>
              <option value="rated">已评分</option>
              <option value="unrated">未评分</option>
            </select>
            <select value={reviewFilter} onChange={(event) => setReviewFilter(event.target.value as ReviewFilter)} className="rounded-md border border-border bg-[var(--bg-input)] px-3 py-2 text-sm text-foreground outline-none focus:border-neon-cyan">
              <option value="all">全部评测</option>
              <option value="reviewed">已评测</option>
              <option value="unreviewed">未评测</option>
            </select>
            <select value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)} className="rounded-md border border-border bg-[var(--bg-input)] px-3 py-2 text-sm text-foreground outline-none focus:border-neon-cyan">
              <option value="playtime">最长游玩</option>
              <option value="rating">最高评分</option>
              <option value="recent">最近更新</option>
              <option value="reviewed">评测优先</option>
              <option value="title">标题</option>
            </select>
          </div>
        </div>
        <div className="mt-4 hidden rounded-md border border-border p-1 md:inline-flex">
          {(["grid", "table"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setViewMode(mode)}
              className={`rounded px-4 py-2 text-xs font-semibold transition-colors ${
                viewMode === mode ? "bg-neon-cyan text-black" : "text-text-secondary hover:text-foreground"
              }`}
            >
              {mode === "grid" ? "封面墙" : "表格"}
            </button>
          ))}
        </div>
      </div>

      {viewMode === "table" ? (
        <div className="hidden overflow-hidden rounded-xl border border-border bg-[var(--bg-card)] md:block">
          <div className="grid grid-cols-[1fr_120px_110px_120px_130px_90px] gap-4 border-b border-border px-5 py-3 text-xs uppercase tracking-[0.18em] text-text-muted">
            <span>游戏</span>
            <span>平台</span>
            <span>状态</span>
            <span>时长</span>
            <span>评分</span>
            <span>动作</span>
          </div>
          {filteredGames.map((game) => (
            <div key={game.id} data-library-card className="grid grid-cols-[1fr_120px_110px_120px_130px_90px] gap-4 border-b border-border/60 px-5 py-4 transition-colors hover:bg-white/[0.03]">
              <div className="flex min-w-0 items-center gap-3">
                <GameCover src={game.coverUrl} title={game.title} className="h-12 w-20 shrink-0" />
                <span className="truncate font-medium">{game.title}</span>
              </div>
              <div className="flex items-center"><PlatformBadge platform={game.platform} /></div>
              <div className="flex items-center text-xs text-text-secondary">{statusLabel(game.status)}</div>
              <div className={`flex items-center font-mono text-sm font-semibold ${playtimeColorClass(game.playtimeMinutes)}`}>{minutesToHours(game.playtimeMinutes)}</div>
              <div className="flex items-center"><QuickRating gameId={game.id} initialRating={game.userRating} compact /></div>
              <div className="flex items-center"><Link href={`/games/${game.id}`} className="text-sm text-neon-cyan hover:underline">查看</Link></div>
            </div>
          ))}
        </div>
      ) : null}

      <div className={`${viewMode === "table" ? "md:hidden" : ""} library-grid grid gap-4 sm:grid-cols-2 xl:grid-cols-3`}>
        {filteredGames.map((game, index) => (
          <article
            key={game.id}
            data-library-card
            className={`group overflow-hidden rounded-xl border border-border bg-[var(--bg-card)] transition-all duration-300 hover:-translate-y-1 hover:border-neon-cyan/45 hover:shadow-[var(--glow-cyan)] ${
              index % 10 === 0 ? "sm:col-span-2" : ""
            }`}
          >
            <Link href={`/games/${game.id}`} className="block">
              <GameCover src={game.coverUrl} title={game.title} className={index % 10 === 0 ? "h-64" : "h-48"} priority={index < 2} />
            </Link>
            <div className="space-y-4 p-4">
              <div className="flex items-start justify-between gap-3">
                <Link href={`/games/${game.id}`} className="line-clamp-2 text-lg font-semibold leading-tight hover:text-neon-cyan">
                  {game.title}
                </Link>
                <PlatformBadge platform={game.platform} />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                <span className={`font-mono font-semibold ${playtimeColorClass(game.playtimeMinutes)}`}>{minutesToHours(game.playtimeMinutes)}</span>
                <span className="rounded border border-border bg-black/20 px-2 py-1 text-xs text-text-secondary">{statusLabel(game.status)}</span>
                {game.hasReview && <span className="rounded border border-neon-cyan/30 bg-neon-cyan/10 px-2 py-1 text-xs text-neon-cyan">有评测</span>}
              </div>
              <div className="flex items-center justify-between gap-3">
                <QuickRating gameId={game.id} initialRating={game.userRating} compact />
                <StatusQuickSwitch gameId={game.id} initialStatus={game.status} compact />
              </div>
            </div>
          </article>
        ))}
      </div>

      {filteredGames.length === 0 && (
        <div className="rounded-xl border border-border bg-[var(--bg-card)] p-12 text-center text-text-secondary">
          没有匹配的游戏。
        </div>
      )}
    </section>
  );
}
