"use client";

import Image from "next/image";
import { useState } from "react";

interface GameCoverProps {
  src: string | null | undefined;
  title: string;
  className?: string;
  priority?: boolean;
}

export function GameCover({ src, title, className = "", priority = false }: GameCoverProps) {
  const [failed, setFailed] = useState(false);

  return (
    <div className={`relative overflow-hidden rounded-md border border-border bg-[var(--bg-elevated)] ${className}`}>
      {src && !failed ? (
        <Image
          src={src}
          alt={title}
          fill
          priority={priority}
          sizes="(max-width: 768px) 100vw, 420px"
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="grid h-full w-full place-items-center bg-gradient-to-br from-white/[0.08] to-transparent px-4 text-center">
          <span className="font-mono text-xs uppercase tracking-[0.18em] text-text-muted">{title.slice(0, 18)}</span>
        </div>
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-white/[0.04]" />
    </div>
  );
}
