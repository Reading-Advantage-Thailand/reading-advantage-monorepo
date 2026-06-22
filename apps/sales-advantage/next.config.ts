import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appDir = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  output: "standalone",
  outputFileTracingRoot: path.join(appDir, "../.."),
  transpilePackages: [
    "@reading-advantage/ai",
    "@reading-advantage/api",
    "@reading-advantage/auth",
    "@reading-advantage/auth-client",
    "@reading-advantage/db",
    "@reading-advantage/domain",
    "@reading-advantage/storage",
    "@reading-advantage/types",
    "@reading-advantage/ui",
    "@reading-advantage/utils",
  ],
  serverExternalPackages: ["@node-rs/argon2"],
  turbopack: {
    resolveAlias: {
      // The utils package's bundled dist imports node:child_process for ffmpeg.
      // We never call those exports from the client; alias utils to its cn-only
      // entry so Turbopack doesn't try to bundle child_process for the browser.
      "@reading-advantage/utils": "@reading-advantage/utils/cn",
    },
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "20mb",
    },
  },
  async headers() {
    return [
      {
        source: "/api/(.*)",
        headers: [
          { key: "Cache-Control", value: "no-store, private" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

const withNextIntl = createNextIntlPlugin();
export default withNextIntl(nextConfig);
