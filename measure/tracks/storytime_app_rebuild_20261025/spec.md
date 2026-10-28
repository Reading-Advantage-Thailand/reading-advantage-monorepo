# Specification: Storytime app rebuild (an app in the monorepo)

**Track ID:** `storytime_app_rebuild_20261025`
**Type:** feature (classic FR list with acceptance checks)
**Status:** active. Opened 2026-10-25.
**Owner chain:** Daniel (owner, milestone judge, hard gates) → Monorepo orchestrator (track owner: build, review, integration, verification) → PM orchestrator (hand-offs to Workbooks and Forge).
**Plan:** [plan.md](./plan.md) · **Survival report S1 to S28:** [docs/s1-s28-survival.md](./docs/s1-s28-survival.md)
**Record of decisions:** S1 to S30 and the feature list, with the reuse verdict for each item, are in [docs/program-decisions-and-features.md](./docs/program-decisions-and-features.md); the old track is archived at [../archive/storytime_advantage_program_20261021/](../archive/storytime_advantage_program_20261021/) and keeps its full design. This track uses those decisions. It does not copy the old plan.

## 1. Architecture (Daniel, 2026-10-25)

Daniel: "Storytime is an APP in the MONOREPO."

- The Storytime system is its own app with its own service and container, inside reading-advantage-monorepo, sharing packages with primary-advantage.
- The app lives at `apps/storytime`. The teacher app and the at-home app are two route groups of this one app. This follows the AGENTS.md rule "one program, one app, one container".
- The app has its own Dockerfile, its own Cloud Build file, its own image, and its own Cloud Run service (S30). The service name is `storytime-app`.
- The app imports shared code through the pnpm workspace (`workspace:*`). A shared change goes into `packages/` in this repository. No other project takes part in a code change.
- Primary Advantage hosts no Storytime page, route, or host rule. A Storytime deploy never moves Primary traffic.
- The repository `~/Desktop/storytime-advantage` is retired and unused. No work goes there. Daniel decides when to delete it.

## 2. State at the opening (2026-10-25)

### 2.1 Survivors of the rollback

Daniel rolled back the first Storytime app build on 2026-10-25. The cause was the multimedia, not the location of the code. The first app build is void. These items survive:

- The 2D/3D models of the Chibi Sprouts cast (Forge).
- The songs, as material only. No song has Daniel's pass at his quality bar.
- Phonics graph v1 (mastery-advantage `ceb728d`).
- The phoneme bank: Daniel's 45 recordings (Workbooks `9478e1f`, `content/storytime/phonemes/daniel/`). On 2026-10-24 Daniel found hiss in the week 1 /n/ file. The cut files had high gain and no noise step. The recordings survive, and the files are made again. Daniel offered to do the noise step himself.
- The authored Level 2 weeks 1 to 8 and their Thai checks (Workbooks `content/storytime/l2/w01.json` to `w08.json`).

### 2.2 Code on master and on other branches

- `apps/storytime` does not exist on master. The void build exists only on the branches `master-next` and `storytime/own-app` (worktrees `~/Desktop/rama-worktrees/storytime-qr` and `~/Desktop/rama-worktrees/storytime`). This track does not merge those branches.
- The void Storytime QR page is still on master inside `apps/primary-advantage`: `app/[locale]/st/[level]/[week]/page.tsx`, `components/storytime/`, `content/storytime/`, `lib/storytime/`, `scripts/storytime/`, and the host rule in `proxy.ts`. Its removal is a deletion, so it waits for Daniel's word.
- `programSchema` in `packages/types/src/index.ts` already has `storytime` (`1e8e3f1f8`), with a test. The skill enums in `packages/domain/src/primary-mastery/` have no Phonics value.
- Primary's read-along player (`components/read-along/`, `lib/read-along/`, `hooks/use-read-along.ts`) serves the live Primary reading pages: articles, lesson reading, and story chapters.

### 2.3 Live service

