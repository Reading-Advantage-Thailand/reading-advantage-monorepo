# Spec: www products page photos

Track: `www_products_photos_20261115` (light lane, bug).
Author model: claude-code/claude-sonnet-5-5
Revised by: opencode-go/deepseek-v4.1-flash (spec review r1 fixes)

## Owner words (Daniel, 2026-11-15)

- 18:14: "I'm pretty sure you're wrong. I loaded and related the page on my phone, and turned on desktop view. There is a single image on the entire page. Did you screenshot or are you hiding again, just like you did hours ago when you toss me they were there then?"
- 18:28: "There are two photos on that page there id only one, and it's mostly covered by text talking about how we report results ... You need to find a way to take screenshots and actually verify what's on the page"
- 18:35: "This is simple website design that a model from any year ago could have done. What is going wrong and why? Identify the root cause and make sure it doesn't happen with some tests."

## Root cause

1. `src/components/marketing/hero-section.tsx` wrapped the hero `floatingImage` in `hidden xl:block`.
   The photo was `display:none` below 1280 px. Next Image never loaded it, so `src` stayed empty
   and the width was 0. A phone in desktop view (980 to 1024 px) never showed the photo.
2. The products page had one other photo. The text box "See How We Report Results" covered most of it.
3. The 4 program cards and the product blocks held only logo tiles and icons.
4. Track A-59 checked that the image files answer 200 and that the logo tiles show, at 1280 px and
   390 px. No test asked the question "does a reader see the photos". No test checked the widths
   between 390 px and 1280 px.

## Deviation note

The hero fix and the product pictures (`8193625ca`) were pushed before the Red phase, because the
stop order reached the session after the push. Red proves the meaning of each test by a failing run
at `8193625ca^` (hero, product photos) and by a failing run at HEAD for what is still wrong (the
covered photo, the Tutor section without a picture, the other findings below).

## Evidence at `8193625ca` (live check, 2026-11-15, 5 x 5 grid, widths 390, 980, 1024, 1280)

The captures and the table are in `~/Desktop/handoff/products-page-2026-11-15/after/`.

- The hero photo and the 8 product pictures load and show at all four widths.
- `blended-learning.png` shows 0 percent at every width. The text box and its overlay cover it.
- At 1024 px the 4 program cards are narrow. The 3 cover and phone pictures render 160 x 256
  (natural proportion 189 x 256), so they look squeezed. The Storytime card picture renders 160 x 108.
- The Tutor section (lower on the page) has no picture.
- The home page hero photo (`workbook-tablet-cutaway`) shows 60 percent at 390 px and 76 percent at
  980 px, because a dark card covers a corner.

## Red evidence at `40419d4bc` (e2e run, 2026-11-15)

The run log is `measure/runs/www_products_photos_20261115/red-p1-40419d4bc.log`.

- The home hero photo is 40 percent covered at 390 px (356 x 200). It passes at 980, 1024, and
  1280 px. This line corrects the live-check line above: the live check read 60 percent at 390 px
  and 76 percent at 980 px, and the e2e reads 40 percent at 390 px and no failure above 390 px.
- `blended-learning.png` is 100 percent covered at the four widths on `/products`.
- The Tutor section shows no photo at the four widths.
- At 1024 px, `primary-origins-2-cover.webp` and `reading-origins-2-cover.webp` render 160 x 256
  (deviation 15.2 percent), and `tutor-flashcard.webp` renders 160 x 256 (deviation 22.2 percent).

## Follow-up (out of this track)

The hero of `/products/reading-advantage` shows a photo file under a 90 percent gradient tint, so a
reader sees a tint and not the photo. The page stays out of AC-1 (page set in AC-1). The PM decides
later whether a design task takes it.

## Owner rule

A picture comes out of a live page only when its replacement goes in the same push.

## Acceptance criteria

