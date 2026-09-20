# Marketing UX Refactor Plan

Date: 2026-09-19. Scope: `apps/marketing`. Method: read-only audit of every user-facing page.

This plan follows the Ponytail Rules. Each fix reuses existing code, installed dependencies, or the platform. No new dependencies.

## 0. Application shape

The application is small. It holds 100 TypeScript files and about 8,300 non-test lines. It has 5 pages,
1 layout, and 15 route handlers. Every page is a client component. About 2,400 of the non-test lines sit
in one file, `app/campaigns/[id]/video/page.tsx`.

The build tool is `vinext`, not stock `next`. `package.json:7-9` runs `vinext dev`, `vinext build`, and
`vinext start`. The application declares no `next.config.ts` and no `middleware.ts` or `proxy.ts`. It
still imports from `next/link`, `next/navigation`, and `next/server`; `vitest.config.ts:13-18` maps each
of those specifiers to a `vinext` shim.

The application supports one language. `app/lib/i18n.ts:2` fixes the locale to `en`. There is no locale
route segment and no locale switch.

The audit found 56 defects. Section 2 names the ones that depend on `vinext` behavior that stock
Next.js does not provide.

## 1. Summary of Findings

The audit found six systemic problems.

1. **One route handler reads `params` synchronously.** `app/api/campaigns/[id]/route.ts:50,57,98,105`
   treat `params` as a plain object. Next.js 16 gives a Promise. The code works only because vinext
   returns a hybrid proxy that also exposes the keys. This is the largest portability defect.
2. **No security headers and no cache headers reach most routes.** The application has no
   `next.config.ts`. `apps/sales-advantage/next.config.ts:39-58` sets `Cache-Control: no-store, private`,
   `X-Frame-Options`, `X-Content-Type-Options`, and `Referrer-Policy` for every route. Eight
   authenticated Marketing route handlers set no `Cache-Control` at all.
3. **The scene editor builds scripts that the API always rejects.**
   `app/lib/script-schema.ts:12` requires 5 to 7 scenes. `app/campaigns/[id]/video/page.tsx:888` adds a
   scene with no upper limit and line 811 removes one with no lower limit. The save then fails with a
   generic message.
4. **The settings page can destroy the stored API key.** The page puts the mask `••••` into the input
   value. `app/lib/settings-update.ts:26-30` treats only the exact mask as unchanged. One backspace
   saves `•••` as the real key.
5. **Error messages name the wrong cause.** The video page maps every failed request to one message. An
   unconfigured language model reports "Topic research did not produce five new topics". The user never
   learns to open Settings.
6. **Forms and labels are absent.** The application declares zero `<form>` elements. Seven `<label>`
   elements carry no `htmlFor` and wrap no control, so seven inputs have no accessible name. The same
   six-line sign-in redirect block appears 14 times across four files.

## 2. vinext and Stock Next.js Assumptions (fix first)

The brief asks for the places where the code assumes stock Next.js behavior. The largest finding runs
the other way: one route depends on a vinext compatibility layer that stock Next.js does not provide.

Issues:

- `app/api/campaigns/[id]/route.ts:50` types the second handler argument as
  `{ params: { id: string } }` and line 57 reads `params.id` without `await`. Line 98 and line 105 repeat
  the same pattern in `PATCH`. Next.js 15 and 16 pass a `Promise` here. `apps/sales-advantage`, which
  runs stock Next.js 16, awaits its params at `app/[locale]/admin/layout.tsx:18`.
- `node_modules/vinext/dist/shims/thenable-params.js` explains why the code works today.
  `makeThenableParams` returns a `Proxy` over a `Promise` whose `get` trap also answers the param keys.
  `app/api/campaigns/[id]/route.ts` reads the id through that trap. Under stock Next.js `params.id`
  resolves to `undefined`, `campaignIdSchema.safeParse(undefined)` fails, and every campaign read and
  every status change returns HTTP 400.
