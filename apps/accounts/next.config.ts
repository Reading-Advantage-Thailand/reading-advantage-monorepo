import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appDir = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  outputFileTracingRoot: path.join(appDir, "../.."),
  transpilePackages: [
    "@reading-advantage/auth",
    "@reading-advantage/backend",
    "@reading-advantage/db",
  ],
  serverExternalPackages: ["@node-rs/argon2", "postgres"],
  async headers() {
    return [{
      source: "/(.*)",
      headers: [
        { key: "Cache-Control", value: "no-store, private" },
        { key: "Content-Security-Policy", value: "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "no-referrer" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" }
      ],
    }];
  },
};

export default nextConfig;
