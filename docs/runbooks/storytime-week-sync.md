# Storytime weeks: receiving steps (monorepo)

Track `storytime_advantage_program_20261021`, plan task Q8. Spec: `qr-page-spec.md` sections 8 and 9.
For the monorepo session. Workbooks owns the week packages; the monorepo copies the page fields only.

| Item | Value |
|---|---|
| Source | `~/Desktop/Workbooks/content/storytime/l<level>/w<nn>.json` (contract `dashboard/lib/storytime/schema.ts`) |
| Script | `apps/primary-advantage/scripts/storytime/receive-weeks.ts` |
| App copy | `apps/primary-advantage/content/storytime/` (week files, `weeks.ts`, `media-list.txt`) |
| Bucket | `gs://primary-app-storage/storytime/<path>` (the path is relative to Workbooks `content/storytime/`) |
| Page | `https://storytime.reading-advantage.com/th/st/<level>/<week>` (also `/th/st/...` on the Primary host) |
| Heavy lock | `~/Desktop/primary-parity-progress/heavy.lock` |

## 1. Receive the weeks

1. Workbooks tells the monorepo session that a week changed or that a week is `published`.
2. In the worktree of the target branch, go to `apps/primary-advantage`.
3. Run the script: `pnpm exec tsx scripts/storytime/receive-weeks.ts` (add `--workbooks <path>` for another Workbooks folder).
4. Read the output. Each `PROBLEM` line names a week and the cause. The exit code is 1 when there is a problem.
5. Send each problem to Workbooks. Do not commit a published week that has a problem.

The script keeps only the page fields. The teacher scripts, the benchmark, and the prompts stay in Workbooks.
A week shows on the page only when `meta.status` is `published` and the week has one book of each kind.

## 2. Check and commit

1. Look at the change: `git diff --stat content/storytime`.
2. Run the tests under the lock: `flock -w 3000 ~/Desktop/primary-parity-progress/heavy.lock pnpm exec vitest run lib/storytime components/storytime --maxWorkers=1`.
3. Commit `content/storytime/` only: `chore(storytime): receive weeks <list> (track_id: storytime_advantage_program_20261021)`.

## 3. Upload the media (Daniel's go)

1. The script writes `content/storytime/media-list.txt` and prints the upload loop. The list has the pictures, the book and song audio, the videos, and the phoneme recordings of the words that blend.
2. Daniel gives the go for the production bucket. Then run the printed loop, or Daniel runs it with `!`.
3. Check one file of each kind: `curl -sI "https://storage.googleapis.com/primary-app-storage/storytime/<path>" | head -1` gives `200`.

## 4. Deploy (Daniel's go)

1. A content change needs a deploy of the Primary service `primary-advantage-app` (`asia-southeast1`).
2. Daniel decides the deploy and the master merge. Prepare the commands; Daniel runs them.

## 5. Map the Storytime host (one time, Daniel's go)

1. Map the domain to the Primary service: `gcloud beta run domain-mappings create --service primary-advantage-app --domain storytime.reading-advantage.com --region asia-southeast1`.
2. Add the DNS record that the command prints (a `CNAME` for `storytime` to `ghs.googlehosted.com.`) in the Squarespace zone of `reading-advantage.com`. Do not change the apex `MX` or `TXT` records.
3. Wait for the certificate: `gcloud beta run domain-mappings describe --domain storytime.reading-advantage.com --region asia-southeast1` shows `Ready`.

The proxy (`lib/storytime/host.ts`) serves only `/<locale>/st/...` on the Storytime host. Every other path goes to the same path on `https://primary.reading-advantage.com`.
The Storytime host registers no service worker, and the page links no manifest, so the phone offers no install.

## 6. Check the page

1. Open `https://storytime.reading-advantage.com/th/st/<level>/<week>` on a phone with no sign-in.
2. Run the acceptance checks of `qr-page-spec.md` section 12 for each new week.
3. Open `/th/st/<level>/99`: the page gives 404.
