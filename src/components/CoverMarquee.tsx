import { GameCover } from "@/components/GameCover";

export interface MarqueeGame {
  id: string;
  title: string;
  coverUrl: string | null;
}

export function CoverMarquee({ games }: { games: MarqueeGame[] }) {
  const covers = games.length ? games : [];
  const loop = [...covers, ...covers].slice(0, Math.max(12, covers.length * 2));

  return (
    <div className="relative overflow-hidden">
      <div className="cover-marquee flex w-max gap-3">
        {loop.map((game, index) => (
          <div key={`${game.id}-${index}`} className="group w-36 shrink-0 md:w-44" data-profile-image>
            <GameCover src={game.coverUrl} title={game.title} className="h-52 md:h-64" priority={index < 4} />
          </div>
        ))}
      </div>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-28 bg-gradient-to-r from-background to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-28 bg-gradient-to-l from-background to-transparent" />
    </div>
  );
}
