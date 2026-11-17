# Spec: www Tutor Advantage screens and commission calculator

Track: `www_tutor_calculator_20261117` (standard lane: two phases).
Author model: opencode-go/deepseek-v4.1-flash.
Source owner: PM assignment A-63 (Daniel, Google Tasks `R2t2eF9Z`, 2026-11-17 06:30 ICT).
Due: 2026-11-21.
Page: `apps/www-reading-advantage` `/products/tutor-advantage` in en, th, and zh.

## 1. Order and source

Order (exact words): "We need to update the tutor advantage www pages with new screenshots
(see the recent daily posts from Oleang) and include a commission calculator in the page with
some networking as examples of income and commission structure."

Calculator shape (Daniel, Tasks `ZTlPNmVq`, 2026-11-17 06:50 ICT; spec source section 5):
"I want a calculator where we can input number of personal students, number of legs with
students by leg, and which demonstrates in a graph how the payout works."

Sources, read once at authoring time:

1. `~/Desktop/handoff/a63-tutor-www-calculator/spec.md`: the code-true formula, the six check
   values, the inputs, and the gates.
2. `~/Desktop/handoff/a63-tutor-www-calculator/www-tutor-advantage-calculator-handoff.md`
   (copy v0.1): five screen slots with caption and alt, calculator keys, three presets, two
   live copy lines, and the zh rule.
3. `~/Desktop/handoff/a63-tutor-www-calculator/tutor-mlm-calculator.html` and `-th.html`:
   the June PR calculator. Layout, input cards, live result card, rate curve, and EN and TH
   wording. Its math and its slider layout are superseded (D-1, D-4).
4. `~/Desktop/handoff/a63-tutor-www-calculator/payout-network-en.png`: the 7-tutor payout
   network. Evidence for D-1 and D-2.
5. `~/Desktop/handoff/a63-tutor-www-calculator/screens/`: the delivered screenshot set, v2.0,
   2026-11-17, source commit `50675d41` of `advantage-pr`. Section 6 holds the use rules.

This spec carries every new string. The implementation reads no file outside the repository.
The tests read no file outside the repository and compute no hashes.

## 2. The two phases

| Phase | Delivers | Dependency |
|---|---|---|
| 1 | The pure commission module with tests, the client calculator with the payout graph, the `calculator.*` locale keys, the calculator section on the page | None |
| 2 | The blurred screen copies, the gallery and its `screens.*` keys, the two live copy lines, the page-check, one www-only push | None; the set arrived 2026-11-17 |

Page order after both phases:

| # | Section | Anchor |
|---|---|---|
| 1 | `tutorRole` | existing |
| 2 | Screens gallery | new, `data-testid="tutor-screens"` |
| 3 | Commission calculator | new, `data-testid="tutor-calculator"` |
| 4 | Honest basics (`commitments`) | existing |
| 5 | `faq` | existing |

## 3. Code truth: the rate, the leg payout, and the tax

Money is in Thai baht. `GV` is the group volume of the month: the own paid class packages plus
every leg. `B = 0.5` is the default base rate.

```text
if V <= 0:          rate = 0
else if V < 20000:  rate = 0.4 + V / 200000
else:               rate = (B * (1 - 0.3 ** (1 + ln(V / 20000) / ln(5)))) / 0.7
```

Check values (rate at GV). The test pins these to four decimals:

| GV (baht) | Rate |
|---|---|
| 1,000 | 40.5000% |
| 5,000 | 42.5000% |
| 10,000 | 45.0000% |
| 20,000 | 50.0000% |
| 30,000 | 55.6065% |
| 50,000 | 60.6315% |

The rate rises toward `0.5 / 0.7 = 71.4286%` and never passes it.

The money rule, with one level of legs:

```text
gross      = rate(GV) * GV
legPayout  = rate(legGV) * legGV            one value per leg
payout     = max(0, gross - the sum of the leg payouts)
tax        = (payoutSatang * 3n + 50n) / 100n   half up, only on a positive payout
net        = payout - tax
```

The conservation check holds by construction: `sum of leg payouts + payout = gross`. The test
asserts it for each preset.

Work order: bottom up. A leg has no downline of its own, so the leg payout is
`rate(legGV) * legGV`. The tutor takes the rest of `rate(GV) * GV`.

## 4. Decisions

### D-1 The deduction uses each leg's whole payout

The graphic is the evidence. Tutor A has GV 60,000 and rate 62.0081%. `rate * GV` is 37,204.85.
Tutor A subtracts the B1 team (14,663.41) and the B2 team (10,661.28), and the payout is
11,880.16. Each team total is that branch's own rate times its own GV, and it already holds the
tutors under it. The graphic states the check: the payouts of all seven tutors add up to A's
`rate * GV`.

With one level (D-4) the rule reduces to `legPayout = rate(legGV) * legGV`, and the
conservation check of section 3 replaces the graphic's seven-tutor check. The rule is the same
rule; the branch is one level deep.

Two earlier forms are wrong and do not appear in this work:

1. The June file's per-child override `(r - r_child) * GV_child`. The result panel replaces it
   with one downline deduction row. The per-row form needs a child rate for every row and
   hides the payout arithmetic.
2. The direct-net variant. It subtracts a direct tutor's own net payout and drops the level
   below. With two levels it pays 22,714.44 across the network against `rate * GV` of
   18,709.44, so level two is paid twice. The graphic and the one-level conservation check both
   reject it.

### D-2 The three presets, computed

Price 3,000 baht in every preset.

