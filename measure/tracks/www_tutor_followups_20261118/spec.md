# Spec: www Tutor Advantage follow-ups (picture and copy)

Track: `www_tutor_followups_20261118` (standard lane: three phases).
Author model: opencode-go/deepseek-v4.1-flash.
Source: PM order 2026-11-18 for the Monorepo www lane (orchestrator session
`ses_e1653aa5cffeDR7OhMeOx59iEZ`). Owner words: Daniel, Google Tasks `LU1FRkk2`, 2026-11-18.
Page: `apps/www-reading-advantage` `/products/tutor-advantage` in en, th, and zh.
Parent: the archived track `measure/archive/www_tutor_calculator_20261117/`.

## 1. Order and source

The parent track closed at `80ac554b4` and left five items open (parent spec section 10, parent
plan section "Answers owed to PR"). Each item goes in the next www push. This track closes four
copy items and two picture items.

Sources, read at authoring time (2026-11-18):

1. Parent spec D-19 and section 10.
2. Parent plan, section "Answers owed to PR".
3. PR handoff `/home/daniebo/Desktop/advantage-pr/11-content/www-tutor-advantage-calculator-handoff.md`,
   version 0.8, 2026-11-18. Sections 6, 6.1, 7, 8.4, 8.5, and 8.6.
4. The picture handoff `/home/daniebo/Desktop/handoff/a63-become-a-tutor/`. It holds two sources
   and `SHA256SUMS`:
   - `2026-11-13-tutor-advantage-img1-1920x1080.jpg`, the become-a-tutor block.
   - `2026-11-06-tutor-advantage-img1-1920x1080.jpg`, the hero.
5. Daniel's look gate, 2026-11-18, relayed by the PM.
6. The live page at `af78cfb43`, the parent closeout, and the parent push of `af78cfb43`.

### 1.1 The picture check

The command `sha256sum -c SHA256SUMS` exits 0 in the picture folder on 2026-11-18. The output has
one `OK` line for each of the two sources. The result is evidence in this spec and in the plan.

The track adds no hash field to `metadata.json` and no checksum to the spec. The repository
records content by the delivered file and by Git. AGENTS.md "Hashing and Provenance Policy"
applies.

### 1.2 The sources of the strings

This spec holds every new string. Section 5 holds the exact text. The implementation reads no
file outside the repository. The tests read no file outside the repository and compute no hash.

## 2. The three phases

| Phase | Delivers | Dependency |
|---|---|---|
| 1 | The new hero picture, the new `#become-a-tutor` picture, the two picture entries, the 16:9 boxes, the two alts, and the page check of both blocks | The PR alt text and its fact gate for each picture |
| 2 | Four PR copy items: `needsOwnStudents`, the leg-total label, `graph.caption`, and the Thai Reedy line | The fact gate of each item |
| 3 | The full www gates, one www-only fast-forward push, the CD watch, and the live checks | The PM page check |

Page order does not change. The hero stays at the top. The block stays at `id="become-a-tutor"`.

Phase 1 does not wait for `graph.caption`. The picture work ships today.

## 3. Decisions

### D-1 The picture keeps the full 16:9 frame

PM decision, 2026-11-18, accepted and not pending. PM words:
"My 4:3 order was wrong; all five faces matter more."

The block keeps the full frame of the source file. The image box changes from `aspect-4/3` to
`aspect-video`. No crop ships. This decision keeps all four faces and the book.

The PM corrected the face count on 2026-11-18: the file is Daniel's choice, and it shows one tutor
and three children, which is four faces. The words "five faces" in the order were wrong.

Reason: the source is 1920 by 1080. The PM measurement gives a face span of x=185 to x=1895,
which is 1710 px. A 4:3 frame at 1080 px height is 1440 px wide. The face span is wider than
1440 px.

A second reading of the delivered file gives a face span of about x=185 to about x=1855, which
is 1670 px. The second reading uses a 100 px grid over the file. Both spans are wider than
1440 px. The crop cannot keep all four faces and the book.

The book sits at about x=565 to x=810. The book stays inside either span.

The file check `sha256sum -c SHA256SUMS` exits 0. The file is the right one.

### D-2 The hero also gets a new picture

PM order 2026-11-18, from Daniel's look gate. Owner words:
"You repeat the hero image later down the page. The tutor and student are also white presenting."

The hero gets a new picture:

