# Evidence — Docker image misses the Primary `public` folder

Date: 2026-10-06. Reported by the Forge session; checked by the monorepo session on integration 146e46261.

## Finding

The Primary Dockerfile runner stage copies `.next/standalone` and `.next/static` only. Next.js
`output: "standalone"` does not copy the `public` folder; file tracing picks up only the public
files the code references. The live image would serve a partial `public` folder.

Local check against a `pnpm build` of the app (counts are files):

| Folder | Real `public` | Standalone copy |
|---|---|---|
| `packs` | 720 | 604 |
| `assets` | 456 | 77 |
| `rpg` | 246 | 246 |
| `login-image.png` | 1 | 1 |

The 116 missing pack files are the 3D model packs. The 379 missing asset files include the 2D sprite
pack and the HUD fonts, so the 2D games would fail on the live site, not only the 3D games.

## Fix

The runner stage now copies the full `public` folder after the static copy, the same way the
www-reading-advantage Dockerfile does:

```
COPY --from=builder --chown=nextjs:nodejs /app/apps/primary-advantage/public ./apps/primary-advantage/public
```

The builder stage runs `pnpm turbo run build --filter=primary-advantage`, whose prebuild step
`sync:3d-assets` fills `public/packs` before `next build`.

## Open check

Build the image once in a free heavy-job slot and request from the container:
`/packs/avatar/1.1.0/catalog.json`, one 3D `pack.json`, `/assets/apk/primary-chibi-2d/v1/pack.json`,
`/rpg/skin.json`, `/login-image.png`. Record the HTTP status of each here.

## Result of the open check (2026-10-07, monorepo session)

**The image build is not possible on this machine.** Three local `podman build` runs of the Primary
Dockerfile failed:

1. and 2. `pnpm install` stopped on fetch timeouts (the registry network was slow; one metadata request
   took 6.5 s), with the container network and with the host network.
3. With the host pnpm store as an overlay mount and `PUPPETEER_SKIP_DOWNLOAD=1` (the Chrome download of
   puppeteer stalled at 25 MB), the install passed in 29 minutes. Then systemd-oomd stopped the build
   during the commit of the dependency layer (memory pressure 85-91 % on the 7 GB machine), before
   `turbo run build`. oomd also stopped one Chrome window at the same time.

**Runner layout check (no container).** The same file layout as the runner stage, made with hard links
from the local production build (integration 11fe3a194, `next build` of 14:51) and without the `.env`
files that `.dockerignore` keeps out: `.next/standalone` at the root,
`.next/static` at `apps/primary-advantage/.next/static`, and the full `public` at
`apps/primary-advantage/public`. `node apps/primary-advantage/server.js` (PORT 3200):

| URL | Status | Type | Bytes |
|---|---|---|---|
| `/packs/avatar/1.1.0/catalog.json` | 200 | application/json | 109,224 |
| `/packs/dungeon-monsters/1.0.1/pack.json` (3D pack) | 200 | application/json | 2,126 |
| `/assets/apk/primary-chibi-2d/v1/pack.json` | 200 | application/json | 580,818 |
| `/rpg/skin.json` | 200 | application/json | 66,898 |
| `/login-image.png` | 200 | image/png | 1,744,795 |
| `/packs/dungeon-monsters/1.0.1/dragon-fire.glb` | 200 | model/gltf-binary | 503,864 |
| `/assets/apk3d/fonts/mitr-600-thai.woff2` | 200 | font/woff2 | 14,180 |
| `/en`, `/en/sign-in` (with `DATABASE_URL`) | 200 | text/html | — |

File counts in the layout: `packs` 720, `assets` 456, `rpg` 246 (equal to the real `public`). Without
`DATABASE_URL` the pages answer 500 ("DATABASE_URL is required in production runtime"); Cloud Run sets
it as a secret.

**Still open:** the same five requests against the image that Cloud Build makes (the first deploy smoke
test). The local check proves the layout of the runner stage, not the Alpine image itself.

## Result (2026-10-08)

Cloud Build a9198276 built the image from integration 68f28eb56 and deployed it without traffic
(revision `primary-advantage-app-00128-pac`, tag `rehearsal1`). Requests to the tag URL:

| Path | Status |
|---|---|
| `/packs/avatar/1.1.0/catalog.json` | 200 |
| `/packs/potion-shop/1.0.0/pack.json` | 200 |
| `/assets/apk/primary-chibi-2d/v1/pack.json` | 200 |
| `/rpg/skin.json` | 200 |
| `/login-image.png` | 200 |
