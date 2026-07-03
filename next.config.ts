import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "cdn.akamai.steamstatic.com" },
      { protocol: "https", hostname: "image.api.playstation.com" },
      { protocol: "https", hostname: "atum-img-lp1.cdn.nintendo.net" },
      { protocol: "https", hostname: "picsum.photos" },
    ],
  },
};

export default nextConfig;