| Item | Value |
|---|---|
| Source | `/home/daniebo/Desktop/handoff/a63-become-a-tutor/2026-11-06-tutor-advantage-img1-1920x1080.jpg` |
| Check | `sha256sum -c SHA256SUMS` exits 0 on 2026-11-18 |
| Subject | One Thai tutor, three children, the Primary Advantage Origins 2 workbook, and the student app on a phone |
| Output | `/images/tutor-advantage-hero-2026-11-06.webp`, 1920 by 1080, quality 85, method 6 |
| Probe size | 165,522 bytes |

The hero shows the full 16:9 frame. No crop ships. The faces span about x=175 to x=1700 of 1920.
The book stays in frame. The faces and the book stay in frame at 390, 980, and 1280 px.

The hero stays the eager, high-priority image (AC-23 of the archived track). The `priority` prop
at `page.tsx:195` stays.

Reason: Daniel's words above. The hero and the block shared one file, and the file showed
white-presenting people.

The hero alt `heroExtra.imageAlt` changes with the picture. PR owes it (D-5).

This decision supersedes the orchestrator answer of 2026-11-18 that kept the old hero picture.

### D-3 The two picture entries

`productPictures.tutorSession` splits into two entries with true width and height in
`apps/www-reading-advantage/src/lib/product-pictures.ts`:

| Entry | File | Size | Used by |
|---|---|---|---|
| `tutorHero` | `/images/tutor-advantage-hero-2026-11-06.webp` | 1920 by 1080 | The hero, `page.tsx:195` |
| `tutorTeachClass` | `/images/tutor-advantage-teach-class.webp` | 1920 by 1080 | The block, `page.tsx:329..332` |

`tutorSession` and its 1024 by 1024 entry are removed. The old file
`/images/tutor-advantage-hero.jpg` leaves the page.

Parent D-19 said the hero and the become-a-tutor block share one file. That part of D-19 is
superseded.

### D-4 The two new files

Both files are webp at 1920 by 1080, quality 85, method 6.

| Source | Output | Probe size |
|---|---|---|
| `2026-11-13-tutor-advantage-img1-1920x1080.jpg` | `public/images/tutor-advantage-teach-class.webp` | 190,298 bytes |
| `2026-11-06-tutor-advantage-img1-1920x1080.jpg` | `public/images/tutor-advantage-hero-2026-11-06.webp` | 165,522 bytes |

The gate limit is 300 KB per file. The Reedy file is 940 KB, so both files are in range.

The conversion tool is the Python library Pillow. `cwebp`, `magick`, and `convert` are not
installed on this machine. Pillow reports webp support, and it reads and writes the file.

### D-5 The alt keys keep their names

Two keys change with the pictures:

| Key | Picture | State |
|---|---|---|
| `tutorRole.alt` | The teach-class block | Delivered in PR section 8.6; fact gate PASS on the third pass, 2026-11-18 |
| `heroExtra.imageAlt` | The hero | Owed by PR; the gate waits on the PR text and its fact gate |

The zh value equals en for both keys, as for every other alt of the page.

The old hero alt and the old block alt describe a tutor and a child with a tablet. Both sentences
are false for the new pictures. A picture cannot ship with a false alt.

Section 5.5 holds the delivered `tutorRole.alt` text. Open question Q4 covers the hero alt.

### D-6 `needsOwnStudents` is a fourth explain state

`explainVariant` returns one of four states after Phase 2:

| State | Condition |
|---|---|
| `zero` | The network volume is 0 |
| `needsOwnStudents` | The own volume is 0 and at least one leg has students |
| `ownOnly` | No leg payout |
| `withLegs` | A leg payout |

Today the second case returns `zero`. The `zero` line reads "Add students to see a month." That
line hides the settlement rule: the code pays 0 to a tutor with legs and no own students. Parent
D-18 records the rule.

The key sits at `calculator.explain.needsOwnStudents`. PR writes `calc.result.needsOwnStudents`.
The page and the component render the explain slot as `copy.explain[variant]`
(`src/components/marketing/tutor-commission-calculator.tsx:472`). The `results` object holds row
labels only. The key path follows the existing block. The words do not change.

### D-7 The caption and the label change in three locales

`graph.caption` and `graph.legCommissionBar` change in en, th, and zh. The zh values equal the en
values, per parent D-10.

### D-8 The Thai Reedy line changes alone

