# Runbook: help video sync (Primary in-app help)

Track `primary_in_app_help_20261023`, spec FR-8. The Monorepo session runs this step. The upload writes to the production bucket, so it needs the owner's go each time.

## When

- After PR adds or retakes a What's New video.
- After each upload day on YouTube (a teacher plays a video from YouTube only when `lib/help/youtube-ids.json` has its id).

## Steps

1. PR refreshes its links JSON in the PR repo: `node scripts/video/whats-new/youtube.mjs`.
2. For a new or retaken video: add or change its row in `apps/primary-advantage/lib/help/videos.ts` (routes, titles, length). Run the help tests: `npx vitest run lib/help scripts/help --maxWorkers=1` (under `heavy.lock`).
3. Stage the files (no upload). In `apps/primary-advantage`:

   ```
   npx tsx scripts/help/stage-help-videos.ts --out ~/Desktop/primary-parity-progress/help-stage
   ```

   The script checks each enabled video: the mp4 and the poster exist, `moov` comes before `mdat`, the codecs are H.264 and AAC, and the length is the registry length (2 s or less difference). It hard-links the files into `help-stage/help/whats-new/<id>.mp4` and `<id>.jpg`, and it writes `lib/help/youtube-ids.json`. Exit code 1 means a `PROBLEM` line: fix it first.
4. Upload (owner go). The command copies only new or changed files:

   ```
   gcloud storage rsync ~/Desktop/primary-parity-progress/help-stage/help/whats-new gs://primary-app-storage/help/whats-new --predefined-acl=publicRead --cache-control="public, max-age=3600"
   ```

   The bucket uses per-object access, so `--predefined-acl=publicRead` is necessary (the other media objects have an `allUsers` reader entry).
5. Check: `curl -sI https://storage.googleapis.com/primary-app-storage/help/whats-new/B4.mp4` gives 200 and `content-type: video/mp4`; the stage folder and the bucket have the same number of files (`gcloud storage ls gs://primary-app-storage/help/whats-new/ | wc -l`).
6. Commit `lib/help/youtube-ids.json` and any registry change. The teacher panel uses a new YouTube id after the next deploy.

## Facts

- 88 videos (G1 and G4 have no file), about 0.56 GB. Average 7 MB, 18 to 73 s.
- PR files: `~/Desktop/advantage-pr/assets/videos/primary-whats-new/wave1|wave2|wave3/` (not in git). The PR file for an id is `<id>-<name>-th.mp4`; a `-th-16x9.mp4` variant is not used.
- A retake keeps its id, so its URL stays the same. Browsers keep an old copy for one hour at most (`max-age=3600`).