- `tsc --noEmit` cannot report the defect, because the file declares its own param type.
- The application declares no `next.config.ts`. It therefore ships no `headers()` block. Eight route
  handlers return no `Cache-Control` header: `app/api/campaigns/route.ts`,
  `app/api/campaigns/[id]/route.ts`, `app/api/settings/route.ts`,
  `app/api/settings/test-connection/route.ts`, `app/api/video/projects/route.ts`,
  `app/api/video/research-topics/route.ts`, `app/api/video/save-topics/route.ts`, and
  `app/api/video/generate-script/route.ts`. Each one returns per-user data.
  `app/api/auth/session/route.ts:19` and `app/api/ready/route.ts:130` are the only two that set the
  header.
- No route in the application sets `X-Frame-Options`, `X-Content-Type-Options`, or `Referrer-Policy`.
  The sales application sets all three for every route.
- No route handler exports `runtime`, `dynamic`, or `revalidate`. The application therefore relies on
  the vinext default for every route.
- `vite.config.ts:8` aliases `"@"` to the relative string `"./app"`. `vitest.config.ts:12` resolves the
  same alias with `path.resolve(__dirname, "app")`. The two resolvers use two rules for the same alias,
  and 102 imports depend on it.
- A stale `.next/types/` directory exists in the application. `.gitignore` does not list `.next`, and
  `tsconfig.json:12-13` includes `**/*.ts` while excluding only `node_modules`. `tsc --noEmit` therefore
  type-checks a Next.js build artifact that the vinext build never produces.
- The application declares no `middleware.ts` and no `proxy.ts`. Every access check runs in the browser
  after the page renders. A visitor to `/settings` receives the full page, then the client redirects.
  `apps/sales-advantage/proxy.ts:30-46` gates its protected paths at the edge.

Plan:

1. Replace `{ params }: { params: { id: string } }` with `{ params }: { params: Promise<{ id: string }> }`
   and read the id with `const { id } = await params;`. This is four lines and it works under both
   runtimes.
2. Add a `headers()` block. Copy the two entries from `apps/sales-advantage/next.config.ts:39-58`. Place
   it where vinext reads configuration, or set the headers in each route handler if vinext reads no
   `next.config.ts`. Verify the choice against one built response before you close the task.
3. Set `Cache-Control: no-store, private` on the eight authenticated route handlers. This is one line
   each.
4. Change `vite.config.ts:8` to use `path.resolve` like `vitest.config.ts:12`. This is three lines.
5. Add `.next` to `.gitignore` and to the `tsconfig.json` exclude list. Delete the stale directory. This
   is two lines.
6. Decide the gate policy. Either add a `proxy.ts` that redirects unauthenticated visitors, or accept the
   client-side gate and record the decision in `measure/tech-debt.md`.

## 3. Video Production Workflow

`app/campaigns/[id]/video/page.tsx` is 908 lines and holds thirteen state variables. It is the largest
and the least correct file in the application.

### 3.1 The scene editor and the script contract

Issues:

- `app/lib/script-schema.ts:12` declares `z.array(scriptSceneSchema).min(5).max(7)`.
  `app/api/video/projects/route.ts:33` uses that schema for both `POST` and `PATCH`.
- `app/campaigns/[id]/video/page.tsx:888-900` renders Add Scene with no upper limit. Line 811 renders
  Delete with no lower limit. A user can build an eight-scene or a four-scene script.
- `app/campaigns/[id]/video/page.tsx:383-389` then reports "Failed to save the project. Please try again."
  The message never names the 5-to-7 rule, and a retry never succeeds.
- `app/campaigns/[id]/video/page.tsx:753` uses `key={index}` for each scene. The list supports drag
  reorder at lines 760-768, move up and move down at lines 780-810, and delete at line 811. React
  therefore reuses the wrong element after each move.
- `app/campaigns/[id]/video/page.tsx:792,809` label the move buttons with the glyphs `↑` and `↓`. Neither
  button carries an `aria-label` or a `title`.
- `app/campaigns/[id]/video/page.tsx:760-768` puts the drag handlers on a plain `div`. The element carries
  no role and shows no drop position.

