# Line Review Evidence: marketing-app-004

Reviewer: coder-xiaomi-mimo-v2-5-pro/marketing-app-004
Files assigned: 7
Lines assigned: 1192

## Coverage

| File | Reviewed ranges | Status | Findings |
|---|---|---|---:|
| apps/marketing/app/api/video/generate-script/route.ts | 1-71 | reviewed | 4 |
| apps/marketing/app/api/video/projects/route.ts | 1-44 | reviewed | 2 |
| apps/marketing/app/api/video/research-topics/route.ts | 1-78 | reviewed | 4 |
| apps/marketing/app/api/video/save-topics/route.ts | 1-33 | reviewed | 2 |
| apps/marketing/app/campaigns/[id]/page.tsx | 1-147 | reviewed | 2 |
| apps/marketing/app/campaigns/[id]/video/page.tsx | 1-596 | reviewed | 1 |
| apps/marketing/app/campaigns/page.tsx | 1-223 | reviewed | 1 |

## Findings

### LR-004-001 — Missing Zod input validation on generate-script POST body

- Severity: Critical
- Category: ai-boundary
- File: `apps/marketing/app/api/video/generate-script/route.ts:11`
- Evidence: Line 11 casts `await request.json()` directly to `{ app: string; topic: string }` with `as` — no Zod schema validation. If the body is missing `app` or `topic`, or they are non-string types, downstream prompt construction (`buildScriptGenerationPrompt(app, topic)`) receives unchecked input.
- Impact: Unvalidated input reaches the AI prompt builder; could produce garbage prompts or runtime errors.
- Recommendation: Define a Zod input schema and validate `request.json()` before use.

### LR-004-002 — No authentication on video API routes

- Severity: Critical
- Category: auth-api
- File: `apps/marketing/app/api/video/generate-script/route.ts:9`
- Evidence: The POST handler at line 9 has no auth check — no session validation, no `auth.requireUser()`, no cookie/token verification. Same pattern applies to `projects/route.ts:6`, `research-topics/route.ts:9`, and `save-topics/route.ts:7`. All four video API routes are publicly accessible.
- Impact: Unauthenticated users can generate AI scripts, create video projects, research topics, and save topics. These operations consume LLM tokens and write to the database.
- Recommendation: Add auth middleware or per-route `auth.requireUser()` calls consistent with the app's auth adapter.

### LR-004-003 — Direct AI client instantiation in route handler

- Severity: High
- Category: adapter-neutrality
- File: `apps/marketing/app/api/video/generate-script/route.ts:37-41`
- Evidence: Lines 37-41 call `createAIClient({ provider, model, apiKey })` directly inside the route handler. The provider/model/apiKey are read from the settings table and the AI client is constructed per-request. Same pattern at `research-topics/route.ts:46-50`. Per AGENTS.md, AI access must go through an internal adapter (`ai.generateText()`) — the route should not instantiate provider-specific clients.
- Impact: Route handler directly couples to AI provider selection logic. If the AI adapter layer is later used for rate limiting, logging, or fallback, these routes bypass it.
- Recommendation: Route should call a backend domain function that internally uses the AI adapter.

### LR-004-004 — Unvalidated campaignId in video project creation

- Severity: High
- Category: persistence
- File: `apps/marketing/app/api/video/projects/route.ts:28`
- Evidence: Line 28 inserts `campaignId: body.campaignId` directly. The `campaignId` is user-supplied from the request body (line 9) and is never verified against the user's access or the campaign's existence. No foreign key check or ownership verification occurs before the insert.
- Impact: A user could create a video project linked to any campaign ID, including non-existent or unauthorized campaigns.
- Recommendation: Verify the campaign exists and the user has access before inserting the video project.

### LR-004-005 — Loop insert without transaction in save-topics

- Severity: Medium
- Category: persistence
- File: `apps/marketing/app/api/video/save-topics/route.ts:19-24`
- Evidence: Lines 19-24 insert topics one-by-one in a `for` loop: `for (const topic of uniqueTopics) { await db.insert(pastTopics).values({ app, topic }); }`. Each insert is a separate database round-trip with no transaction wrapper. If any insert fails mid-loop, earlier inserts are committed but later ones are lost.
- Impact: Partial topic persistence on failure; data inconsistency between the client's expectation (all topics saved) and the database state.
- Recommendation: Use a batch insert or wrap the loop in a transaction.

### LR-004-006 — Unsafe JSON.parse on LLM output

