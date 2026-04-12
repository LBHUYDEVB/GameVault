"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { PlatformBadge } from "@/components/PlatformBadge";
import { RatingDisplay } from "@/components/RatingDisplay";
import { minutesToHours } from "@/lib/utils";

interface Game {
  id: string;
  title: string;
  platform: string;
  playtimeMinutes: number;
  userRating: number | null;
  reviewRichText: string | null;
  coverUrl: string | null;
  status: string;
  tags: string | null;
  lastSyncedAt: string | null;
  updatedAt: string;
}

export default function GameDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/games/${id}`)
      .then((r) => r.json())
      .then(setGame)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[50vh]">
        <span className="font-mono text-text-muted animate-pulse">▓ LOADING... ▓</span>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="p-8 text-center">
        <p className="text-text-muted font-mono">游戏不存在</p>
        <button onClick={() => router.back()} className="mt-4 text-neon-cyan font-mono text-sm hover:underline">
          返回
        </button>
      </div>
    );
  }

  const hasReview = !!game.reviewRichText && game.reviewRichText.replace(/<[^>]*>/g, "").trim().length > 0;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-text-secondary font-mono mb-6">
        <Link href="/dashboard" className="hover:text-neon-cyan transition-colors">DASHBOARD</Link>
        <span className="text-text-muted">/</span>
        <span className="text-foreground">{game.title}</span>
      </div>

      {/* Hero */}
      <div className="neon-card p-6 mb-6">
        <div className="flex items-start gap-6">
          {game.coverUrl && (
            <img
              src={game.coverUrl}
              alt={game.title}
              className="w-48 rounded-md border border-border object-cover"
            />
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold font-mono tracking-wide mb-3">{game.title}</h1>
            <div className="flex flex-wrap items-center gap-4 mb-4">
              <PlatformBadge platform={game.platform} />
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-text-secondary font-mono uppercase">时长</span>
                <span className="font-mono font-bold text-neon-cyan">{minutesToHours(game.playtimeMinutes)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-text-secondary font-mono uppercase">评分</span>
                <RatingDisplay rating={game.userRating} />
              </div>
            </div>

            {game.tags && (
              <div className="flex flex-wrap gap-1.5 mb-4">
                {game.tags.split(",").map((tag) => (
                  <span key={tag} className="px-2 py-0.5 rounded text-xs font-mono bg-white/5 border border-border text-text-secondary">
                    {tag.trim()}
                  </span>
                ))}
              </div>
            )}

            {game.lastSyncedAt && (
              <p className="text-xs text-text-muted font-mono">
                最近同步: {new Date(game.lastSyncedAt).toLocaleString("zh-CN")}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Review Section */}
      <div className="neon-card p-6">
        <h2 className="text-sm font-mono uppercase tracking-widest text-text-secondary mb-4 flex items-center gap-2">
          <span className="text-neon-magenta">▸</span> 详细评测
        </h2>

        {hasReview ? (
          <div
            className="prose prose-invert prose-sm max-w-none text-foreground/90 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: game.reviewRichText! }}
          />
        ) : (
          <div className="text-center py-8">
            <p className="text-text-muted font-mono text-sm mb-3">░░ 暂无评测内容 ░░</p>
            <Link
              href={`/admin/games/${game.id}`}
              className="inline-flex items-center px-4 py-2 rounded-md border border-neon-magenta/40 text-neon-magenta text-sm font-mono hover:bg-neon-magenta/10 transition-colors"
            >
              撰写评测
            </Link>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-between mt-6">
        <button onClick={() => router.back()} className="text-sm font-mono text-text-secondary hover:text-foreground transition-colors">
          ← 返回
        </button>
        <Link
          href={`/admin/games/${game.id}`}
          className="inline-flex items-center px-4 py-2 rounded-md border border-neon-cyan/40 text-neon-cyan text-sm font-mono hover:bg-neon-cyan/10 transition-colors"
        >
          编辑
        </Link>
      </div>
    </div>
  );
}