Plan:

1. Disable Add Scene at 7 scenes and Delete at 5 scenes. Read the two numbers from one exported constant
   in `app/lib/script-schema.ts`. This is about ten lines.
2. State the 5-to-7 rule beside the Add Scene button.
3. Give each scene a stable identifier. Create it when the script loads and keep it in the scene object.
   Use it as the React key.
4. Add `aria-label` to the two move buttons. Add two message keys.

### 3.2 Topic review

Issues:

- `app/campaigns/[id]/video/page.tsx:576-586` renders the topic editor as an uncontrolled input with
  `defaultValue` and an `onBlur` handler. There is no Save button, no Enter handler, and no Escape
  handler. The user must click elsewhere to keep the edit.
- `app/campaigns/[id]/video/page.tsx:233-251` update `topics` from the captured closure with
  `topics.map(...)`. `handleSceneChange` at lines 334-338 uses the functional form
  `setScript(prev => ...)`. One file holds two rules. Two clicks in one tick lose an update.
- `app/campaigns/[id]/video/page.tsx:234,238,242,247,257,263,287,355,433,434,665` name a callback
  parameter `t`. Line 13 imports the translator as `t`. The parameter shadows the translator in every
  one of those callbacks.
- `app/campaigns/[id]/video/page.tsx:667` renders Save Approved Topics with no pending state. Two clicks
  send two requests.
- `app/campaigns/[id]/video/page.tsx:665` computes `topics.some((t) => t.approved)`. Line 433 already
  computes `approvedTopics`.

Plan:

1. Make the topic editor a controlled input with a Save button and an Enter handler. Keep `onBlur`.
2. Change the four topic handlers to the functional `setTopics(prev => ...)` form. This is four lines.
3. Rename every callback parameter `t` to `topic` or `scene`. This is eleven lines.
4. Add a pending state to Save Approved Topics.
5. Use `approvedTopics.length > 0` at line 665.

### 3.3 Error reporting

Issues:

- `app/api/video/research-topics/route.ts:96-101` returns HTTP 400 with "LLM not configured. Please set
  up API key in Settings." `app/campaigns/[id]/video/page.tsx:200-203` maps every non-OK response to
  `t("video.researchFailed")`, which reads "Topic research did not produce five new topics." The user
  reads the wrong cause and never opens Settings.
- `app/api/video/research-topics/route.ts:147-157` returns a structured 422 with `code`,
  `expectedCount`, and `actualCount`. The client reads none of those fields.
- `app/api/video/generate-script/route.ts:118-123` has the same 400 case.
  `app/campaigns/[id]/video/page.tsx:312-315` has the same fault.
- `app/campaigns/[id]/video/page.tsx:45` declares `useState<any>(null)` for the campaign. Line 438 reads
  `campaign.name` and line 368 reads `campaign.id` with no check. `app/campaigns/[id]/page.tsx:13-21`
  already declares a `Campaign` interface.
- `app/campaigns/[id]/video/page.tsx:522` writes `getMarketingAppName(key) || APP_NAMES[key]`.
  `app/lib/i18n.ts:243` returns the key itself when the name is absent, never an empty string. The
  fallback is unreachable. `app/__tests__/phase-7-schema-integrity.red.test.ts:222` pins the import that
  feeds the dead branch.
- The page holds no unsaved-changes guard. A user can edit a whole script and leave through the sidebar.

Plan:

1. Read the response body on a 400 and show its `message` field. Do this once, in a shared helper. See
   section 6.
2. Show the `actualCount` from the 422 body in the shortfall message.
3. Type the campaign state with the `Campaign` interface. Move that interface into one shared file. See
   section 7.
4. Delete the unreachable `|| APP_NAMES[key]` fallback and update the test that pins it.
5. Warn the user before leaving with an unsaved script. Use the native `beforeunload` event and a
   navigation guard.

## 4. Settings

Issues:

