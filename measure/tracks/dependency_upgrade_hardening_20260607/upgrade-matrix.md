# Upgrade Matrix

> Generated from `pnpm outdated -r --format json` captured 2026-06-13.
> `pnpm audit --json` timed out (registry stall); security results are incomplete.
> `pnpm dedupe --check` timed out; re-run during Phase 3 Batch H.

## Version Alignment Contracts

### Next / eslint-config-next
- **Selected patch line:** Next `16.2.9` (latest stable Next 16, patched).
- `eslint-config-next` stays at `15.5.9` for `vocabulary-games` (Next 15 app). Not overridden.
- Exception: `vocabulary-games` uses `next@16.0.0` via override but declares `eslint-config-next@15.5.9`. Will align after override upgrade.

### React / React DOM
- **Selected patch line:** `19.2.7` (latest React 19 patch).
- Override `react` and `react-dom` from `19.2.5` → `19.2.7`.

### Vitest / @vitest/ui / @vitest/coverage-v8
- **Selected patch line:** `4.1.8`.
- Override `vitest` from `4.1.5` → `4.1.8`.
- `@vitest/ui` already at `4.1.8` in workspace; `@vitest/coverage-v8` aligned to `4.1.8`.

### Drizzle
- **Hold** at `0.44.7`. `0.45.x` requires a dedicated ORM compatibility review (separate track).

### AI SDK
- **Defer** all `@ai-sdk/*` and `ai` major upgrades to dedicated follow-up track.

### Zod
- **Hold** at `3.25.76`. Zod 4 is a major migration coordinated with `zod_boundary_hardening_20260603`.

### TypeScript
- **Hold** at `5.9.3`. TypeScript 6 is a major migration (dedicated track).

### Jest
- **Hold** at `29.7.0`. Jest 30 is a major migration (dedicated track).

### Zustand
- **Hold** at `4.5.7` for reading-advantage. Zustand 5 is a major migration (dedicated track).

### Prisma
- **Hold** at `6.19.3`. Prisma 7 is rejected; primary-advantage migrates to Drizzle.

### pnpm
- **Hold** at `8.15.8`. pnpm 11 is a major migration (dedicated track).

## Temporary Exceptions

| App | Package | Declared | Override/Resolved | Owner | Removal Condition |
|-----|---------|----------|-------------------|-------|-------------------|
| vocabulary-games | eslint-config-next | 15.5.9 | 15.5.9 | dependency_upgrade_hardening | Align after vocabulary-games migrates to Next 16 |

## Matrix

