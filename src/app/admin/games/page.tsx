"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
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
}

export default function AdminGamesPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newGame, setNewGame] = useState({ title: "", platform: "steam", playtimeMinutes: 0 });
  const [search, setSearch] = useState("");

  const fetchGames = async () => {
    setLoading(true);
    const res = await fetch("/api/games");
    const json = await res.json();
    setGames(json.games);
    setLoading(false);
  };

  useEffect(() => { fetchGames(); }, []);

  const handleAdd = async () => {
    if (!newGame.title.trim()) return;
    await fetch("/api/games", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newGame),
    });
    setNewGame({ title: "", platform: "steam", playtimeMinutes: 0 });
    setShowAddForm(false);
    fetchGames();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定删除该游戏？")) return;
    await fetch(`/api/games/${id}`, { method: "DELETE" });
    fetchGames();
  };

  const filteredGames = useMemo(() => {
    if (!search.trim()) return games;
    return games.filter((g) => fuzzyMatch(g.title, search));
  }, [games, search]);

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold font-mono tracking-wide neon-text">管理游戏</h1>
          <p className="text-text-secondary text-sm mt-1">新增、编辑、删除游戏记录</p>
        </div>
        <button
          onClick={() => setShowAddForm((v) => !v)}
          className="px-4 py-2 rounded-md border border-neon-cyan/50 text-neon-cyan text-sm font-mono hover:bg-neon-cyan/10 transition-colors"
        >
          {showAddForm ? "取消" : "+ 手动添加"}
        </button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="neon-card p-5 mb-6">
          <h3 className="text-sm font-mono uppercase tracking-widest text-text-secondary mb-4">手动添加游戏</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="text-xs font-mono text-text-secondary block mb-1">游戏名称</label>
              <input
                value={newGame.title}
                onChange={(e) => setNewGame((g) => ({ ...g, title: e.target.value }))}
                className="w-full px-3 py-2 rounded-md border border-border bg-[var(--bg-input)] text-foreground font-mono text-sm focus:border-neon-cyan focus:outline-none transition-colors"
                placeholder="输入游戏名称..."
              />
            </div>
            <div>
              <label className="text-xs font-mono text-text-secondary block mb-1">平台</label>
              <select
                value={newGame.platform}
                onChange={(e) => setNewGame((g) => ({ ...g, platform: e.target.value }))}
                className="w-full px-3 py-2 rounded-md border border-border bg-[var(--bg-input)] text-foreground font-mono text-sm focus:border-neon-cyan focus:outline-none"
              >
                <option value="steam">Steam</option>
                <option value="nintendo">Nintendo</option>
                <option value="playstation">PlayStation</option>
                <option value="other">其他</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-mono text-text-secondary block mb-1">游玩时长 (分钟)</label>
              <input
                type="number"
                value={newGame.playtimeMinutes}
                onChange={(e) => setNewGame((g) => ({ ...g, playtimeMinutes: Number(e.target.value) }))}
                className="w-full px-3 py-2 rounded-md border border-border bg-[var(--bg-input)] text-foreground font-mono text-sm focus:border-neon-cyan focus:outline-none"
              />
            </div>
          </div>
          <button
            onClick={handleAdd}
            className="px-5 py-2 rounded-md bg-neon-cyan/15 border border-neon-cyan/50 text-neon-cyan text-sm font-mono hover:bg-neon-cyan/25 transition-colors"
          >
            确认添加
          </button>
        </div>
      )}

      {/* Search Bar */}
      <div className="mb-4 relative">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted text-sm pointer-events-none">⌕</span>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜索游戏名称..."
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

      {search && (
        <p className="text-xs text-text-secondary font-mono mb-3">
          找到 <span className="text-neon-cyan">{filteredGames.length}</span> / {games.length} 款游戏
        </p>
      )}

      {/* Game List */}
      <div className="neon-card overflow-hidden">
        <div className="grid grid-cols-[1fr_100px_100px_80px_120px] gap-4 px-5 py-3 border-b border-border text-xs font-mono uppercase tracking-wider text-text-secondary">
          <span>游戏</span>
          <span>平台</span>
          <span>时长</span>
          <span>评分</span>
          <span>操作</span>
        </div>

        {loading ? (
          <div className="px-5 py-12 text-center text-text-muted font-mono text-sm animate-pulse">
            ▓ LOADING... ▓
          </div>
        ) : filteredGames.length === 0 ? (
          <div className="px-5 py-12 text-center text-text-muted font-mono text-sm">
            {search ? `░░ 没有匹配「${search}」的游戏 ░░` : "░░ 暂无游戏 ░░"}
          </div>
        ) : (
          filteredGames.map((game) => (
            <div
              key={game.id}
              className="grid grid-cols-[1fr_100px_100px_80px_120px] gap-4 px-5 py-3 border-b border-border/50 hover:bg-card-hover transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                {game.coverUrl && (
                  <img src={game.coverUrl} alt="" className="w-8 h-8 rounded object-cover border border-border shrink-0" />
                )}
                <span className="truncate text-sm">{game.title}</span>
              </div>
              <div className="flex items-center"><PlatformBadge platform={game.platform} /></div>
              <div className={`flex items-center font-mono text-sm font-semibold ${playtimeColorClass(game.playtimeMinutes)}`}>
                {minutesToHours(game.playtimeMinutes)}
              </div>
              <div className="flex items-center"><RatingDisplay rating={game.userRating} /></div>
              <div className="flex items-center gap-3">
                <Link href={`/admin/games/${game.id}`} className="text-xs font-mono text-neon-cyan hover:underline">
                  编辑
                </Link>
                <button onClick={() => handleDelete(game.id)} className="text-xs font-mono text-neon-magenta hover:underline">
                  删除
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
