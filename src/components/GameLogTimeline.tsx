"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { minutesToHours } from "@/lib/utils";

export interface GameLogItem {
  id: string;
  playedAt: string;
  minutes: number;
  note: string | null;
  tags: string | null;
}

function toLocalInput(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function formatLogDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function GameLogTimeline({ gameId, initialLogs }: { gameId: string; initialLogs: GameLogItem[] }) {
  const router = useRouter();
  const [logs, setLogs] = useState(initialLogs);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    playedAt: toLocalInput(new Date().toISOString()),
    minutes: 60,
    note: "",
    tags: "",
  });
  const [isPending, startTransition] = useTransition();

  const totalMinutes = useMemo(() => logs.reduce((sum, log) => sum + log.minutes, 0), [logs]);

  const resetDraft = () => {
    setEditingId(null);
    setDraft({ playedAt: toLocalInput(new Date().toISOString()), minutes: 60, note: "", tags: "" });
  };

  const submit = () => {
    startTransition(async () => {
      const endpoint = editingId ? `/api/logs/${editingId}` : `/api/games/${gameId}/logs`;
      const response = await fetch(endpoint, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const saved = await response.json();
      if (!response.ok) return;
      setLogs((current) => editingId
        ? current.map((item) => (item.id === editingId ? saved : item))
        : [saved, ...current]);
      resetDraft();
      router.refresh();
    });
  };

  const edit = (log: GameLogItem) => {
    setEditingId(log.id);
    setDraft({
      playedAt: toLocalInput(log.playedAt),
      minutes: log.minutes,
      note: log.note ?? "",
      tags: log.tags ?? "",
    });
  };

  const remove = (id: string) => {
    startTransition(async () => {
      const response = await fetch(`/api/logs/${id}`, { method: "DELETE" });
      if (!response.ok) return;
      setLogs((current) => current.filter((log) => log.id !== id));
      router.refresh();
    });
  };

  return (
    <section className="rounded-xl border border-border bg-[var(--bg-card)] p-5 md:p-7">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold">游玩日志</h2>
          <p className="mt-2 text-sm text-text-secondary">
            {logs.length ? `${logs.length} 条记录，手动补充 ${minutesToHours(totalMinutes)}` : "记录每一次回到这款游戏的理由。"}
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-3 rounded-lg border border-border bg-black/15 p-4 md:grid-cols-[180px_120px_1fr_160px]">
        <input
          type="datetime-local"
          value={draft.playedAt}
          onChange={(event) => setDraft((value) => ({ ...value, playedAt: event.target.value }))}
          className="rounded-md border border-border bg-[var(--bg-input)] px-3 py-2 text-sm text-foreground outline-none focus:border-neon-cyan"
        />
        <input
          type="number"
          min="0"
          value={draft.minutes}
          onChange={(event) => setDraft((value) => ({ ...value, minutes: Number(event.target.value) }))}
          className="rounded-md border border-border bg-[var(--bg-input)] px-3 py-2 text-sm text-foreground outline-none focus:border-neon-cyan"
          placeholder="分钟"
        />
        <input
          value={draft.note}
          onChange={(event) => setDraft((value) => ({ ...value, note: event.target.value }))}
          className="rounded-md border border-border bg-[var(--bg-input)] px-3 py-2 text-sm text-foreground outline-none focus:border-neon-cyan"
          placeholder="这次玩了什么，有什么感觉"
        />
        <button
          type="button"
          onClick={submit}
          disabled={isPending}
          className="rounded-md bg-neon-cyan px-4 py-2 text-sm font-semibold text-black disabled:opacity-60"
        >
          {editingId ? "保存日志" : "添加日志"}
        </button>
      </div>

      {editingId && (
        <button type="button" onClick={resetDraft} className="mt-3 text-sm text-text-muted hover:text-foreground">
          取消编辑
        </button>
      )}

      <div className="mt-6 space-y-3">
        {logs.map((log) => (
          <article key={log.id} className="group rounded-lg border border-border bg-black/15 p-4 transition-colors hover:border-neon-cyan/40">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="font-mono text-sm text-neon-cyan">{formatLogDate(log.playedAt)}</p>
                <p className="mt-2 text-sm leading-6 text-foreground/85">{log.note || "没有写备注，但这次记录已经留下了。"}</p>
                {log.tags && <p className="mt-2 text-xs text-text-muted">{log.tags}</p>}
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="font-mono text-sm text-text-secondary">{minutesToHours(log.minutes)}</span>
                <button type="button" onClick={() => edit(log)} className="text-xs text-neon-cyan hover:underline">
                  编辑
                </button>
                <button type="button" onClick={() => remove(log.id)} className="text-xs text-[var(--color-error)] hover:underline">
                  删除
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