| Field | Preset 1 | Preset 2 | Preset 3 |
|---|---|---|---|
| Own students | 4 | 2 | 2 |
| Legs | 0 | 2 | 3 |
| Students per leg | none | 3, 3 | 4, 4, 4 |
| Own GV | 12,000.00 | 6,000.00 | 6,000.00 |
| Network GV | 12,000.00 | 24,000.00 | 42,000.00 |
| Rate | 46.0000% | 52.7321% | 59.1273% |
| Gross | 5,520.00 | 12,655.69 | 24,833.45 |
| Leg payouts | 0 | 8,010.00 | 16,560.00 |
| Payout before tax | 5,520.00 | 4,645.69 | 8,273.45 |
| Withholding tax | 165.60 | 139.37 | 248.20 |
| Net | 5,354.40 | 4,506.32 | 8,025.25 |

Preset 1 and preset 2 fit the copy file's lines as they stand. Their figures round to the same
whole baht: 5,520 / 5,354 and 12,656 / 4,646 / 4,506.

Preset 3 has one level (D-4). It uses two own students and three legs of four students. The
table holds its figures, and the PR v0.4 copy of 2026-11-17 quotes the same ones. The rate comes
from the formula of section 3, and the module test pins it to four decimals.

**D-2a. Preset 3 wording (resolved by PR v0.4, task 2.7).** PR handoff v0.4 section 8 replaced
the draft on 2026-11-17. The shipped copy is the final copy:

| Key | en | th |
|---|---|---|
| `presets[2].name` | A small team with three legs | ทีมเล็กที่มีสามสาย |
| `presets[2].setup` | Two personal students, and three legs with four students each. | นักเรียนในคลาสของคุณเอง 2 คน และ 3 สาย สายละ 4 คน |
| `presets[2].result` | 42,000 baht of network volume at a rate of 59.1%. The gross is 24,833 baht, and the three legs earn 16,560 baht of it. The payout is 8,273 baht before tax, and 8,025 baht after 3% withholding tax. | ยอดรวมของเครือข่าย 42,000 บาท ที่อัตรา 59.1% ยอดก่อนหักคือ 24,833 บาท และสามสายได้ค่าคอมมิชชัน 16,560 บาทจากยอดนี้ ยอดจ่ายคือ 8,273 บาทก่อนหักภาษี และ 8,025 บาทหลังหักภาษีหัก ณ ที่จ่าย 3% |

The draft of this session ("A small team, three legs", three legs of three students) never
shipped. The commit `d91e6c527` and its follow-ups carry the final copy.

The earlier corrected-preset-3 line of the 2026-11-17 brief (GV 33,000 with two directs and one
second-level tutor, payout 5,884.44, net 5,707.91) is superseded by the shipped one-level shape.
It does not appear.

### D-3 Money is integer satang: gross truncates, tax rounds half up

The graphic states the gross rule: GV and payouts are whole satang, the rate has a scale of
10^9, and `rate * GV` is truncated to the satang. The settlement service does the same in
`finance-mlm-service/src/services/commissionService.ts`, `calculatePayoutMinor`:
`(volumeMinor * scaledRate) / RATE_SCALE` with BigInt division, which truncates. The module
matches that rule:

1. `gvSatang = Math.round(GV baht * 100)`.
2. `rateUnits = Math.round(rate(GV) * 1e9)`.
3. `flatSatang = (BigInt(rateUnits) * BigInt(gvSatang)) / 1000000000n`, which truncates.
4. The deduction is integer arithmetic on satang.
5. Tax is half up. The settlement service does this in
   `finance-mlm-service/src/services/taxService.ts:4`:
   `(grossPayoutMinor * 3n + 50n) / 100n`. The module uses
   `(payoutSatang * 3n + 50n) / 100n`. Net is payout minus tax.

BigInt keeps the product exact. A Number product passes 2^53 at large volume, so the module
does not use one. The module returns baht as a Number for display.

The two rounding points differ and must not be merged. Gross truncates. Tax rounds half up.
Price 1,007 with one own student and no legs gives gross 407.87 satang-exact, tax 12.24, and
net 395.63. Truncating the tax would give 12.23.

PR handoff v0.4 section 4 rounds the gross to 12,655.70, 24,833.46, 4,506.33, and 8,025.26.
The settlement code truncates the gross, so the calculator shows 12,655.69, 24,833.45,
4,506.32, and 8,025.25. The PR copy quotes whole baht, so its text is not affected. The
calculator follows settlement, not the PR table.

Reviewed result, round 1 of `fb6bf7c0d`: preset 2 under this algorithm is gross 12,655.69,
payout 4,645.69, and net 4,506.32. Rounding the raw float product gives 12,655.70 / 4,645.70 /
4,506.33, and that value is not this algorithm. Do not reopen the difference.

Display rules, ASCII digits, comma grouping, and a period decimal mark in all three locales:

| Value | Rule | Example |
|---|---|---|
| Money | Whole baht when the satang part is zero, else exactly two decimals | `5,520`, `12,655.69` |
| Rate | One decimal, trailing `.0` dropped | `46%`, `52.7%`, `55.6%` |

The figures do not depend on the locale, so the server and the client render the same text.
Thai and Chinese pages show the same ASCII digits that the copy file uses.

### D-4 The calculator has one level

Daniel's shape: personal students, the number of legs, and the students in each leg. One input
per leg, added or removed with the leg count. The second-level inputs drop out, the
`explain.twoLevels` line drops out, and Daniel's shape replaces the June slider layout wherever
they differ.

This removes the second-level tutor from the inputs, from the result, and from the copy. The
deduction is the sum of the leg payouts (D-1), and the conservation check of section 3 replaces
the two-level variant.

### D-5 A preset resets the price to 3,000 baht

Each preset's result line quotes 3,000 baht. A preset therefore sets the price, the own
students, the leg count, and the students per leg. A preset that keeps a hand-typed price would
show a result that its own example line contradicts.

### D-6 The first paint shows no figures

The default state is price 3,000 baht, 0 own students, and 0 legs. The result card shows the
`explain.zero` line and 0 values. The copy provides that line, and a page that opens on an
income figure looks like a promise (gate: no income promise). A leg added by the count control
starts with 3 students, the module default.

### D-7 An edit clears the selected preset