Checked on 2026-10-25 with `curl` and read-only `gcloud` commands:

- The domain `storytime.reading-advantage.com` maps to the Cloud Run service `storytime-app` (project `primary-advantage`, region `asia-southeast1`).
- Revision `storytime-app-00008-tmb` (the void build) has 100 percent of the traffic.
- `https://storytime.reading-advantage.com/th/st/2/1` answers 404. The service URL answers 404 for the same path.

### 2.4 Content in Workbooks

- Workbooks owns the week contract `StorytimeWeekSchema`, version 1 (`dashboard/lib/storytime/schema.ts`). A week file is `content/storytime/l<level>/w<nn>.json`.
- Thai text is in `{ en, th }` objects. The contract has no separate Thai field.
- Level 2 week 1 ("Hello!") has `meta.status: published` (Workbooks `4d78b21`). Its latest commit `8e6df79` puts song cut 3 in the file. Daniel never passed cut 3. Weeks 2 to 8 are drafts.
- The week 1 decodable is a sound book. Week 1 teaches /n/ before the first vowel, so its words play whole (design §6.1).

### 2.5 Production rules

- The generation rules, draft 2 (`~/Desktop/storytime-approval/re/generation-rules-draft2.md`, 2026-10-24), answer the 156 faults of the audit of the first build.
- Rule 6.7 (a model pre-check before Daniel) is Daniel's rule. The other rules wait for Daniel's pass (page check RU4).
- This track uses draft 2 as its working standard. If Daniel changes a rule, this track follows the change on the same day.

## 3. Milestone 1: one week end to end

Milestone 1 is one week end to end: the teacher app, the at-home app, one read-along, one decodable, and one song at Daniel's quality bar.

- The milestone week is Level 2 week 1 (`/th/st/2/1`), unless Daniel names another week. Week 1 has the smallest cast (8 characters, S26), and its QR code is the first printed code.
- The week 1 decodable is a sound book, so it does not show blending. Tests on later shipped weeks cover blending. Daniel can move the milestone to another week at any time.
- Daniel judges the media at the milestone, not in each phase.
- Milestone 1 passes when Daniel passes each of the five items on the milestone review page (FR-12).

## 4. Functional requirements

Each acceptance check (AC) names its evidence class: **automated** (a test or a script), **model pre-check** (rule 6.7), **person-checked**, or **owner-passed**. An automated count is never acceptance of media (rule 6.2).

### FR-1 App and service

- `apps/storytime` is a Next.js app with the App Router. It uses `output: "standalone"` and `outputFileTracingRoot` at the monorepo root, as `apps/primary-advantage/next.config.ts` does.
- The package name is `storytime`. The locales are `th` (default) and `en`, with next-intl and the locale prefix "always".
- `apps/storytime/Dockerfile` builds from the monorepo root and runs `pnpm turbo run build --filter=storytime`. The runner starts `apps/storytime/server.js` on port 8080.
- `apps/storytime/cloudbuild.yaml` builds the image `asia-southeast1-docker.pkg.dev/primary-advantage/primary-advantage-repo/storytime-app`. It deploys the service `storytime-app` in `asia-southeast1` with `--no-traffic` and a revision tag. Milestone 1 needs no database and no secrets.
- A runbook gives the deploy command, the traffic step, and the rollback step. Only Daniel's go starts a deploy or a traffic move.

Acceptance:

- AC-1.1 (automated) `pnpm turbo run build check-types lint test --filter=storytime` exits 0.
- AC-1.2 (automated) A test reads `cloudbuild.yaml`: it names the service `storytime-app`, uses `--no-traffic`, and never names `primary-advantage-app`.
- AC-1.3 (automated) A test finds no import from `apps/primary-advantage` in `apps/storytime`, and no import from `apps/storytime` in `apps/primary-advantage`.
- AC-1.4 (automated) The Docker image builds locally from the monorepo root. The container answers `/th/st/2/1` with the week page.

