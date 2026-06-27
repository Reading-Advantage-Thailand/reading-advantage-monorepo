# Line Review — ra-batch-18

**Track:** reading_advantage_full_review_20260626
**Batch:** ra-batch-18 (20 files)
**Baseline SHA:** d348666be047b929d02c747120c32d2ea0fc53fc
**Files changed since baseline:** 0
**Reviewer:** Measure Review C (UX & API end-to-end contract)

---

## Files Reviewed

| # | File | Lines | Client? |
|---|------|-------|---------|
| 1 | `article-actions.tsx` | 94 | `"use client"` |
| 2 | `article-card.tsx` | 78 | Server |
| 3 | `article-content.tsx` | 524 | `"use client"` |
| 4 | `article-footer.tsx` | 17 | Server |
| 5 | `article-records-table.tsx` | 284 | `"use client"` |
| 6 | `article-showcase-card.tsx` | 188 | `"use client"` (forwardRef) |
| 7 | `article-summary.tsx` | 62 | `"use client"` |
| 8 | `audio-button.tsx` | 61 | `"use client"` |
| 9 | `audio-img.tsx` | 93 | `"use client"` |
| 10 | `authorsTabs.tsx` | 52 | `"use client"` |
| 11 | `change-username-form.tsx` | 113 | `"use client"` |
| 12 | `chapter-rating-popup.tsx` | 263 | `"use client"` |
| 13 | `chatbot-floating-button.tsx` | 204 | `"use client"` |
| 14 | `classroom-teachers.tsx` | 225 | `"use client"` |
| 15 | `classroom-xp-chart-per-students.tsx` | 372 | `"use client"` |
| 16 | `dashboard/active-goals-widget.tsx` | 172 | `"use client"` |
| 17 | `dashboard/activity-charts.tsx` | 776 | `"use client"` |
| 18 | `dashboard/activity-timeline.tsx` | 601 | `"use client"` |
| 19 | `dashboard/adoption-widget.tsx` | 320 | `"use client"` |
| 20 | `dashboard/ai-insights.tsx` | 474 | `"use client"` |

---

## Endpoint Contract Map

| Component | HTTP Method | Endpoint | Server route exists? | Auth? |
|-----------|-------------|----------|---------------------|-------|
| `article-actions.tsx` | DELETE | `/api/v1/articles/${articleId}` | ✅ `[article_id]/route.ts` DELETE | `protect` middleware |
| `article-content.tsx` | POST | `/api/v1/assistant/translate/${articleId}` | ✅ `assistant/translate/[article_id]/route.ts` | — |
| `article-content.tsx` | POST | `/api/v1/users/sentences/${userId}` | ✅ `users/sentences/[id]/route.ts` | — |
| `article-summary.tsx` | POST | `/api/v1/assistant/translate/${articleId}` | ✅ same as above | — |
| `article-showcase-card.tsx` | POST | `/api/v1/articles/${articleId}/translate` | ✅ `articles/[article_id]/translate/route.ts` | — |
| `change-username-form.tsx` | PATCH | `/api/v1/users/${userId}` | ✅ `users/[id]/route.ts` | — |
| `chapter-rating-popup.tsx` | GET | `/api/v1/users/${userId}/activitylog` | ✅ `users/[id]/activitylog/route.ts` | — |
| `chapter-rating-popup.tsx` | POST | `/api/v1/users/${userId}/activitylog` | ✅ same | — |
| `chapter-rating-popup.tsx` | PUT | `/api/v1/stories/${storyId}/${chapterNumber}` | ✅ `stories/[storyId]/[chapterNumber]/route.ts` | `protect` middleware |
| `chatbot-floating-button.tsx` | POST | `/api/v1/assistant/chatbot` | ✅ `assistant/chatbot/route.ts` | — |
| `classroom-teachers.tsx` | GET | `/api/v1/classroom/${classroomId}/teachers` | ✅ `[classroomId]/teachers/route.ts` | `protect` middleware |
| `classroom-teachers.tsx` | POST | `/api/v1/classroom/${classroomId}/teachers` | ✅ same | `protect` middleware |
| `classroom-teachers.tsx` | DELETE | `/api/v1/classroom/${classroomId}/teachers` | ✅ same | `protect` middleware |
| `dashboard/active-goals-widget.tsx` | GET | `/api/v1/goals?status=ACTIVE` | ✅ `goals/route.ts` | — |
| `dashboard/activity-charts.tsx` | GET | `/api/v1/metrics/activity?format=heatmap&...` | ✅ `metrics/activity/route.ts` | — |
| `dashboard/activity-charts.tsx` | GET | `/api/v1/metrics/activity?format=timeline&...` | ✅ same | — |
| `dashboard/activity-timeline.tsx` | GET | `/api/v1/metrics/activity?format=timeline&...` | ✅ same | — |
| `dashboard/adoption-widget.tsx` | GET | `/api/v1/admin/dashboard?...` | ✅ `admin/dashboard/route.ts` | — |
| `dashboard/ai-insights.tsx` | GET | `/api/v1/ai/summary?...` | ✅ `ai/summary/route.ts` | — |
| `dashboard/ai-insights.tsx` | POST | `/api/v1/ai/insights/dismiss` | ✅ `ai/insights/dismiss/route.ts` | — |
| `dashboard/ai-insights.tsx` | POST | `/api/v1/ai/insights/action` | ✅ `ai/insights/action/route.ts` | — |

