export function RatingDisplay({ rating }: { rating: number | null | undefined }) {
  if (rating == null) {
    return <span className="text-text-muted font-mono text-sm">—</span>;
  }

  let color = "text-text-secondary";
  if (rating >= 8) color = "text-neon-cyan";
  else if (rating >= 6) color = "text-neon-amber";
  else if (rating >= 4) color = "text-neon-purple";
  else color = "text-neon-magenta";

  return (
    <span className={`font-mono font-bold text-sm ${color}`}>
      {rating.toFixed(1)}
    </span>
  );
}