A preset shows its `setup` and `result` lines. A change to any input clears the selection and
hides the example text, because the example no longer matches the inputs. The live figures
stay. The three preset buttons stay visible.

### D-8 Both new sections sit after `tutorRole`

The gallery goes after the `tutorRole` section. The calculator goes after the gallery. Both sit
before the `commitments` ("Honest basics") section, which is before `faq`. This satisfies "after
`tutorRole` and before `faq`" for both sections and keeps the calculator beside the tutor copy.

### D-9 The payout graph

Daniel's shape: "which demonstrates in a graph how the payout works". The graph is one row per
leg plus one row for the tutor's own students:

1. A row holds a label, a bar, and the money figure of that row.
2. The bar length is the volume of that row against the network volume, so the own bar and the
   leg bars add up to the whole network volume.
3. A leg row reads `graph.legBar` with the leg numeral, then the leg volume, then the leg
   commission as bold text.
4. The own row reads `graph.ownBar` and the own students' volume: the price times the personal
   students (D-20).
5. The rate curve of the June file sits next to the graph at `lg` and above it at small widths
   (D-11).

The graph uses the PR section 6 labels: `graph.legBar` with the `{n}` placeholder, `graph.ownBar`,
`graph.grossBar`, `graph.legCommissionBar`, `graph.netBar`, and `graph.axisBaht`. The three
totals under the bars read the gross, the leg commission, and the net. The bar length is a
run-time value: an inline style carries it as a CSS custom property, and one rule in
`src/app/[locale]/globals.css` reads it. The `shadcn/no-inline-styles` row of
`apps/www-reading-advantage/docs/design-rules.md` allows an inline style that sets a CSS
custom property or a value computed at run time.

### D-10 The zh block takes the English lines for the new work

The copy rule for this page: the zh block copies the English lines until the contracted Chinese
speaker delivers. This applies to the new `screens.*` and `calculator.*` values, the three
chart labels, and the two changed live lines. The existing zh translations of every other key
stay unchanged.

The zh page therefore shows English inside the two new sections and on two lines in the tutor
part and the FAQ. A stale Chinese line is the worse option: the live line "我们不公布收入数字"
would contradict the calculator on the same page. The spec marks this as a placeholder (D-10).
One code comment at the zh block records it. No `TODO` text reaches the page.

### D-11 The rate curve is decorative

The June file's rate curve returns as an SVG next to the payout graph. It is `aria-hidden` and
has no alt text, because every number it draws appears as text in the result panel and in
`rateNote`. The curve uses the formula, the x axis runs 0 to 500,000 baht, and a dot marks the
current network volume. Item 7 of the review checklist in
`apps/www-reading-advantage/docs/design-rules.md` asks for alt text on a non-decorative image,
so a decorative curve needs none.

### D-12 The calculator is a client component with server props

The page is a server component. It reads the copy with `getScopedI18n` and passes strings to
the calculator, as `TutorClassStepper` does. The calculator holds the input state and calls the
pure module. No locale data and no formatting table load on the client.

### D-13 Phase 1 does not push alone

Phase 1 ships no separate push. The branch pushes once, after Phase 2 and the PM page-check,
because `tutorRole.points[3]` still says "We do not publish income figures" until task 2.3.
If the PM asks to ship the calculator before the gallery, task 2.5 moves into Phase 1 word for
word, and no other task moves.

### D-14 The screenshot use rules are checked by people

"No admin screen", "no price", "no visible development class name", "no error or unfinished
state", "no student face", and "earnings only as recruitment material" are visual rules. A
vitest cannot read pixels. Task 2.1 checks each file against them, records one line per file,
and confirms each saved copy at full size. The PM page-check confirms it again. The tests pin
the file names, the captions, the alt text, and the render order.

### D-15 Three gallery captions have a picture; two do not

The delivered set holds a student app and a tutor or presenter app. It holds no network screen
and no earnings screen (set README, rule 7). The copy file has five captions, so `network` and
`earnings` have no allowed picture. They are not rendered, and PR answers with a screen or a
withdrawn caption (open question 2). The gallery shows the three slots that have a picture, in
copy order.

**D-15a. Slot 2's alt text (resolved by PR v0.4, task 2.7).** Copy v0.1 gave the `lessonPhases`
alt as "Tutor app showing the 18 phases of one lesson", and the Thai as "แอปติวเตอร์แสดง 18
ช่วงของบทเรียนหนึ่งบท". The mapped screen, `student-mobile/002`, is a student-app screen: the
student tab bar and the student points header are visible. The alt named the wrong app.

PR v0.4 replaced the alt with "Student app short-answer screen with the question and a typed
answer", and the Thai with "หน้าจอตอบคำถามสั้นในแอปนักเรียน พร้อมคำถามและคำตอบที่พิมพ์ไว้".
The manifest key is now `shortAnswer`, and task 2.7 shipped the new alt.

### D-16 The June claims do not return

These June claims stay out: the annual projection, the teacher-salary comparison, the hourly
rate, "VAT handled", "50 Tawi", and "no earning cap". No percentage appears beyond the rate
formula. Every figure is an example, and the disclaimer says so.

### D-17 PR section 6 is the only string authority (Phase 3)

The audit (rows D-1, D-2, `27f33b18e`, `e583e21b3`, `08fcd93b0`) found that the shipped page
carried copy v0.1. PR handoff v0.4 section 6 now supersedes this spec's earlier key tables for
both new blocks. Section 6 supplies every `calculator.*` and `screens.*` string in en. The Thai
of PR sections 2 and 3 supplies every th string in the same key order. The zh values equal the
en values (D-10).

Decision: a string that section 6 does not carry does not ship. The `chart.*` keys, any
downline, second-level, or direct-tutor key, and any pre-tax label are removed. The gallery
uses the five student slots of PR section 2, in that order; the 070 and `tutor-desktop/062`
files and their manifest keys are removed.

