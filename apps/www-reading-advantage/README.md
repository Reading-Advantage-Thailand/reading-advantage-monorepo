# Reading Advantage Platform

A static marketing experience for Reading Advantage and related programs (Math, Science, STEM, Storytime, Zhongwen, CodeCamp, Tutor). This is a purely static brochure website with no user authentication or accounts. The Next.js 15 app router implementation lives in this repository alongside legacy static assets.

## Quick Links
- Product brief: `docs/project-brief.md`
- Product requirements: `docs/prd.md`
- Specs index: `docs/specs/README.md`
- Sprint planning: `docs/sprint/S0.md`
- Migration issue: [#8](https://github.com/Reading-Advantage-Thailand/www-reading-advantage/issues/8)

## Getting Started
```bash
npm install
npm run dev   # starts Next.js 15 app router dev server
npm run build # production build
npm run lint  # lint checks
```

## Tech Highlights
- Next.js 15 + React 19 RC with app router
- Tailwind CSS + shadcn/ui component library
- Framer Motion animation primitives
- MDX blogging pipeline (in progress)

## Workflow
We follow a spec-driven git workflow. Before starting new work:
1. Draft/update specs under `docs/specs/` (`init-spec <capability>`).
2. Plan sprint work in `docs/sprint/` and run `seed-sprint` to generate issues.
3. Reference the relevant spec + issue in branches, commits, and PRs.

See `CLAUDE.md` and `AGENTS.md` for collaboration expectations. Legacy `todo.md` items will be transitioned into specs/issues during the migration.
