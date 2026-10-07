# Spec — Primary public pages in the RPG skin

**Status:** requested by the owner through the PR session, 2026-10-07. Owner decisions of 2026-10-07 are in §3.
**Branch:** `primary/public-pages`, made from `primary-parity-integration`. The feature freeze applies: nothing
from this track goes to integration, master, or production before the Primary cutover passes
(deploy 2026-10-11, last date 2026-10-20). If the cutover fails, this track waits with the rest of the build.
**Design authority:** `docs/primary-rpg-skin.md` (rules 1–3, 7, 8). **Copy:** PR (English, alt text, claims
review); Daniel (Thai); the contracted reviewer (cn, tw).

## 1. Problem

The four public pages (`app/[locale]/(index)`) do not look like the product and do not work:

- Home uses the old dark-blue design (#172554, wave SVGs, glow text), not the RPG skin of the app and the
  gatehouse sign-in.
- The home contact form has no submit handler: "Send Message" does nothing, so a school's message is lost.
- About has only a title and a description; Contact has one hard-coded English line; Authors shows the
  placeholder "Authors Page".
- `HomePage` strings make claims that are not approved: "AI-Powered Fun", "ages 8-12", "Start your free
  trial" (as worded), "Why Schools Love Primary Advantage", outcome promises ("Become a Super Reader"),
  and "made just for you" (adaptive features are not live).
- `siteConfig.description` ("Extensive reading app incorporating AI.") shows in the metadata and under
  the sign-in form.

## 2. Requirements

- **PP-1 Skin.** The public layout and pages use the RPG skin kit: a `Scene` per page (gatehouse for home,
  guild-hall for About, inn for Contact, library for Our books), parchment panels, wood plaques, the
  `cq-` type, and the Forge assets only. Light and night mode both work. Mobile first (375 px), then
  1280 px.
- **PP-2 Home sections**, in this order (§4): hero, the book and the app, inside the app, for teachers,
  levels, for families, contact.
- **PP-3 No dead form.** The home contact form is removed. Contact is a list of links: LINE Official
  (with the QR picture), Facebook, phone (`tel:`), and email (`mailto:`). The channel values live in one
  config file (`configs/contact-channels.ts`), not in the message files. The values come from PR's
  single source `advantage-pr/01-company/contact-and-locations.md` (v2.1, 2026-10-07); the LINE QR picture
  is `advantage-pr/assets/images/line-qr.jpg`.
- **PP-4 Free trial call to action.** "Contact us for a free trial" (owner decision 3) links to the
  contact section or page. No trial terms on any page.
- **PP-5 Book mock-up.** Home section 2 (and Our books) shows a CSS book (perspective, spine, shadow)
  made from a flat front cover (1474×2000). The cover of Primary Advantage Origins 3.2 comes from the
  Workbooks session; until it arrives, the Origins 3.1 cover is the placeholder. The alt text and
  captions always say "Primary Advantage Origins 3.2". No copy says that the book is on sale or in
  schools before it is printed (printer 2026-10-11; books in hand about 2026-11-08).
- **PP-6 Our books.** `/books` replaces `/authors` (owner decision 1); `/authors` redirects permanently
  to `/books`; the nav label is "Our books". The page shows the series (Origins, Quest, Adventure),
  written and edited by the Reading Advantage team, with the founders named.
- **PP-7 About and Contact.** About: who we are, what Primary Advantage is, how schools use it (Blended
  Learning: printed workbooks and the app), how families use it (Tutor Advantage). Contact: the channels
  of PP-3, with i18n labels.
- **PP-8 Locales.** The public pages have en, th, cn, and tw strings. vi has no public page strings
  (owner decision 2): for vi, the public namespaces fall back to English in `i18n/request.ts`. The vi
  locale stays for the rest of the app.
- **PP-9 Site tagline.** A translated tagline (`PublicSite.tagline`) replaces `siteConfig.description` in
  the metadata and under the sign-in form. No "AI" in a hook or a title.
- **PP-10 Pictures.** Screenshots from the accepted set
  (`~/Desktop/advantage-pr/assets/screenshots/primary-advantage/rpg-skin-2026-10-06/`, Phases 0 and 2–5
  only) are converted to WebP at display size under `public/landing/`. No frame with qa-* names, the QA
  school, a QA class, or a QA article title. The Word adventures block and the teacher block wait for
  retakes with the demo seed; Daniel accepts each retake before public use.
- **PP-11 Claims.** No string of the old `HomePage` namespace is reused. Approved facts only: grades 3–6,
  ages 8–11; "CEFR-aligned, 15 levels from Pre-A1 (A0) to B2" (never GSE, Pearson, or YLE); Reedy shows
  only with its "Preview" label and only if decision D4 lets Reedy ship at the cutover.
- **PP-12 Tests.** Key parity of the public namespaces across en, th, cn, and tw; the vi fallback; no
  `<form>` on the public pages; the `/authors` redirect; the contact links (`tel:`, `mailto:`, `https:`);
  every page renders with each locale.

## 3. Owner decisions (2026-10-07, through PR)

1. Authors becomes the "Our books" page (option a).
2. No Vietnamese strings for the public pages; vi falls back to English there.
3. The free trial is a call to action only: "Contact us for a free trial", linked to the contact links.
   The sales team gives the pilot terms in the conversation.
4. Home section 2 shows a mock-up of Primary Advantage Origins 3.2 (§PP-5).

## 4. Section list and string keys (for PR's copy)

New namespaces replace `HomePage` and `AboutPage`. `MainNav.authors` becomes `MainNav.books`. Every key
below is a plain string unless it ends in `[]`. PR writes the English; the structure may change while
the copy is written, and the spec follows it.

### PublicSite (shared)
- `tagline` — one line for the metadata and the sign-in page (PP-9)
- `trialCta` — "Contact us for a free trial" (PP-4)
- `signIn` — the sign-in button label

### PublicHome
1. Hero (gatehouse scene, the home capture in a phone frame)
   - `meta.title`, `meta.description`
   - `hero.title` (product name), `hero.tagline` (one value line, no "AI"), `hero.forSchools` (link to contact), `hero.phoneAlt`
2. The book and the app
   - `book.title`, `book.body` (one printed workbook of 14 lessons; the app has the same lessons), `book.mockupAlt` ("Primary Advantage Origins 3.2" mock-up), `book.classBookAlt`, `book.classBookCaption` (the class book capture shows Origins 2)
3. Inside the app (picture blocks; each block has `title`, `body`, `alt`)
   - `inside.title`, `inside.intro`
   - `inside.hero.*` (choose a hero), `inside.shop.*` (earn coins and shop), `inside.quest.*` (Class Quest), `inside.classBook.*` (the class book)
   - `inside.reedy.*` (only if D4 allows; with the Preview label), `inside.wordAdventures.*` (after the demo-seed retake)
4. For teachers (after the retake)
   - `teachers.title`, `teachers.body`, `teachers.points[]` (up to three short points), `teachers.alt`
5. Levels
   - `levels.title`, `levels.body` ("CEFR-aligned, 15 levels from Pre-A1 (A0) to B2")
6. For families
   - `families.title`, `families.body`, `families.link` (Tutor Advantage; PR confirms the target)
7. Contact
   - `contact.title`, `contact.body`, `contact.line`, `contact.lineQrAlt`, `contact.facebook`, `contact.phone`, `contact.email`

### PublicAbout
- `meta.title`, `meta.description`, `title`
- `who.title`, `who.body` (curriculum publisher in Khon Kaen, founded January 2024 by Phikul Phookathin and Daniel Bo)
- `product.title`, `product.body`
- `schools.title`, `schools.body` (Blended Learning)
- `families.title`, `families.body`, `families.link`

### PublicContact
- `meta.title`, `meta.description`, `title`, `intro`
- `line`, `lineQrAlt`, `facebook`, `phone`, `email` (labels; the values are in `configs/contact-channels.ts`)

### PublicBooks
- `meta.title`, `meta.description`, `title`, `intro`
- `series.origins.title`, `series.origins.body`, `series.quest.title`, `series.quest.body`, `series.adventure.title`, `series.adventure.body`
- `team.title`, `team.body` (written and edited by the Reading Advantage team; the founders named)
- `mockupAlt`

### MainNav and Footer
- `MainNav.books` ("Our books") replaces `MainNav.authors`; the Footer keys stay, with `Footer.tagline` reading `PublicSite.tagline`.

## 5. Out of scope

Removing the vi locale from the app; any change to student, teacher, or admin pages; a contact backend
or inbox; trial terms or pricing; the printed-book photo (later, after about 2026-11-08); the www site
(PR's own track).
