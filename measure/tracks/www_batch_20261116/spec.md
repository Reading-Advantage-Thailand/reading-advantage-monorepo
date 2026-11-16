# Spec: www Monday batch 2026-11-16, rows A and B

Track: `www_batch_20261116` (light lane, chore).
Author: Monorepo build session.
Source owner: Monorepo orchestrator, 2026-11-16.

## Why

The www change list v1.39 marks three rows READY. Two rows are the batch of 2026-11-16:
row A (the 2027 school year on the three product cards) and row B (the Storytime
Advantage launch on 30 November 2026). The third row is the stapler row of 2026-11-05
(TH-184).

The live pages show the old copy. Daniel checked the Thai of the three rows on
2026-11-16 (Google Tasks 04:59 and 07:36 ICT). The site must show the approved copy
word for word.

## Source

- Batch v1.2: `~/Desktop/handoff/pr-www-batch-2026-11-16/www-batch-2026-11-16.md`.
- Change list v1.39: `~/Desktop/handoff/pr-www-batch-2026-11-16/www-change-list.md`.
- `MANIFEST.txt` SHA-256 `95c4888e674f59e18a3808d6d1d2c34556683cb5fe0b89a5a4fed4507f644fc8`.
  `sha256sum -c MANIFEST.txt` returned OK at the build start.
- Branch base: `origin/master` `ad461d105`.
- Build branch: `www/batch-1116`, worktree
  `/home/daniebo/Desktop/rama-worktrees/www-batch-1116`.

## Row A: the 2027 school year

Page: `/products` and `/th/products`.
File: `apps/www-reading-advantage/src/locales/components/products/b2b-solutions.ts`.

| Place | Key | Live (en) | New (en) | New (th) |
|---|---|---|---|---|
| 1 | `products.scienceAdvantage.badge` | On our roadmap | For the 2027 school year | สำหรับปีการศึกษา 2570 |
| 2 | `products.mathAdvantage.badge` | On our roadmap | For the 2027 school year | สำหรับปีการศึกษา 2570 |
| 3 | `products.zhongwenAdvantage.badge` | On our roadmap | For the 2027 school year | สำหรับปีการศึกษา 2570 |
| 4 | `products.scienceAdvantage.features[3]` | No release date has been set | Planned for Thai primary schools in the 2027 school year | มีแผนเปิดให้โรงเรียนประถมไทยใช้ในปีการศึกษา 2570 |
| 5 | `products.zhongwenAdvantage.features[3]` | No release date has been set | Planned for Thai primary schools in the 2027 school year | มีแผนเปิดให้โรงเรียนประถมไทยใช้ในปีการศึกษา 2570 |

STEM Advantage keeps "On our roadmap". The Math card has no limit feature.

## Row B: the Storytime Advantage launch

Pages: `/products/storytime-advantage`, `/th/products/storytime-advantage`,
`/products`, `/`, and `/th`.

Ten places. The English and the Thai come from the row, word for word.

| Place | Key | New (en) | New (th) |
|---|---|---|---|
| 1 | `pages.products.storytimeAdvantage.metadata.description` | …The first unit launches on 30 November 2026, with the Storytime Advantage, Level 2, Unit 1 student book and QR-linked digital parts. | …หน่วยการเรียนรู้แรกเปิดตัววันที่ 30 พฤศจิกายน 2569 พร้อมหนังสือนักเรียน Storytime Advantage, Level 2, Unit 1 และส่วนดิจิทัลที่เชื่อมด้วยคิวอาร์โค้ด |
| 2 | `…hero.description` | …The first unit launches on 30 November 2026. | …หน่วยการเรียนรู้แรกเปิดตัววันที่ 30 พฤศจิกายน 2569 (the live tail stays) |
| 3 | `…hero.comingSoon` | Launches 30 November 2026 | เปิดตัววันที่ 30 พฤศจิกายน 2569 |
| 4 | `…cta.description` | The first unit launches on 30 November 2026. Contact us to discuss Storytime Advantage. | หน่วยการเรียนรู้แรกเปิดตัววันที่ 30 พฤศจิกายน 2569 ติดต่อเราเพื่อพูดคุยเกี่ยวกับ Storytime Advantage |
| 5 | `components.common.navigation.itemsDescription.storytimeAdvantage` | English for Anuban 2 to P2; the first unit launches on 30 November 2026 | ภาษาอังกฤษสำหรับอนุบาล 2 ถึง ป.2 หน่วยการเรียนรู้แรกเปิดตัววันที่ 30 พฤศจิกายน 2569 |
| 6 | `components.products.b2bSolutions.products.storytimeAdvantage.badge` | Launches 30 November 2026 | เปิดตัววันที่ 30 พฤศจิกายน 2569 |
| 7 | `pages.home.v2.products.storytimePreparingLabel` | Launches 30 November 2026 | เปิดตัววันที่ 30 พฤศจิกายน 2569 |
| 8 | `pages.home.suite.description` | …Science, Math, Zhongwen, and STEM Advantage are on our roadmap. The first Storytime Advantage unit launches on 30 November 2026. | …Science, Math, Zhongwen และ STEM Advantage อยู่ในแผนงาน หน่วยการเรียนรู้แรกของ Storytime Advantage เปิดตัววันที่ 30 พฤศจิกายน 2569 |
| 9 | `pages.products.overview.gradeBands.storytime.description` | …The first unit launches on 30 November 2026. | …หน่วยการเรียนรู้แรกเปิดตัววันที่ 30 พฤศจิกายน 2569 |
| 10 | `…hero.launchNote` (new) | Storytime Advantage launches on 30 November 2026. | Storytime Advantage เปิดตัววันที่ 30 พฤศจิกายน 2569 |

