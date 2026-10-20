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
    "@reading-advantage/game-cartridges-3d",
    "@reading-advantage/game-contracts",
  ],
  async headers() {
    return [
      {
        // The new worker replaces the legacy worker at this URL (track primary_parity_pwa).
        source: "/serwist/sw.js",
        headers: [
          { key: "Service-Worker-Allowed", value: "/" },
          { key: "Cache-Control", value: "no-cache" },
        ],
      },
      {
        // The print frame is sandboxed with an opaque origin, so its font requests are cross-origin
        // (track primary_parity_print_lesson).
        source: "/print-fonts/:path*",
        headers: [{ key: "Access-Control-Allow-Origin", value: "*" }],
      },
    ];
  },
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