The Thai sentence replaces `platformFeatures.features[2].description` in the th block only. The
en and zh values stay. The live Thai line is a fragment with no verb, as PR handoff section 8.5
records. Daniel checks the Thai on the live page after the push.

### D-9 Each copy item ships only after its fact gate

PR handoff section 7 holds the gate lines. The state at authoring time:

| Item | Gate state |
|---|---|
| `needsOwnStudents` | PASS, 2026-11-17 |
| `graph.legCommissionBar` | PASS, 2026-11-18 |
| Thai Reedy line | PASS, 2026-11-18 |
| `tutorRole.alt` | PASS, third pass, 2026-11-18 |
| `graph.caption` | No gate line |
| `heroExtra.imageAlt` | No gate line |

Section 8 maps each item to its gate. Open question Q2 covers the caption. Open question Q4
covers the hero alt.

### D-10 The push follows the PM page check

The PM runs a page check at 390, 980, and 1280 px. The check covers the hero and the
`#become-a-tutor` block. The push comes after a PASS. The push is one www-only fast-forward from
`origin/master`. No deploy command runs from the session. Daniel owns the deploy gate.

### D-11 The zh result line takes the PR zh draft

The zh block takes the zh text of section 5.1 for `calculator.explain.needsOwnStudents`. PR
supplies the line, and the PM asked for all three locales. The line equals the PR draft until the
contracted Chinese speaker checks it. The code comment marks it `draft`.

Every other new zh value in this track equals en (D-7).

## 4. Phase 1: the two pictures

### 4.1 The sources

| Item | Hero | Block |
|---|---|---|
| Path | `/home/daniebo/Desktop/handoff/a63-become-a-tutor/2026-11-06-tutor-advantage-img1-1920x1080.jpg` | `/home/daniebo/Desktop/handoff/a63-become-a-tutor/2026-11-13-tutor-advantage-img1-1920x1080.jpg` |
| Size | 1920 by 1080 | 1920 by 1080 |
| Format | JPEG, RGB, baseline | JPEG, RGB, baseline |
| Check | `sha256sum -c SHA256SUMS` exit 0 | `sha256sum -c SHA256SUMS` exit 0 |
| Subject | One Thai tutor, three children, the Primary Advantage Origins 2 workbook, the student app on a phone | One tutor, three children, the Primary Advantage Origins 2 workbook, the student app on a phone |

### 4.2 The commands

The conversion runs once per source and writes the repo files:

```bash
python3 - <<'PY'
from PIL import Image
pairs = [
  ("2026-11-06-tutor-advantage-img1-1920x1080.jpg", "tutor-advantage-hero-2026-11-06.webp"),
  ("2026-11-13-tutor-advantage-img1-1920x1080.jpg", "tutor-advantage-teach-class.webp"),
]
base = "/home/daniebo/Desktop/handoff/a63-become-a-tutor"
outdir = "apps/www-reading-advantage/public/images"
for src, out in pairs:
    im = Image.open(f"{base}/{src}").convert("RGB")
    im.save(f"{outdir}/{out}", "WEBP", quality=85, method=6)
PY
```

The check command prints the size and the byte count of each file:

```bash
python3 -c "from PIL import Image; import os; d='apps/www-reading-advantage/public/images'; [print(n, Image.open(f'{d}/{n}').size, os.path.getsize(f'{d}/{n}')) for n in ('tutor-advantage-hero-2026-11-06.webp','tutor-advantage-teach-class.webp')]"
```

### 4.3 The page

The hero sits at `src/app/[locale]/(marketing)/products/tutor-advantage/page.tsx:192..198`. It
calls `ProductPicture` with `priority`. The block sits at lines 324..336. Line 334 holds the class
string.

| Line | Now | After |
|---|---|---|
| 195 | `picture={productPictures.tutorSession}` | `picture={productPictures.tutorHero}` |
| 329 | `src={productPictures.tutorSession.src}` | `src={productPictures.tutorTeachClass.src}` |
| 331 | `width={productPictures.tutorSession.width}` | `width={productPictures.tutorTeachClass.width}` |
| 332 | `height={productPictures.tutorSession.height}` | `height={productPictures.tutorTeachClass.height}` |
| 334 | `className="aspect-4/3 w-full object-cover"` | `className="aspect-video w-full object-cover"` |

The hero keeps `priority` and `alt={t("heroExtra.imageAlt")}`. `ProductPicture` renders
`h-auto w-full`, so the 1920 by 1080 file shows the full 16:9 frame. The block alt line 330 stays
`alt={t("tutorRole.alt")}`. The `sizes` line stays.