- `app/settings/page.tsx:337-339` sets `value={apiKey}` on the password input. After a load, `apiKey`
  holds `MARKETING_MASKED_SECRET`, which is `••••`.
- `app/lib/settings-update.ts:26-30` treats only an empty string and the exact mask as "unchanged". One
  backspace produces `•••`. `prepareMarketingSettingsUpdate` keeps that value,
  `app/api/settings/route.ts:108` encrypts it, and line 110 writes it. Every later model call then fails
  with an invalid key.
- `app/settings/page.tsx:396-408` renders Save with no pending state and no disabled state. Two clicks
  send two writes.
- `app/settings/page.tsx:273,301,321,361` declare four `<label>` elements with no `htmlFor`. None of the
  four wraps its control. The provider select, the model input, the API key input, and the mmx path
  input therefore have no accessible name.
- `app/settings/page.tsx:53` returns from the load effect without clearing `loading`. The render path
  hides the result today, so the defect is latent.
- `app/settings/page.tsx:13` hardcodes the model identifier
  `nvidia/nemotron-3-ultra-550b-a55b:free` in the page.
- `app/api/settings/route.ts:106-117` writes each setting in an awaited loop. Four settings cost four
  round trips.
- `app/api/settings/route.ts:59,120` bind `error` in the catch clause and never read it. Neither failure
  reaches a log. `@reading-advantage/utils/structured-error` already exports `logStructuredError`, and
  `apps/sales-advantage` uses it.
- `app/lib/settings-schema.ts:12` accepts any key name up to 100 characters. The route writes those keys
  into the shared `settings` table.

Plan:

1. Keep the mask out of the input value. Show the mask as a placeholder and start `apiKey` as an empty
   string. The existing `isApiKeyMasked` flag already drives the "configured" label. This removes the
   data-destruction path in about six lines.
2. Add a `saving` state to the Save button. Copy the pattern from
   `app/campaigns/[id]/video/page.tsx:723`.
3. Give each of the four inputs an `id` and give each label an `htmlFor`. This is eight lines.
4. Clear `loading` in the early-return branch at line 53. This is one line.
5. Move the default model identifier into `app/lib/ai-credentials.ts` beside the provider list.
6. Replace the awaited loop with one batched insert, or with `Promise.all`.
7. Log both settings failures with `logStructuredError`.
8. Constrain `settingsPostSchema` to the four keys the page writes.

## 5. Campaigns

Issues:

- `app/campaigns/page.tsx:27` starts `campaigns` as an empty array and declares no loading state. Before
  the fetch resolves the page renders an empty grid. After a successful fetch with no rows it renders the
  same empty grid. The user cannot tell the two states apart.
- `app/campaigns/page.tsx:219-231` renders Create with no pending state and with no client-side check on
  the name. An empty name reaches the server and returns "Failed to create campaign. Check the form and
  try again."
- `app/campaigns/page.tsx:142-246` renders the create panel as a `div`. There is no `<form>`, no Enter
  submit, no Escape close, and no focus move into the panel.
- `app/campaigns/page.tsx:154,177,200` declare three `<label>` elements with no `htmlFor`. None wraps its
  control. The type select, the app select, and the name input have no accessible name.
- `app/campaigns/page.tsx:99` sets a success message that nothing ever clears.
- `app/campaigns/[id]/page.tsx:23-28` declares `statusTransitions` inline.
  `app/lib/campaign-status.ts:3-8` already holds the same state machine and exports
  `nextCampaignStatuses`. `app/api/campaigns/[id]/route.ts:29` already imports from that file. The client
  and the server hold two copies of one rule.
- `app/campaigns/[id]/page.tsx:191-206` renders the transition buttons with no pending state. Two clicks
  send two `PATCH` requests, and the second one fails the transition check.
- `app/campaigns/page.tsx:293-300` and `app/campaigns/[id]/page.tsx:171-178` hold two copies of the same
  status-to-color ternary.
- `app/campaigns/page.tsx:13-20` and `app/campaigns/[id]/page.tsx:13-21` declare the `Campaign` interface
  twice. `app/campaigns/[id]/video/page.tsx:45` uses `any` for the same shape.
