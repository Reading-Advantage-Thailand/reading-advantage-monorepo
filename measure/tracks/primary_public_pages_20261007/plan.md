# Plan — Primary public pages in the RPG skin

Feature freeze: all code on `primary/public-pages` (from `primary-parity-integration`); the merge waits
until the Primary cutover passes.

## Phase 0: Spec
- [x] Spec with the owner decisions of 2026-10-07 and the section list and string keys (§4)
- [x] Send PR the section list and the string keys (2026-10-07)

## Phase 1: Structure (after the cutover blockers)
- [x] Branch `primary/public-pages`; the public layout in the skin (wood header, `Scene`, light and night)
- [x] The new namespaces with placeholder text in en, th, cn, tw; the vi fallback in `i18n/request.ts`; tests (key parity, fallback)
  - th, cn, and tw hold the English copy as placeholders until the translations arrive
- [x] Remove the home contact form; `configs/contact-channels.ts`; contact links; test (no `<form>`, link schemes)
- [x] `PublicSite.tagline` in the metadata and the sign-in page
  - The footer also lost the GitHub link, the `/#features` link, and the theme and locale switchers (they are in the header)

## Phase 2: Home
- [x] Convert the chosen screenshots to WebP at display size under `public/landing/`
  - No teacher picture and no Word adventures picture until the demo-seed retakes; no Reedy (D4)
- [x] The CSS book mock-up from the flat cover (3.1 placeholder until Workbooks sends the 3.2 cover)
  - The Origins 3.2 cover is in (`public/landing/pa-origins-3.2-cover.webp`); the 3.1 file is gone
- [x] The seven home sections, 375 px and 1280 px

## Phase 3: About, Contact, Our books
- [x] About and Contact
- [x] `/books` (Our books) with the mock-up; `/authors` redirects permanently; `MainNav.books`; test
  - `/th/authors` answers 308 to `/th/books` on `next start`

## Phase 4: Copy and look
- [ ] PR's English copy and alt text in; Thai from Daniel; cn and tw from the contracted reviewer
  - [x] English copy draft 1 and the alt text are in (2026-10-07)
  - [ ] Thai from Daniel
  - [ ] cn and tw from the contracted reviewer
- [ ] Captures at 375 px and 1280 px, light and night, to Daniel for the look check
  - [x] 20 captures in `captures/` (status 200, no page overflow, no form, no console errors)
  - [ ] Daniel's look check
- [ ] Retakes with the demo seed (Word adventures, teacher dashboard) to Daniel before public use
- [ ] PR claims review of the branch diff

## Phase 5: Merge
- [ ] Tests, tsc, ESLint green
- [ ] Merge into integration after the cutover passes (tell the monorepo session's peers)