The manifest at `src/lib/product-pictures.ts:56..61` replaces `tutorSession` with two entries:

```ts
/** The hero picture (spec D-2). */
tutorHero: {
  src: "/images/tutor-advantage-hero-2026-11-06.webp",
  width: 1920,
  height: 1080,
  portrait: false,
},
/** The classroom picture of the become-a-tutor block (spec D-3). */
tutorTeachClass: {
  src: "/images/tutor-advantage-teach-class.webp",
  width: 1920,
  height: 1080,
  portrait: false,
},
```

### 4.4 The alts

Two locale keys change:

| Key | Locale lines | State |
|---|---|---|
| `tutorRole.alt` | en 153, th 490, zh 827 | Delivered text in section 5.5 |
| `heroExtra.imageAlt` | en 19, th 356, zh 693 | Owed by PR (section 5.6) |

### 4.5 The old hero file

`/images/tutor-advantage-hero.jpg` leaves the page. The delete runs only after a scan finds no
other reference:

```bash
rg -n "tutor-advantage-hero\.jpg" apps/www-reading-advantage/src --glob '!**/*.test.*'
```

Pass: no output. Test files may name the string only as the forbidden file of the new case (c).

Then `git rm apps/www-reading-advantage/public/images/tutor-advantage-hero.jpg`.

If the scan finds a reference in a source file, keep the file and record the path in the task. The
page still may not show it (AC-16).

### 4.6 The tests

File `src/app/[locale]/(marketing)/products/tutor-advantage/page.images.test.tsx`. The page
renders with the real dictionaries in en, th, and zh.

1. The hero case (lines 184..194) pins `/images/tutor-advantage-hero-2026-11-06.webp` and
   `text(locale, "heroExtra.imageAlt")`. AC-14.
2. The case "AC-22: the become-a-tutor block" (lines 243..254) pins
   `/images/tutor-advantage-teach-class.webp` and `text(locale, "tutorRole.alt")`. AC-15.
3. A new case "AC-16: no image uses the old hero file" reads every `img` of the page and asserts no
   reference contains `tutor-advantage-hero.jpg`. AC-16.
4. A new case "AC-17: no two content images share a file" maps each `img` of the page to its file,
   drops the files under `/media/brand/`, and asserts the list holds no duplicate. AC-17.
5. A new case "AC-18: both pictures have the expected size" reads the webp header of both files
   with `webpSize` and asserts 1920 by 1080. It asserts each byte count is at or below 300 KB.
   AC-18.
6. The manifest test of the block box asserts `aspect-video` and no `aspect-4/3` (spec 4.3).
7. The three book cases and the banned-file case stay as they are.

File `src/app/[locale]/(marketing)/products/tutor-advantage/page.phase3.adversarial.test.tsx`:

1. `expectedContentImages` (lines 352 and 357) takes the two new files, one per block.
2. The preload case (line 437) expects `/images/tutor-advantage-hero-2026-11-06.webp` in
   `imagesrcset`.
3. The case that only the hero is eager stays. It reads the hero alt, which is unchanged as a key.

### 4.7 The order of the Phase 1 tasks

Task 1.0 passed on 2026-11-18. Task 1.1 gates the hero alt. A picture cannot ship with a false
alt (D-5). The hero picture task and the block picture task ship in one change with their alts.

## 5. Phase 2: the PR copy

Each item in this section is one task with its own fact gate. Section 8 records the gate.

### 5.1 `calc.result.needsOwnStudents`

The key is `calculator.explain.needsOwnStudents` (D-6). PR calls it `calc.result.needsOwnStudents`.

English:

> Your own class unlocks your network commission. Add at least one personal student this month, and your legs count toward your payout.

Thai (draft; Daniel checks on the built page):

> คลาสของคุณเองปลดล็อกค่าคอมมิชชันจากเครือข่าย เพิ่มนักเรียนในคลาสของคุณเองอย่างน้อย 1 คนในเดือนนี้ สายของคุณก็นับเข้ายอดจ่ายของคุณ

zh (draft; the contracted Chinese speaker checks it):

> 您自己的班级是解锁网络佣金的关键。本月只要有至少一名您自己的学员，您各团队的业绩就会计入您的结算。