- `app/api/campaigns/[id]/route.ts:134-163` reads the campaign and then updates it without a transaction.
  Two concurrent transitions can both read the same start state.

Plan:

1. Add a `loading` state and an empty state to the campaigns list. This is about twelve lines.
2. Add a pending state to Create and disable it while the name is empty.
3. Wrap the create panel in a `<form>` with `onSubmit`. The browser then handles Enter and the required
   check. This removes code.
4. Give each of the three inputs an `id` and each label an `htmlFor`.
5. Clear the success message when the list refreshes.
6. Import `nextCampaignStatuses` in `app/campaigns/[id]/page.tsx` and delete the inline copy. This
   removes six lines.
7. Add a pending state to the transition buttons.
8. Extract one `campaignStatusColor(status)` lookup map into `app/lib/campaign-status.ts`. Use it in both
   pages.
9. Move the `Campaign` interface into one shared file. Use it in all three pages.

## 6. Authentication and Shell

Issues:

- The same six-line block appears 14 times across four page files:
  `app/settings/page.tsx:48,59,121,170`, `app/campaigns/page.tsx:50,84`,
  `app/campaigns/[id]/page.tsx:51,90`, and `app/campaigns/[id]/video/page.tsx:78,115,191,267,303,374`.
  Each copy writes `window.location.href = redirectToLogin(...)`.
- Every one of those 14 copies forces a full page reload. `next/navigation` already provides `useRouter`,
  and the application already imports from that module at `app/campaigns/[id]/page.tsx:4`.
- `app/api/auth/callback/route.ts:46-63` issues a Marketing session cookie without checking the Marketing
  role. `apps/sales-advantage/app/api/auth/callback/route.ts:54-74` checks the role, revokes the token,
  and redirects with `?error=forbidden`. The Marketing shell blocks the user at
  `app/marketing-app-shell.tsx:32-50`, but the unauthorized identity keeps a live session cookie.
- `app/api/auth/login/route.ts` always returns HTTP 409. No component calls it. The application holds no
  credential form.
- `app/lib/auth.ts:31,38-40` export `hasLegacyMarketingAccess`. It has zero callers.
- `app/lib/company-oidc.ts:76-78` returns `xp: 0`, `level: 1`, and `cefrLevel: "N/A"` in the Marketing
  user projection. The three fields belong to the learner products and mean nothing here.
- `app/layout.tsx:22-30` wraps every route, including `/login`, in `MarketingAppShell`. The sign-in page
  therefore renders the application sidebar.
- `app/layout.tsx:7-10` holds the only `metadata` export. Every page shares one title and one
  description.
- The application declares no `error.tsx`, no `loading.tsx`, no `not-found.tsx`, and no
  `global-error.tsx`. A throw on any page replaces the whole shell with the runtime default.
- `app/page.tsx:17-44` and `app/marketing-app-shell.tsx:74-99` render the same two links with the same
  inline style object. The home page duplicates the sidebar.
- `app/login/page.tsx:11` calls `useSearchParams()` with no `Suspense` boundary above it. Stock Next.js
  refuses to prerender that page. Verify the vinext behavior before you rely on it.
- No client fetch in the application uses an `AbortController`.

Plan:

1. Extract one `handleAuthFailure(response)` helper into `app/lib/login-redirect.ts`. Call it from all
   14 sites. This removes about 70 lines.
2. Use `router.replace` from `next/navigation` inside that helper. Keep the client-side history.
3. Add the Marketing role check to the callback route. Copy the shape from the sales callback. This is
   about twelve lines.
4. Delete `app/api/auth/login/route.ts` and `hasLegacyMarketingAccess`.
5. Delete `xp`, `level`, and `cefrLevel` from `marketingSessionUser`, or record why the shared type needs
   them.
