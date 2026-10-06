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
