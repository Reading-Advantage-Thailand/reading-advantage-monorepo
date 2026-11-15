# Spec: www products page photos

Track: `www_products_photos_20261115` (light lane, bug).
Author model: claude-code/claude-sonnet-5-5

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

## Owner rule

A picture comes out of a live page only when its replacement goes in the same push.

## Acceptance criteria

- **AC-1 (Playwright e2e).** For every www marketing page with a hero image and for `/products`, in
  en and th, at 390, 980, 1024, and 1280 px: each photo is loaded (`complete`, `naturalWidth > 0`),
  visible, and at most 30 percent covered. A photo is a raster image that is not an SVG, a logo,
  an icon, or the QR code, rendered at least 120 x 120 px. A decorative image (empty alt) is not a
  photo. The cover test uses a 5 x 5 `document.elementFromPoint` grid with `pointer-events:auto`
  forced on every element. The image or its own wrapper must be the top element. The hero photo
  shows at every width. `/products` shows at least one product photo in each built product block
  (Storytime, Primary, Reading, Tutor).
- **AC-2 (unit test).** For `HeroSection`, the `floatingImage` container and its ancestors have no
  `hidden` class at any breakpoint.
- **AC-3 (CI).** The e2e runs in the www CI job, so a push that breaks it turns the job red. The plan
  names the job, the server, and Chrome.
- **AC-4 (Green).** Fix only what is still wrong at HEAD:
  - no text box covers more than a small corner of any photo: "See How We Report Results" goes
    beside the picture from the `lg` breakpoint and under it below that breakpoint; check every
    other photo with an overlay in the same way, including the home hero;
  - the Tutor section gets one real picture;
  - the pictures at 1024 px keep their proportion and a usable size;
  - one real product picture stays in each built product block and program card, from the CURRENT.md
    sets: Storytime `app-2026-11-15` cropped to the picture card; Primary `parity-run2-2026-10-19`
    or a printed cover; the Reading Origins 2 cover; Tutor `dev-2026-10-15` as its README allows;
    CodeCamp only if CURRENT.md lists a screen; Science, Math, Zhongwen, and STEM keep logo tiles;
  - no child face in any new picture; the files come from `~/Desktop/handoff/products-images-2026-11-15/`.

## Out of scope

The architecture-check hash failure of the CI job `Build, Lint, and Test` (track `ci_green_master_20261115`).
