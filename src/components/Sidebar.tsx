"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/dashboard", label: "总览", short: "OV" },
  { href: "/admin/games", label: "管理", short: "MG" },
  { href: "/settings/integrations", label: "同步", short: "SC" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40 border-b border-border bg-background/85 px-4 py-3 backdrop-blur-xl md:hidden">
        <div className="flex items-center">
          <Link href="/dashboard" className="font-mono text-sm font-bold tracking-[0.18em] text-foreground">
            GAME TRACKER
          </Link>
        </div>
      </header>

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 shrink-0 border-r border-border bg-[var(--bg-secondary)]/92 backdrop-blur-xl md:flex md:flex-col">
        <div className="px-6 py-7 border-b border-border">
          <Link href="/dashboard" className="block text-lg font-bold tracking-[0.18em] neon-text font-mono">
            GAME TRACKER
          </Link>
        </div>

        <nav className="flex-1 space-y-2 px-3 py-5">
          {navItems.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center gap-3 rounded-md border px-3 py-3 text-sm font-medium transition-all duration-200
                  ${active
                    ? "border-neon-cyan/35 bg-neon-cyan/10 text-neon-cyan shadow-[var(--glow-cyan)]"
                    : "border-transparent text-text-secondary hover:border-border hover:bg-white/[0.03] hover:text-foreground"
                  }`}
              >
                <span className="grid h-8 w-8 place-items-center rounded border border-border bg-black/20 font-mono text-[10px] tracking-widest group-hover:border-neon-cyan/40">
                  {item.short}
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>

      </aside>

      <nav className="fixed inset-x-3 bottom-3 z-50 grid grid-cols-3 gap-2 rounded-lg border border-border bg-[var(--bg-secondary)]/92 p-2 shadow-2xl backdrop-blur-xl md:hidden">
        {navItems.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-md px-2 py-2 text-center text-xs transition-colors
                ${active ? "bg-neon-cyan text-black" : "text-text-secondary hover:bg-white/5 hover:text-foreground"}`}
            >
              <span className="block font-mono text-[10px] tracking-widest">{item.short}</span>
              <span className="mt-1 block">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