Place 8 also deletes "with no dates". The row gives that limit fix.

## Stapler row of 2026-11-05 (TH-184)

Page: `/products/storytime-advantage`, `/th/products/storytime-advantage`, and
`/zh/products/storytime-advantage`.
Key: `pages.products.storytimeAdvantage.keyFeatures.features[0].points[0]`.

- New (en): "One A4 Storytime Advantage, Level 2, Unit 1, Student Book for weeks 1 to 8.
  Small reader books sit inside it. Children tear them out and fold them. The teacher
  staples them."
- New (th): "หนังสือนักเรียน Storytime Advantage, Level 2, Unit 1, Student Book ขนาด A4
  หนึ่งเล่ม สำหรับสัปดาห์ที่ 1 ถึง 8 มีหนังสือฝึกอ่านเล่มเล็กอยู่ด้านใน เด็กฉีกออกและพับ
  ครูเป็นคนเย็บหนังสือฝึกอ่านเล่มเล็ก"

The stapler row is one commit that stands alone. The orchestrator can drop it.

## Decisions

- **zh stays as it is.** The zh lines Z19 to Z28 are machine drafts. No zh file changes.
  The zh Storytime page shows the English through the `...en` spread, so row B places 1
  to 4 and the stapler row also change the zh page.
- **Place 10 takes its own slot.** The row gives the slot choice to this session. Place 2
  owns the last sentence of the hero description, and place 3 owns the hero badge. Place
  10 is a new hero note under the description, key `hero.launchNote`. The string stays
  word for word.
- **The key name `v2.products.storytimePreparingLabel` stays.** The row leaves the rename
  to this session. A rename adds churn for no reader change.
- **The claims scanner allows the one approved date.** The page test flags every year and
  English month. The test clears the two approved strings first: "30 November 2026" and
  "30 พฤศจิกายน 2569". Every other date still fails the scan.
- **`src/config/navigation.ts` follows place 5.** The header reads this static English
  file. The existing test keeps it equal to the en locale line.

## Out of scope

- The three rows of 2026-11-12 that wait for the Thai check.
- The sign-in row of 2026-11-07.
- The release-state row of 2026-10-27.
- The launch-date row of 2026-09-30 (on hold).
- The zh lines Z19 to Z28.
- Push and deploy. The orchestrator pushes.

## Acceptance criteria

- **AC-1.** A locale test reads the en and th dictionaries. It finds each new line of rows
  A and B word for word. It finds no old line at the named keys.
- **AC-2.** The zh dictionary keeps its current lines for row A. The zh Storytime page
  shows the English through the spread.
- **AC-3.** The Storytime page content test renders the new copy, the new hero note, the
  new metadata, and the new badge.
- **AC-4.** The claims scanner still fails a different date, a different month, and a price.
- **AC-5.** Gates exit 0: the new test, the www locale tests, `tsc`, ESLint on the touched
  files, the www build, the photo e2e, and `npx vitest run scripts/ci/__tests__/`.
- **AC-6.** Captures of six pages at 1280 and 390 show the new copy.
- **AC-7.** `node scripts/ci/affected-apps.mjs` prints only `www-reading-advantage` for the
  code commits and `[]` for the track-only commit.
