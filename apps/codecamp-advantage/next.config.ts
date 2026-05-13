import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  devIndicators: false,
  reactStrictMode: false,
  transpilePackages: [
    "@reading-advantage/api",
    "@reading-advantage/auth",
    "@reading-advantage/auth-client",
    "@reading-advantage/db",
    "@reading-advantage/types",
    "@reading-advantage/ui",
    "@reading-advantage/utils",
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
