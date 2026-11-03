# Pilot report: Storytime standalone output and the content folder

Base commit: `01f2acfe8ae9d9ef88c2a62cb425992a00261bab`. Branch: `pilot/cloud-storytime-standalone-content`.
This change adds only this report. No source file changed. The trials ran in a scratch git worktree, and that worktree is gone.

## Result

- The current standalone output does **not** hold `apps/storytime/content`.
- Option A (`outputFileTracingIncludes` in `next.config.ts`) works. The standalone folder and the image both hold `content/source.json` and `content/l2/w01.json` to `w08.json`.
- Option B (one Dockerfile `COPY` line) works. The image holds the same 9 files.
- Recommendation: use option A. It keeps the files in the standalone folder itself, so any host that runs `server.js` gets them, not only the Docker image. It needs no Dockerfile change. Option B suits a case where the files must stay out of the Next.js trace.

## Commands and exit codes

| Step | Command | Exit |
|------|---------|------|
| 1 | `pnpm install --frozen-lockfile` | 0 |
| 2 | `./node_modules/.bin/turbo run build --filter=storytime` (baseline) | 0 |
| 3 | `ls -a apps/storytime/.next/standalone` and `find . -name w01.json -o -name source.json` | 0 (no match) |
| 5a | `git worktree add --detach <scratch>/wt HEAD` | 0 |
| 5b | `pnpm install --frozen-lockfile` (in the worktree) | 0 |
| 5c | `./node_modules/.bin/turbo run build --filter=storytime` (option A) | 0 |
| 7a | `docker info` (no daemon running) | 1 |
| 7b | `dockerd` started in the background, then `docker info` | 0 |
| 7c | `docker build -f apps/storytime/Dockerfile -t storytime-pilot:copy .` (no proxy) | 1 |
| 7d | same build, with `--network=host`, the proxy build args and a scratch CA line | 1 (Docker Hub 429) |
| 7e | retry of 7d | 1 (Docker Hub 429) |
| 7f | `docker pull mirror.gcr.io/library/node:22-alpine` then `docker tag ... node:22-alpine` | 0, 0 |
| 7g | `docker build ... -t storytime-pilot:copy .` (option B) | 0 |
| 7h | `docker run --rm --entrypoint sh storytime-pilot:copy -c 'ls -lR apps/storytime/content'` | 0 |
| 7i | `docker build ... -t storytime-pilot:trace .` (option A, no COPY line) | 0 |
| 7j | `docker run --rm --entrypoint sh storytime-pilot:trace -c 'find apps/storytime/content'` | 0 |

Notes on step 7:

- 7c failed at `corepack prepare pnpm@11.8.0`. The build container had no route to the session proxy and no proxy CA.
- For 7d onward, the scratch Dockerfile gained two lines in the `base` stage: `COPY ccr-ca.crt /etc/ccr-ca.crt` and `ENV NODE_EXTRA_CA_CERTS=/etc/ccr-ca.crt`. These lines serve this sandbox only. They do not belong in the real Dockerfile.
- Docker Hub returned 429 for `node:22-alpine`. The same image from `mirror.gcr.io` unblocked the build.

## Step 3: baseline standalone listing

```
apps/storytime/.next/standalone/
  apps/storytime/.next/   (BUILD_ID, manifests, server/)
  apps/storytime/package.json
  apps/storytime/server.js
  node_modules/
```

`apps/storytime/content` is absent. The route `/[locale]/st/[level]/[week]` reads no content file yet, so the tracer finds no reason to copy the folder.

## Step 4: current config

`apps/storytime/next.config.ts` sets `output: "standalone"` and `outputFileTracingRoot` to the monorepo root. It sets no `outputFileTracingIncludes`.

`apps/storytime/Dockerfile` copies `.next/standalone` to `/app` and `.next/static` to `/app/apps/storytime/.next/static`. It copies nothing from `content`. The `CMD` runs `node apps/storytime/server.js`. That `server.js` calls `process.chdir(__dirname)`, so at run time the working directory is `/app/apps/storytime` and `./content` resolves to `/app/apps/storytime/content`.

## Option A: exact lines (`apps/storytime/next.config.ts`)

Add one line after `outputFileTracingRoot`:

```ts
  outputFileTracingRoot: path.join(appDir, "../.."),
  outputFileTracingIncludes: { "/**": ["./content/**/*.json"] },
```

The glob path is relative to `apps/storytime`. The key `/**` matches every route. The build adds the files to `.next/server/app/[locale]/st/[level]/[week]/page.js.nft.json`.

Standalone listing after the build:

```
apps/storytime/content
apps/storytime/content/l2
apps/storytime/content/l2/w01.json
apps/storytime/content/l2/w02.json
apps/storytime/content/l2/w03.json
apps/storytime/content/l2/w04.json
apps/storytime/content/l2/w05.json
apps/storytime/content/l2/w06.json
apps/storytime/content/l2/w07.json
apps/storytime/content/l2/w08.json
apps/storytime/content/source.json
```

## Option B: exact line (`apps/storytime/Dockerfile`)

Add one line in the `runner` stage, after the `.next/static` copy:

```dockerfile
COPY --from=builder --chown=nextjs:nodejs /app/apps/storytime/content ./apps/storytime/content
```

The `pruner` stage already copies all of `apps/storytime`, so `content` reaches the `builder` stage.

Image listing (`storytime-pilot:copy`):

```
apps/storytime/content:
drwxr-xr-x  nextjs nodejs    l2
-rw-r--r--  nextjs nodejs    484 source.json
apps/storytime/content/l2:
-rw-r--r--  nextjs nodejs 172335 w01.json
-rw-r--r--  nextjs nodejs 188141 w02.json
-rw-r--r--  nextjs nodejs 188967 w03.json
-rw-r--r--  nextjs nodejs 189765 w04.json
-rw-r--r--  nextjs nodejs 197356 w05.json
-rw-r--r--  nextjs nodejs 200579 w06.json
-rw-r--r--  nextjs nodejs 211208 w07.json
-rw-r--r--  nextjs nodejs 111594 w08.json
```

The option A image (`storytime-pilot:trace`) lists the same 11 paths.

## Sizes

| Item | Bytes (`du -sb`) | `du -sh` |
|------|------------------|----------|
| `apps/storytime/content` (source) | 1,460,429 | 1.5M |
| `.next/standalone`, before (baseline) | 36,588,267 | 40M |
| `.next/standalone`, after (option A) | 38,051,250 | 41M |
| Difference | 1,462,983 | about 1.4 MiB |
| `/app` in the option B image | — | 41.2M |
| `/app` in the option A image | — | 41.2M |
| Image size, both options | — | 295MB |

Option B leaves the standalone folder at its baseline size. Its files arrive only in the image.

## Cleanup

- The scratch worktree is removed (`git worktree remove --force`, then `git worktree prune`).
- The two pilot images are removed (`docker rmi storytime-pilot:copy storytime-pilot:trace`).
