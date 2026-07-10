import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appDirectory = path.dirname(fileURLToPath(import.meta.url));

const isGithubActions = process.env.GITHUB_ACTIONS === "true";
const repoName = process.env.GITHUB_REPOSITORY?.split("/")[1];
const envBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? process.env.BASE_PATH ?? "";
const normalizedEnvBasePath =
  envBasePath === ""
    ? ""
    : envBasePath.startsWith("/")
      ? envBasePath
      : `/${envBasePath}`;
const inferredBasePath = isGithubActions && repoName ? `/${repoName}` : "";
const basePath = normalizedEnvBasePath || inferredBasePath;

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(appDirectory, "../.."),
  transpilePackages: [
    "@reading-advantage/api",
    "@reading-advantage/auth",
    "@reading-advantage/db",
  ],
  serverExternalPackages: ["@node-rs/argon2"],
  basePath: basePath || undefined,
  assetPrefix: basePath || undefined,
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
