export function minutesToHours(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function minutesToDecimalHours(minutes: number): string {
  return (minutes / 60).toFixed(1);
}

/**
 * < 5h   → 灰色(text-muted)
 * 5-15h  → 蓝灰
 * 15-50h → 青色
 * 50-100h → 绿色
 * 100-300h → 橙色
 * 300h+  → 洋红+发光
 */
export function playtimeColorClass(minutes: number): string {
  const h = minutes / 60;
  if (h < 5)   return "text-text-muted";
  if (h < 15)  return "text-slate-400";
  if (h < 50)  return "text-neon-cyan";
  if (h < 100) return "text-emerald-400";
  if (h < 300) return "text-neon-amber";
  return "text-neon-magenta drop-shadow-[0_0_6px_rgba(255,0,229,0.5)]";
}

export function fuzzyMatch(text: string, query: string): boolean {
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  let qi = 0;
  for (let i = 0; i < lower.length && qi < q.length; i++) {
    if (lower[i] === q[qi]) qi++;
  }
  return qi === q.length;
}
