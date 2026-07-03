"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { RichTextEditor } from "@/components/RichTextEditor";
import { StatusQuickSwitch } from "@/components/StatusQuickSwitch";

const scores = Array.from({ length: 20 }, (_, index) => (index + 1) / 2);

export function EditGameForm({
  gameId,
  initialRating,
  initialReview,
  initialStatus,
}: {
  gameId: string;
  initialRating: number | null;
  initialReview: string;
  initialStatus: string;
}) {
  const router = useRouter();
  const [rating, setRating] = useState<number | null>(initialRating);
  const [review, setReview] = useState(initialReview);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  const save = () => {
    startTransition(async () => {
      await fetch(`/api/games/${gameId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userRating: rating,
          reviewRichText: review.trim() ? review : null,
        }),
      });
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 1800);
    });
  };

  return (
    <section className="space-y-6">
      <div className="rounded-xl border border-border bg-[var(--bg-card)] p-5 md:p-7">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold">评分</h2>
            <p className="mt-1 text-sm text-text-secondary">用 0.5 分粒度快速定调。</p>
          </div>
          <span className="font-mono text-3xl text-neon-cyan">{rating == null ? "未评分" : rating.toFixed(1)}</span>
        </div>
        <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
          {scores.map((score) => (
            <button
              key={score}
              type="button"
              onClick={() => setRating(score)}
              className={`rounded-md border px-2 py-2 font-mono text-sm transition-colors ${
                rating === score
                  ? "border-neon-cyan bg-neon-cyan text-black"
                  : "border-border text-text-secondary hover:border-neon-cyan hover:text-foreground"
              }`}
            >
              {score.toFixed(1)}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => setRating(null)} className="mt-4 text-sm text-text-muted hover:text-neon-magenta">
          清除评分
        </button>
      </div>

      <div className="rounded-xl border border-border bg-[var(--bg-card)] p-5 md:p-7">
        <h2 className="text-2xl font-semibold">游玩状态</h2>
        <p className="mt-1 text-sm text-text-secondary">把它放到正在玩、已通关、搁置或愿望单里。</p>
        <div className="mt-5">
          <StatusQuickSwitch gameId={gameId} initialStatus={initialStatus} />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-[var(--bg-card)] p-5 md:p-7">
        <h2 className="text-2xl font-semibold">详细评测</h2>
        <p className="mt-1 text-sm text-text-secondary">记录体验、系统、画面、情绪和以后会不会重玩。</p>
        <div className="mt-5">
          <RichTextEditor content={review} onChange={setReview} />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <button type="button" onClick={() => router.back()} className="text-sm text-text-secondary hover:text-foreground">
          返回
        </button>
        <div className="flex items-center gap-3">
          {saved && <span className="text-sm text-[var(--color-success)]">已保存</span>}
          <button
            type="button"
            onClick={save}
            disabled={isPending}
            className="rounded-md bg-neon-cyan px-6 py-3 text-sm font-semibold text-black disabled:opacity-60"
          >
            {isPending ? "保存中" : "保存记录"}
          </button>
        </div>
      </div>
    </section>
  );
}
