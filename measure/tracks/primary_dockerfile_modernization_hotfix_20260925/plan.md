# Implementation Plan: Primary Dockerfile Modernization Hotfix

- [x] Task 1: Rewrite Dockerfile to the monorepo pnpm/standalone pattern (this commit)
- [x] Task 2: Add standalone output, tracing root, server externals to next.config.ts (this commit)
- [x] Task 3: Fix cloudbuild.yaml build step (-f path, drop broken DATABASE_URL build arg) (this commit)