The zh block takes this line in zh (D-11). PR says the Monorepo may ship the zh line or the English
line until the Chinese speaker checks it. Decision: the zh block takes the zh line, because PR
supplies it and the PM asked for all three locales. The line stays a draft in the code comment.

Behaviour: the line shows when the own students are 0 and at least one leg has students. The net
payout is 0 in that state. The `zero` line shows only when the network volume is 0.

### 5.2 `graph.legCommissionBar`

| Locale | Text |
|---|---|
| en | Commission of all legs |
| th | ค่าคอมมิชชันของทุกสาย |
| zh | Commission of all legs |

The current en and zh value is "Commission of each leg". The current th value is
"ค่าคอมมิชชันของแต่ละสาย".

### 5.3 `graph.caption`

English:

> Each leg has its own bar: the volume it brings and the commission it earns on its own. Your payout is your rate on the whole volume, minus the commissions of the legs.

Thai:

> แต่ละสายมีแท่งของตัวเอง: ยอดที่สายนั้นพามา และค่าคอมมิชชันที่สายนั้นได้เอง ยอดจ่ายของคุณคืออัตราของคุณคูณกับยอดรวมทั้งเครือข่าย ลบด้วยค่าคอมมิชชันของทุกสาย

zh equals en.

The current lines start "Each bar is one leg:" in en and zh, and "แท่งแต่ละแท่งคือหนึ่งสาย:" in th.
Only the first clause changes.

### 5.4 The Thai Reedy line

The key is `platformFeatures.features[2].description` in the th block.

| Column | Text |
|---|---|
| Live Thai | การฝึกพูดกับ Reedy สำหรับนักเรียนที่มีแพ็กเกจคลาสที่ใช้งานอยู่ และในบทเรียนที่เรียนจบแล้ว |
| English (unchanged) | Reedy voice practice is open to students with an active class package, on lessons they finished. |
| New Thai | การฝึกพูดกับ Reedy เปิดให้นักเรียนที่มีแพ็กเกจคลาสที่ยังใช้งานอยู่ใช้ได้ ในบทเรียนที่เรียนจบแล้ว |

The zh line stays as it is. The zh line reads
"Reedy 口语练习面向持有有效课程包的学生，用于已完成的课程。".

The test `src/__tests__/www-tutor-reedy-claim.test.tsx` pins the line at `PAGE_REEDY.th`
(lines 97..101). The constant changes to the new Thai.

### 5.5 The alt text (`tutorRole.alt`)

The text below is the delivered alt, PR handoff version 0.8 section 8.6 (lines 386..392). Its fact
gate passed on the third pass on 2026-11-18.

| Key | English | Thai |
|---|---|---|
| `tutorRole.alt` | A tutor with three schoolchildren in a bright classroom; one holds the Primary Advantage Origins 2 workbook, another the student app on a phone. | ติวเตอร์กับเด็กนักเรียนสามคนในห้องเรียนที่สว่าง คนหนึ่งถือเวิร์กบุ๊ก Primary Advantage Origins 2 อีกคนถือโทรศัพท์ที่เปิดแอปนักเรียน |

zh equals en.

### 5.6 The hero alt (`heroExtra.imageAlt`, owed)

The hero picture changes, so the hero alt must change. The current value describes a tutor and a
child with a tablet.

PR owes the en and th text, and the PM asked PR on 2026-11-18. The zh value equals en. The key
stays `heroExtra.imageAlt` at en 19, th 356, zh 693.

Task 1.1 waits on the PR text and its fact gate. The old text does not ship with the new picture.

### 5.7 The tests of Phase 2

| Test file | Change |
|---|---|
| `src/__tests__/www-tutor-calculator.locale.test.ts` | The `CALC_EN`, `CALC_TH` fixtures gain `explain.needsOwnStudents` and hold the new caption and label. `CALC_EN` is also the zh expectation. |
| `src/lib/tutor-commission.adversarial.test.ts` | The case at line 384 expects `needsOwnStudents`, not `zero`. The case at line 553 keeps `zero` for a zero volume. |
| `src/components/marketing/tutor-commission-calculator.test.tsx` | A new case types own students 0 and one leg with students. It asserts the `needsOwnStudents` line in en and th. The `zero` cases at lines 137, 384, 399, and 415 stay for the zero-volume state. |
| `src/components/marketing/tutor-commission-calculator.adversarial.test.tsx` | The case at line 253 keeps `zero` for a zero volume. A new case asserts the payout is 0 and the line is `needsOwnStudents` for legs without own students. |
| `src/__tests__/www-tutor-reedy-claim.test.tsx` | `PAGE_REEDY.th` takes the new Thai. |

