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
    "@reading-advantage/db",
    "@reading-advantage/domain",
    "@reading-advantage/storage",
  ],
  serverExternalPackages: ["postgres"],
};

export default nextConfig;
