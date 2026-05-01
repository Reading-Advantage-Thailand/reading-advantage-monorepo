# Design Language — Reading Advantage (Thailand)

> Canonical design language for the marketing surfaces, derived from Clay
> (warm cream, Roobert, playful hover) and constrained to the Reading
> Advantage sky palette. This document is the source of truth for the home
> page rewrite shipped April 2026.

---

## 1. Visual Theme & Atmosphere

Reading Advantage's marketing surfaces combine the **warm, artisanal canvas**
of Clay with the **disciplined, single-color brand identity** of a Southeast
Asian education company that takes its research seriously. Warm cream
(`#faf9f7`) and oat borders (`#dad4c8`) provide the paper-like ground;
**sky-500 / sky-900** are the only brand colors permitted at scale; neutrals
handle everything else.

The design rejects the common edtech trap of decorating every section with
a different gradient, blurred color blob, or card treatment. Instead, sections
alternate between **paper** (warm cream) and **loud** (sky-900 or indigo-900
ground). The visual rhythm comes from *restraint*, not from variety.

Typography is **Roobert** with five OpenType stylistic sets for display
(`ss01 ss03 ss10 ss11 ss12`), compressed tight at display scale (-3.2px at
80px) so headlines feel like billboards. **Space Mono** handles code and
technical labels. Serifs are not used.

Hover animations inherit the Clay signature: `rotateZ(-8deg)` +
`translateY(-80%)` + hard offset shadow `rgb(0,0,0) -7px 7px`. Subtle fades
are not in the vocabulary — interactions are physical and slightly playful.

### Key characteristics

- Warm cream canvas (`#faf9f7`) — never cool white, never neutral gray
- Oat borders (`#dad4c8`) — warm-toned structural lines, not `#e5e7eb`
- **Single-color brand discipline**: sky-500 lead, sky-900 deep, indigo-900
  partner — no amber, orange, rose, or slate alongside
- Roobert + Space Mono, five stylistic sets on display type
- Multi-layer shadow with inset highlight (Level 1) + hard offset (hover)
- Generous radius: 16px cards, 24px feature cards, 40px sections
- Uppercase eyebrows (`tracking-[0.18em]`) as the wayfinding system

---

## 2. Color Palette & Roles

### Foundation

| Token       | Value     | Role                                               |
| ----------- | --------- | -------------------------------------------------- |
| `cream`     | `#faf9f7` | Page background — the warm, paper-like canvas      |
| `white`     | `#ffffff` | Card backgrounds, the "calm" band inside sections  |
| `black`     | `#000000` | Headings, body emphasis, primary button background |
| `charcoal`  | `#55534e` | Tertiary text, link text                           |
| `silver`    | `#9f9b93` | Muted / caption text, footer links                 |
| `oat`       | `#dad4c8` | Primary border — warm cream-toned                  |
| `oat-light` | `#eee9df` | Secondary lighter border, subtle dividers          |

### Reading Advantage sky palette — the brand accent

| Token      | Value     | Role                                              |
| ---------- | --------- | ------------------------------------------------- |
| `sky-100`  | `#e0f2fe` | Soft wash — icon-tile ground, badge backgrounds   |
| `sky-300`  | `#7dd3fc` | Light sky — text on sky-900, highlight fills      |
| `sky-400`  | `#38bdf8` | Primary logo color — small bright accents         |
| `sky-500`  | `#0ea5e9` | **Lead accent** — logo, hover-border, link-accent |
| `sky-700`  | `#0369a1` | **Text accent** — eyebrows, body links on cream   |
| `sky-900`  | `#0c4a6e` | **Deep** — "loud" section backgrounds, deep logo  |
| `indigo-900` | `#1e1b4b` | Second-neutral partner for dark backgrounds     |

### Usage rules

1. **Sky-700 for type on cream.** `sky-500` is the logo mark and the lead
   accent but it fails contrast for body copy on `#faf9f7`. Use `sky-700`
   (`#0369a1`) for eyebrows, inline links, and ghost-button borders.
2. **One "loud" section per page.** Exactly one section uses `sky-900` or
   `indigo-900` as a full-bleed background. Everything else is cream or
   white. Running two loud sections in a row defeats the rhythm.
3. **No gradient text.** Ever. The sky-300→sky-500 headline gradient is
   forbidden; it reads as generic SaaS and flattens the typographic voice.
4. **No blurred color orbs.** `blur-[100px]` sky/amber blobs as section
   decoration are out. If a section needs energy, use a full-bleed color,
   not decorative blur.
5. **Product families keep their own hues on their own pages.** Cyan for
   Primary, Orange for Math, Rose for Science, etc. But **the marketing
   root (home, about, contact, pricing) is sky-only.** Don't mix product
   hues on the home page.