All 20 component fetch endpoints resolve to existing route handlers. No dangling references found.

---

## Contract & Flow Findings

### F1 — Inconsistent translate API surface (two different endpoints)

**Severity:** Medium
**Files:** `article-summary.tsx` (line 16), `article-content.tsx` (line 54), `article-showcase-card.tsx` (line 19)

`article-summary.tsx` and `article-content.tsx` call:
```
POST /api/v1/assistant/translate/${articleId}
Body: { type: "passage" | "summary", targetLanguage }
```

`article-showcase-card.tsx` calls a **different** endpoint:
```
POST /api/v1/articles/${articleId}/translate
Body: { targetLanguage }
```

Both return the same shape `{ message: string; translated_sentences: string[] }`, but two distinct routes serve translation. This is a **route parity concern**: the showcase card bypasses the assistant translation API entirely. If one route is migrated or deprecation-removed, the other silently breaks.

**Recommendation:** Consolidate translation through a single backend module (e.g. the `assistant/translate` endpoint) or document the rationale for the dual-route split.

---

### F2 — Hard-coded English strings bypass i18n

**Severity:** Low-Medium
**Files:** `article-actions.tsx`, `article-content.tsx`, `article-records-table.tsx`, `chatbot-floating-button.tsx`, `classroom-teachers.tsx`, `authorsTabs.tsx`, `chapter-rating-popup.tsx`

| File | Line(s) | Hard-coded string |
|------|---------|-------------------|
| `article-actions.tsx` | 41 | `"Article Deleted"`, `"The article with title: ..."` |
| `article-actions.tsx` | 48 | `"Failed to delete article with title: ..."` |
| `article-actions.tsx` | 68 | `"appoveButton"` — **also a typo** ("appove" → "approve") |
| `article-content.tsx` | 189 | `"No sentence selected"`, `"Please select a sentence first."` |
| `article-content.tsx` | 235-237 | `"Translation failed"`, `"Could not translate..."` |
| `article-content.tsx` | 265-269 | `"Success"`, `"You have saved..."` |
| `article-content.tsx` | 274 | `"Sentence already saved"` |
| `article-content.tsx` | 280-283 | `"Something went wrong."` |
| `article-content.tsx` | 321-323 | `"Something went wrong."` |
| `article-content.tsx` | 399 | `"Loading"` |
| `article-content.tsx` | 508 | `"Save to flashcard"`, `"Translate"` |
| `article-records-table.tsx` | 151-152 | `"Error loading articles: ..."`, `"Loading articles..."` |
| `article-records-table.tsx` | 247-248 | `"No articles found..."`, `"No articles match..."` |
| `chatbot-floating-button.tsx` | 67 | `" : "` — leading colon before bot response |
| `chatbot-floating-button.tsx` | 74 | `"Error: Could not fetch response."` |
| `chatbot-floating-button.tsx` | 120 | `"Talk to our assistant"` |
| `chatbot-floating-button.tsx` | 176 | `"Type your message..."` |
| `classroom-teachers.tsx` | 39, 48-49, 73-74, 80, 88-89, 99, 118, 123, 131, 170, 190 | Multiple: `"Error"`, `"Success"`, `"No teachers found"`, etc. |
| `authorsTabs.tsx` | 12-13, 21, 37 | `"Fiction"`, `"Non Fiction"`, `"Authors: ..."` |
| `chapter-rating-popup.tsx` | 153 | `"you not earned XP."` — also grammatically incorrect |

