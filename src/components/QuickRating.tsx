"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

const scores = Array.from({ length: 20 }, (_, index) => (index + 1) / 2);

export function QuickRating({
  gameId,
  initialRating,
  compact = false,
  onChange,
}: {
  gameId: string;
  initialRating: number | null;
  compact?: boolean;
  onChange?: (rating: number | null) => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(initialRating);
  const [isPending, startTransition] = useTransition();

  const saveRating = (score: number | null) => {
    setRating(score);
    onChange?.(score);
    setOpen(false);
    startTransition(async () => {
      await fetch(`/api/games/${gameId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userRating: score }),
      });
      router.refresh();
    });
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={`rounded-md border border-border bg-black/20 font-mono transition-colors hover:border-neon-cyan hover:text-neon-cyan ${
          compact ? "px-2 py-1 text-xs" : "px-3 py-2 text-sm"
        } ${rating == null ? "text-text-muted" : "text-foreground"}`}
      >
        {isPending ? "保存中" : rating == null ? "未评分" : rating.toFixed(1)}
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+0.5rem)] z-30 w-64 rounded-lg border border-border bg-[var(--bg-secondary)] p-3 shadow-2xl">
          <div className="grid grid-cols-5 gap-1.5">
            {scores.map((score) => (
              <button
                key={score}
                type="button"
                onClick={() => saveRating(score)}
                className={`rounded border px-2 py-1.5 font-mono text-xs transition-colors ${
                  rating === score
                    ? "border-neon-cyan bg-neon-cyan text-black"
                    : "border-border text-text-secondary hover:border-neon-cyan hover:text-foreground"
                }`}
              >
                {score.toFixed(1)}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => saveRating(null)}
            className="mt-2 w-full rounded border border-border px-3 py-2 text-xs text-text-secondary hover:border-neon-magenta hover:text-neon-magenta"
          >
            清除评分
          </button>
        </div>
      )}
    </div>
  );
}