6. Render `/login` outside `MarketingAppShell`, or hide the sidebar when the user has no session.
7. Add a `metadata` export to each of the five pages.
8. Add one `app/error.tsx` and one `app/global-error.tsx`.
9. Delete the duplicated link block from `app/page.tsx`. Point the home page at the sidebar.
10. Add an `AbortController` to each page-level fetch effect.

## 7. Duplication and Dead Code

Issues:

- Three route files hand-write the same eight-member application union:
  `app/api/campaigns/route.ts:100-108`, `app/api/video/research-topics/route.ts:109-118`, and
  `app/api/video/save-topics/route.ts:47-55`. `app/lib/campaign-schema.ts:17` and
  `app/lib/topic-schema.ts:13` already derive the same list from `appEnum.enumValues`.
- `app/lib/apps.ts:16-25` declares `APP_NAME_VALUES` with the eight display names.
  `app/lib/i18n.ts:177-184` declares the same eight names under `app.*` keys. A rename in one place
  leaves the other stale.
- `app/lib/apps.ts:27-33` binds each color and each name to the array index of `APPS`. A reorder or an
  addition in `@reading-advantage/db/marketing-constants` shifts every color and every name silently.
- `app/lib/scene-editor.ts:1-5` declares `Scene`. `app/lib/script-schema.ts:48` declares `ScriptScene`
  with the same three fields. The video page imports the first and validates with the second.
- `app/api/video/generate-script/route.ts:101-123` duplicates
  `app/api/video/research-topics/route.ts:79-101`. Both read the three `llm.*` settings, build the map,
  call `resolveMarketingAIConfig`, and return the same 400. This is about 22 duplicated lines.
- `app/api/campaigns/route.ts:28-36` and `app/api/campaigns/[id]/route.ts:33-41` declare
  `campaignClientColumns` twice with the same seven entries.
- `app/api/health/db/route.ts:6` and `app/api/ready/route.ts:83` both run `SELECT 1`.
  `/api/health/db` needs no session, so any caller can reach the database. The application has no
  database-free liveness route, unlike `apps/sales-advantage/app/api/health/route.ts`.
- `app/lib/public-url.ts` is a near-copy of `apps/sales-advantage/lib/public-url.ts`. The two files differ
  only in the product name and one extra exported helper. This is about 150 duplicated lines.
- `app/lib/login-redirect.ts:6-25` duplicates `apps/sales-advantage/lib/sign-in-href.ts:6-25` byte for
  byte. `packages/auth` already exports `parseCompanyOidcReturnTo` and is the correct home.
- `app/api/video/research-topics/route.ts:79-119` and `app/api/video/generate-script/route.ts:101-119`
  run two independent database reads in sequence. `Promise.all` covers both.
- `app/lib/i18n.ts:4-190` holds one locale. `getMarketingMessage` takes no locale parameter, so a second
  language needs a change at every one of the 102 call sites.
- `app/lib/i18n.ts:232` returns the key itself when a key is absent. The user then reads a raw key path.

Plan:

1. Export one `MarketingApp` type from `app/lib/apps.ts`, derived from `appEnum.enumValues`. Use it in
   the three route files. This removes about 24 lines.
2. Delete `APP_NAME_VALUES` and `APP_NAMES` from `app/lib/apps.ts`. Keep `getMarketingAppName`.
3. Replace the index binding in `app/lib/apps.ts:27-33` with an explicit map keyed by application name.
4. Delete `Scene` from `app/lib/scene-editor.ts` and import `ScriptScene` from `app/lib/script-schema.ts`.
5. Extract one `loadMarketingAIClient()` helper into `app/lib/ai-credentials.ts`. Call it from both video
   routes. This removes about 22 lines.
6. Move `campaignClientColumns` into `app/lib/campaign-schema.ts`. Import it in both campaign routes.
7. Delete `app/api/health/db/route.ts`, or replace it with a database-free liveness route. Update
   `scripts/marketing-smoke.sh:61` and `scripts/verify-marketing-release.ts:88`.
8. Run the two independent reads in each video route with `Promise.all`.
9. Add a locale parameter to `getMarketingMessage` only when a second language arrives. Record the
   single-locale decision in `measure/tech-debt.md` until then.

