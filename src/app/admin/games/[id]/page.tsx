"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { PlatformBadge } from "@/components/PlatformBadge";
import { minutesToHours } from "@/lib/utils";
import { RichTextEditor } from "@/components/RichTextEditor";

interface Game {
  id: string;
  title: string;
  platform: string;
  playtimeMinutes: number;
  userRating: number | null;
  reviewRichText: string | null;
  coverUrl: string | null;
}

export default function EditGamePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [game, setGame] = useState<Game | null>(null);
  const [rating, setRating] = useState<number>(0);
  const [reviewContent, setReviewContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/games/${id}`)
      .then((r) => r.json())
      .then((data: Game) => {
        setGame(data);
        setRating(data.userRating ?? 0);
        setReviewContent(data.reviewRichText ?? "");
        setLoading(false);
      });
  }, [id]);

  const handleSave = async () => {
    setSaving(true);
    await fetch(`/api/games/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userRating: rating || null,
        reviewRichText: reviewContent || null,
      }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[50vh]">
        <span className="font-mono text-text-muted animate-pulse">▓ LOADING... ▓</span>
      </div>
    );
  }

  if (!game) return null;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-text-secondary font-mono mb-6">
        <Link href="/admin/games" className="hover:text-neon-cyan transition-colors">管理游戏</Link>
        <span className="text-text-muted">/</span>
        <span className="text-foreground">编辑</span>
      </div>

      {/* Game Info */}
      <div className="neon-card p-5 mb-6">
        <div className="flex items-center gap-4">
          {game.coverUrl && (
            <img src={game.coverUrl} alt="" className="w-20 h-20 rounded-md border border-border object-cover" />
          )}
          <div>
            <h1 className="text-xl font-bold font-mono">{game.title}</h1>
            <div className="flex items-center gap-3 mt-2">
              <PlatformBadge platform={game.platform} />
              <span className="font-mono text-sm text-text-secondary">{minutesToHours(game.playtimeMinutes)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Rating */}
      <div className="neon-card p-5 mb-6">
        <h2 className="text-sm font-mono uppercase tracking-widest text-text-secondary mb-4">
          <span className="text-neon-cyan">▸</span> 评分
        </h2>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min="0"
            max="10"
            step="0.5"
            value={rating}
            onChange={(e) => setRating(Number(e.target.value))}
            className="flex-1 accent-[var(--neon-cyan)]"
          />
          <span className="font-mono text-2xl font-bold text-neon-cyan w-16 text-right">
            {rating > 0 ? rating.toFixed(1) : "—"}
          </span>
        </div>
        <div className="flex justify-between mt-2 text-xs text-text-muted font-mono">
          <span>0</span>
          <span>5</span>
          <span>10</span>
        </div>
      </div>

      {/* Review Editor */}
      <div className="neon-card p-5 mb-6">
        <h2 className="text-sm font-mono uppercase tracking-widest text-text-secondary mb-4">
          <span className="text-neon-magenta">▸</span> 详细评测
        </h2>
        <RichTextEditor content={reviewContent} onChange={setReviewContent} />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <button onClick={() => router.back()} className="text-sm font-mono text-text-secondary hover:text-foreground transition-colors">
          ← 返回
        </button>
        <div className="flex items-center gap-3">
          {saved && (
            <span className="text-sm font-mono text-[var(--color-success)] animate-pulse">
              ✓ 已保存
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 rounded-md bg-neon-cyan/15 border border-neon-cyan/50 text-neon-cyan font-mono text-sm hover:bg-neon-cyan/25 transition-all disabled:opacity-50"
          >
            {saving ? "保存中..." : "保存"}
          </button>
        </div>
      </div>
    </div>
  );
}