- **AC-1 (Playwright e2e).** For every www marketing page with a hero image and for `/products`, in
  en and th, at 390, 980, 1024, and 1280 px: each photo is loaded (`complete`, `naturalWidth > 0`),
  visible, and at most 30 percent covered. A photo is a raster image that is not an SVG, a logo,
  an icon, or the QR code, with a rendered short side of at least 100 px. A decorative image
  (empty alt) is not a photo. The cover test uses a 5 x 5 `document.elementFromPoint` grid with
  `pointer-events:auto` forced on every element. The image or its own wrapper must be the top
  element. A text rule measures the union of the bounding boxes of the visible text boxes that
  paint over the photo. That union covers at most 10 percent of the photo area. A text box is an
  element with non-empty own text. The rule skips the photo's own ancestors and a figcaption that
  sits below the photo. The photo report prints the text share. An image in a page main element
  with an empty src or no `currentSrc` fails the test. It is not skipped, because that was the
  original bug. The hero photo shows at every width. `/products` shows at least one product photo in
  each built product block (Storytime, Primary, Reading, Tutor).
  Each product picture of `/products` also keeps its natural aspect ratio within 5 percent and a
  rendered short side of at least 100 px at the four widths. This assertion catches a squeezed or
  a shrunk card, which the cover test alone does not catch.
  The four widths stay. 980 px is a phone in desktop view. 1024 px is the `lg` breakpoint where the
  squeezed program cards appear.

  **Exclusion rule (the test skips an image only by one of these rules):**
  - Decorative: the alt is empty, the image carries `aria-hidden="true"`, or an ancestor carries
    `aria-hidden="true"`. The home `texture-warm` background (alt empty) is the only such image.
  - Logo or icon: the file ends in `.svg`; the file sits under `/media/brand/`; or the file name
    starts with `qr`, `logo`, or `icon` and the alt names a logo, an icon, or a QR code. Both
    signals are needed, so a photo named `icon-guide.png` still counts.
  - Thumbnail: the rendered short side is below 100 px. This rule applies to the cover test only,
    not to the product picture assertion, which fails a shrunk picture.

  **Home Mastery card:** on `/` at 390 px the Mastery card sits under the photo. Its centre falls
  within 10 percent of the viewport centre, or its width is at least 90 percent of the photo
  width. A card beside the photo fails.

  **Page set:** the six www marketing pages whose hero shows a content photo: `/`, `/products`,
  `/services/blended-learning`, `/services/managed-service`, `/pricing`, and `/about`.
  `/products/reading-advantage` stays out of the set. Its hero shows a product logo and a
  full-bleed background file (alt "Student engaging with digital reading platform") under a
  90 percent gradient tint. That file is a section tint, not a content photo. A fix for it is a
  design change, and AC-4 does not cover a design change.
- **AC-2 (unit test).** For `HeroSection`, the `floatingImage` container and its ancestors have no
  `hidden` class at any breakpoint.
- **AC-3 (CI and CD).** The e2e runs at two points:
  - (a) In the `ci.yml` job `affected`, when the matrix id is `www-reading-advantage`. A push that
    breaks it turns that job red.
  - (b) In `.github/workflows/cd-www-reading-advantage.yml`, before the deploy step, against the app
    built in that job. The job starts the app with `next start -p 3123`. Chrome comes from
    `playwright install --with-deps chromium`. A failing e2e stops the deploy.

  Point (b) exists because `ci.yml` is red on master for an unrelated cause, the architecture check.
  A "CD needs CI" link would stop every www deploy for that cause. The PM page check of task 1.4
  stays the human gate before Daniel gets the link.
- **AC-4 (Green).** Fix only what is still wrong at HEAD:
  - no text box covers more than a small corner of any photo: "See How We Report Results" goes
    beside the picture from the `lg` breakpoint and under it below that breakpoint; check every
    other photo with an overlay in the same way, including the home hero;
  - the Tutor section gets one real picture;
  - the pictures at 1024 px keep their proportion and a usable size;
  - one real product picture stays in each built product block and program card, from the CURRENT.md
    sets: Storytime `app-2026-11-15` cropped to the picture card; Primary program card
    `public/images/products/primary-lesson-intro.webp` and Primary product block
    `public/images/products/primary-origins-2-cover.webp` (the files of `8193625ca`); the Reading
    Origins 2 cover `public/images/products/reading-origins-2-cover.webp`; Tutor `dev-2026-10-15`
    as its README allows, `public/images/products/tutor-flashcard.webp`; CodeCamp only if CURRENT.md
    lists a screen; Science, Math, Zhongwen, and STEM keep logo tiles;
  - no child face in any new picture; the files come from `~/Desktop/handoff/products-images-2026-11-15/`.

## Out of scope

The architecture-check hash failure of the CI job `Build, Lint, and Test` (track `ci_green_master_20261115`).
