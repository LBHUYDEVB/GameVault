import Link from "next/link";
import { CoverMarquee } from "@/components/CoverMarquee";
import { GameCover } from "@/components/GameCover";
import { GameLibraryView, type LibraryGame } from "@/components/GameLibraryView";
import { GameListShelf, type ShelfGame, type ShelfList } from "@/components/GameListShelf";
import { PlatformBadge } from "@/components/PlatformBadge";
import { ProfileMotion } from "@/components/ProfileMotion";
import { QuickRating } from "@/components/QuickRating";
import { prisma } from "@/lib/db";
import { statusLabel } from "@/lib/gameStatus";
import { getIntegrationStatuses } from "@/lib/integrations/statusService";
import { listGameLists } from "@/lib/repositories/activityRepository";
import { minutesToHours } from "@/lib/utils";

export const dynamic = "force-dynamic";

function hasReview(value: string | null) {
  return Boolean(value?.replace(/<[^>]*>/g, "").trim());
}

function serializeGame(game: {
  id: string;
  title: string;
  platform: string;
  status: string;
  playtimeMinutes: number;
  userRating: number | null;
  reviewRichText: string | null;
  coverUrl: string | null;
  lastSyncedAt: Date | null;
  updatedAt: Date;
}): LibraryGame {
  return {
    id: game.id,
    title: game.title,
    platform: game.platform,
    status: game.status,
    playtimeMinutes: game.playtimeMinutes,
    userRating: game.userRating,
    hasReview: hasReview(game.reviewRichText),
    coverUrl: game.coverUrl,
    lastSyncedAt: game.lastSyncedAt?.toISOString() ?? null,
    updatedAt: game.updatedAt.toISOString(),
  };
}

function serializeShelfGame(game: {
  id: string;
  title: string;
  platform: string;
  coverUrl: string | null;
  userRating: number | null;
}): ShelfGame {
  return {
    id: game.id,
    title: game.title,
    platform: game.platform,
    coverUrl: game.coverUrl,
    userRating: game.userRating,
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
      game: serializeShelfGame(item.game),
    })),
  };
}