## 8. Prioritized Roadmap

Each phase maps to one Measure track. Write tests for backend changes per project policy.

### Phase 0: Broken UX (one to two line fixes each)

1. Await `params` in `app/api/campaigns/[id]/route.ts`.
2. Keep the mask out of the settings API key input value.
3. Disable Add Scene at 7 scenes and Delete at 5 scenes.
4. Add a pending state to Create, Save Settings, Save Approved Topics, and the status buttons.
5. Give the seven unlabeled inputs an `id` and an `htmlFor`.
6. Add `aria-label` to the two scene move buttons.
7. Import `nextCampaignStatuses` in `app/campaigns/[id]/page.tsx` and delete the inline copy.
8. Add `.next` to `.gitignore` and to the `tsconfig.json` exclude list.
9. Clear `loading` in the settings early-return branch.
10. Delete `app/api/auth/login/route.ts` and `hasLegacyMarketingAccess`.

### Phase 1: Runtime and header correctness

1. Add the `headers()` block, or set the headers per route. Verify one built response.
2. Set `Cache-Control: no-store, private` on the eight authenticated route handlers.
3. Change the `vite.config.ts` alias to use `path.resolve`.
4. Add the Marketing role check to the callback route.
5. Decide the gate policy for `/settings` and `/campaigns`.

### Phase 2: Loading and state correctness

1. Add a loading state and an empty state to the campaigns list.
2. Show the server `message` on a 400 in the video workflow.
3. Show `actualCount` in the shortfall message.
4. Give each scene a stable React key.
5. Change the four topic handlers to the functional state form.
6. Make the topic editor a controlled input with a Save button.
7. Add an `AbortController` to each page-level fetch effect.
8. Add one `app/error.tsx` and one `app/global-error.tsx`.
9. Warn the user before leaving with an unsaved script.
10. Log the two settings failures with `logStructuredError`.

### Phase 3: Duplication removal

1. Extract one `handleAuthFailure(response)` helper and call it from all 14 sites.
2. Export one `MarketingApp` type and delete the three hand-written unions.
3. Delete `APP_NAME_VALUES` and `APP_NAMES`.
4. Delete `Scene` and use `ScriptScene`.
5. Extract one `loadMarketingAIClient()` helper.
6. Move `campaignClientColumns` and the `Campaign` interface into one shared file each.
7. Extract one `campaignStatusColor(status)` map.
8. Delete `app/api/health/db/route.ts` or replace it with a liveness route.
9. Rename the eleven shadowing `t` parameters in the video page.
10. Delete the duplicated link block from `app/page.tsx`.

### Phase 4: Structural alignment (needs dedicated tracks)

1. Move `public-url.ts` and the return-path helpers into `packages/auth`. This changes two applications.
2. Split `app/campaigns/[id]/video/page.tsx` into a topic step, a script step, and a scene editor. The
   file is 908 lines and holds thirteen state variables.
3. Wrap every data entry screen in a `<form>`. The application declares zero `<form>` elements today.
4. Add a `metadata` export to each page.
5. Replace the index binding between `APPS`, the colors, and the names.
6. Constrain `settingsPostSchema` to the four keys the page writes.

## 9. Out of Scope

- Framework upgrades. The version policy forbids them in feature work. A move from `vinext` to stock
  `next` is a migration, not a fix; section 2 only makes the code work under both.
- New dependencies. Every fix uses an installed package or the platform.
- The release and smoke scripts under `scripts/`. They are operator tooling, not user pages. Section 7
  names the two lines that a deletion of `/api/health/db` must update.
- A second language. `app/lib/i18n.ts` holds one locale by design. Section 7 records the cost of a later
  change.
- The shared `@reading-advantage/auth-client` package. This application already satisfies the session
  route contract that `apps/sales-advantage` breaks.
- Per-row tenant scoping of the marketing tables. `app/lib/auth.ts:1-17` records that the tables hold no
  `schoolId` column. That change belongs to the schema, not to the pages.
