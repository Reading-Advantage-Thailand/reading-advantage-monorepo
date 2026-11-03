# Storytime accessibility report at 01f2acfe8

## Summary

- Scope: `apps/storytime` and `packages/read-along`, for children aged 4 to 8 on a tablet.
- Build: `turbo run build --filter=storytime` passed. The app ran on port 3077.
- Live check: `/`, `/th`, `/en`, `/th/st/2/1`, `/en/st/2/1` all answer 404 with the default English page and `lang=""`.
- No app route renders the read-along yet. The package findings come from code reading and the built CSS.
- 41 checks: 18 Pass, 15 Fail, 5 Partial, 2 Phase 1 placeholder, 1 N/A.
- Player buttons pass 48 px, labels, icon hiding, focus order, and the no-autoplay check.
- The worst gaps: low contrast on the current word, word tap targets near 28 px, no alt text contract, no `lang="en"` on English text inside Thai pages, and empty translations.
- No source file changed.

## Full table

| file:line | check | result |
|---|---|---|
| apps/storytime/app/[locale]/st/[level]/[week]/page.tsx:18 | Phase 1 placeholder | Placeholder: every week calls `notFound()`; Phase 3 adds the page. |
| apps/storytime/app/[locale]/ (no page.tsx) | Phase 1 placeholder | Placeholder: `/th` and `/en` answer 404; no landing page exists. |
| apps/storytime/app/[locale]/layout.tsx:25 | lang attribute | Pass: `<html lang={locale}>` sets `th` or `en` on rendered routes. |
| apps/storytime/app/ (no not-found.tsx) | lang attribute on 404 | Fail: the live 404 has `lang=""` on every tested route, including `/th/...`. |
| apps/storytime/app/ (no not-found.tsx) | screen reader text | Fail: the 404 reads "This page could not be found." in English only; the server HTML of `/th/st/2/1` has an empty body until scripts run. |
| apps/storytime/messages/th.json:1 | translated labels | Fail: `th.json` and `en.json` are `{}`; no Thai control label exists. |
| packages/read-along/components/read-along/read-along-player.tsx:159-166 | tap target 48 px | Pass: `size-12` gives 48 x 48 px. |
| packages/read-along/components/read-along/read-along-player.tsx:168-175 | tap target 48 px | Pass: `size-12` gives 48 x 48 px. |
| packages/read-along/components/read-along/read-along-player.tsx:176-184 | tap target 48 px | Pass: play is `size-14`, 56 x 56 px. |
| packages/read-along/components/read-along/read-along-player.tsx:185-193 | tap target 48 px | Pass: `size-12` gives 48 x 48 px. |
| packages/read-along/components/read-along/read-along-player.tsx:194-203 | tap target 48 px | Pass: `min-h-12 min-w-14` gives at least 48 x 56 px. |
| packages/read-along/components/read-along/read-along-player.tsx:161,170,179,187,196 | labels on icon buttons | Pass: every button has an `aria-label`. |
| packages/read-along/components/read-along/read-along-player.tsx:166,174,183,192 | icons hidden from screen reader | Pass: lucide-react 0.562 adds `aria-hidden="true"` to an unlabeled icon. |
| packages/read-along/components/read-along/read-along-player.tsx:42-49 | labels in the page language | Fail: the default labels are English; a Thai page reads them with a Thai voice. |
| packages/read-along/components/read-along/read-along-player.tsx:164 | visible focus | Partial: the plain chrome gives `""`, so focus relies on the browser ring; a host chrome can remove it. |
| packages/read-along/components/read-along/read-along-player.tsx:158-203 | focus order | Pass: DOM order is previous, replay, play, next, speed, and matches the visual order. |
| packages/read-along/components/read-along/read-along-player.tsx:152 | tablet layout | Fail: `--bottom-nav-h` is not defined in Storytime; `bottom` falls back to `auto`, so the fixed bar on a tablet below 1024 px has no set position. |
| packages/read-along/components/read-along/read-along-player.tsx:178 | unique id | Fail: the fixed `id="playPauseButton"` repeats if a page holds two players. |
| packages/read-along/components/read-along/read-along-player.tsx:179-183 | state that a screen reader reads | Pass: the label switches between play and stop. |
| packages/read-along/components/read-along/read-along-passage.tsx:74 | reduced motion | Partial: `transition-all duration-200` has no `motion-reduce:` variant. |
| packages/read-along/components/read-along/read-along-passage.tsx:104 | reduced motion | Partial: `transition-colors duration-150` has no `motion-reduce:` variant. |
| packages/read-along/components/read-along/read-along-passage.tsx:77 | visible focus | Pass: the 2 px ring shows in the text color; `ring-ring` builds no CSS because Storytime defines no `--color-ring`. |
| packages/read-along/components/read-along/read-along-passage.tsx:79-90 | keyboard use | Pass: a sentence is a `role="button"` with `tabIndex=0`, Enter, and Space. |
| packages/read-along/components/read-along/read-along-passage.tsx:70-74 | tap target 48 px | Fail: a sentence is an inline span with a line box near 28 px tall (`text-lg`). |
| packages/read-along/components/read-along/read-along-passage.tsx:102-108 | tap target 48 px | Fail: a word is an inline span near 28 px tall and one word wide. |
| packages/read-along/components/read-along/read-along-passage.tsx:102-107 | keyboard use | Fail: a word has a click handler but no role, no `tabIndex`, and no key handler. |
| packages/read-along/components/read-along/read-along-passage.tsx:107 | tap only while active | Fail: the word click calls `onWordTap` even when `active` is false. |
| packages/read-along/components/read-along/read-along-passage.tsx:70-75 | text that a screen reader reads | Fail: the current sentence and word show only by color; no `aria-current` marks them. |
| packages/read-along/components/read-along/read-along-passage.tsx:93-114 | text that a screen reader reads | Pass: the words stay plain text in document order. |
| packages/read-along/components/read-along/read-along-passage.tsx:150,164 | lang attribute for English text | Fail: the passage sets no `lang`; English story text on a `/th/` page is read with Thai rules. |
| packages/read-along/components/read-along/read-along-passage.tsx:74,150 | text size for young readers | Partial: 18 px (20 px from `md`); `font-article` builds no CSS in Storytime, so no Thai or reading font loads. |
| packages/read-along/lib/highlight.ts:13 | color contrast | Fail: white on blue-500 (#3080ff) is 3.71:1; 18 to 20 px normal text needs 4.5:1. |
| packages/read-along/lib/highlight.ts:13 | color contrast, dark | Pass: blue-950 on blue-400 is 5.62:1. |
| packages/read-along/lib/highlight.ts:9 | color contrast | Pass: black on amber-200 is 16.87:1; black on amber-800/60 over white is 7.10:1. |
| packages/read-along/lib/highlight.ts:11 | color contrast | Pass: black on emerald-200 is 16.42:1. |
| packages/read-along/hooks/use-read-along.ts:52-101 | audio starts only after a tap | Pass: the hook never calls `play()`; it only listens to audio events. |
| packages/read-along/hooks/use-read-along.ts:70-73 | reduced motion | Pass: the frame loop moves no element; it only reads the time. |
| apps/storytime/lib/contracts/week.ts:52-60 | alt text on pictures | Fail: `imageSchema` has no alt field; `caption` defaults to `""`, and there is no Thai text. |
| apps/storytime/content/l2/*.json | alt text on pictures | Fail: 172 of 237 picture entries have an empty caption; 0 have Thai text. |
| apps/storytime/lib/contracts/week.ts:43-49 | Thai text present | Partial: `biText.th` defaults to `""`, so a Thai line can be blank. |
| packages/read-along/components/read-along/read-along-passage.tsx:163 | alt text on pictures | N/A: the host renders the picture through `renderBlockMedia`. |

## Top 10 findings by risk

1. `packages/read-along/lib/highlight.ts:13` — The current word is white on blue-500 at 3.71:1, below 4.5:1. Fix: change `bg-blue-500` to `bg-blue-700` (white on blue-700 passes 4.5:1).
2. `packages/read-along/components/read-along/read-along-passage.tsx:102-108` — A word tap target is near 28 px tall, too small for a 4-year-old finger. Fix: add `inline-block min-h-12 px-1 leading-[3rem]` to the word span, or raise the passage line height to 48 px.
3. `apps/storytime/lib/contracts/week.ts:52-60` — Pictures have no alt text field, and 172 of 237 captions are empty. Fix: add a required `alt: biText` field to `imageSchema` and fail a published week without it.
4. `packages/read-along/components/read-along/read-along-passage.tsx:164` — English story text on a Thai page has no `lang="en"`, so a screen reader speaks it with Thai rules. Fix: add `lang="en"` (or a `lang` prop) to each passage `<p>`.
5. `apps/storytime/messages/th.json:1` — The message files are empty, so the player falls back to English labels on Thai pages. Fix: add Thai player labels to `th.json` and pass them as `labels` when the Phase 3 page mounts the player.
6. `packages/read-along/components/read-along/read-along-player.tsx:152` — `--bottom-nav-h` is not defined in Storytime, so the fixed bar on a tablet below 1024 px has no bottom position. Fix: write `bottom-[var(--bottom-nav-h,0px)]` so the bar falls back to the screen edge.
7. `apps/storytime/app/` (no not-found.tsx) — Every 404 answers in English with `lang=""`, and every printed QR link lands there in Phase 1. Fix: add `app/[locale]/not-found.tsx` with a short Thai and English message.
8. `packages/read-along/components/read-along/read-along-passage.tsx:70-75` — The current sentence and word show only by color, so a screen reader user cannot find them. Fix: set `aria-current="true"` on the current sentence span and the marked word span.
9. `packages/read-along/components/read-along/read-along-passage.tsx:107` — A word tap calls `onWordTap` while the read-along is off, so a stray tap can start audio. Fix: set `onClick={active ? tap : undefined}` on the word span.
10. `packages/read-along/components/read-along/read-along-passage.tsx:74` — The band and mark transitions ignore the reduced-motion setting. Fix: add `motion-reduce:transition-none` next to each `transition-*` class at lines 74 and 104.
