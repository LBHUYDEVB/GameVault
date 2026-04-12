const platformConfig: Record<string, { label: string; className: string }> = {
  steam: { label: "Steam", className: "badge-steam" },
  nintendo: { label: "Nintendo", className: "badge-nintendo" },
  playstation: { label: "PlayStation", className: "badge-playstation" },
  other: { label: "Other", className: "bg-white/5 border-white/10 text-text-secondary" },
};

export function PlatformBadge({ platform }: { platform: string }) {
  const cfg = platformConfig[platform] ?? platformConfig.other;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-mono border ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}