---

## 3. Typography Rules

### Font families

- **Primary**: `Roobert` (fallback: `Arial`)
- **Monospace**: `Space Mono`
- **OpenType**: `"ss01" "ss03" "ss10" "ss11" "ss12"` on display;
  `"ss03" "ss10" "ss11" "ss12"` on body and UI.

### Hierarchy (home-page scale)

| Role           | Size          | Weight | Line height | Tracking      |
| -------------- | ------------- | ------ | ----------- | ------------- |
| Display hero   | 80px / 5rem   | 600    | 1.02        | `-0.03em`     |
| Section head   | 44–60px       | 600    | 1.05        | `-0.02em`     |
| Card title     | 20–24px       | 600    | 1.20        | `-0.4px`      |
| Body large     | 18–20px       | 400    | 1.50–1.60   | normal        |
| Body           | 16px          | 400    | 1.60        | `-0.16px`     |
| UI / button    | 14–16px       | 500    | 1.50        | `-0.16px`     |
| Eyebrow label  | 12px UPPER    | 600    | 1.20        | `0.18em`      |

### Principles

- **Weight 600 for display and headings. Weight 500 for UI. Weight 400 for
  body.** Strict three-tier system; no variation.
- **Aggressive display tracking.** At 80px, track `-0.03em`. This is what
  makes Roobert feel like a brand font rather than default Arial.
- **Uppercase eyebrows are the wayfinding.** Every section opens with a
  12px uppercase eyebrow at `tracking-[0.18em]` in `sky-700` (or `sky-300`
  on dark). This replaces decorative icon badges.
- **Never use italic serifs for emphasis.** Reading Advantage's voice is
  confident and neutral, not editorial. Italic Instrument Serif accents
  — considered in the review phase — are **out**. Emphasis comes from
  eyebrows, uppercase, and a single `sky-700` color shift.

---

## 4. Components

### Buttons

The existing `Button` component (`src/components/ui/button.tsx`) is the
canonical primitive. Variants in use on the home page:

- **`default`** — `bg-primary` (maps to black), white text. Primary CTA.
  Hover: `-translate-y-1` + `shadow-lg` (inherited from `buttonVariants`).
- **`white`** — white background, slate-900 text. Use on `sky-900`
  section.
- **Ghost link** — a bare `<Link>` with `border-b border-[#dad4c8]`, no
  padding, no bg. Used as the secondary "See the research →" pairing next
  to every primary CTA. This replaces the old multi-button approach.

### Cards

- Background: `#ffffff` on cream, or `sky-900/40` on sky-900 backgrounds.
- Border: `1px solid #dad4c8` on cream; `1px solid sky-700` on sky-900.
- Radius: `rounded-2xl` (16px) for standard list cards, `rounded-3xl`
  (24px) for feature / image cards.
- Shadow (on cream only):
  `rgba(0,0,0,0.1) 0px 1px 1px,
   rgba(0,0,0,0.04) 0px -1px 1px inset,
   rgba(0,0,0,0.05) 0px -0.5px 1px`.
  Do not use `shadow-xl` or `shadow-2xl` — they aren't in the language.

### Grid "divider cards"

The `howItWorks` section uses a grid-gap-trick: cells sit on a `bg-[#dad4c8]`
wrapper with `gap-px`, producing a 1px oat rule between cards. This is the
preferred pattern for four-up numbered lists — it replaces the previous
gradient-icon-tile approach.

### Evidence stat row (hero)

A 3-column `dl` with `border-t border-[#dad4c8]`, numbers in weight-600 at
32–40px, labels in 12px uppercase silver. No icons, no cards, no gradient
backgrounds. The data *is* the decoration.

---

## 5. Layout

### Section rhythm

Home page ships **5 sections**, not 8:

| # | Section            | Ground        | Job                                        |
| - | ------------------ | ------------- | ------------------------------------------ |
| 1 | Hero               | Cream         | Claim + evidence + primary CTA             |
| 2 | Flagship           | Cream         | What it is, who it's for                   |
| 3 | How it works       | White + rules | The Big 4 Quality Protocol, numbered       |
| 4 | For Thai schools   | **Sky-900**   | The specific wedge — the loud section      |
| 5 | Final CTA          | Cream         | Repeat the same ask from the hero, verbatim |

Removed: Mission, Overview, Innovation (merged into How it works),
standalone Big 4 section (merged into How it works), separate Impact
stats block (promoted into the hero).

### Spacing

- Section vertical padding: `py-24 md:py-32` (96 / 128 px). Never less than
  `py-16` on marketing sections.
