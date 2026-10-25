import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appDir = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // The Docker image starts the standalone server (FR-1, task 1.2).
  output: "standalone",
  // Trace from the monorepo root so shared workspace packages land in the standalone bundle,
  // as apps/primary-advantage/next.config.ts does.
  outputFileTracingRoot: path.join(appDir, "../.."),
};

const withNextIntl = createNextIntlPlugin();

export default withNextIntl(nextConfig);
