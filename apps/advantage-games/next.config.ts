import type { NextConfig } from "next";

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
  output: "export",
  images: {
    unoptimized: true,
  },
  basePath: basePath || undefined,
  assetPrefix: basePath || undefined,
  trailingSlash: true,
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
