"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/dashboard", label: "总览", icon: "◈" },
  { href: "/admin/games", label: "管理游戏", icon: "⚙" },
  { href: "/settings/integrations", label: "平台接入", icon: "⟁" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 shrink-0 border-r border-border bg-[var(--bg-secondary)] flex flex-col">
      <div className="px-5 py-6 border-b border-border">
        <h1 className="text-lg font-bold tracking-wider neon-text font-mono">
          GAME<span className="text-neon-magenta">TRACKER</span>
        </h1>
        <p className="text-xs text-text-secondary mt-1 font-mono tracking-wide">Personal Journey Log</p>
      </div>

      <nav className="flex-1 py-4 space-y-1 px-3">
        {navItems.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-150
                ${active
                  ? "bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/30 shadow-[var(--glow-cyan)]"
                  : "text-text-secondary hover:text-foreground hover:bg-white/5 border border-transparent"
                }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-5 py-4 border-t border-border">
        <p className="text-[10px] text-text-muted font-mono tracking-widest uppercase">Local Mode</p>
      </div>
    </aside>
  );
}