- Severity: Medium
- Category: ai-boundary
- File: `apps/marketing/app/api/video/generate-script/route.ts:48`
- Evidence: Line 48 calls `JSON.parse(result)` on the raw LLM text output without a try-catch around the parse itself (the outer catch handles it, but the error message will be a generic JSON parse error, not an LLM-output-specific message). Same pattern at `research-topics/route.ts:57`. The generate-script route does validate via `scriptSchema.safeParse` after parsing, but a non-JSON LLM response produces an unhelpful error.
- Impact: LLMs can return markdown, preamble text, or malformed JSON. The user sees "Unexpected token" instead of a meaningful "LLM returned invalid format" message.
- Recommendation: Wrap JSON.parse in its own try-catch with a descriptive error, or use a JSON-extraction utility.

### LR-004-007 — No HTTP response status validation in campaign detail page

- Severity: Medium
- Category: ux-i18n
- File: `apps/marketing/app/campaigns/[id]/page.tsx:36-38`
- Evidence: Lines 36-38 in `fetchCampaign` call `await res.json()` without checking `res.ok` or `res.status`. If the API returns a 404 or 500 with an error JSON body, the component will set `campaign` to the error object (e.g., `{ message: "Not found" }`) and attempt to render it as a Campaign, displaying undefined fields. Same pattern at line 52 for `handleStatusChange`.
- Impact: API errors silently produce a broken UI instead of showing an error message to the user.
- Recommendation: Check `res.ok` before parsing; set an error state on non-2xx responses.

### LR-004-008 — No error state in campaign detail page

- Severity: Low
- Category: ux-i18n
- File: `apps/marketing/app/campaigns/[id]/page.tsx:24-41`
- Evidence: The component has no `error` state variable. The `catch` blocks at lines 39 and 54 only call `console.error`. The user sees "Loading..." indefinitely if the fetch fails, with no way to retry or understand what went wrong.
- Impact: Silent failure leaves user stuck on a loading screen with no feedback.
- Recommendation: Add an `error` state and display an error message with a retry option.

### LR-004-009 — No HTTP response status validation in video production page

- Severity: Medium
- Category: ux-i18n
- File: `apps/marketing/app/campaigns/[id]/video/page.tsx:57-59`
- Evidence: Lines 57-59 in `fetchCampaign` call `await res.json()` without checking `res.ok`. Same pattern at lines 73-74 (`handleResearchTopics`), 141-142 (`handleGenerateScript`), and 187 (`handleSaveScript`). Error responses from the API will be misinterpreted as valid data.
- Impact: If any API returns an error, the component sets state to the error object, producing broken UI or silent failures.
- Recommendation: Check `res.ok` on every fetch call; display error feedback to the user.

### LR-004-010 — No HTTP response status validation in campaigns list page

- Severity: Medium
- Category: ux-i18n
- File: `apps/marketing/app/campaigns/page.tsx:45-47`
- Evidence: Lines 45-47 in `fetchCampaigns` call `await res.json()` without checking `res.ok`. If the API returns an error, `setCampaigns(data)` receives a non-array object, which will crash when `.map()` is called at line 166.
- Impact: A 500 error from the campaigns API causes a client-side runtime crash (`data.map is not a function`).
- Recommendation: Check `res.ok`; validate that the response is an array before setting state.

## No-Finding Notes

- `apps/marketing/app/api/video/generate-script/route.ts`: reviewed line-by-line (71 lines); findings recorded above. Note: the script output IS validated via `scriptSchema.safeParse` at line 49 — this is good practice. The LLM settings lookup uses `or(eq(...))` correctly.
- `apps/marketing/app/api/video/projects/route.ts`: reviewed line-by-line (44 lines); findings recorded above. Note: script validation via `scriptSchema.safeParse` at line 14 is correct. Error handling is adequate.
- `apps/marketing/app/api/video/research-topics/route.ts`: reviewed line-by-line (78 lines); findings recorded above. Note: topic deduplication via `deduplicateTopics` is correctly applied. Topic cap at 5 (`slice(0, 5)`) is appropriate.
- `apps/marketing/app/api/video/save-topics/route.ts`: reviewed line-by-line (33 lines); findings recorded above. Note: deduplication before insert is correct.
- `apps/marketing/app/campaigns/[id]/page.tsx`: reviewed line-by-line (147 lines); findings recorded above. Note: status transition logic (`statusTransitions` map) correctly limits available transitions. Video production link is conditionally shown only for `type === "video"`.
- `apps/marketing/app/campaigns/[id]/video/page.tsx`: reviewed line-by-line (596 lines); findings recorded above. Note: scene editor integration via `@/lib/scene-editor` imports (`addScene`, `removeScene`, `reorderScenes`) uses immutable operations. Drag-and-drop implementation is functional. `appNames` map is a superset of the campaign page's `appColors` — both should be consolidated into a shared constant but this is a minor code quality issue, not a material finding.
- `apps/marketing/app/campaigns/page.tsx`: reviewed line-by-line (223 lines); findings recorded above. Note: campaign creation form correctly resets state after success. `appColors` map provides visual differentiation per app.
