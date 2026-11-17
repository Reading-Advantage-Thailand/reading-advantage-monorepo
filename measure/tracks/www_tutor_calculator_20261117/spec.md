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
tax        = 3% of a positive payout
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
| Students per leg | none | 3, 3 | 3, 3, 3 |
| Own GV | 12,000.00 | 6,000.00 | 6,000.00 |
| Network GV | 12,000.00 | 24,000.00 | 33,000.00 |
| Rate | 46.0000% | 52.7321% | 56.6953% |
| Gross | 5,520.00 | 12,655.69 | 18,709.44 |
| Leg payouts | 0 | 8,010.00 | 12,015.00 |
| Payout before tax | 5,520.00 | 4,645.69 | 6,694.44 |
| Withholding tax | 165.60 | 139.37 | 200.83 |
| Net | 5,354.40 | 4,506.32 | 6,493.61 |

Preset 1 and preset 2 fit the copy file's lines as they stand. Their figures round to the same
whole baht: 5,520 / 5,354 and 12,656 / 4,646 / 4,506.

Preset 3 does not fit "a small team, two levels" any more, because the calculator has one level
(D-4). The default is three legs of three students with two own students: GV 33,000, rate
56.6953%, gross 18,709.44, leg payouts 12,015.00, payout 6,694.44, tax 200.83, net 6,493.61.
The rate is 56.6953% from the formula; the brief of 2026-11-17 gives 56.6951%, which differs in
the fourth decimal. Every money figure in the brief matches this table to the whole baht.

**D-2a. Preset 3 wording (pending from PR).** The copy file's preset 3 name, setup, and result
no longer describe the inputs. This session supplies a draft. PR replaces the draft when it
delivers the new wording. The figures are the table above.

| Key | Draft en | Draft th |
|---|---|---|
| `presets[2].name` | A small team, three legs | ทีมเล็ก สามสายงาน |
| `presets[2].setup` | Two own students, and three direct tutors with three students each. | นักเรียนของตัวเองสองคน และติวเตอร์ชั้นแรกสามคนที่มีนักเรียนคนละสามคน |
| `presets[2].result` | 33,000 baht of network volume at a rate of 56.7%. The gross is 18,709 baht, and the three direct tutors earn 12,015 baht of it. The payout is 6,694 baht before tax, and 6,494 baht after 3% withholding tax. | ยอดรวมของเครือข่าย 33,000 บาท ที่อัตรา 56.7% ค่าคอมมิชชันก่อนหัก 18,709 บาท โดยติวเตอร์ชั้นแรกสามคนได้รับ 12,015 บาท เหลือจ่ายก่อนภาษี 6,694 บาท และหลังหักภาษีหัก ณ ที่จ่าย 3% เหลือ 6,494 บาท |

The earlier corrected-preset-3 line of the 2026-11-17 brief (GV 33,000 with two directs and one
second-level tutor, payout 5,884.44, net 5,707.91) is superseded by this one-level shape. It
does not appear.

### D-3 Money is integer satang, truncated

The graphic states the rule: GV and payouts are whole satang, the rate has a scale of 10^9,
and `rate * GV` is truncated to the satang. The module does the same:

1. `gvSatang = Math.round(GV baht * 100)`.
2. `rateUnits = Math.round(rate(GV) * 1e9)`.
3. `flatSatang = (BigInt(rateUnits) * BigInt(gvSatang)) / 1000000000n`, which truncates.
4. Deduction and tax are integer arithmetic on satang. Tax is `(payoutSatang * 3n) / 100n`.

BigInt keeps the product exact. A Number product passes 2^53 at large volume, so the module
does not use one. The module returns baht as a Number for display.

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
starts with 3 students, the value the presets use.

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
leg plus one row for the tutor:

1. A row holds a label, a bar, and the money figures of that row.
2. The bar length is the payout of that row against the gross, so the rows add up to the whole.
3. A leg row reads `chart.leg` and the leg numeral, then `chart.volume` with the volume, then
   the leg payout as bold text.
4. The tutor row reads `chart.you` and the payout as bold text.
5. The rate curve of the June file sits next to the graph at `lg` and above it at small widths
   (D-11).

The graph uses three short labels, `chart.leg`, `chart.you`, and `chart.volume`. The copy file
has no such keys, so this session supplies drafts, and PR confirms them with the preset 3
wording (D-2a). The bar length is a run-time value: an inline style carries it as a CSS custom
property, and one rule in `src/app/[locale]/globals.css` reads it. The `shadcn/no-inline-styles`
row of `apps/www-reading-advantage/docs/design-rules.md` allows an inline style that sets a CSS
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

