# Specification: Experience Primary Advantage (embedded game demo)

## Overview

The Primary Advantage product page (`/products/primary-advantage`) gets a section where a visitor plays the
Primary game demo in the page. The demo is a static site built in the `advantage-forge` repo (`bodangren/advantage-forge`,
branch `rebuild`). It has four sample stories (one per level: Pre-A1, A0, A0+, A1), recorded read-aloud, Thai
translations, and eight games.

## Functional Requirements

- FR-1: The demo build is served by this app from `public/experience/` (same origin, no third-party host).
- FR-2: The section shows a poster and a "Play the demo" button. The iframe loads only after the visitor presses it
  (the demo is about 30 MB).
- FR-3: A "Full screen" link opens `/experience/index.html` in a new tab.
- FR-4: The section text exists in English, Thai, and Chinese.
- FR-5: The demo content comes only from the out-of-workbook ("bank") articles. No workbook article is in the build.
- FR-6: The embed does not break the `proxy.ts` locale matcher (`/experience/index.html` has a dot, so it is skipped).

## Out of Scope

- Saving student progress, accounts, or any database write.
- Changing the demo's games.