### D-18 The calculator pays 0 to a tutor with legs and no own students (Phase 3)

The page copy says, "The calculator uses the same formula as our settlement system." The
settlement service pays 0 to a tutor who has no personal volume and at least one child. The
source is
`/home/daniebo/Desktop/tutor-advantage/services/finance-mlm-service/src/services/settlementService.ts:536-548`:

```
let payoutForMe = calculatePayoutMinor(node.groupVolumeMinor, myRate) - childPayouts;
if (payoutForMe < 0n) payoutForMe = 0n;
if (node.personalVolumeMinor === 0n && children.length > 0) {
  node.eligibilityStatus = "INELIGIBLE_NO_PV";
  payoutForMe = 0n;
}
```

The calculator takes the own student count and one student entry per leg. A leg is a child,
so a leg count of 1 or more is `children.length > 0`. No personal students is
`node.personalVolumeMinor === 0n`, after the clamp.

Decision: when the clamped personal student count is 0 and the leg count is 1 or more, the
payout before tax is 0, the withholding tax is 0, and the net payout is 0. The network volume,
the rate, the gross, and the leg commissions keep their present values, because settlement
still computes them. `explainVariant` returns `"zero"` for that input. This is the orchestrator
default until PR supplies a dedicated line, so no locale key is added.

The other inputs keep their present behavior. A personal student count of 0 with no legs gives
volume 0 and the `"zero"` variant. A personal student count of 1 or more gives the figures of
D-2.

### D-19 Each page block shows its own image (Phase 3)

The PM order of 2026-11-17 follows Daniel's live check of the page: "5 of 6 images are wrong".
The page order is top to bottom. The table names the file and the alt text of each block. All
files sit under `apps/www-reading-advantage/public`.

| # | Block | File | Size |
|---|---|---|---|
| 1 | Hero, the section with the `heroExtra` copy | `/images/tutor-advantage-hero.jpg` | 1024 by 1024 |
| 2 | Books, card 1, "Primary Advantage Origins 2" | `/images/products/primary-origins-2-cover.webp` | 480 by 651 |
| 3 | Books, card 2, "Primary Advantage Origins 3.1" | `/images/products/primary-origins-3-1-cover.webp` | 480 by 651 |
| 4 | Books, card 3, "Reading Advantage Origins 2" | `/images/products/reading-origins-2-cover.webp` | 480 by 651 |
| 5 | Reedy, the section with the `reedyBlock` copy | `/images/primary-advantage/reedy-preview.webp` | 1280 by 912 |
| 6 | Become a tutor, `id="become-a-tutor"`, the `tutorRole` copy | `/images/tutor-advantage-hero.jpg` | 4:3 crop |
| 7 | Screens gallery, `data-testid="tutor-screens"` | the five student screens | unchanged |

The three book cards follow the order of the `books.items` keys. The whole cover shows, with
no crop.

The alt text belongs to the locale:

1. Hero: key `heroExtra.imageAlt`. en: "A tutor and a child look at a tablet together, with a
   notebook and a pen on the table." th: "ติวเตอร์และเด็กดูแท็บเล็ตด้วยกัน มีสมุดและปากกาวางอยู่บนโต๊ะ".
   zh equals en.
2. Books, one value per card. en: "<product name> book cover". th: "ปกหนังสือ <product name>".
   zh equals en.
3. Reedy: the approved Primary page alt, `src/__tests__/fixtures/primary-page-expected.ts:145`.
   en: "Reedy, the speaking coach, is marked Preview. A wizard avatar stands in a forest next
   to a Start talking button." th: "รีดี้ โค้ชฝึกพูด มีป้ายทดลอง ตัวละครพ่อมดยืนอยู่ในป่าข้างปุ่มเริ่มพูดคุย".
   zh equals en.
4. Become a tutor: the hero alt of the locale.
5. Screens: the five gallery alts of PR section 2 stay.

No block shows a file under `/media/images/classroom/`, `/media/images/primary/primary-book`,
`/media/images/chibi/`, or `/media/images/tutor/tutor-question`.

The hero and the become-a-tutor block share one file. The second block shows a 4:3 crop. This
is the orchestrator default until Daniel decides on a Muse picture.

The new cover file is a 480 by 651 webp. Green converts it from the printed cover PNG
`/home/daniebo/Desktop/Workbooks/assets/PA-Origins-3.1-Front Cover.png`.

### D-20 The own bar shows the own students' volume (Phase 3, review round 1)

PR handoff section 3 says: "The graph shows one bar per leg, with that leg's volume and that
leg's own commission. It shows the tutor's own students as one bar, the gross at the tutor's
rate, and the payout after the leg commissions and the 3% tax."

Decision: the `graph.ownBar` row shows the own students' volume, which is the price times the
personal students. At the 3,000 baht price the own bar reads 12,000 for preset 1, and 6,000 for
presets 2 and 3. The own bar and the leg bars add up to the network volume. The tutor's payout
after the leg commissions and the 3% tax stays under `graph.netBar`: 5,354.40, 4,506.32, and
8,025.25 for the three presets. The payout before tax has no row in the graph.

The source is the PM decision of 2026-11-17 on review A finding A-P3-1, which accepts the PR
line. This decision replaces the D-9 text that named `chart.*` and demanded bars that add up to
the gross.

## 5. Phase 1: the calculator

### 5.1 Files

| File | State |
|---|---|
| `apps/www-reading-advantage/src/lib/tutor-commission.ts` | new |
| `apps/www-reading-advantage/src/lib/tutor-commission.test.ts` | new |
| `apps/www-reading-advantage/src/components/marketing/tutor-commission-calculator.tsx` | new, `"use client"` |
| `apps/www-reading-advantage/src/components/marketing/tutor-commission-calculator.test.tsx` | new |
| `apps/www-reading-advantage/src/__tests__/www-tutor-calculator.locale.test.ts` | new |
| `apps/www-reading-advantage/src/app/[locale]/(marketing)/products/tutor-advantage/page.tsx` | calculator section |
| `apps/www-reading-advantage/src/app/[locale]/(marketing)/products/tutor-advantage/page.test.tsx` | section test |
| `apps/www-reading-advantage/src/locales/pages/products/tutor-advantage.ts` | `calculator.*` in en, th, zh |
| `apps/www-reading-advantage/src/app/[locale]/globals.css` | one rule for the bar width |