Components already have `useScopedI18n` imported in most cases but the toast notifications and some UI strings bypass it.

---

### F3 — Typo in i18n key: `appoveButton`

**Severity:** Low (cosmetic, but visible in UI)
**File:** `article-actions.tsx`, line 68

```tsx
{t("appoveButton")}
```

Should be `approveButton`. If the locale JSON has `appoveButton`, the typo is "consistent" but will confuse maintainers. If the locale has `approveButton`, this will render as a raw key.

---

### F4 — Duplicate `<XAxis>` in `classroom-xp-chart-per-students.tsx`

**Severity:** Medium (bug)
**File:** `classroom-xp-chart-per-students.tsx`, lines 250-261 and 281-292

The component renders `<XAxis dataKey="name" ...>` **twice** inside the same `<BarChart>`. Recharts will render two overlapping X axes, likely causing visual glitches (double labels, overlapping ticks).

```tsx
<XAxis dataKey="name" angle={...} ... />  {/* Line 250 */}
...
<CartesianGrid ... />
<XAxis dataKey="name" angle={...} ... />  {/* Line 281 — DUPLICATE */}
```

The first `<XAxis>` (line 250) should be removed; only the one after `<CartesianGrid>` (line 281) should remain.

---

### F5 — `chapter-rating-popup.tsx` response status check on wrong property

**Severity:** Medium (potential silent failure)
**File:** `chapter-rating-popup.tsx`, line 123

```tsx
const resRatingActivity = await ratingActivity.json();
const resReadActivity = await readActivity.json();
if (resRatingActivity.status === 200 && resReadActivity.status === 200) {
```

This checks the **response body's** `.status` property, not the HTTP status. If the server returns `{ data: ... }` (without a `.status` field), this condition is always false and the user never sees a success toast. Meanwhile `updateAverageRating` (line 91) fires but its result is never checked at all.

The pattern should be `ratingActivity.ok` / `readActivity.ok` (HTTP response status), or the response body must include a `status` field.

---

### F6 — `chatbot-floating-button.tsx` bot response has leading colon artifact

**Severity:** Low
**File:** `chatbot-floating-button.tsx`, line 67

```tsx
const response: Message = {
  text: ` : ${data?.text}`,
  sender: "bot",
};
```

There is a stray ` : ` before the bot text. If `data.text` is `"Hello"`, the display shows ` : Hello`. This is likely a leftover from a previous formatting attempt.

---

### F7 — `audio-button.tsx` interval polling on 10ms for playback end

**Severity:** Low (performance, non-blocking)
**File:** `audio-button.tsx`, line 34-43

```tsx
const checkProgress = setInterval(() => {
  if (audioRef.current && audioRef.current?.currentTime + tolerance >= endTimestamp) {
    audioRef.current?.pause();
    clearInterval(checkProgress);
    setIsPlaying(false);
  }
}, 10);
```

A 10ms polling interval creates ~100 callbacks/sec. Combined with React state updates on each interval, this is heavier than needed. `audio-img.tsx` (line 49) uses 5ms, which is even worse. Consider using the `timeupdate` event (~4Hz) or a 250ms interval instead. Neither component clears the interval on unmount, which can cause memory leaks if the component is removed while audio is playing.

---

### F8 — `audio-img.tsx` event listener leak on unmount

**Severity:** Low
**File:** `audio-img.tsx`, lines 52-58

The `ended` event listener added at line 57 is never cleaned up in a `useEffect` return. If the component unmounts while audio is playing, the listener fires against a stale ref. The interval-based polling in `audio-button.tsx` has the same issue.

---

### F9 — `article-showcase-card.tsx` passes `ref` to both wrapper div and inner div

**Severity:** Low
**File:** `article-showcase-card.tsx`, lines 63 and 104

```tsx
<div ref={ref} className="relative hover:scale-105 ...">     // line 63
  ...
  <div ref={ref} className="w-full flex flex-col ...">        // line 104
```

`forwardRef` receives a single `ref` but it is applied to **two** DOM elements. Only the last assignment takes effect (the inner div). The outer div does not receive the ref. If consumers rely on the ref for measuring/scrolling the card container, it will point to the wrong element.

---

### F10 — `article-content.tsx` missing `Content-Type` header on flashcard save

**Severity:** Low
**File:** `article-content.tsx`, lines 243-261

