"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GameCover } from "@/components/GameCover";
import { PlatformBadge } from "@/components/PlatformBadge";

export interface ShelfGame {
  id: string;
  title: string;
  platform: string;
  coverUrl: string | null;
  userRating: number | null;
}

export interface ShelfListItem {
  id: string;
  gameId: string;
  position: number;
  note: string | null;
  game: ShelfGame;
}

export interface ShelfList {
  id: string;
  title: string;
  description: string | null;
  ranked: boolean;
  items: ShelfListItem[];
}

export function GameListShelf({
  initialLists,
  games,
  currentGameId,
  title = "私人榜单",
}: {
  initialLists: ShelfList[];
  games: ShelfGame[];
  currentGameId?: string;
  title?: string;
}) {
  const router = useRouter();
  const [lists, setLists] = useState(initialLists);
  const [newList, setNewList] = useState({ title: "", description: "" });
  const [selectedListId, setSelectedListId] = useState(initialLists[0]?.id ?? "");
  const [selectedGameId, setSelectedGameId] = useState(currentGameId ?? games[0]?.id ?? "");
  const [isPending, startTransition] = useTransition();

  const activeList = useMemo(() => lists.find((list) => list.id === selectedListId) ?? lists[0], [lists, selectedListId]);

  const refreshLists = async () => {
    const response = await fetch("/api/lists");
    const data = await response.json();
    setLists(data.lists ?? []);
    if (!selectedListId && data.lists?.[0]?.id) setSelectedListId(data.lists[0].id);
  };

  const createList = () => {
    if (!newList.title.trim()) return;
    startTransition(async () => {
      const response = await fetch("/api/lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newList, ranked: true }),
      });
      const created = await response.json();
      if (!response.ok) return;
      setLists((current) => [{ ...created, items: [] }, ...current]);
      setSelectedListId(created.id);
      setNewList({ title: "", description: "" });
      router.refresh();
    });
  };

  const addItem = () => {
    if (!selectedListId || !selectedGameId) return;
    startTransition(async () => {
      const response = await fetch(`/api/lists/${selectedListId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId: selectedGameId }),
      });
      if (!response.ok) return;
      await refreshLists();
      router.refresh();
    });
  };

  const moveItem = (item: ShelfListItem, direction: -1 | 1) => {
    const list = lists.find((entry) => entry.id === selectedListId);
    if (!list) return;
    const ordered = [...list.items].sort((a, b) => a.position - b.position);
    const index = ordered.findIndex((entry) => entry.id === item.id);
    const swap = ordered[index + direction];
    if (!swap) return;
    startTransition(async () => {
      await Promise.all([
        fetch(`/api/lists/${selectedListId}/items`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ itemId: item.id, position: swap.position }),
        }),
        fetch(`/api/lists/${selectedListId}/items`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ itemId: swap.id, position: item.position }),
        }),
      ]);
      await refreshLists();
      router.refresh();
    });
  };

  const deleteItem = (itemId: string) => {
    if (!selectedListId) return;
    startTransition(async () => {
      await fetch(`/api/lists/${selectedListId}/items`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId }),
      });
      await refreshLists();
      router.refresh();
    });
  };

  return (
    <section className="rounded-xl border border-border bg-[var(--bg-card)] p-5 md:p-7">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-2xl font-semibold">{title}</h2>
        </div>
        <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <input
            value={newList.title}
            onChange={(event) => setNewList((value) => ({ ...value, title: event.target.value }))}
            placeholder="新榜单标题"
            className="rounded-md border border-border bg-[var(--bg-input)] px-3 py-2 text-sm text-foreground outline-none focus:border-neon-cyan"
          />
          <input
            value={newList.description}
            onChange={(event) => setNewList((value) => ({ ...value, description: event.target.value }))}
            placeholder="一句话描述"
            className="rounded-md border border-border bg-[var(--bg-input)] px-3 py-2 text-sm text-foreground outline-none focus:border-neon-cyan"
          />
          <button type="button" onClick={createList} disabled={isPending} className="rounded-md bg-neon-cyan px-4 py-2 text-sm font-semibold text-black disabled:opacity-60">
            创建榜单
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[260px_1fr]">
        <div className="space-y-2">
          {lists.length === 0 && <div className="rounded-lg border border-dashed border-border p-5 text-sm text-text-secondary">还没有榜单。</div>}
          {lists.map((list) => (
            <button
              key={list.id}
              type="button"
              onClick={() => setSelectedListId(list.id)}
              className={`w-full rounded-lg border p-4 text-left transition-colors ${
                activeList?.id === list.id ? "border-neon-cyan bg-neon-cyan/10" : "border-border bg-black/15 hover:border-neon-cyan/40"
              }`}
            >
              <span className="block font-semibold">{list.title}</span>
              <span className="mt-1 block text-xs text-text-secondary">{list.items.length} 款游戏</span>
            </button>
          ))}
        </div>

        <div className="min-w-0 rounded-lg border border-border bg-black/15 p-4">
          {activeList ? (
            <>
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-xl font-semibold">{activeList.title}</h3>
                  {activeList.description && <p className="mt-1 text-sm text-text-secondary">{activeList.description}</p>}
                </div>
                <div className="grid gap-2 sm:grid-cols-[180px_auto]">
                  {!currentGameId && (
                    <select
                      value={selectedGameId}
                      onChange={(event) => setSelectedGameId(event.target.value)}
                      className="rounded-md border border-border bg-[var(--bg-input)] px-3 py-2 text-sm text-foreground outline-none focus:border-neon-cyan"
                    >
                      {games.map((game) => (
                        <option key={game.id} value={game.id}>{game.title}</option>
                      ))}
                    </select>
                  )}
                  <button type="button" onClick={addItem} disabled={isPending} className="rounded-md border border-neon-cyan px-4 py-2 text-sm font-semibold text-neon-cyan hover:bg-neon-cyan hover:text-black disabled:opacity-60">
                    加入当前榜单
                  </button>
                </div>
              </div>

              <div className="mt-5 grid gap-3">
                {activeList.items.map((item, index) => (
                  <article key={item.id} className="group grid gap-3 rounded-lg border border-border bg-[var(--bg-card)] p-3 transition-colors hover:border-neon-cyan/40 md:grid-cols-[44px_88px_1fr_auto] md:items-center">
                    <span className="font-mono text-2xl text-text-muted">{String(index + 1).padStart(2, "0")}</span>
                    <Link href={`/games/${item.game.id}`} className="block">
                      <GameCover src={item.game.coverUrl} title={item.game.title} className="h-24 w-full md:h-16 md:w-24" />
                    </Link>
                    <div className="min-w-0">
                      <Link href={`/games/${item.game.id}`} className="line-clamp-1 font-semibold hover:text-neon-cyan">{item.game.title}</Link>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <PlatformBadge platform={item.game.platform} />
                        {item.game.userRating != null && <span className="font-mono text-xs text-neon-cyan">{item.game.userRating.toFixed(1)}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => moveItem(item, -1)} className="rounded border border-border px-2 py-1 text-xs text-text-secondary hover:border-neon-cyan hover:text-neon-cyan">上移</button>
                      <button type="button" onClick={() => moveItem(item, 1)} className="rounded border border-border px-2 py-1 text-xs text-text-secondary hover:border-neon-cyan hover:text-neon-cyan">下移</button>
                      <button type="button" onClick={() => deleteItem(item.id)} className="rounded border border-border px-2 py-1 text-xs text-[var(--color-error)] hover:border-[var(--color-error)]">移除</button>
                    </div>
                  </article>
                ))}
              </div>
            </>
          ) : (
            <div className="p-8 text-center text-sm text-text-secondary">创建一个榜单后，这里会变成你的私人片单墙。</div>
          )}
        </div>
      </div>
    </section>
  );
}