The locale test deep-equals the whole `calculator` block in en, th, and zh. Every added key and
every changed value appears there first, as a failing test.

## 6. Phase 3: gates, push, and live checks

### 6.1 The gate commands

| Gate | Command | Pass |
|---|---|---|
| www suite | `bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'pnpm --filter www-reading-advantage exec vitest run --maxWorkers=1'` | exit 0 |
| types | `pnpm --filter www-reading-advantage exec tsc --noEmit -p .` | exit 0 |
| lint | `pnpm --filter www-reading-advantage lint` | exit 0, no `shadcn/*` error in a touched file |
| build | `pnpm --filter www-reading-advantage build` | exit 0 |
| downline scan | `rg -n -i "downline\|ดาวน์ไลน์" apps/www-reading-advantage/src --glob '!**/*.test.*'` | exit 1, no output |
| affected apps | `node scripts/ci/affected-apps.mjs --base 80ac554b426551e5749f0e2cd500cbbf0eb93530 --head <HEAD 40 hex>` | lists www-reading-advantage only |

The base commit is `80ac554b426551e5749f0e2cd500cbbf0eb93530` (the branch point on
`origin/master`). The head is the full 40-character commit id. The script rejects a short id.

### 6.2 The page check

The PM checks the hero and `#become-a-tutor` at 390, 980, and 1280 px, in en and th. The check of
the calculator is optional for this push.

The session prepares the evidence before it asks for the check:

1. Build the app: `pnpm --filter www-reading-advantage build`.
2. Start it: `pnpm --filter www-reading-advantage start` on port 3107.
3. Capture both blocks at the three widths in en and th. Twelve captures.
4. Write the captures and a `checks.json` to `measure/runs/www_tutor_followups_20261118/`.
5. Send the folder path to the PM.

Each capture must show all four faces and the book, with no crop and no horizontal scroll.

The PM owns the PASS. No push runs before the PASS.

### 6.3 The push

One fast-forward push of the track commits to `origin/master`. The changed paths are
`apps/www-reading-advantage/**` and `measure/**` only.

The push needs Daniel's standing approval, which the parent track recorded (Daniel, 2026-11-15).
No deploy command runs from the session. Cloud Build starts from the CD workflow.

### 6.4 The live checks

The session reads the service URL:

```bash
gcloud run services describe www-reading-advantage --platform managed \
  --region asia-southeast1 --format='value(status.url)'
```

Then it checks the three pages:

1. `/en/products/tutor-advantage`
2. `/th/products/tutor-advantage`
3. `/zh/products/tutor-advantage`

Each page must answer HTTP 200. Each page must hold `tutor-advantage-hero-2026-11-06.webp`,
`tutor-advantage-teach-class.webp`, and the new caption text. No page may hold
`tutor-advantage-hero.jpg`, `downline`, `ดาวน์ไลน์`, or "Tutor Advantage only".

The CD run id and its result go in the ledger at closeout.

## 7. Out of scope

- A crop of either picture at any ratio.
- A third picture, or a change to the book covers and the Reedy picture.
- A repeat use of one content file by two blocks of the page.
- A zh translation written in this session. The zh values are the PR values or the en values.
- A change to the gallery, the presets, the rate curve, or the tax rule.
- A change to another page, another locale file, or another app.
- A framework upgrade, a dependency change, or a lockfile change.
- A hash or checksum field.
- A deploy command, a Cloud Run change, or a public date.

## 8. Gates and their state

| Item | Gate | State at authoring | Task |
|---|---|---|---|
| The block picture and its 16:9 box | PM D-1 accepted 2026-11-18 | Accepted | 1.3, 1.4 |
| The hero picture and its 16:9 frame | Daniel's look gate, 2026-11-18 | Accepted | 1.3, 1.4 |
| `tutorRole.alt` | PR text plus PR fact gate | PASS, third pass, 2026-11-18 | 1.0 |
| `heroExtra.imageAlt` | PR text plus PR fact gate | Owed by PR | 1.1 |
| `needsOwnStudents` | PR fact gate | PASS 2026-11-17 | 2.2 |
| `graph.legCommissionBar` | PR fact gate | PASS 2026-11-18 | 2.3 |
| Thai Reedy line | PR fact gate | PASS 2026-11-18 | 2.4 |
| `graph.caption` | PR fact gate | No gate line | 2.5 |
| The push | PM page check of both blocks | Pending | 3.2, 3.3 |

