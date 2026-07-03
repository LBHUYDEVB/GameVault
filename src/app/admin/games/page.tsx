import { AdminGamesClient } from "@/components/AdminGamesClient";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminGamesPage() {
  const games = await prisma.game.findMany({
    orderBy: { playtimeMinutes: "desc" },
  });

  return (
    <div className="min-h-screen px-4 pt-20 md:px-8 md:pt-8">
      <div className="mx-auto max-w-7xl space-y-8 pb-20">
        <section className="rounded-xl border border-border bg-[var(--bg-secondary)] px-5 py-8 md:px-8">
          <h1 className="text-4xl font-semibold tracking-tight md:text-6xl">管理游戏记录</h1>
        </section>
        <AdminGamesClient
          initialGames={games.map((game) => ({
            id: game.id,
            title: game.title,
            platform: game.platform,
            playtimeMinutes: game.playtimeMinutes,
            recentPlaytimeMinutes: game.recentPlaytimeMinutes,
            recentPlaytimeSource: game.recentPlaytimeSource,
            userRating: game.userRating,
            coverUrl: game.coverUrl,
          }))}
        />
      </div>
    </div>
  );
}