### 5.2 The module

```ts
export const CLASS_PRICE_DEFAULT = 3000;
export const TAX_RATE = 0.03;
export const LEG_STUDENTS_DEFAULT = 3;

export type NetworkInput = {
  price: number;
  personalStudents: number;
  studentsPerLeg: readonly number[];
};

export type LegResult = {
  leg: number;      // 1-based
  students: number;
  volume: number;   // baht
  payout: number;   // baht, satang
};

export type NetworkResult = {
  ownVolume: number;      // baht
  networkVolume: number;  // baht
  rate: number;           // 0 to 1
  gross: number;          // baht, satang
  legPayouts: number;     // baht, satang; the downline deduction
  preTax: number;         // baht, satang; not displayed
  withholdingTax: number; // baht, satang
  net: number;            // baht, satang
  legs: readonly LegResult[];
};

export function commissionRate(volume: number): number;
export function payoutAfterDeduction(gross: number, paidBelow: number): number;
export function calculateNetwork(input: NetworkInput): NetworkResult;
export function explainVariant(result: NetworkResult): "zero" | "ownOnly" | "withLegs";
export function resizeLegs(current: readonly number[], count: number): number[];
export const NETWORK_PRESETS: readonly NetworkInput[];
```

Rules the module holds:

1. A non-finite or negative input becomes 0. A leg count becomes a whole number of 0 or more.
2. `commissionRate` returns 0 at `V <= 0`.
3. The money outputs use the satang rule of D-3.
4. `payoutAfterDeduction` returns `max(0, gross - paidBelow)` in satang. It is exported so the
   zero floor has one test that does not depend on a network that reaches it.
5. `explainVariant` reads the result: `networkVolume === 0` gives `zero`; `legPayouts === 0`
   gives `ownOnly`; anything else gives `withLegs`. The variant name equals the PR section 6
   key `explain.withLegs`.
6. `resizeLegs` keeps the first entries, appends `LEG_STUDENTS_DEFAULT` for new legs, and drops
   the rest.
7. `NETWORK_PRESETS` holds the three inputs of D-2, price 3,000 included.

### 5.3 The component

Props, all from the server component:

```ts
type TutorCommissionCalculatorProps = {
  copy: {
    eyebrow: string; heading: string; description: string;
    volumeNote: string; rateNote: string; payoutNote: string; disclaimer: string;
    inputs: { price: string; priceNote: string; ownStudents: string;
              legCount: string; legStudents: string; addLeg: string; removeLeg: string };
    results: { ownGV: string; networkGV: string; rate: string; gross: string;
               legCommissions: string; tax: string; net: string };
    explain: { ownOnly: string; withLegs: string; zero: string };
    graph: { title: string; caption: string; ownBar: string; legBar: string;
             grossBar: string; legCommissionBar: string; netBar: string;
             axisBaht: string; rateTitle: string; rateAxis: string; ratePoint: string };
    presets: readonly { name: string; setup: string; result: string }[];
  };
};
```

Layout, from the June file:

1. `SectionHeader` with the eyebrow, the heading, and the description.
2. Three preset buttons in a row. The selected one is `aria-pressed`.
3. A 12-column grid at `lg`. Inputs take seven columns, results take five.
4. Input cards: price with `priceNote`; own students; the leg count. Below the count, one row
   per leg, each with the leg numeral, the `legStudents` label, and a number input.
5. The payout graph and the rate curve under the input cards (D-9, D-11).
6. Results: the net payout as the hero figure, then the rows `ownGV`, `networkGV`, `rate`,
   `gross`, `legCommissions`, `tax`, `net`. `gross - leg commissions - tax = net` holds on the
   page.
7. The explain line under the result, chosen by `explainVariant`.
8. The selected preset's `setup` under the buttons and its `result` in a bordered block under
   the result panel.
9. `volumeNote`, `rateNote`, `payoutNote`, and `disclaimer` as muted text. The disclaimer sits
   last.
10. The result card is `aria-live="polite"`.

Design rules: theme colors only (site neutrals plus the emerald scale), no arbitrary value, no
inline style except the bar width custom property, 390 px with no horizontal scroll, and a
44 px minimum target on the buttons and the leg controls.

### 5.4 The locale keys (PR section 6; Phase 3)

D-17 makes PR handoff v0.4 section 6 the authority for this block. The earlier v0.1 key
tables and the `chart.*` labels do not ship. Insert the block after `tutorRole` and before
`faq` in all three dictionaries. Key order follows section 6.