**D-15a. Slot 2's alt text is a draft.** Copy v0.1 gives the `lessonPhases` alt as "Tutor app
showing the 18 phases of one lesson", and the Thai as "แอปติวเตอร์แสดง 18 ช่วงของบทเรียนหนึ่งบท".
The mapped screen, `student-mobile/002`, is a student-app screen: the student tab bar and the
student points header are visible. The caption ("One lesson, 18 phases") fits the screen; the
alt names the wrong app.

This spec keeps PR's wording word for word and marks it as a draft. PR either corrects it to a
student-app wording or confirms it. The locale test pins the string as it stands, so the change
is one line in the dictionary and one line in the test.

### D-16 The June claims do not return

These June claims stay out: the annual projection, the teacher-salary comparison, the hourly
rate, "VAT handled", "50 Tawi", and "no earning cap". No percentage appears beyond the rate
formula. Every figure is an example, and the disclaimer says so.

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
export function explainVariant(result: NetworkResult): "zero" | "ownOnly" | "withDownline";
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
   gives `ownOnly`; anything else gives `withDownline`.
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
              directTutors: string; studentsPerDirect: string };
    results: { ownGV: string; networkGV: string; rate: string; gross: string;
               downline: string; tax: string; net: string };
    explain: { ownOnly: string; withDownline: string; zero: string };
    chart: { leg: string; you: string; volume: string };
    presets: readonly { name: string; setup: string; result: string }[];
  };
};
```

Layout, from the June file:

1. `SectionHeader` with the eyebrow, the heading, and the description.
2. Three preset buttons in a row. The selected one is `aria-pressed`.
3. A 12-column grid at `lg`. Inputs take seven columns, results take five.
4. Input cards: price with `priceNote`; own students; the leg count. Below the count, one row
   per leg, each with the leg numeral, the `studentsPerDirect` label, and a number input.
5. The payout graph and the rate curve under the input cards (D-9, D-11).
6. Results: the net payout as the hero figure, then the rows `ownGV`, `networkGV`, `rate`,
   `gross`, `downline`, `tax`, `net`. `gross - downline - tax = net` holds on the page.
7. The explain line under the result, chosen by `explainVariant`.
8. The selected preset's `setup` under the buttons and its `result` in a bordered block under
   the result panel.
9. `volumeNote`, `rateNote`, `payoutNote`, and `disclaimer` as muted text. The disclaimer sits
   last.
10. The result card is `aria-live="polite"`.

Design rules: theme colors only (site neutrals plus the emerald scale), no arbitrary value, no
inline style except the bar width custom property, 390 px with no horizontal scroll, and a
44 px minimum target on the buttons and the leg controls.

### 5.4 The locale keys (en, then th, then zh)

Key order follows the copy file. Insert the `calculator` block after `tutorRole` and before
`faq` in all three dictionaries.

```ts
calculator: {
    eyebrow: "THE COMMISSION CALCULATOR",
    heading: "See how one month's commission works",
    description: "The calculator uses the same formula as our settlement system. Choose the price and the students, and see the month. Every figure is an example, not a promise of income.",
    volumeNote: "Volume is the class package price times the students who paid in the month.",
    rateNote: "The rate starts near 40% on a small volume. It passes 50% at 20,000 baht and approaches 71% at very high volume.",
    payoutNote: "Your payout is the rate times the network volume, minus the payouts of your direct downline tutors. 3% withholding tax comes off a positive payout.",
    inputs: {
        price: "Class package price (baht)",
        priceNote: "Default: 3,000 baht. The price adapts to the market.",
        ownStudents: "Students in your own classes this month",
        directTutors: "Direct tutors in your network",
        studentsPerDirect: "Students for each direct tutor",
    },
    results: {
        ownGV: "Your own volume",
        networkGV: "Network volume",
        rate: "Commission rate",
        gross: "Gross commission",
        downline: "Downline deduction",
        tax: "Withholding tax (3%)",
        net: "Net payout",
    },
    explain: {
        ownOnly: "No downline this month, so the whole gross amount is the payout.",
        withDownline: "Your rate applies to the whole network volume. The payouts of the tutors directly below you come off, and so does 3% withholding tax.",
        zero: "Add students to see a month.",
    },
    chart: {
        leg: "Leg",
        you: "Your payout",
        volume: "Volume",
    },
    presets: [
        { name: "A new tutor", setup: "Four students, no network.", result: "12,000 baht of volume at a rate of 46%. The gross is 5,520 baht, and with no downline it is all payout. After 3% withholding tax: 5,354 baht." },
        { name: "A tutor with two direct tutors", setup: "Two own students, and two direct tutors with three students each.", result: "24,000 baht of network volume at a rate of 52.7%. The gross is 12,656 baht, and the two direct tutors earn 8,010 baht of it. The payout is 4,646 baht before tax, and 4,506 baht after 3% withholding tax." },
        { name: "A small team, three legs", setup: "Two own students, and three direct tutors with three students each.", result: "33,000 baht of network volume at a rate of 56.7%. The gross is 18,709 baht, and the three direct tutors earn 12,015 baht of it. The payout is 6,694 baht before tax, and 6,494 baht after 3% withholding tax." },
    ],
    disclaimer: "Every figure in these examples is an illustration. Commission depends on the classes that run and are paid for.",
},
```

`presets[2]` is a draft (D-2a). `chart` is a draft (D-9).

The `th` block holds the Thai values of the copy file in the same order:

| Key | Thai |
|---|---|
| `eyebrow` | เครื่องคำนวณค่าคอมมิชชัน |
| `heading` | ดูว่าค่าคอมมิชชันของหนึ่งเดือนคิดอย่างไร |
| `description` | เครื่องคำนวณนี้ใช้สูตรเดียวกับระบบสรุปยอดของเรา เลือกราคาและจำนวนนักเรียน แล้วดูยอดของเดือนนั้น ตัวเลขทุกตัวเป็นตัวอย่าง ไม่ใช่คำสัญญาเรื่องรายได้ |
| `volumeNote` | ยอดรวม คือราคาแพ็กเกจคลาสคูณกับจำนวนนักเรียนที่จ่ายเงินในเดือนนั้น |
| `rateNote` | อัตราเริ่มต้นใกล้ 40% เมื่อยอดรวมยังน้อย ผ่าน 50% ที่ 20,000 บาท และเข้าใกล้ 71% เมื่อยอดรวมสูงมาก |
| `payoutNote` | เงินที่คุณได้รับ คืออัตราคูณกับยอดรวมของเครือข่าย หักด้วยเงินที่ติวเตอร์ดาวน์ไลน์ชั้นแรกได้รับ แล้วหักภาษีหัก ณ ที่จ่าย 3% จากยอดที่เป็นบวก |
| `inputs.price` | ราคาแพ็กเกจคลาส (บาท) |
| `inputs.priceNote` | ค่าเริ่มต้น 3,000 บาท ราคาปรับตามตลาด |
| `inputs.ownStudents` | จำนวนนักเรียนในคลาสของคุณเดือนนี้ |
| `inputs.directTutors` | ติวเตอร์ชั้นแรกในเครือข่ายของคุณ |
| `inputs.studentsPerDirect` | จำนวนนักเรียนของติวเตอร์ชั้นแรกแต่ละคน |
| `results.ownGV` | ยอดรวมของคุณเอง |
| `results.networkGV` | ยอดรวมของเครือข่าย |
| `results.rate` | อัตราค่าคอมมิชชัน |
| `results.gross` | ค่าคอมมิชชันก่อนหัก |
| `results.downline` | ส่วนที่หักให้ดาวน์ไลน์ |
| `results.tax` | ภาษีหัก ณ ที่จ่าย (3%) |
| `results.net` | เงินที่ได้รับสุทธิ |
| `explain.ownOnly` | เดือนนี้ไม่มีดาวน์ไลน์ เงินก่อนหักทั้งหมดจึงเป็นเงินที่คุณได้รับ |
| `explain.withDownline` | อัตราของคุณคิดกับยอดรวมทั้งเครือข่าย จากนั้นหักเงินที่ติวเตอร์ที่อยู่ใต้คุณโดยตรงได้รับ และหักภาษีหัก ณ ที่จ่าย 3% |
| `explain.zero` | ใส่จำนวนนักเรียนเพื่อดูยอดของเดือน |
| `chart.leg` | สายงาน (draft) |
| `chart.you` | เงินที่คุณได้รับ (draft) |
| `chart.volume` | ยอดรวม (draft) |
| `presets[0].name` | ติวเตอร์ใหม่ |
| `presets[0].setup` | นักเรียนสี่คน ไม่มีเครือข่าย |
| `presets[0].result` | ยอดรวม 12,000 บาท ที่อัตรา 46% ค่าคอมมิชชันก่อนหัก 5,520 บาท ไม่มีดาวน์ไลน์ จึงได้รับทั้งหมด หลังหักภาษีหัก ณ ที่จ่าย 3% เหลือ 5,354 บาท |
| `presets[1].name` | ติวเตอร์ที่มีติวเตอร์ชั้นแรกสองคน |
| `presets[1].setup` | นักเรียนของตัวเองสองคน และติวเตอร์ชั้นแรกสองคนที่มีนักเรียนคนละสามคน |
| `presets[1].result` | ยอดรวมของเครือข่าย 24,000 บาท ที่อัตรา 52.7% ค่าคอมมิชชันก่อนหัก 12,656 บาท โดยติวเตอร์ชั้นแรกสองคนได้รับ 8,010 บาท เหลือจ่ายก่อนภาษี 4,646 บาท และหลังหักภาษีหัก ณ ที่จ่าย 3% เหลือ 4,506 บาท |
| `presets[2].name` | ทีมเล็ก สามสายงาน (draft) |
| `presets[2].setup` | นักเรียนของตัวเองสองคน และติวเตอร์ชั้นแรกสามคนที่มีนักเรียนคนละสามคน (draft) |
| `presets[2].result` | see D-2a (draft) |
| `disclaimer` | ตัวเลขทุกตัวในตัวอย่างนี้เป็นการอธิบายให้เห็นภาพ ค่าคอมมิชชันขึ้นอยู่กับคลาสที่เปิดสอนและมีการจ่ายเงินจริง |

The keys `inputs.secondLevel`, `inputs.studentsSecondLevel`, and `explain.twoLevels` of copy
v0.1 do not exist (D-4).

`zh` takes the English values of every key above, key for key. D-10 applies.

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
| 1 | `tutorScreens.studentHome` | `student-mobile/070-screen.png` | `student-mobile/070-screen.webp` |
| 2 | `tutorScreens.lessonPhases` | `student-mobile/002-screen.png` | `student-mobile/002-screen.webp` |
| 3 | `tutorScreens.classList` | `tutor-desktop/062-screen.png` | `tutor-desktop/062-screen.webp` |

The manifest entries go into `productPictures` in
`apps/www-reading-advantage/src/lib/product-pictures.ts`, in slot order, with the real pixel
size and `portrait: false`, so each screen keeps its own proportions at card width.

Slots 4 and 5 have no picture (D-15).

### 6.3 The gallery section

`SectionHeader` with the three `screens` strings, then one card per slot in copy order. Each
card renders `ProductPicture` with the slot's `alt` and the caption under it. The grid puts the
two phone screens in half-width cards and the wide screen across the row at `md`, and one
column at 390 px. No new image or heading component: item 8 of the review checklist in
`apps/www-reading-advantage/docs/design-rules.md` requires the shared parts.

```ts
screens: {
    eyebrow: "INSIDE THE APPS",
    heading: "The student app and the tutor app",
    description: "A student joins the class in LINE. The tutor runs the class in the tutor app. Both follow the same printed workbook.",
    items: [
        { caption: "The student's home: the next class, the lesson, and Reedy practice.", alt: "Tutor Advantage student app home screen" },
        { caption: "One lesson, 18 phases. The app follows the printed workbook step by step.", alt: "Tutor app showing the 18 phases of one lesson" }, // alt draft, see D-15a
        { caption: "The tutor's class list: who is in today's class and which lesson they are on.", alt: "Tutor app class list with the students of one class" },
    ],
},
```

The Thai values, in the same order:

| Key | Thai |
|---|---|
| `eyebrow` | ภายในแอป |
| `heading` | แอปของนักเรียน และแอปของติวเตอร์ |
| `description` | นักเรียนเข้าคลาสผ่าน LINE ติวเตอร์สอนผ่านแอปของติวเตอร์ ทั้งสองใช้เวิร์กบุ๊กที่พิมพ์เป็นเล่มชุดเดียวกัน |
| `items[0].caption` | หน้าแรกของนักเรียน: คลาสถัดไป บทเรียน และการฝึกพูดกับ Reedy |
| `items[0].alt` | หน้าแรกของแอปนักเรียน Tutor Advantage |
| `items[1].caption` | หนึ่งบทเรียน 18 ช่วง แอปพาไปทีละขั้นตามเวิร์กบุ๊กที่พิมพ์เป็นเล่ม |
| `items[1].alt` | แอปติวเตอร์แสดง 18 ช่วงของบทเรียนหนึ่งบท (draft, D-15a) |
| `items[2].caption` | รายชื่อคลาสของติวเตอร์: วันนี้มีใครบ้าง และแต่ละคนอยู่บทไหน |
| `items[2].alt` | รายชื่อนักเรียนในคลาสหนึ่งของแอปติวเตอร์ |

The copy file's `network` and `earnings` captions are not added until PR delivers a matching
screen (D-15). The copy file's `lessonPhases` alt text says "18 phases of one lesson", which is
what `student-mobile/002` shows: "ขั้นที่ 8/18". That alt also names the tutor app, and the
screen is a student-app screen, so the alt is a draft (D-15a).

`zh` takes the English values. D-10 applies.

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
  1,201,500 + 669,444 = 1,870,944. Preset 3 reports leg payouts 12,015.00, payout 6,694.44, and
  net 6,493.61.
- **AC-4.** `payoutAfterDeduction` returns 0 for `(0, 0)` and for `(100, 150)`, and tax and net
  are 0 on a zero payout.
- **AC-5.** `www-tutor-calculator.locale.test.ts` holds every `calculator.*` string of
  section 5.4 word for word in en and th, the same key paths in en, th, and zh, the zh values
  equal to the en values, and none of `inputs.secondLevel`, `inputs.studentsSecondLevel`, or
  `explain.twoLevels`.
- **AC-6.** The same test holds the two new live lines and finds neither old line.
- **AC-7.** The same test holds the preset 3 draft of D-2a in en and th, and finds no `5,884`,
  `5,707`, `22,714`, or `9,889` string in the `calculator` block.
- **AC-8.** The same test fails on each forbidden claim of D-16 inside the new strings, and it
  finds the price default of 3,000 baht.
- **AC-9.** The component test shows the default state (0 figures and the `zero` line), the leg
  count adding and removing one leg row, each preset's setup and result text and its figures,
  the clear on edit (D-7), the `aria-pressed` state, and the live region on the result card.
- **AC-10.** The page test finds `tutor-calculator` after the `tutorRole` section and before the
  `commitments` section, and `tutor-screens` before `tutor-calculator`, with three cards in the
  copy order and their alt texts.
- **AC-11.** The gates of section 8 exit 0: the module test, the www suite, types, lint, and
  build.
- **AC-12.** `scripts/ci/shadcn-ratchet-baseline.json` is unchanged.
- **AC-13.** Phase 2 adds the three manifest entries and the three webp files.
  `src/lib/__tests__/tutor-screens.test.ts` holds the three keys in slot order, each
  `src`/`width`/`height`/`portrait` value, and a file existence check under `public/`, and each
  card renders its file with the copy's alt text.
- **AC-14.** No used image shows "Reading 3.1": the task records the blur rectangles, the
  output files, and one full-size review per file.
- **AC-15.** The PM page-check at 390, 980, and 1280 px passes: no horizontal scroll, both new
  sections in the order of section 2, the calculator figures readable, and the Thai checked by
  Daniel.
- **AC-16.** The app selector prints `["www-reading-advantage"]` for the code commits.

## 10. Open questions

1. Preset 3 (name, setup, result) and the three `chart.*` labels are drafts (D-2a, D-9). PR
   confirms or replaces them, with one fact-gate pass.
2. The copy file's `network` and `earnings` captions have no screen in the delivered set. PR
   delivers a capture of the tutor app's network page and its income page, or withdraws the two
   captions. The gallery holds three cards until then.
3. The `studentHome` caption names "Reedy practice". `student-mobile/070` shows the next class,
   the lesson, and a chat button, and no Reedy card. Neither allowed screen `070` nor `071`
   shows Reedy practice. PR either drops the clause or delivers a Reedy screen.
4. The Thai lines are drafts until Daniel checks them on the built page. The zh lines wait for
   the contracted Chinese speaker (D-10).
5. "No deploy" and "push to master" meet at the CD run: a push to `origin/master` starts the CD
   deploy. This plan reads the standing approval as a push after the page-check, with no deploy
   command from this session. Daniel confirms the order.
6. The delivered `student-mobile` files are 520 x 1125, the original capture size. A larger
   phone file does not exist. At 390 px the card is sharp; at 1280 px it is upscaled. Daniel
   accepts the softness or PR captures again.
7. The `lessonPhases` alt names the tutor app, and the mapped screen is the student app
   (D-15a). PR corrects the alt or confirms it.
