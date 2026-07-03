"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { GAME_STATUSES, normalizeGameStatus, STATUS_DESCRIPTIONS, STATUS_LABELS, type GameStatus } from "@/lib/gameStatus";

export function StatusQuickSwitch({
  gameId,
  initialStatus,
  compact = false,
}: {
  gameId: string;
  initialStatus: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<GameStatus>(normalizeGameStatus(initialStatus));
  const [isPending, startTransition] = useTransition();

  const save = (nextStatus: GameStatus) => {
    setStatus(nextStatus);
    startTransition(async () => {
      await fetch(`/api/games/${gameId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      router.refresh();
    });
  };

  return (
    <div className={compact ? "flex flex-wrap gap-1.5" : "grid gap-2 sm:grid-cols-4"}>
      {GAME_STATUSES.map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => save(item)}
          disabled={isPending}
          title={STATUS_DESCRIPTIONS[item]}
          className={`rounded-md border px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-60 ${
            status === item
              ? "border-neon-cyan bg-neon-cyan text-black"
              : "border-border bg-black/20 text-text-secondary hover:border-neon-cyan hover:text-foreground"
          }`}
        >
          {STATUS_LABELS[item]}
        </button>
      ))}
    </div>
  );
}