```ts
calculator: {
    eyebrow: "THE COMMISSION CALCULATOR",
    heading: "See how one month's commission works",
    description: "The calculator uses the same formula as our settlement system. Choose the price, your students, and your legs, and see the month. Every figure is an example, not a promise of income.",
    volumeNote: "Volume is the class package price times the students who paid in the month.",
    rateNote: "The rate starts near 40% on a small volume. It passes 50% at 20,000 baht and approaches 71% at very high volume.",
    payoutNote: "Your payout is the rate times the network volume, minus the commission of each leg. 3% withholding tax comes off a positive payout.",
    inputs: {
        price: "Class package price (baht)",
        priceNote: "Default: 3,000 baht. The price adapts to the market.",
        ownStudents: "Personal students this month",
        legCount: "Legs with students",
        legStudents: "Students in this leg",
        addLeg: "Add a leg",
        removeLeg: "Remove a leg",
    },
    results: {
        ownGV: "Your own volume",
        networkGV: "Network volume",
        rate: "Commission rate",
        gross: "Gross commission",
        legCommissions: "Leg commissions",
        tax: "Withholding tax (3%)",
        net: "Net payout",
    },
    graph: {
        title: "How this month's payout is built",
        caption: "Each bar is one leg: the volume it brings and the commission it earns on its own. Your payout is your rate on the whole volume, minus the commissions of the legs.",
        ownBar: "Your own students",
        legBar: "Leg {n}",
        grossBar: "Gross at your rate",
        legCommissionBar: "Commission of each leg",
        netBar: "Your payout after 3% tax",
        axisBaht: "Baht",
        rateTitle: "Your rate for the network volume",
        rateAxis: "Rate",
        ratePoint: "This month",
    },
    explain: {
        ownOnly: "No legs this month, so the whole gross amount is the payout.",
        withLegs: "Your rate applies to the whole network volume. The commission of each leg comes off, and 3% withholding tax comes off the rest.",
        zero: "Add students to see a month.",
    },
    presets: [
        { name: "A new tutor", setup: "Four personal students, no legs.", result: "12,000 baht of volume at a rate of 46%. The gross is 5,520 baht, and with no legs it is all payout. After 3% withholding tax: 5,354 baht." },
        { name: "A tutor with two legs", setup: "Two personal students, and two legs with three students each.", result: "24,000 baht of network volume at a rate of 52.7%. The gross is 12,656 baht, and the two legs earn 8,010 baht of it. The payout is 4,646 baht before tax, and 4,506 baht after 3% withholding tax." },
        { name: "A small team with three legs", setup: "Two personal students, and three legs with four students each.", result: "42,000 baht of network volume at a rate of 59.1%. The gross is 24,833 baht, and the three legs earn 16,560 baht of it. The payout is 8,273 baht before tax, and 8,025 baht after 3% withholding tax." },
    ],
    disclaimer: "Every figure in these examples is an illustration. Commission depends on the classes that run and are paid for.",
},
```

The th block takes the Thai lines of PR sections 2 and 3 for the matching keys, in the same
key order. The two live lines come from PR section 5 (section 6.4). The `www-tutor-calculator`
locale test pins every th value exactly.

The keys `inputs.directTutors`, `inputs.studentsPerDirect`, `results.downline`,
`explain.withDownline`, every `chart.*` key, and any pre-tax label do not exist (D-17). The
second-level keys of copy v0.1 stay absent (D-4). `zh` takes the en values of every key above,
key for key. D-10 applies.

## 6. Phase 2: the gallery and the live copy

### 6.1 The delivered screenshot set

Path: `~/Desktop/handoff/a63-tutor-www-calculator/screens/`. Version 2.0, dated 2026-11-17,
source commit `50675d41` of `advantage-pr`. The set holds 72 files in two folders, and the
`README.md` carries the rules below.

| Folder | Files | Size | What it shows |
|---|---|---|---|
| `student-mobile/` | 41 | 520 x 1125 | Phone-width student app: home, lesson phases, games, writing, AI feedback, reflection, scores |
| `tutor-desktop/` | 31 | 1440 x 900 | Wide tutor or presenter app: side menu, lesson pane, participant panel |

Use rules, from the set README, checked once per file (D-14):

1. No admin screen. The set holds none.
2. No price. Class cards and payments show ฿2,500 (the code default); the approved price is
   "from 3,000 baht per class package". Cover or crop it, or do not use the screen. The set
   holds no price.
3. Blur the development class name "Reading 3.1" on every `tutor-desktop` screen that is used,
   and on `student-mobile/070-screen.png` and `071-screen.png`.
4. No error state, no unfinished state, and no zero-value screen. Do not use
   `tutor-desktop/011`, `024`, `043`, `050`, `054`, or `student-mobile/025`.
5. Earnings screens are recruitment material only. The set holds no earnings screen.
6. No student face. The set holds none; the fox mascot is a drawing.
7. Keep the set's own naming.

### 6.2 The assets and the manifest

Only the used screens enter the repository. Each becomes a webp at its delivered size, under
`apps/www-reading-advantage/public/images/products/tutor-advantage/`, in the set's two folder
names:

| Slot | Manifest key | Source file | Repo file |
|---|---|---|---|
| 1 | `tutorScreens.guidedWriting` | `student-mobile/040-screen.png` | `student-mobile/040-screen.webp` |
| 2 | `tutorScreens.shortAnswer` | `student-mobile/002-screen.png` | `student-mobile/002-screen.webp` |
| 3 | `tutorScreens.feedback` | `student-mobile/004-screen.png` | `student-mobile/004-screen.webp` |
| 4 | `tutorScreens.selfReflection` | `student-mobile/052-screen.png` | `student-mobile/052-screen.webp` |
| 5 | `tutorScreens.classRecord` | `student-mobile/064-screen.png` | `student-mobile/064-screen.webp` |

D-17 makes PR section 2 the authority for the gallery. All five files are 520 by 1125. No
tutor screen ships. The 070 and `tutor-desktop/062` webp files and their manifest keys are
removed. No blur is needed on the five delivered files: the orchestrator viewed 040, 004,
052, and 064 and saw no "Reading 3.1" and no price; 064 shows the demo tutor name
"ครู ฝน ใจดี", which the audit accepts.

The manifest entries stay a sibling export in
`apps/www-reading-advantage/src/lib/product-pictures.ts`, in slot order, with the real pixel
size and `portrait: false`, so each screen keeps its own proportions at card width.

### 6.3 The gallery section

D-17 makes PR handoff v0.4 section 6 the authority. `SectionHeader` takes the three `screens`
strings, then one card per slot in copy order. Each card renders `ProductPicture` with the
slot's `alt` and the caption under it. The five phone screens sit in a responsive grid, one
column at 390 px. No new image or heading component: item 8 of the review checklist in
`apps/www-reading-advantage/docs/design-rules.md` requires the shared parts.

