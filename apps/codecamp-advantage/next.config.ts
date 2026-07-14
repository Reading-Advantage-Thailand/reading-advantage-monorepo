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
  // Keep these out of the server bundle and let output-file-tracing copy
  // them into .next/standalone instead: postgres.js breaks parameter
  // serialization when minified into a chunk (Date params reach the socket
  // writer raw), and @node-rs/argon2 is a native addon (same setting as
  // sales-advantage).
  serverExternalPackages: ["postgres", "@node-rs/argon2"],
  transpilePackages: [
    "@reading-advantage/api",
    "@reading-advantage/auth",
    "@reading-advantage/auth-client",
    "@reading-advantage/db",
    "@reading-advantage/domain",
    "@reading-advantage/types",
    "@reading-advantage/ui",
    "@reading-advantage/utils",
    "@reading-advantage/webhooks",
  ],
  // typescript: { ignoreBuildErrors: true },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
        pathname: "**",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/api/(.*)",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "https://codecamp.reading-advantage.com" },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, PUT, DELETE, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization" },
          { key: "Cache-Control", value: "no-store, private" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
        ],
      },
      {
        source: "/:locale(en|th)",
        headers: [
          { key: "Cache-Control", value: "public, s-maxage=3600, stale-while-revalidate=86400" },
        ],
      },
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.youtube.com https://s.ytimg.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https://storage.googleapis.com",
              "font-src 'self'",
              "connect-src 'self' https://openrouter.ai",
              "frame-src https://www.youtube.com",
              "frame-ancestors 'none'",
            ].join("; "),
          },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
        ],
      },
    ];
  },
};

const withNextIntl = createNextIntlPlugin();
export default withNextIntl(nextConfig);
