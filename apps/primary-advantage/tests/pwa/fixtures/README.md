# Legacy worker fixtures

Read-only copies for the takeover test (`tests/pwa/takeover.spec.ts`). Do not edit these files.

- `legacy-sw.js`: the live legacy worker, fetched with a plain GET on 2026-10-12 from
  `https://primary.reading-advantage.com/serwist/sw.js` (56449 bytes, Serwist 9.5.7 build).
- `legacy-precache-urls.txt`: the precache URL list of that worker (one `url:` entry per line).
  The fixture server answers 200 for each URL.

Response headers of the fetch (2026-10-12 09:05 GMT):

```
HTTP/2 200
vary: rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch
x-nextjs-cache: HIT
cache-control: s-maxage=31536000
content-type: application/javascript
service-worker-allowed: /
server: Google Frontend
```

The live response has `Cache-Control: s-maxage=31536000` (a shared-cache rule from the Next
route, not `no-cache`). The Phase 0 note said "no `Cache-Control`". The browser treats
`max-age` only, so the browser still checks the worker on each update check.

Legacy cache names in the worker: precache `serwist-precache-v2-<scope URL>` and runtime caches
`pages`, `pages-rsc`, `pages-rsc-prefetch`, `apis`, `others`, `cross-origin`, `next-data`,
`next-image`, `next-static-js-assets`, `google-fonts-stylesheets`, `google-fonts-webfonts`,
`static-audio-assets`, `static-data-assets`, `static-font-assets`, `static-image-assets`,
`static-js-assets`, `static-style-assets`, `static-video-assets`.
