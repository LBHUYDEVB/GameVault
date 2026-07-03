export const PLATFORMS = ["steam", "playstation", "nintendo"] as const;

export type Platform = (typeof PLATFORMS)[number];

export const PLATFORM_META: Record<
  Platform,
  {
    label: string;
    shortLabel: string;
    accent: string;
    description: string;
  }
> = {
  steam: {
    label: "Steam",
    shortLabel: "ST",
    accent: "#67c1f5",
    description: "官方 Web API，适合稳定同步库存和时长。",
  },
  playstation: {
    label: "PlayStation",
    shortLabel: "PS",
    accent: "#2f6bff",
    description: "本地保存 NPSSO 或 refresh token，读取 PSN 游玩记录。",
  },
  nintendo: {
    label: "Nintendo",
    shortLabel: "NS",
    accent: "#e60012",
    description: "本地 session token 换取任天堂 play history。",
  },
};

export function isPlatform(value: string): value is Platform {
  return PLATFORMS.includes(value as Platform);
}
