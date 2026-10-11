# Plan — Primary public pages in the RPG skin

Feature freeze: all code on `primary/public-pages` (from `primary-parity-integration`); the merge waits
until the Primary cutover passes.

## Phase 0: Spec
- [x] Spec with the owner decisions of 2026-10-07 and the section list and string keys (§4)
- [x] Send PR the section list and the string keys (2026-10-07)

## Phase 1: Structure (after the cutover blockers)
- [ ] Branch `primary/public-pages`; the public layout in the skin (wood header, `Scene`, light and night)
- [ ] The new namespaces with placeholder text in en, th, cn, tw; the vi fallback in `i18n/request.ts`; tests (key parity, fallback)
- [ ] Remove the home contact form; `configs/contact-channels.ts`; contact links; test (no `<form>`, link schemes)
- [ ] `PublicSite.tagline` in the metadata and the sign-in page

## Phase 2: Home
- [ ] Convert the chosen screenshots to WebP at display size under `public/landing/`
- [ ] The CSS book mock-up from the flat cover (3.1 placeholder until Workbooks sends the 3.2 cover)
- [ ] The seven home sections, 375 px and 1280 px

## Phase 3: About, Contact, Our books
- [ ] About and Contact
- [ ] `/books` (Our books) with the mock-up; `/authors` redirects permanently; `MainNav.books`; test

## Phase 4: Copy and look
- [ ] PR's English copy and alt text in; Thai from Daniel; cn and tw from the contracted reviewer
- [ ] Captures at 375 px and 1280 px, light and night, to Daniel for the look check
- [ ] Retakes with the demo seed (Word adventures, teacher dashboard) to Daniel before public use
- [ ] PR claims review of the branch diff

## Phase 5: Merge
- [ ] Tests, tsc, ESLint green
- [ ] Merge into integration after the cutover passes (tell the monorepo session's peers)
