# Catalog art recapture

Date: 2026-08-20  
Route: public preview `/en/student/arcade/dragon-flight`  
Authenticated catalog route: `/en/student/games/apk/{id}` (Reading and Primary now use the same path)

## Result

Playwright captured compact 390x844 and wide 1440x900 after briefing and tutorial skip.

- [Compact](evidence/dragon-flight-compact.png)
- [Wide](evidence/dragon-flight-wide.png)

The Phaser canvas is present. Player and enemy standard-pack sprites overlay the scene. This recapture does not certify every title or every leftover page.

## Command

```bash
PLAYWRIGHT_PORT=3018 PLAYWRIGHT_CHROME_PATH=/usr/bin/google-chrome \
  pnpm exec playwright test tests/e2e/apk/catalog-art-recapture.spec.ts --project=chromium
```
