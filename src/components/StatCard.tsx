interface StatCardProps {
  label: string;
  value: string | number;
  unit?: string;
  accent?: "cyan" | "magenta" | "purple" | "amber";
}

const accentMap = {
  cyan: "border-neon-cyan/40 shadow-[var(--glow-cyan)]",
  magenta: "border-neon-magenta/40 shadow-[var(--glow-magenta)]",
  purple: "border-neon-purple/40",
  amber: "border-neon-amber/40",
};

export function StatCard({ label, value, unit, accent = "cyan" }: StatCardProps) {
  return (
    <div className={`neon-card p-5 relative overflow-hidden ${accentMap[accent]}`}>
      <p className="text-xs uppercase tracking-widest text-text-secondary font-mono mb-2">{label}</p>
      <div className="flex items-baseline gap-1.5">
        <span className="text-3xl font-bold font-mono text-foreground">{value}</span>
        {unit && <span className="text-sm text-text-secondary font-mono">{unit}</span>}
      </div>
    </div>
  );
}
