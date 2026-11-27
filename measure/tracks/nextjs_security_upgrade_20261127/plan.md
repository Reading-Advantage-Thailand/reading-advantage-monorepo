# Plan — Next.js security upgrade

Light card. One registry line in `measure/tracks.md`. This card records the work only. Do not run the upgrade and do not change a dependency or a lockfile in this change. The www build prints `next upgrade --agent=security`. Each app gets its own upgrade, gates, render check, and own CD push. The CD deploy-traffic guard of d9c242832 reports held traffic for gated services; no traffic move is implied here. No spec, no review, no gates.

## Phase 1

- [ ] www-reading-advantage: upgrade Next.js, run tests and build, check a rendered page, then push through its own CD.
- [ ] accounting: upgrade Next.js, run tests and build, check a rendered page, then push through its own CD.
- [ ] accounts: upgrade Next.js, run tests and build, check a rendered page, then push through its own CD.
- [ ] advantage-games: upgrade Next.js, run tests and build, check a rendered page, then push through its own CD.
- [ ] codecamp-advantage: upgrade Next.js, run tests and build, check a rendered page, then push through its own CD.
- [ ] primary-advantage: upgrade Next.js, run tests and build, check a rendered page, then push through its own CD.
- [ ] reading-advantage: upgrade Next.js, run tests and build, check a rendered page, then push through its own CD.
- [ ] sales-advantage: upgrade Next.js, run tests and build, check a rendered page, then push through its own CD.
- [ ] science-advantage: upgrade Next.js, run tests and build, check a rendered page, then push through its own CD.
- [ ] storytime: upgrade Next.js, run tests and build, check a rendered page, then push through its own CD.
- [ ] workbooks: upgrade Next.js, run tests and build, check a rendered page, then push through its own CD.