### FR-2 Printed-URL continuity

- The at-home entry path is `/<locale>/st/<level>/<week>`. The printed form is `https://storytime.reading-advantage.com/th/st/<level>/<week>`.
- The path scheme is frozen from 2026-10-25. A change can add a path. A change never removes or renames a path.
- `?part=book|decodable|song` opens that part first.
- A path without a locale (for example `/st/2/1`) redirects to the `th` path.
- A week that does not exist or is not published answers with the HTTP status 404.
- The printed cards ship about 2026-11-22. Before the cards reach homes, the live service must answer every printed path with its week page. That deploy is Daniel's gate.

Acceptance:

- AC-2.1 (automated) A route test covers the path shape, `?part=`, the locale redirect, and the 404 status.
- AC-2.2 (automated) A test reads `home.songUrl` and `home.readAlongUrl` of every received week. Each URL resolves to a route of `apps/storytime`.
- AC-2.3 (automated, after Daniel's deploy go) A script requests every printed URL of the published weeks on the live domain. Each answers 200. The script records the URL, the revision, and the time.

### FR-3 Shared contracts

- `programSchema` keeps `storytime` (`packages/types`, `1e8e3f1f8`).
- The week contract is a Zod schema in `apps/storytime/lib/contracts/`. It follows Workbooks `StorytimeWeekSchema` version 1 for the fields that the app reads. It accepts extra keys.
- The fields are `meta`, `focus`, `opening`, `books[]`, `song`, `scripts[]`, `review[]`, `check`, `home`, and `tags`.
- The sentence timing has the Primary `SentenceTimepointSchema` shape (sentence, startTime, endTime, words) with an optional 1-based `page`.
- A published week must have exactly one book of each kind (`readalong`, `decodable`) and a picture file on every book page.
- The contract moves to `packages/types` when a second app reads weeks. Until then it stays in the app.

Acceptance:

- AC-3.1 (automated) The contract parses the shipped Workbooks weeks `l2/w01` to `l2/w08` at the handed-off commit. Tests load the shipped files, not hand-made fixtures (rule 11.3).
- AC-3.2 (automated) Each broken copy fails with the field path (rule 11.1). The copies have a missing book, a page with no picture file, times out of order, and a version other than 1.

### FR-4 Content receiving

- A script (`apps/storytime/scripts/receive-weeks.ts`) reads the Workbooks week files at a commit that the PM orchestrator hands off. It validates each week and writes it to `apps/storytime/content/l<level>/w<nn>.json`.
- The script lists every media file that each week needs, with its kind and the rule that checks it.
- The script never changes `meta.status`. Approval lives in the source repository (rule 12.1).
- A changed media file gets a new file name (rule 12.2). The upload to the production bucket goes with a deploy, on Daniel's go, and is checked file by file (rule 12.4).

Acceptance:

- AC-4.1 (automated) A run on the handed-off commit writes the weeks and lists the missing media by name.
- AC-4.2 (automated) A test shows that the script keeps the status of the source file.

### FR-5 At-home app: entry and home card

- The entry page needs no login. It writes no cookie, records no evidence, and has `noindex`.
- The page shows three tiles: read-along, decodable, and song. Each tile has a picture and a speaker control.
- A tap on the speaker plays the recorded label. The phone voice is never a fallback for content audio (rule 10.5). A label without a recording shows no speaker.
- Below the tiles, the home card shows the Thai parent line, the three words with recorded audio, the frame, and the activity.
- The page works in portrait and in landscape on a low-cost Android phone and an iPhone.
- The first load is at most 300 KB transferred, without media. Media loads only when the child opens a part.

Acceptance:

- AC-5.1 (automated) Tests show that the route is public, has `noindex`, and sends no `Set-Cookie` header.
- AC-5.2 (automated) A browser check measures each tap target at 64 px or more in portrait and in landscape.
- AC-5.3 (automated) A browser check records the network log. The log shows at most 300 KB before the first tap. It shows no media request before a part opens.

### FR-6 Read-along player

- The player core is a new shared package, `packages/read-along`. It starts from a copy of Primary's player logic. Primary keeps its own copy in this track (section 9, choice 4).
- The book shows one page on each screen, with its picture. Large arrows and a swipe move between pages.
- "Read it to me": the page audio plays, and the current word lights up in time.
- "My turn": no audio plays before a tap. A tap on a word plays that word from the book recording.
- A word plays from 30 ms before its start to its measured end. The end comes from the sound (the energy drop), never from the start of the next word (rule 10.2).
- Every sentence on a page plays and lights up (rule 10.3).
- The slow mode plays the real slow recording (`slowFile`, `slowSentences`), not a faster or slower playback rate (rule 10.1).
- A sound that fails to load shows a message (rule 10.4).

Acceptance:

- AC-6.1 (automated) Tests on a shipped two-sentence page show that each sentence seeks and lights up correctly.
- AC-6.2 (automated) A script exports every word cut of the milestone book as a file and measures the energy at both edges. A cut with sound at an edge fails. The script fails the cut-off "Hello" of BA1 (rule 11.1).
- AC-6.3 (model pre-check) Every word cut of the milestone book passes the word-cut rubric (rule 6.7) before Daniel hears it.

### FR-7 Decodable

- The decodable uses the player of FR-6.
- The first page is the sounds page: the element, its graphemes, and its sound from the phoneme bank. A tap plays the sound.
- A tap on a decodable word plays its sounds one by one from the phoneme bank. Then the whole word plays from the book recording.
- A pure function decides how a word plays. It uses the taught graphemes (`tags.taught`), the tricky words, and the sound-book flag. A tricky word and each word of a sound book play whole.

Acceptance:

- AC-7.1 (automated) Tests use the shipped weeks. Each word of week 1 plays whole. The CVC words of a later shipped week play in grapheme order.
- AC-7.2 (automated) Each phoneme file of the milestone passes the audio gate. The gate checks a noise floor below -60 dBFS, no clipping, and the loudness target of rule 5.2.
- AC-7.3 (model pre-check) Each phoneme file passes the phoneme rubric. The rubric fails the hissy `04-n.mp3` (rule 6.7d).

### FR-8 Song page

- The page shows the poster and a play button. No sound plays before a tap.
- A portrait phone plays `song.videoPhone` in a 9:16 box, at most 75 percent of the screen height, with `song.posterPhone`. Other screens play `song.video` in a 16:9 box with `song.poster`.
- Below the video, each lyric line lights up in time from `song.times`. Each line shows its gesture name and its picture. A picture shows the object of the line, never a gesture thumbnail (rule 9.1).
- Without a video, the page plays `song.audio` with the lit lyric lines.
- A karaoke tile shows only when `song.karaoke` exists. Karaoke waits for S28.

Acceptance:

- AC-8.1 (automated) Tests show no autoplay with sound and correct line timing from `song.times`.
- AC-8.2 (automated) A browser check measures the 9:16 box on a portrait phone and the 16:9 box on a laptop.

### FR-9 Teacher app

- The teacher routes are `/<locale>/teacher/<level>/<week>` (week view) and `/<locale>/teacher/<level>/<week>/<day>` (lesson flow).
- The week view shows the title and the element with its sound. It also shows the phonemic awareness skill, the tricky words, the frame, and the family words with pictures. It lists the five lessons by day and the three materials.
- The lesson flow shows the opening routine and then each step of the day's script, one step on each screen.
- Each step shows its title, its minutes, the four headings, and the Easier, Harder, and Group lines. The four headings are: what the teacher does, the English that the teacher says, what the students do, and what to watch.
- The flow shows the review strip of the day (`review[]`) and, on day 5, the Friday check (`check`).
- A toggle shows the Thai text of each `{ en, th }` field.
- A step with media opens the at-home player in class-screen mode. The flow stays open.
- The layout fits a landscape class screen (1920x1080) and a laptop.
- Milestone 1 has no teacher sign-in. Until Daniel decides question Q1, a production build serves no teacher route. An environment flag turns on the teacher routes, and the flag is off by default.

Acceptance:

- AC-9.1 (automated) Tests against the shipped milestone file show every item of the week view.
- AC-9.2 (automated) For each day, a test compares the steps on screen with the steps in the file. Each step has the four headings and the three variant lines.
- AC-9.3 (automated) With the flag off, every teacher route answers 404.

### FR-10 Milestone media

- The production side makes the media. Workbooks makes the book audio, the pictures, the lyric sheet, the video overlay, and the sound mix. Forge makes the option C renders from the 3D cast models. Daniel offered to do the phoneme noise step. Requests and files move through the PM orchestrator.
- This track sends the exact media list (FR-4) and receives the files.
- The song uses Lyria 3 Pro (S16) as the music source and option C (S27) as the video model. The milestone song is the first test of both. The current Lyria takes are material only.
- The read-along audio is one recording of each page in context, at kindergarten speed, by a voice that Daniel chose (rule 10.1). Each page picture shows the named object in the stated count (rules 9.1, 9.2).
- The decodable text passes the decodability gate (rule 8.3). The phoneme files come from Daniel's recordings after the noise step.
- Paid generation (for example new Lyria takes) waits for Daniel's go.

Acceptance:

- AC-10.1 (automated) Every file on the media list exists, with the expected size and type.
- AC-10.2 (model pre-check) Every media file of the milestone week passes its rubric. The run log with the model output is attached to the delivery (rule 6.7f).

### FR-11 Checks before Daniel

- Every sound, video, and picture passes three stages in this order: (1) measurement scripts, (2) the model pre-check of rule 6.7, and (3) Daniel.
- A file that fails stage 1 or stage 2 goes back to production with the reason. It never reaches Daniel (rule 6.6).
- The measurement scripts and the pre-check runner are in git under `apps/storytime/scripts/checks/`.
- A rubric counts only after it fails the known bad files and passes a file that Daniel passed (rule 6.7d).
- The model and its price are named and logged before each pre-check run. Release files get a second model from another provider (rule 6.7e).
- The agent side opens, plays, and checks every part on the review copy before Daniel sees the page (rule 6.5).

Acceptance:

- AC-11.1 (automated) Each measurement script fails on a broken copy before it counts (rule 11.1).
- AC-11.2 (model pre-check) The calibration log shows that each rubric fails its known bad files. These files are the cut-off "Hello" (BA1), `04-n.mp3`, the week 2 cut 1 (C1W2), and the gesture thumbnail for "One sun".

### FR-12 Milestone review

- A live review page shows five items. The items are the teacher app (week view and one lesson day), the at-home entry page, the read-along, the decodable, and the song.
- Each item has Pass, Fail, a comment, and Send, as in Daniel's earlier review pages.
- The review copy runs on a local server on the office network with the milestone week. It serves media from local files. The production bucket receives files only with a deploy, on Daniel's go.
- Sound and touch checks run on one real iPhone and one low-cost Android phone (rule 11.5). These are person checks.

Acceptance:

- AC-12.1 (owner-passed) Daniel passes all five items on the page. A section without an answer is open (rule 0.3).

## 5. Quality bar and hard gates

- Daniel judges the media at the milestone, not in each phase. The phases do not stop for a media look check.
- The four hard gates stay with Daniel: paid generation, deploys, deletions, and public dates.
- Deploys include a new Cloud Run revision, a traffic move, a domain mapping change, and an upload to the production bucket.
- Deletions include files of the void build, the void Storytime code in Primary, branches, worktrees, cloud resources, and the retired repository.
- Every other step continues without a stop to ask (Daniel, 2026-10-25). A task at a gate gets `[b] deferred:daniel`, and the work continues with the next task.
- A plan task is `[x]` only with its evidence class in the note (rule 7.1). A peer's report never closes a task (rule 7.2).

## 6. Non-functional requirements

- AGENTS.md applies: Zod at every boundary, JSDoc on exported functions, tests with the code, and no new cryptographic hashing.
- Server code logs through a structured logger, not `console.error`. A bucket write from code uses `@reading-advantage/storage`.
- Forge assets only. No ElvGames asset.
- Thai and English text. Daniel or a Thai reader that he names checks the Thai (rule 8.5).
- No launch date appears in user-facing text.
- Heavy jobs (build, Vitest, browser checks, Docker) run one at a time under `~/Desktop/primary-parity-progress/heavy.lock`. Vitest runs on changed files only, with `--maxWorkers=1`.
- Commits follow Conventional Commits. The header is 100 characters or less, including `(track_id: storytime_app_rebuild_20261025)`.

## 7. Out of scope for milestone 1

- Sign-in for teachers, children, or parents.
- Evidence, FSRS, cartridges, and the Chibi Sprouts shell (map, stars, seeds, pet, class garden).
- Finished media for weeks other than the milestone week.
- Print, the karaoke cut (S28), Level 1, and the locales `vi`, `cn`, and `tw`.
- The Primary catch-up module (S12) and the Phonics skill value (S8, with the first evidence code).
- Primary's switch to `packages/read-along` (plan Phase 7).

## 8. Open questions

| # | Question | Default until Daniel answers |
|---|---|---|
| S17 | Release-1 scope: does 2026-12-01 still mean weeks 1 to 8 in print and by QR? Does it include the teacher app? | Answer after milestone 1. Release-1 phases stay `[b] deferred:daniel`. |
| S26 | Cast size: all 13 or the S18 cap of 8? | Week 1 needs 8. Weeks 2 to 7 wait. |
| S28 | Karaoke in release 1, and may song audio go to a hosted separation service? | No karaoke tile. No audio leaves the machine. |
| Q1 | Teacher access: which sign-in protects the teacher app on a public service? | Teacher routes are off on public builds. |
| Q2 | Milestone week: Level 2 week 1, or a week whose decodable shows blending? | Level 2 week 1. |
| Q3 | Generation rules draft 2: Daniel's pass (RU4). | Draft 2 is the working standard. Rule 6.7 binds now. |
| Q4 | The void build: code fate (RU2) for the Primary copy on master, the branches `master-next`, `storytime/own-app`, and `storytime/primary-cleanup`, and their worktrees. | Nothing is deleted or merged. The rebuild reads the old code only as a reference. |

## 9. Choices made at the opening

The planner made these choices without a question, as Daniel ordered. Each choice keeps the risk low.

1. **One app, two route groups.** The teacher app and the at-home app are two route groups of `apps/storytime`. AGENTS.md has the rule: one program, one app, one container.
2. **At-home app before the teacher app.** The plan builds the at-home players first. The teacher flow uses them, and the printed URLs have a date.
3. **Week contract in the app.** Only Storytime reads weeks today. The contract moves to `packages/types` when a second app reads weeks.
4. **Primary keeps its player.** `packages/read-along` starts from a copy. Primary's reading pages use the current player, so this track does not change them. A tech-debt row records the copy. Primary switches in Phase 7.
5. **New deploys take no traffic.** `cloudbuild.yaml` deploys with `--no-traffic` and a tag. Each traffic move is a separate step with Daniel's go.
6. **Teacher routes off in production.** Without a sign-in decision (Q1), no public build serves teacher content.
7. **Recorded audio only.** The phone voice is never a fallback for content audio, so a label without a recording shows no speaker.
8. **Media from local files on the review copy.** The production bucket receives files only with a deploy.
9. **Draft 2 rules as the working standard.** They are stricter than no rules. Rule 6.7 is Daniel's rule.
10. **Locales `th` and `en` only.** The printed URLs use `th`. The parents read Thai. The content is English.
