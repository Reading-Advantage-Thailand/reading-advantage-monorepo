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
};

const withNextIntl = createNextIntlPlugin();
export default withNextIntl(nextConfig);
