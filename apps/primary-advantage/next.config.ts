import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  devIndicators: false,
  allowedDevOrigins: ["127.0.0.1"],
  reactStrictMode: false,
  transpilePackages: [
    "@reading-advantage/advantage-play-kit",
    "@reading-advantage/game-cartridges",
    "@reading-advantage/game-contracts",
  ],
  typescript: { ignoreBuildErrors: true },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
        pathname: "**",
      },
    ],
  },
};

const withNextIntl = createNextIntlPlugin();
export default withNextIntl(nextConfig);