- Container max width: `max-w-6xl` (72rem) for content sections; `max-w-4xl`
  for the closing CTA.
- Section-to-section dividers: `border-t border-[#dad4c8]` between cream
  sections; no rule against loud sections (the color change *is* the rule).

### Border radius scale

| Level           | Value   | Use                                       |
| --------------- | ------- | ----------------------------------------- |
| Sharp           | 4px     | Inputs, ghost outlines                    |
| Standard        | 8–12px  | Small buttons, inline tags                |
| Card            | 16px    | Standard cards (`rounded-2xl`)            |
| Feature         | 24px    | Hero image frame, big feature cards       |
| Section         | 40px    | Large containers, footer                  |

---

## 6. Voice & copy rules

These are part of the design language because they constrain layout
decisions:

1. **One CTA verb per page.** The home page uses "Book a 20-min demo"
   everywhere a primary CTA appears. Never "Partner With Us," "Start Your
   Success Story," "Discover Your Solution" — these read as the company
   negotiating with itself.
2. **Every primary CTA is time-boxed.** "Book a **20-min** demo" lowers
   commitment anxiety. "Schedule a demo" does not.
3. **Lead with evidence.** Aka (2019) +9.5 pts vs. grammar is the single
   most persuasive fact the brand owns. It belongs above the fold, in the
   hero, as a number — not buried in an Overview stat card.
4. **Name the customer.** "Thai private schools" is specific enough that
   a reader either self-identifies or self-excludes — both are wins.
   "Educational institutions across Southeast Asia" is not.
5. **No superlatives in headlines.** "Empowering," "transformative,"
   "innovative," "cutting-edge" — banned. The brand is credible because
   it's specific, not because it claims to be.
6. **Never advertise the model vendor.** "Powered by Google Gemini & GPT-5
   AI" does not belong on a marketing page. Schools buy on outcomes and
   support, not on which frontier model sits behind the dashboard. If this
   line survives anywhere, it's a single sentence in the `/about`
   footer area.

---

## 7. Do / Don't

### Do

- Start every section with an uppercase `sky-700` eyebrow
- Use `bg-[#faf9f7]` as the canonical page background
- Use `border-[#dad4c8]` for every structural border on cream
- Repeat the same primary CTA verb across the page
- Pick exactly one section per page to run as the "loud" sky-900 band
- Use weight 600 for display, 500 for UI, 400 for body — strictly
- Use the 3-stat evidence `<dl>` pattern instead of hero decoration

### Don't

- Don't use gradient text — not on headlines, not anywhere
- Don't stack a `badge` CTA on top of a button CTA saying the same words
- Don't use `blur-[100px]` color orbs as background decoration
- Don't mix amber, orange, rose, or slate alongside sky on the home page
- Don't use more than one primary CTA verb on a page
- Don't use `mailto:` for the demo CTA — route through `/contact` form
- Don't name the model vendor ("Gemini / GPT-5") in marketing copy
- Don't use photos of students in generic classrooms as hero decoration;
  if they're real partner schools, name them and add a quote; if they're
  stock-feeling, use a product screenshot instead

---

## 8. Agent prompt guide

### Example prompts for future pages that should match this language

- "Add a pricing section. Warm cream `#faf9f7` background, Roobert
  weight 600 section heading at 44px with `-0.02em` tracking, uppercase
  `sky-700` eyebrow above it. Three plan cards, white ground,
  `border-[#dad4c8]`, `rounded-2xl`, multi-layer Clay shadow. One primary
  CTA per card: 'Book a 20-min demo' — same verb as the home page."

- "Dark CTA section. `bg-sky-900`, white heading at 60px weight 600,
  `sky-300` eyebrow. Single `variant='white'` button with the time-boxed
  CTA. No blurred orbs, no gradient backgrounds."

- "Four-up numbered list. Cream background. Grid of four cells on a
  `bg-[#dad4c8]` wrapper with `gap-px` — this produces 1px oat rules
  between cards. Each cell: white ground, `p-8`, uppercase `sky-700`
  `01`/`02`/`03`/`04` label, weight-600 title, 14px `#55534e` body."

### Checklist before shipping a new marketing section

1. Is the ground cream, white, sky-900, or indigo-900 — and nothing else?
2. Is the section opened by an uppercase `sky-700` eyebrow?
3. Is there a single primary CTA using the same verb as the rest of the page?
4. Are all borders `#dad4c8`?
5. Are all headings Roobert weight 600 with negative tracking?
6. Are there exactly zero: gradient texts, blurred orbs, icon-gradient tiles?

If any answer is "no," the section doesn't belong in the language yet.
