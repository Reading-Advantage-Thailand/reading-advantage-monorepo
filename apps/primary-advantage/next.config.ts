import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appDir = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(appDir, "../.."),
  serverExternalPackages: ["postgres", "@node-rs/argon2"],
  devIndicators: false,
  allowedDevOrigins: ["127.0.0.1"],
  reactStrictMode: false,
  transpilePackages: [
    "@reading-advantage/advantage-play-kit",
    "@reading-advantage/advantage-play-kit-3d",
    "@reading-advantage/game-cartridges",
    "@reading-advantage/game-cartridges-3d",
    "@reading-advantage/game-contracts",
  ],
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