| package | current | wanted | latest | dependents | risk class | decision | implementation batch | validation scope |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| next | 16.0.0 | 16.0.0 | 16.2.9 | apps/* (override) | high | upgrade | Batch A | all-six-app-builds |
| react | 19.2.5 | 19.2.5 | 19.2.7 | packages/* (override) | high | upgrade | Batch A | all-six-app-builds |
| react-dom | 19.2.5 | 19.2.5 | 19.2.7 | packages/* (override) | high | upgrade | Batch A | all-six-app-builds |
| vitest | 4.1.5 | 4.1.5 | 4.1.8 | 16 workspaces (override) | medium | upgrade | Batch B | all-vitest-workspace-tests |
| drizzle-orm | 0.44.7 | 0.44.7 | 0.45.2 | root | medium | hold | — | — |
| eslint-config-next | 15.5.9 | 15.5.9 | 16.2.9 | vocabulary-games | low | hold (exception) | — | — |
| typescript | 5.9.3 | 5.9.3 | 6.0.3 | all workspaces | high | defer | — | — |
| zod | 3.25.76 | 3.25.76 | 4.4.3 | 12 workspaces | high | defer | — | — |
| jest | 29.7.0 | 29.7.0 | 30.4.2 | reading-advantage, scripts | medium | defer | — | — |
| zustand | 4.5.7 | 4.5.7 | 5.0.14 | reading-advantage | medium | defer | — | — |
| @prisma/client | 6.19.3 | 6.19.3 | 7.8.0 | primary-advantage | high | hold | — | — |
| prisma | 6.19.3 | 6.19.3 | 7.8.0 | primary-advantage | high | hold | — | — |
| ai | 5.0.183 | 5.0.183 | 6.0.204 | @reading-advantage/ai | high | defer | — | — |
| @ai-sdk/google | 2.0.72 | 2.0.72 | 3.0.82 | @reading-advantage/ai | high | defer | — | — |
| @ai-sdk/google-vertex | 2.2.27 | 2.2.27 | 4.0.145 | primary-advantage, reading-advantage, scripts | high | defer | — | — |
| @ai-sdk/openai | 2.0.106 | 2.0.106 | 3.0.71 | @reading-advantage/ai | high | defer | — | — |
| @ai-sdk/provider-utils | 2.2.8 | 2.2.8 | 4.0.29 | reading-advantage | high | defer | — | — |
| @ai-sdk/react | 1.2.12 | 1.2.12 | 3.0.206 | codecamp-advantage, primary-advantage | high | defer | — | — |
| openai | 4.104.0 | 4.104.0 | 6.42.0 | reading-advantage, scripts | high | defer | — | — |
| react-day-picker | 9.14.0 | 9.14.0 | 10.0.1 | primary-advantage | medium | hold | — | — |
| @types/bcryptjs | 2.4.6 | 2.4.6 | 3.0.0 | primary-advantage, api, auth | low | remove | Batch D | type-check |
| @types/marked | 6.0.0 | 6.0.0 | 7.0.0 | www-reading-advantage | low | remove | Batch D | type-check |
| @types/sharp | 0.31.1 | 0.31.1 | 0.32.0 | primary-advantage | low | remove | Batch D | type-check |
| @types/uuid | 10.0.0 | 10.0.0 | 11.0.0 | reading-advantage | low | remove | Batch D | type-check |
| fluent-ffmpeg | 2.1.3 | 2.1.3 | — | primary-advantage | medium | remove | Batch E | unit-tests + ffmpeg-smoke |
| postcss | 8.5.13 | 8.5.13 | 8.5.15 | reading-advantage, www-reading-advantage | low | upgrade | Batch F | build |
| prettier | 3.8.3 | 3.8.3 | 3.8.4 | root, codecamp, primary, science | low | upgrade | Batch F | lint |
| react-konva | 19.2.3 | 19.2.3 | 19.2.5 | vocabulary-games, reading-advantage | low | upgrade | Batch F | build |
| ts-jest | 29.4.9 | 29.4.9 | 29.4.11 | reading-advantage | low | upgrade | Batch F | jest-targeted |
| turbo | 2.9.8 | 2.9.8 | 2.9.18 | root | low | upgrade | Batch F | build |
| @google/generative-ai | 0.22.0 | 0.22.0 | 0.24.1 | reading-advantage | low | upgrade | Batch F | build |
| @types/react-gauge-chart | 0.4.3 | 0.4.3 | 0.5.0 | reading-advantage | low | upgrade | Batch F | type-check |
| @tabler/icons-react | 3.41.1 | 3.41.1 | 3.44.0 | science-advantage | low | upgrade | Batch F | build |
| next-themes | 0.3.0 | 0.3.0 | 0.4.6 | reading-advantage | low | upgrade | Batch F | build |
| @playwright/test | 1.59.1 | 1.59.1 | 1.60.0 | vocabulary-games, codecamp, science, www | low | upgrade | Batch G | e2e-smoke |
| @tanstack/react-query | 5.100.8 | 5.100.8 | 5.101.0 | codecamp, primary, reading | low | upgrade | Batch G | build |
| axios | 1.16.0 | 1.16.0 | 1.17.0 | reading-advantage, scripts | low | upgrade | Batch G | build |
| date-fns | 4.1.0 | 4.1.0 | 4.4.0 | primary, reading | low | upgrade | Batch G | build |
| framer-motion | 12.38.0 | 12.38.0 | 12.40.0 | vocabulary-games, primary, reading | low | upgrade | Batch G | build |
| jotai | 2.19.1 | 2.19.1 | 2.20.1 | reading-advantage | low | upgrade | Batch G | build |
| pg | 8.20.0 | 8.20.0 | 8.21.0 | primary, reading | low | upgrade | Batch G | build |
| react-hook-form | 7.75.0 | 7.75.0 | 7.78.0 | codecamp, primary, reading, science | low | upgrade | Batch G | build |
| tailwindcss | 4.1.18 | 4.1.18 | 4.3.1 | 7 workspaces | medium | upgrade (visual smoke) | Batch G | visual-smoke |
| @tailwindcss/postcss | 4.1.18 | 4.1.18 | 4.3.1 | 6 workspaces | medium | upgrade (visual smoke) | Batch G | visual-smoke |
| tsx | 4.21.0 | 4.21.0 | 4.22.4 | primary, reading, science, www, api, webhooks | low | upgrade | Batch G | build |
| typescript-eslint | 8.59.1 | 8.59.1 | 8.61.0 | vocabulary-games, config | low | upgrade | Batch G | lint |
| ws | 8.20.0 | 8.20.0 | 8.21.0 | vocabulary-games | low | upgrade | Batch G | build |
| @radix-ui/react-context-menu | 2.2.16 | 2.2.16 | 2.3.0 | primary, reading | low | upgrade | Batch F | build |
| @radix-ui/react-radio-group | 1.3.8 | 1.3.8 | 1.4.0 | primary, reading, science | low | upgrade | Batch F | build |
| @radix-ui/react-select | 2.2.6 | 2.2.6 | 2.3.0 | primary, reading, science, www | low | upgrade | Batch F | build |
| @radix-ui/react-slider | 1.3.6 | 1.3.6 | 1.4.0 | reading-advantage | low | upgrade | Batch F | build |
| @aws-sdk/client-s3 | 3.1065.0 | 3.1065.0 | 3.1068.0 | @reading-advantage/storage | low | upgrade | Batch F | build |
| @aws-sdk/s3-request-presigner | 3.1065.0 | 3.1065.0 | 3.1068.0 | @reading-advantage/storage | low | upgrade | Batch F | build |
| @google-cloud/storage | 7.19.0 | 7.19.0 | 7.21.0 | primary, reading, scripts | low | upgrade | Batch F | build |
| @vercel/analytics | 1.6.1 | 1.6.1 | 2.0.1 | primary-advantage | low | defer | — | — |
| @hookform/resolvers | 3.10.0 | 3.10.0 | 5.4.0 | reading-advantage | medium | defer | — | — |
| @hono/node-server | 1.19.14 | 1.19.14 | 2.0.4 | webhooks | medium | defer | — | — |
| @mui/material | 6.5.0 | 6.5.0 | 9.1.1 | reading-advantage | high | defer | — | — |
| @next/mdx | 15.5.15 | 15.5.15 | 16.2.9 | www-reading-advantage | medium | upgrade | Batch A | build |
| @faker-js/faker | 9.9.0 | 9.9.0 | 10.4.0 | primary-advantage | low | defer | — | — |
| @google-cloud/text-to-speech | 5.8.1 | 5.8.1 | 6.4.1 | reading-advantage | medium | defer | — | — |
| @google-cloud/translate | 8.5.1 | 8.5.1 | 9.4.2 | reading-advantage | medium | defer | — | — |
| @hello-pangea/dnd | 17.0.0 | 17.0.0 | 18.0.1 | reading-advantage | medium | defer | — | — |
| @eslint/js | 9.39.4 | 9.39.4 | 10.0.1 | vocabulary-games, config | medium | defer | — | — |
| @types/node | 20.19.39 | 20.19.39 | 25.9.3 | 15 workspaces | medium | hold | — | — |
| @types/nodemailer | 6.4.23 | 6.4.23 | 8.0.1 | reading-advantage | low | hold | — | — |
| @types/jest | 29.5.14 | 29.5.14 | 30.0.0 | reading-advantage | low | hold | — | — |
| bcryptjs | 2.4.3 | 2.4.3 | 3.0.3 | api, auth | medium | defer | — | — |
| dotenv | 16.6.1 | 16.6.1 | 17.4.2 | scripts | medium | defer | — | — |
| eslint | 9.39.4 | 9.39.4 | 10.5.0 | vocabulary-games, science, www, config | medium | defer | — | — |
| eslint-plugin-react-hooks | 5.2.0 | 5.2.0 | 7.1.1 | vocabulary-games, config | medium | defer | — | — |
| eslint-plugin-testing-library | 6.5.0 | 6.5.0 | 7.16.2 | reading-advantage | medium | defer | — | — |
| firebase-admin | 13.8.0 | 13.8.0 | 14.0.0 | reading-advantage | medium | defer | — | — |
| globals | 16.5.0 | 16.5.0 | 17.6.0 | vocabulary-games, config | medium | defer | — | — |
| googleapis | 148.0.0 | 148.0.0 | 173.0.0 | primary-advantage | medium | defer | — | — |
| jsdom | 27.4.0 | 27.4.0 | 29.1.1 | science-advantage | medium | defer | — | — |
| lucide-react | 0.562.0 | 0.562.0 | 1.18.0 | vocabulary-games | medium | defer | — | — |
| marked | 14.1.4 | 14.1.4 | 18.0.5 | www-reading-advantage | medium | defer | — | — |
| next-intl | 3.26.5 | 3.26.5 | 4.13.0 | reading-advantage | medium | defer | — | — |
| next-mdx-remote | 5.0.0 | 5.0.0 | 6.0.0 | www-reading-advantage | medium | defer | — | — |
| nodemailer | 6.10.1 | 6.10.1 | 8.0.11 | reading-advantage | medium | defer | — | — |
| nuqs | 1.20.0 | 1.20.0 | 2.8.9 | reading-advantage | medium | defer | — | — |
| prettier-plugin-tailwindcss | 0.6.14 | 0.6.14 | 0.8.0 | codecamp, primary | low | upgrade | Batch F | lint |
| react-gauge-component | 1.2.64 | 1.2.64 | 2.0.29 | primary-advantage | medium | defer | — | — |
| react-quizlet-flashcard | 3.0.0 | 3.0.0 | 4.0.22 | reading-advantage | medium | defer | — | — |
| react-router-dom | 6.30.3 | 6.30.3 | 7.17.0 | reading-advantage | high | defer | — | — |
| react-tailwindcss-datepicker | 1.7.4 | 1.7.4 | 2.0.0 | reading-advantage | medium | defer | — | — |
| recharts | 2.15.4 | 2.15.4 | 3.8.1 | primary, science | medium | defer | — | — |
| resend | 4.8.0 | 4.8.0 | 6.12.4 | primary, reading | medium | defer | — | — |
| sharp | 0.34.5 | 0.34.5 | 0.35.1 | primary, science | low | upgrade | Batch F | build |
| tailwind-merge | 2.6.1 | 2.6.1 | 3.6.0 | reading, www, ui, utils | medium | defer | — | — |
| ts-fsrs | 4.7.1 | 4.7.1 | 5.4.1 | reading-advantage | medium | defer | — | — |
| uuid | 10.0.0 | 10.0.0 | 14.0.0 | reading-advantage | medium | defer | — | — |
| @jest/environment-jsdom | 29.7.0 | 29.7.0 | 30.4.1 | reading-advantage | low | hold | — | — |

## Summary by Decision

| Decision | Count |
|----------|------:|
| upgrade (Batch A: framework) | 4 |
| upgrade (Batch B: vitest) | 1 |
| upgrade (Batch F: patch) | ~20 |
| upgrade (Batch G: minor) | ~15 |
| upgrade (visual smoke) | 2 |
| remove (Batch D: deprecated types) | 4 |
| remove (Batch E: fluent-ffmpeg) | 1 |
| hold | ~10 |
| defer (major) | ~40 |

## Baseline Evidence

| Artifact | Status | Path |
|----------|--------|------|
| git-status.txt | captured | baseline/git-status.txt |
| pnpm-outdated.json | captured | baseline/pnpm-outdated.json |
| pnpm-list.json | captured | baseline/pnpm-list.json |
| pnpm-dedupe-check.txt | timed out (180s) | baseline/pnpm-dedupe-check.txt |
| pnpm-audit.json | incomplete (registry stall) | baseline/pnpm-audit.json |
