import Link from "next/link";
import { notFound } from "next/navigation";
import { EditGameForm } from "@/components/EditGameForm";
import { GameCover } from "@/components/GameCover";
import { PlatformBadge } from "@/components/PlatformBadge";
import { getGame } from "@/lib/repositories/gameRepository";
import { minutesToHours } from "@/lib/utils";

export default async function EditGamePage(props: PageProps<"/admin/games/[id]">) {
  const { id } = await props.params;
  const game = await getGame(id);
  if (!game) notFound();

  return (
    <div className="min-h-screen px-4 pt-20 md:px-8 md:pt-8">
      <div className="mx-auto max-w-5xl space-y-8 pb-20">
        <nav className="flex items-center gap-2 text-sm text-text-secondary">
          <Link href="/admin/games" className="hover:text-neon-cyan">管理</Link>
          <span>/</span>
          <span className="truncate text-foreground">编辑</span>
        </nav>

        <section className="rounded-xl border border-border bg-[var(--bg-secondary)] p-5 md:p-7">
          <div className="flex flex-col gap-5 md:flex-row md:items-center">
            <GameCover src={game.coverUrl} title={game.title} className="h-36 w-full md:h-28 md:w-44" priority />
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-3xl font-semibold md:text-5xl">{game.title}</h1>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <PlatformBadge platform={game.platform} />
                <span className="font-mono text-sm text-text-secondary">{minutesToHours(game.playtimeMinutes)}</span>
              </div>
            </div>
            <Link href={`/games/${game.id}`} className="rounded-md border border-border px-4 py-2 text-sm text-text-secondary hover:border-neon-cyan hover:text-neon-cyan">
              查看详情
            </Link>
          </div>
        </section>

        <EditGameForm
          gameId={game.id}
          initialRating={game.userRating}
          initialReview={game.reviewRichText ?? ""}
          initialStatus={game.status}
        />
      </div>
    </div>
  );
}
