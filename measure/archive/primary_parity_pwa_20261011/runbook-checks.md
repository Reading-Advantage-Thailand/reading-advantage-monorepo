# Runbook checks for rehearsal 3 and the cutover (track primary_parity_pwa_20261011)

For `primary_parity_rehearsal3_20261011`: add both checks to the cutover command sheet.
Both checks only read. They change nothing.

## AC-2: worker headers (before and after the traffic switch)

Run on the rehearsal tag URL first. Run on `https://primary.reading-advantage.com` after the switch.

```bash
BASE=https://primary.reading-advantage.com   # or the rehearsal tag URL
curl -sI "$BASE/serwist/sw.js"
```

Pass when the answer has all of these:

- status `200` (no redirect, no `404`);
- `content-type: application/javascript` (any JavaScript MIME type);
- `service-worker-allowed: /`;
- `cache-control: no-cache`.

Also check that the body is the new worker, not the legacy worker:

```bash
curl -s "$BASE/serwist/sw.js" | grep -c 'primary-v2-'   # pass: 1 or more
curl -s "$BASE/serwist/sw.js" | grep -c 'serwist-precache' # pass: 0
```

## AC-4: a phone with the installed legacy app, after the traffic switch

Use a phone (or an Android emulator) that had the legacy app installed and opened before the cutover.
The phone has the legacy worker and its caches. Do this after the switch:

1. Open the installed app (or `https://primary.reading-advantage.com` in Chrome) with the network on.
2. Wait for the first page. The page can reload one time. Do not tap during the reload.
3. Pass when the new app shows (the new look, the RPG skin) and the page reloads at most one time.
4. Open `chrome://inspect/#service-workers` on a computer with the phone connected (Chrome remote
   debugging). Open the DevTools Application tab of the page.
5. Pass when Application > Service workers shows `/serwist/sw.js` as `activated and is running`,
   and the script is the new worker (it has a `fetch` handler for navigations only; the Sources tab shows
   `primary-v2-` and the version constant).
6. Pass when Application > Cache storage lists only `primary-v2-offline-v1` (the offline page cache that
   the worker creates at install). The names `serwist-precache-v2-*`, `pages`, `pages-rsc`, `apis`,
   `others`, and any older `primary-v2-offline*` name must not be in the list.
7. Close the app and open it again. Pass when no second reload happens.

Fail action: if a legacy cache stays, unregister the worker in DevTools, reload, and report the
phone model and the browser version to the PWA track owner.