```ts
screens: {
    eyebrow: "INSIDE THE APPS",
    heading: "Inside the student app",
    description: "One lesson in the LINE student app, step by step. The app follows the printed workbook.",
    items: [
        { caption: "A writing task from the printed workbook: the student picks a sentence frame and writes the answer.", alt: "Student app guided writing screen with sentence frames" },
        { caption: "The student types the answer in the app, on the same lesson as the printed page.", alt: "Student app short-answer screen with the question and a typed answer" },
        { caption: "After the answer, the app shows the AI check and the points.", alt: "Student app screen with the AI check and the points for one answer" },
        { caption: "At the end of the lesson, the student rates the effort and writes a note for the tutor.", alt: "Student app end-of-lesson screen with the student's rating and a note for the tutor" },
        { caption: "The learning record: the lessons, the points, and today's class.", alt: "Student app learning record with the lesson count, the points, and today's class" },
    ],
},
```

The th block takes the Thai captions and alt texts of PR section 2 in the same key order. The
`www-tutor-calculator` locale test pins every th value exactly. PR section 8 dropped the
`network` and `earnings` captions (D-15) and corrected the slot-2 alt to the student app
(D-15a). `zh` takes the English values. D-10 applies.

### 6.4 The two live lines

Each line keeps the rest of its field word for word.

| Key | New en | New th |
|---|---|---|
| `tutorRole.points[3]` | The calculator on this page shows examples. Ask us about your own case. | เครื่องคำนวณในหน้านี้แสดงตัวอย่าง ทักมาคุยกับเราเรื่องกรณีของคุณเองได้ |
| `faq.items[5].answer` | Tutors earn commission under a unilevel commission model, and the system settles it monthly. The rate rises with the network volume of the month. The calculator on this page shows examples; the real figure comes from the classes that run and are paid for. | ติวเตอร์ได้รับค่าคอมมิชชันตามโมเดลคอมมิชชันแบบยูนิเลเวล และระบบสรุปยอดให้ทุกเดือน อัตราจะสูงขึ้นตามยอดรวมของเครือข่ายในเดือนนั้น เครื่องคำนวณในหน้านี้แสดงตัวอย่าง ตัวเลขจริงมาจากคลาสที่เปิดสอนและมีการจ่ายเงินจริง |

The old en lines are "We do not publish income figures. Ask us for the details." and "Tutors
earn commission under a unilevel commission model, and the system settles it monthly. We do
not publish income figures. Use the contact page to ask about the details." Neither appears
after Phase 2. The `zh` values take the new English lines.

## 7. Out of scope

- The annual projection, the teacher-salary comparison, the hourly rate, "VAT handled", the
  "50 Tawi" line, and "no earning cap" (D-16).
- The ฿2,500 price and the 2026-10-15 screenshot set.
- A second level, a two-level preset, and the `explain.twoLevels` line (D-4).
- A network or earnings screen, and any invented screen (D-15).
- A new image component, a new heading component, and a URL parameter for the calculator state.
- The Thai check by Daniel and the Chinese lines from the contracted Chinese speaker.
- Any deploy command and any Cloud Run change.

## 8. Gates

Every gate runs in the worktree. Heavy commands go through the shared runner.

| Gate | Command |
|---|---|
| Phase 1 module test | `pnpm --filter www-reading-advantage exec vitest run src/lib/tutor-commission.test.ts --silent=true` |
| www test suite | `pnpm --filter www-reading-advantage test --reporter=dot --silent=true` |
| Types | `pnpm turbo run check-types --filter=www-reading-advantage` |
| Lint | `pnpm --filter www-reading-advantage lint` |
| Build | `bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'pnpm --filter www-reading-advantage build'` |
| Page check | The PM captures `/en/`, `/th/`, and `/zh/products/tutor-advantage` at 390, 980, and 1280 px |
| App selector | `node scripts/ci/affected-apps.mjs --base ff028a710 --head <HEAD>` prints `["www-reading-advantage"]` |

Constraints on the gates:

1. No new `shadcn/*` lint error in a touched file.
2. `scripts/ci/shadcn-ratchet-baseline.json` keeps `lintWarnings: 241` and `copies: 36`.
   `git diff --exit-code scripts/ci/shadcn-ratchet-baseline.json` passes.
3. No deploy. The push to `origin/master` is www-only and standing-approved (Daniel
   2026-11-15). This session runs no deploy command. If Daniel holds the release, the push
   waits for his word.
4. No public date and no income promise.

## 9. Acceptance criteria

- **AC-1.** `tutor-commission.test.ts` pins the six rates of section 3 to four decimals, the
  `V <= 0` case, a negative volume, and a rate below 71.43% at 10^9 baht.
- **AC-2.** `calculateNetwork` returns the money values of D-2 to the satang for the three
  presets, including each leg's volume and payout.
- **AC-3.** For preset 2 and preset 3, the conservation check holds in integer satang: leg
  payouts plus payout equal the gross satang, so 801,000 + 464,569 = 1,265,569 and
  1,656,000 + 827,345 = 2,483,345. Preset 3 reports leg payouts 16,560.00, payout 8,273.45, and
  net 8,025.25. Tax uses half up (D-3); price 1,007 with one own student and no legs gives
  gross 407.87, tax 12.24, and net 395.63.
- **AC-4.** `payoutAfterDeduction` returns 0 for `(0, 0)` and for `(100, 150)`, and tax and net
  are 0 on a zero payout.
- **AC-5.** `www-tutor-calculator.locale.test.ts` holds every `calculator.*` string of
  section 5.4 word for word in en and th, the same key paths in en, th, and zh, the zh values
  equal to the en values, and none of `inputs.secondLevel`, `inputs.studentsSecondLevel`, or
  `explain.twoLevels`.
