import Link from "next/link";
import { notFound } from "next/navigation";
import { GameCover } from "@/components/GameCover";
import { GameListShelf, type ShelfList } from "@/components/GameListShelf";
import { GameLogTimeline, type GameLogItem } from "@/components/GameLogTimeline";
import { PlatformBadge } from "@/components/PlatformBadge";
import { QuickRating } from "@/components/QuickRating";
import { StatusQuickSwitch } from "@/components/StatusQuickSwitch";
import { statusLabel } from "@/lib/gameStatus";
import { listGameLists } from "@/lib/repositories/activityRepository";
import { getGame } from "@/lib/repositories/gameRepository";
import { minutesToHours } from "@/lib/utils";

function stripHtml(value: string | null | undefined) {
  return value?.replace(/<[^>]*>/g, "").trim() ?? "";
}

function serializeLog(log: {
  id: string;
  playedAt: Date;
  minutes: number;
  note: string | null;
  tags: string | null;
}): GameLogItem {
  return {
    id: log.id,
    playedAt: log.playedAt.toISOString(),
    minutes: log.minutes,
    note: log.note,
    tags: log.tags,
  };
}

function serializeShelfList(list: Awaited<ReturnType<typeof listGameLists>>[number]): ShelfList {
  return {
    id: list.id,
    title: list.title,
    description: list.description,
    ranked: list.ranked,
    items: list.items.map((item) => ({
      id: item.id,
      gameId: item.gameId,
      position: item.position,
      note: item.note,
      game: {
        id: item.game.id,
        title: item.game.title,
        platform: item.game.platform,
        coverUrl: item.game.coverUrl,
        userRating: item.game.userRating,
      },
    })),
  };
}

export default async function GameDetailPage(props: PageProps<"/games/[id]">) {
  const { id } = await props.params;
  const [game, lists] = await Promise.all([getGame(id), listGameLists()]);
  if (!game) notFound();

  const reviewText = stripHtml(game.reviewRichText);
  const hasReview = Boolean(reviewText);
  const tags = game.tags?.split(",").map((tag) => tag.trim()).filter(Boolean) ?? [];
  const serializedLogs = game.logs.map(serializeLog);
  const shelfLists = lists.map(serializeShelfList);
  const currentGame = [{
    id: game.id,
    title: game.title,
    platform: game.platform,
    coverUrl: game.coverUrl,
    userRating: game.userRating,
  }];

  return (
    <div className="min-h-screen px-4 pt-20 md:px-8 md:pt-8">
      <div className="mx-auto max-w-6xl space-y-10 pb-24">
        <nav className="flex items-center gap-2 text-sm text-text-secondary">
          <Link href="/dashboard" className="hover:text-neon-cyan">资料库</Link>
          <span>/</span>
          <span className="truncate text-foreground">{game.title}</span>
        </nav>

        <section className="relative overflow-hidden rounded-2xl border border-border bg-[var(--bg-secondary)]">
          <div className="absolute inset-0 opacity-25 blur-2xl">
            <GameCover src={game.coverUrl} title={game.title} className="h-full w-full rounded-none border-0" priority />
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-black/40" />
          <div className="relative grid gap-0 lg:grid-cols-[0.82fr_1.18fr]">
            <div className="group p-5 md:p-8">
              <GameCover src={game.coverUrl} title={game.title} className="h-[32rem] rounded-xl" priority />
            </div>
            <div className="flex flex-col justify-end p-6 md:p-10">
              <div className="flex flex-wrap items-center gap-3">
                <PlatformBadge platform={game.platform} />
                <span className="rounded border border-border bg-black/30 px-2.5 py-1 text-xs text-text-secondary">{statusLabel(game.status)}</span>
              </div>
              <h1 className="mt-6 max-w-4xl text-4xl font-semibold leading-tight tracking-tight md:text-6xl">{game.title}</h1>
              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                <Fact label="时长" value={minutesToHours(game.playtimeMinutes)} />
                <div className="rounded-lg border border-border bg-black/25 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-text-muted">评分</p>
                  <div className="mt-3"><QuickRating gameId={game.id} initialRating={game.userRating} /></div>
                </div>
                <Fact label="日志" value={`${game.logs.length} 条`} />
              </div>
              <div className="mt-7">
                <StatusQuickSwitch gameId={game.id} initialStatus={game.status} />
              </div>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href={`/admin/games/${game.id}`} className="rounded-md bg-neon-cyan px-5 py-3 text-sm font-semibold text-black">
                  编辑记录
                </Link>
                <Link href="/dashboard#library" className="rounded-md border border-border bg-black/30 px-5 py-3 text-sm font-semibold text-foreground hover:border-neon-cyan hover:text-neon-cyan">
                  返回资料库
                </Link>
              </div>
            </div>
          </div>
        </section>

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span key={tag} className="rounded border border-border bg-black/15 px-3 py-1 text-xs text-text-secondary">{tag}</span>
            ))}
          </div>
        )}

        <GameLogTimeline gameId={game.id} initialLogs={serializedLogs} />

        <section className="rounded-xl border border-border bg-[var(--bg-card)] p-6 md:p-10">
          <div className="mb-8 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-3xl font-semibold">私人评测</h2>
              <p className="mt-2 text-sm text-text-secondary">写给以后自己的判断和回忆。</p>
            </div>
            {!hasReview && (
              <Link href={`/admin/games/${game.id}`} className="hidden rounded-md border border-neon-cyan px-4 py-2 text-sm text-neon-cyan hover:bg-neon-cyan hover:text-black sm:inline-flex">
                补写
              </Link>
            )}
          </div>
          {hasReview ? (
            <div className="prose prose-invert max-w-none text-foreground/90" dangerouslySetInnerHTML={{ __html: game.reviewRichText! }} />
          ) : (
            <div className="rounded-lg border border-dashed border-border p-10 text-center text-text-secondary">
              还没有评测。可以先写一段短评，再慢慢补成完整记录。
            </div>
          )}
        </section>

        <GameListShelf initialLists={shelfLists} games={currentGame} currentGameId={game.id} title="所属榜单" />
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-black/25 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-text-muted">{label}</p>
      <p className="mt-3 font-mono text-xl font-semibold">{value}</p>
    </div>
  );
}