## 9. Acceptance criteria

**AC-1.** The block `#become-a-tutor` shows `/images/tutor-advantage-teach-class.webp` in en, th,
and zh. The hero shows `/images/tutor-advantage-hero-2026-11-06.webp` in all three.

**AC-2.** The image box of the block uses `aspect-video`. It does not use `aspect-4/3`. The file
is 1920 by 1080, so the box and the file share one ratio and the picture shows no crop.

**AC-3.** The block alt equals `tutorRole.alt` of the locale. The value is the PR alt text of
section 5.5. The th value is the Thai text of section 5.5. The zh value equals en.

**AC-4.** The teach-class file is a webp of 1920 by 1080. Its size is at or below 300 KB. The test
reads the header and computes no hash.

**AC-5.** A tutor with 0 own students and at least one leg with students sees
`calculator.explain.needsOwnStudents` and a net payout of 0. A tutor with 0 volume sees
`calculator.explain.zero`.

**AC-6.** `graph.caption` equals the text of section 5.3 in en and th. The zh value equals en.

**AC-7.** `graph.legCommissionBar` equals "Commission of all legs" in en and zh, and
"ค่าคอมมิชชันของทุกสาย" in th.

**AC-8.** `platformFeatures.features[2].description` in th equals the New Thai of section 5.4. The
en and zh values stay as they are.

**AC-9.** Every gate command of section 6.1 passes. The www suite runs with `--maxWorkers=1`
through heavy-run.

**AC-10.** The PM page check passes for the hero and `#become-a-tutor` at 390, 980, and 1280 px.
The captures sit in `measure/runs/www_tutor_followups_20261118/`.

**AC-11.** The push is one fast-forward to `origin/master`. It touches only
`apps/www-reading-advantage/**` and `measure/**`.

**AC-12.** The three live pages answer HTTP 200 and hold the new strings. The CD run succeeds.

**AC-13.** No test reads a file outside the repository. No test computes a hash. `metadata.json`
holds no hash field. `git status` is clean at closeout.

**AC-14.** The hero shows `/images/tutor-advantage-hero-2026-11-06.webp` with
`heroExtra.imageAlt` in en, th, and zh. The hero is eager and high-priority, as AC-23 of the
archived track requires.

**AC-15.** `#become-a-tutor` shows `/images/tutor-advantage-teach-class.webp` with `tutorRole.alt`
in en, th, and zh.

**AC-16.** No `img` of the page references `tutor-advantage-hero.jpg` in en, th, and zh. The old
file is absent from `public/images/` unless task 1.5 records a remaining source reference.

**AC-17.** No two content images of the page share a file in en, th, and zh. The files under
`/media/brand/` are excluded.

**AC-18.** Both new files are webp of 1920 by 1080. Each size is at or below 300 KB. The test reads
the header and computes no hash.

## 10. Open questions

### Resolved on 2026-11-18

**Q1. The face count and the file variant.** Resolved. The file is Daniel's choice, and
`SHA256SUMS` checks OK. The file shows one tutor and three children, which is four faces. The
words "five faces" and "four children" in the first order were wrong. D-1 keeps all four faces and
the book.

**Q3. The alt delivery and its gate.** Resolved for the block. PR handoff version 0.8 section 8.6
is the delivered alt for `tutorRole.alt`. Its fact gate passed on the third pass on 2026-11-18
(section 7). Section 5.5 holds the delivered text.

The hero alt is now open again under Q4.

### Open

**Q2. The `graph.caption` fact gate.** PR handoff section 7 holds no fact gate line for the v0.6
caption. The orchestrator routes the question to the PM on 2026-11-18. The PM answers with a gate
line or with an acceptance. This question blocks task 2.5.

**Q4. The hero alt delivery and its gate.** The hero picture changes (D-2), so `heroExtra.imageAlt`
changes. PR owes the en and th text, and the PM asked PR on 2026-11-18. The task needs the PR text
and a PASS fact gate. The zh value equals en. This question blocks task 1.1.

## 11. The closeout

Task C.1 moves the track to `measure/archive/www_tutor_followups_20261118`, updates the registry
row, and records the closeout. The row names the commit range, the gate output, the page-check
folder, the CD run, and the questions that stay open.