```tsx
const resSaveSentences = await fetch(`/api/v1/users/sentences/${userId}`, {
  method: "POST",
  body: JSON.stringify({...}),
});
```

No `Content-Type: application/json` header is set. The browser will default to `text/plain` for `fetch` POST with a string body. The server route may still parse it (if `next-connect` or the framework auto-parses), but this is fragile and inconsistent with the same component's translate call (line 55-58) which does set the header.

---

### F11 — `article-content.tsx` uses `Number` (wrapper object) instead of `number` (primitive)

**Severity:** Very Low
**File:** `article-content.tsx`, line 82

```tsx
const [selectedSentence, setSelectedSentence] = React.useState<Number>(-1);
```

`Number` is the wrapper object type. Should be `number` (lowercase primitive). This can cause subtle comparison issues (e.g., `selectedSentence === -1` may not behave as expected with the wrapper type in some type-checking scenarios).

---

### F12 — `article-content.tsx` — `useEffect` missing `isPlaying` and `sentenceList` deps

**Severity:** Low
**File:** `article-content.tsx`, lines 342-368

```tsx
useEffect(() => {
  ...
  if (isPlaying) {
    audio.play().catch(...)
  }
  ...
}, [currentAudioIndex, speed]);
```

`isPlaying` and `sentenceList` are used inside the effect but not listed in the dependency array. React's exhaustive-deps lint rule would flag this. If `isPlaying` changes without `currentAudioIndex` changing, the audio won't auto-play/pause.

---

### F13 — `chatbot-floating-button.tsx` — stale closure risk in `handleSendMessage`

**Severity:** Low
**File:** `chatbot-floating-button.tsx`, line 44

```tsx
setMessages([...messages, newMessage]);
```

`messages` is captured from the closure at the time `handleSendMessage` is defined. Rapid successive sends will overwrite each other because `messages` is stale. Should use functional state update: `setMessages(prev => [...prev, newMessage])`. Line 70 already uses this correct pattern for the bot response, making the inconsistency more likely a bug.

---

### F14 — `dashboard/active-goals-widget.tsx` — "View All" not i18n-ized

**Severity:** Low
**File:** `active-goals-widget.tsx`, line 106

```tsx
View All
```

The button text is hard-coded English while the component otherwise uses `useScopedI18n`.

---

### F15 — `dashboard/activity-timeline.tsx` — `useCallback` with mutable property for throttling

**Severity:** Low (correctness)
**File:** `activity-timeline.tsx`, lines 397-398

```tsx
if (now - (handleScroll as any).lastCall < 1000) return;
(handleScroll as any).lastCall = now;
```

This attaches a mutable `.lastCall` property to a function reference via `as any`. This pattern is fragile because `useCallback` may return a new function reference on re-renders (when deps change), which would lose the throttle state. A `useRef` would be more robust.

---

### F16 — `dashboard/adoption-widget.tsx` — CEFR level grouping logic may be incomplete

**Severity:** Low (logic)
**File:** `adoption-widget.tsx`, lines 118-121

```tsx
const cefrMainLevels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const byCEFR = cefrMainLevels.map(mainLevel => {
  const relatedLevels = cefrLevels.filter(l =>
    l.startsWith(mainLevel.charAt(0)) && l.includes(mainLevel.charAt(1))
  );
```

`mainLevel.charAt(1)` for `'A1'` is `'1'`. But `cefrLevels` includes `'A0'`, `'A0+'`, etc. The filter `l.startsWith('A') && l.includes('1')` matches `A1`, `A1+`, `A1-` correctly, but `A0`, `A0+` would not be matched by any `cefrMainLevels` entry since `'0'` is not in `cefrMainLevels`. Students with CEFR level `A0`, `A0+`, `A0-` would silently disappear from the chart.

---

## Summary

| Severity | Count | IDs |
|----------|-------|-----|
| Medium | 3 | F1, F4, F5 |
| Low-Medium | 1 | F2 |
| Low | 10 | F3, F6, F7, F8, F9, F10, F12, F13, F14, F15, F16 |
| Very Low | 1 | F11 |

**Critical blockers:** None.
**API contract issues:** All 20 components target existing endpoints (F1 is a design concern, not a 404).
**UX consistency:** F2 (i18n gaps), F3 (typo), F6 (stray colon), F4 (duplicate axis), F5 (status check).

No app-code edits were made per the review scope. Findings are advisory.

---

*End of line review for ra-batch-18.*