- **AC-6.** The same test holds the two new live lines and finds neither old line.
- **AC-7.** The same test finds no `5,884`, `5,707`, `22,714`, or `9,889` string in the
  `calculator` block. Under D-17 it also finds no `chart.*` key, no downline, second-level, or
  direct-tutor key, and no pre-tax label. The shipped test does not check the superseded
  one-level draft figures (18,709.44 / 6,694.44 / 6,493.61 / 12,015), so this spec claims no
  such check.
- **AC-8.** The same test fails on each forbidden claim of D-16 inside the new strings, and it
  finds the price default of 3,000 baht.
- **AC-9.** The component test shows the default state (0 figures and the `zero` line), the leg
  count adding and removing one leg row, each preset's setup and result text and its figures,
  the clear on edit (D-7), the `aria-pressed` state, and the live region on the result card.
- **AC-10.** The page test finds `tutor-calculator` after the `tutorRole` section and before the
  `commitments` section, and `tutor-screens` before `tutor-calculator`, with five cards in the
  copy order and their alt texts.
- **AC-11.** The gates of section 8 exit 0: the module test, the www suite, types, lint, and
  build.
- **AC-12.** `scripts/ci/shadcn-ratchet-baseline.json` is unchanged.
- **AC-13.** The gallery holds the manifest entries and the webp files of AC-19.
  `src/lib/__tests__/tutor-screens.test.ts` holds the keys in slot order, each
  `src`/`width`/`height`/`portrait` value, and a file existence check under `public/`, and each
  card renders its file with the copy's alt text.
- **AC-14.** No used image shows "Reading 3.1": the task records the blur rectangles, the
  output files, and one full-size review per file.
- **AC-15.** The PM page-check at 390, 980, and 1280 px passes: no horizontal scroll, both new
  sections in the order of section 2, the calculator figures readable, and the Thai checked by
  Daniel.
- **AC-16.** The app selector prints `["www-reading-advantage"]` for the code commits.
- **AC-17.** `www-tutor-calculator.locale.test.ts` deep-equals the whole `calculator` and
  `screens` blocks against PR section 6: en and zh from section 6, th from the Thai of sections
  2 and 3, in the same key order, with no other key in either block. A rendered-page case finds
  no `downline`, `Downline deduction`, or `ดาวน์ไลน์` in en, th, or zh, before and after preset
  2 and preset 3 are pressed.
- **AC-18.** The component and the page use only PR section 6 keys. The graph carries
  `ownBar`, `legBar` with `{n}`, `grossBar`, `legCommissionBar`, `netBar`, `axisBaht`,
  `rateTitle`, `rateAxis`, and `ratePoint`. The variant `withLegs` equals the locale key. No
  `chart.*`, downline, second-level, direct-tutor, or pre-tax key remains.
- **AC-19.** `tutorScreens` holds exactly `guidedWriting`, `shortAnswer`, `feedback`,
  `selfReflection`, and `classRecord`, in that order, with the 040, 002, 004, 052, and 064
  student-mobile webp files at 520 by 1125. The page renders five cards with the PR alt text.
  No tutor screen ships.
- **AC-20.** Tax rounds half up as `(payoutSatang * 3n + 50n) / 100n`. Gross stays truncated.
  The three preset figures do not move. No test reads production source as text or computes a
  hash.
- **AC-21.** For 0 personal students and 1 or more legs, the payout before tax, the tax, and the
  net are 0, and `explainVariant` returns `zero` (D-18). The network volume, the rate, the gross,
  and the leg commissions keep their present values. One leg with 0 students and 0 personal
  students still gives volume 0 and the `zero` variant. A personal student count of 1 or more
  keeps the preset figures. The component shows a net payout of 0 and the `explain.zero` line
  for 0 personal students and one leg with 3 students, in en and th. No test reads production
  source as text or computes a hash.
- **AC-22.** The page renders each block of D-19 with the named file and the alt text of its
  locale in en, th, and zh. The three book cards follow the `books.items` order. The five
  gallery screens keep their files and alts. No block shows a banned file of D-19. The new
  cover file exists at 480 by 651. No test reads production source as text or computes a hash.
- **AC-23.** The component shows the own students' volume under `graph.ownBar` for each preset:
  12,000, 6,000, and 6,000 baht (D-20). The own bar and the leg bars add up to the network
  volume, each bar as its volume share. The `graph.grossBar`, `graph.legCommissionBar`, and
  `graph.netBar` rows keep the gross, the leg commissions, and the net. The page passes a value
  for the `{n}` placeholder of `calculator.graph.legBar`, and it renders in en, th, and zh with
  no missing placeholder value. A cleared leg-count field keeps the leg rows and the typed
  students, and a count of 2 again restores the earlier 5 and 7 students. The hero image loads
  with `loading="eager"` or `fetchpriority="high"`. No test reads production source as text or
  computes a hash.

## 10. Open questions

All seven questions closed on 2026-11-17. PR handoff v0.4 section 8 answers questions 1, 3, and
7 in task 2.7, commit `d91e6c527` and its follow-ups. The PM decisions answer questions 2, 5,
and 6. The PM page-check of task 2.5 answers question 4.

1. Resolved. PR v0.4 gives the preset 3 copy and the three chart labels (D-2a, D-9).
2. Resolved. The PM dropped the `network` and `earnings` captions, so the gallery holds three
   cards (D-15).
3. Resolved. PR v0.4 gives the `studentHome` caption and alt text of the shipped locale.
4. Resolved. The PM page-check passed on 2026-11-17, and Daniel read the Thai on the live page.
   The zh lines keep the English values (D-10).
5. Resolved. The www-only push `a726b2be2` came after the page-check, and CD run 44053703983
   succeeded. No deploy command ran from the session.
6. Resolved. The PM accepted the 11 % upscale of the phone screens at 1280 px.
7. Resolved. PR v0.4 replaced the alt text, and the manifest key is now `shortAnswer` (D-15a).
