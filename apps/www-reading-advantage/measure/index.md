# Measure: www-reading-advantage

## Project Overview

This is the **Reading Advantage Platform** — a unified, static marketing website for the "Advantage" suite of educational curriculum products (Reading, Math, Science, STEM, Storytime, Zhongwen, CodeCamp, Tutor, and Primary). The site is a Next.js 15 App Router application deployed on Google Cloud Run, targeting school administrators, teachers, and parents in Thai private schools and international schools across Southeast Asia.

## Quick Links

| File | Purpose |
|------|---------|
| [product.md](./product.md) | Vision, target audience, core features |
| [product-guidelines.md](./product-guidelines.md) | Visual identity, tone, UI principles |
| [tech-stack.md](./tech-stack.md) | Framework, libraries, infrastructure |
| [workflow.md](./workflow.md) | TDD task lifecycle, commit conventions, deployment |
| [tracks.md](./tracks.md) | All development tracks (upcoming, active, complete) |
| [lessons-learned.md](./lessons-learned.md) | Retrospective insights from completed work |
| [tech-debt.md](./tech-debt.md) | Known technical debt and deferred cleanup |
| [autonomous_prompt.md](./autonomous_prompt.md) | Prompt used for autonomous AI agent sessions |
| [review-prompt.md](./review-prompt.md) | Prompt used for AI code review sessions |

## Directory Structure

```
measure/
├── index.md                   ← This file
├── product.md
├── product-guidelines.md
├── tech-stack.md
├── workflow.md
├── tracks.md
├── lessons-learned.md
├── tech-debt.md
├── autonomous_prompt.md       ← Hard-linked from advantage-games/measure/
├── review-prompt.md           ← Hard-linked from advantage-games/measure/
├── REFACTOR.md                ← Audit findings (Feb 2026) referenced by track
├── code_styleguides/
│   ├── general.md
│   ├── html-css.md
│   ├── javascript.md
│   └── typescript.md
├── tracks/
│   ├── services_development_20260114/
│   ├── site_refactor_20260207/        ← COMPLETED
│   ├── hero_standardization_20260208/
│   ├── prowlarr_ui_cloning_20260214/
│   ├── sonarr_ui_cloning_20260214/
│   ├── radarr_ui_cloning_20260214/
│   └── bazarr_ui_cloning_20260214/
└── archive/                   ← Completed tracks moved here after archiving
```

## Current Status (as of 2026-04-08)

- **Completed:** Site-wide refactor addressing performance, accessibility, and code quality
- **In Queue:** Services page finalization, Hero standardization, product page redesigns
- **Platform:** 9 product landing pages live, multilingual (EN/TH/ZH), deployed to Cloud Run

## Key Constraints

- **No Framer Motion** — all animations must use `tailwindcss-animate`
- **No hard-coded strings** — all text through `next-international` locale files
- **Server components by default** — only use `"use client"` when React state/hooks are needed
- **TypeScript strict** — build errors must not be ignored
