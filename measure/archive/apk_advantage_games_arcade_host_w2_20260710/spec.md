# Specification: APK Advantage Games Arcade Host W2

## Overview

The APK foundation and W0/W1 delivered five shared Phaser 4 cartridges, dual audience editions, a QC testbed, and typed Reading/Primary consumption proofs. Advantage Games is still configured as a static export, its completion routes return mock responses, and its public cards launch `/qc`. W2 makes it the first real APK host.

The stable educational ABI remains unchanged:

```ts
Array<{ term: string; translation: string }>
{ accuracy, xp, score, correctAnswers, totalAttempts }
```

The browser maps those five fields to the existing strict completion input, but never supplies authoritative XP, identity, tenant, or permissions. Those remain server-owned.

## Stories

### Story S1: Activate first-party student sessions
**As a** student
**I want** to sign in with my Reading Advantage username and password
**So that** Advantage Games can identify me without coupling its UI to session storage details.

**Acceptance Criteria:**
- Given the current static export, When W2 is enabled, Then Advantage Games builds as a dynamic Next.js application and its API routes execute at request time.
- Given valid first-party credentials, When login succeeds, Then the shared auth adapter issues the existing HttpOnly database session cookie and the student is redirected to the arcade.
- Given invalid credentials, rate limiting, an expired session, or a non-student-safe request, When auth is evaluated, Then the app fails closed with a structured response or safe redirect.
- Given application code, When auth is needed, Then it calls shared auth/API adapters rather than NextAuth, OAuth, Firebase, or direct password/session internals.

**Estimate:** L
**Priority:** Must

### Story S2: Mount the production cartridge host
**As a** student
**I want** every published APK game to launch through one real student route
**So that** cartridges do not require copied pages, scenes, assets, or per-game host logic.

**Acceptance Criteria:**
- Given any of the five public cartridge IDs, When `/student/arcade/<id>` loads, Then one client-only `APKGameHost` resolves the shared loader and the correct vocabulary or sentence input.
- Given an unknown or retired ID, When the route is requested, Then it returns the normal not-found boundary and never falls back to another game silently.
- Given Primary Chibi or Secondary Epic, When a student changes the presentation pack, Then gameplay logic and educational input remain identical and only edition-owned assets/tuning change.
- Given repeated navigation, restart, or edition changes, When the host remounts, Then exactly one canvas and one input lifecycle remain active at desktop and 390x844.

**Estimate:** XL
**Priority:** Must

### Story S3: Persist completion server-side
**As a** student
**I want** completed games to save once and award server-computed XP
**So that** my arcade activity is durable without trusting the browser.

**Acceptance Criteria:**
- Given a valid authenticated student and strict completion payload, When the generic APK completion endpoint runs, Then it resolves the session and school tenant server-side and delegates to `recordGameCompletion`.
- Given client-supplied XP, identity, school, unknown fields, an unsupported ID, a cross-origin request, or missing/invalid auth, When the endpoint receives it, Then it is rejected without a write.
- Given the same idempotency key twice or two concurrent requests, When persistence runs, Then XP is written at most once and the duplicate response is successful and explicit.
- Given Astral Mage or Sorcerer's Ziggurat, When W2 production persistence is proven, Then their IDs enter the authoritative game enum with contract, domain, and route tests.

**Estimate:** XL
**Priority:** Must

### Story S4: Ship the continuous arcade loop
**As a** student
**I want** to choose another game immediately after finishing
**So that** I can practice language skills continuously without returning to a dead-end page.

**Acceptance Criteria:**
- Given the catalog, When a published APK card is selected, Then it opens its production arcade route rather than `/qc` or a nonexistent legacy route.
- Given a successful completion, When the result appears, Then the student sees saved XP, replay, catalog, and deterministic next-game actions.
- Given mobile and keyboard-only use, When the entire login → catalog → play → save → next-game flow runs, Then it remains accessible, readable, and free of horizontal overflow.
- Given caller-owned legacy implementations, When cutover evidence is evaluated, Then only first-five paths made caller-free by the generic host may be deleted; all other games and concurrent work remain untouched.

**Estimate:** L
**Priority:** Must

## Non-Functional Requirements

- Use shared `@reading-advantage/auth`, `@reading-advantage/db`, `@reading-advantage/domain`, game contracts, APK runtime, and cartridge packages behind app-local adapters.
- Keep route handlers and React components thin; authentication, tenancy, XP, idempotency, and persistence remain in shared packages/domain functions.
- Validate all external input with Zod and document every new export with repository-standard JSDoc.
- Use username/password only; do not introduce OAuth, hosted auth, magic links, or NextAuth application coupling.
- Preserve one-canvas lifecycle, keyboard access, 44px touch targets, and 390x844 no-overflow behavior.
- Focused new logic must exceed 80% statement and line coverage; affected lint, type, test, build, architecture, and browser gates must pass.

## Out of Scope

- Porting a sixth game or rebuilding unrelated legacy games.
- Reading/Primary production route cutover; those apps continue consuming the package proof until their server-owned host track.
- Assignment-aware or teacher-selected content, multiplayer, leaderboards, final artwork, or deployment.
- Deleting Abyssal Well, Babel Architect, R3F work, or any path still referenced by a live route/test.
- Changing vocabulary arrays, sentence arrays, the five-field result, or the server XP formula.