function formatDate(value: string | Date | null | undefined) {
  if (!value) return "尚未同步";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default async function DashboardPage() {
  const [games, accountStatuses, lists] = await Promise.all([
    prisma.game.findMany({ orderBy: { playtimeMinutes: "desc" } }),
    getIntegrationStatuses(),
    listGameLists(),
  ]);

  const serializedGames = games.map(serializeGame);
  const shelfGames = games.map(serializeShelfGame);
  const shelfLists = lists.map(serializeShelfList);
  const ratedGames = games.filter((game) => game.userRating != null);
  const reviewedGames = games.filter((game) => hasReview(game.reviewRichText));
  const unratedGames = games.filter((game) => game.userRating == null).slice(0, 5);
  const recentReviews = [...reviewedGames].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()).slice(0, 4);
  const favoriteGames = [...ratedGames].sort((a, b) => (b.userRating ?? 0) - (a.userRating ?? 0) || b.playtimeMinutes - a.playtimeMinutes).slice(0, 5);
  const coverGames = games.filter((game) => game.coverUrl).slice(0, 16);
  const averageRating = ratedGames.length
    ? (ratedGames.reduce((sum, game) => sum + (game.userRating ?? 0), 0) / ratedGames.length).toFixed(1)
    : "未开始";

  return (
    <ProfileMotion>
      <div className="min-h-screen px-4 pt-20 md:px-8 md:pt-8">
        <div className="mx-auto max-w-7xl pb-24">
          <nav className="mx-auto flex w-full max-w-4xl items-center justify-between rounded-full border border-border bg-[var(--bg-secondary)]/78 px-4 py-3 shadow-2xl backdrop-blur-xl">
            <Link href="/dashboard" className="font-mono text-xs font-bold tracking-[0.22em] text-foreground">
              GAME TRACKER
            </Link>
            <div className="hidden items-center gap-2 text-sm text-text-secondary md:flex">
              <Link href="#profile" className="rounded-full px-3 py-1.5 hover:bg-white/5 hover:text-foreground">档案</Link>
              <Link href="#lists" className="rounded-full px-3 py-1.5 hover:bg-white/5 hover:text-foreground">榜单</Link>
              <Link href="#library" className="rounded-full px-3 py-1.5 hover:bg-white/5 hover:text-foreground">游戏库</Link>
            </div>
            <Link href="/settings/integrations" className="rounded-full bg-neon-cyan px-4 py-2 text-xs font-semibold text-black">
              同步中心
            </Link>
          </nav>

          <section id="profile" className="relative overflow-hidden py-24 text-center md:py-36">
            <div className="absolute inset-x-[-20%] top-4 h-96 bg-[radial-gradient(circle_at_center,rgba(110,231,216,0.16),transparent_58%)]" />
            <div
              className="absolute inset-x-0 top-16 mx-auto h-[30rem] max-w-5xl rounded-full opacity-20 blur-3xl"
              style={{ backgroundImage: "url(https://picsum.photos/seed/private-archive/1920/1080)", backgroundSize: "cover" }}
            />
            <div className="relative mx-auto flex max-w-6xl flex-col items-center">
              <h1 className="profile-title w-full max-w-6xl font-semibold tracking-tight">
                把玩过的游戏
                <span
                  className="mx-3 hidden h-12 w-28 rounded-full bg-cover bg-center align-middle contrast-125 grayscale md:inline-block"
                  style={{ backgroundImage: "url(https://picsum.photos/seed/played-memory/320/140)" }}
                />
                整理成私人档案
              </h1>
              <div className="mt-9 flex flex-wrap justify-center gap-3">
                <Link href="#library" className="rounded-md bg-neon-cyan px-6 py-3 text-sm font-semibold text-black transition-transform hover:-translate-y-0.5">
                  浏览游戏库
                </Link>
                <Link href="#lists" className="rounded-md border border-border bg-black/30 px-6 py-3 text-sm font-semibold text-foreground hover:border-neon-cyan hover:text-neon-cyan">
                  整理榜单
                </Link>
              </div>
            </div>
            <div className="relative mt-16">
              <CoverMarquee games={coverGames.map((game) => ({ id: game.id, title: game.title, coverUrl: game.coverUrl }))} />
            </div>
          </section>

          <section className="library-grid grid grid-flow-dense grid-cols-1 gap-4 md:grid-cols-12">
            <div data-stack-card className="neon-card md:col-span-7 p-6 md:p-8">
              <div className="grid gap-4 sm:grid-cols-4">
                <Metric label="游戏" value={`${games.length}`} />
                <Metric label="评分" value={`${ratedGames.length}`} />
                <Metric label="评测" value={`${reviewedGames.length}`} />
                <Metric label="均分" value={averageRating} />
              </div>
            </div>

            <div data-stack-card className="neon-card md:col-span-5 p-6 md:p-8">
              <h2 className="text-2xl font-semibold">未评分队列</h2>
              <div className="mt-5 space-y-3">
                {unratedGames.map((game) => (
                  <div key={game.id} className="flex items-center gap-3 rounded-md border border-border bg-black/15 p-2">
                    <GameCover src={game.coverUrl} title={game.title} className="h-14 w-20 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <Link href={`/games/${game.id}`} className="truncate font-medium hover:text-neon-cyan">{game.title}</Link>
                      <p className="mt-1 text-xs text-text-secondary">{minutesToHours(game.playtimeMinutes)}</p>
                    </div>
                    <QuickRating gameId={game.id} initialRating={game.userRating} compact />
                  </div>
                ))}
              </div>
            </div>

            <div data-stack-card className="neon-card md:col-span-4 p-6 md:p-8">
              <h2 className="text-xl font-semibold">最近评测</h2>
              <div className="mt-5 space-y-3">
                {recentReviews.map((game) => (
                  <Link key={game.id} href={`/games/${game.id}`} className="block rounded-md border border-border/70 px-3 py-2 hover:border-neon-cyan/40">
                    <span className="line-clamp-1 text-sm font-medium">{game.title}</span>
                    <span className="mt-1 block text-xs text-text-muted">{formatDate(game.updatedAt)}</span>
                  </Link>
                ))}
              </div>
            </div>

            <div data-stack-card className="neon-card md:col-span-4 p-6 md:p-8">
              <h2 className="text-xl font-semibold">平台状态</h2>
              <div className="mt-5 space-y-3">
                {accountStatuses.map((status) => (
                  <Link key={status.platform} href="/settings/integrations" className="flex items-center justify-between rounded-md border border-border/70 px-3 py-2 hover:border-neon-cyan/40">
                    <PlatformBadge platform={status.platform} />
                    <span className="font-mono text-sm text-text-secondary">{status.gameCount}</span>
                  </Link>
                ))}
              </div>
            </div>

            <div data-stack-card className="neon-card md:col-span-4 p-6 md:p-8">
              <h2 className="text-xl font-semibold">状态分布</h2>
              <div className="mt-5 space-y-3">
                {Array.from(new Map(games.map((game) => [game.status, games.filter((entry) => entry.status === game.status).length]))).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between text-sm">
                    <span className="text-text-secondary">{statusLabel(status)}</span>
                    <span className="font-mono">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="py-28 md:py-40">
            <div className="mb-8 max-w-3xl">
              <h2 className="text-4xl font-semibold tracking-tight md:text-6xl">最能代表你口味的几款</h2>
            </div>
            <div className="flex min-h-[420px] flex-col gap-3 lg:flex-row">
              {favoriteGames.map((game, index) => (
                <Link
                  key={game.id}
                  href={`/games/${game.id}`}
                  data-profile-image
                  className="group relative min-h-72 flex-1 overflow-hidden rounded-xl border border-border bg-[var(--bg-card)] transition-all duration-700 hover:flex-[2.2] hover:border-neon-cyan/50"
                >
                  <GameCover src={game.coverUrl} title={game.title} className="absolute inset-0 h-full w-full rounded-none border-0" priority={index < 2} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-5">
                    <p className="font-mono text-sm text-neon-cyan">{game.userRating?.toFixed(1) ?? "N/A"}</p>
                    <h3 className="mt-2 text-2xl font-semibold">{game.title}</h3>
                    <p className="mt-2 text-sm text-text-secondary">{minutesToHours(game.playtimeMinutes)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <div id="lists" className="pb-28">
            <GameListShelf initialLists={shelfLists} games={shelfGames} />
          </div>

          <section id="library" className="pb-28">
            <GameLibraryView games={serializedGames} />
          </section>

          <section className="rounded-2xl border border-border bg-[var(--bg-secondary)] p-8 text-center md:p-12">
            <h2 className="mx-auto max-w-4xl text-4xl font-semibold tracking-tight md:text-6xl">下一步，把零散记忆写成自己的游戏年鉴。</h2>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="#library" className="rounded-md bg-neon-cyan px-6 py-3 text-sm font-semibold text-black">继续补评测</Link>
              <Link href="/settings/integrations" className="rounded-md border border-border px-6 py-3 text-sm font-semibold text-foreground hover:border-neon-cyan hover:text-neon-cyan">同步平台</Link>
            </div>
          </section>
        </div>
      </div>
    </ProfileMotion>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-black/20 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-text-muted">{label}</p>
      <p className="mt-3 font-mono text-3xl font-semibold text-foreground">{value}</p>
    </div>
  );
}
