# T6 Accessibility QA — primary-advantage (2026-09-15)

- App: http://localhost:3000 (dev server, `apps/primary-advantage`)
- User: `qa-student-a1` (view-only; no quiz submits, no data mutations)
- Method: headless system Chrome via Playwright 1.61. No app code changed.
- Axe: skipped. `@axe-core/playwright` is not installed. No new deps installed.
- Artifacts: this folder. Drivers: `a11y-driver.mjs`, `a11y-followup.mjs`, `a11y-final.mjs` (test-only). Data: `results-a11y.json`, `results-followup.json`, `results-final.json`.

## Pages tested

| Key | URL | Final URL / note |
|-----|-----|------------------|
| P1 landing | `/en` | `/en` |
| P2 sign-in | `/en/auth/signin` | `/en/auth/signin` |
| P3 dashboard | `/en/student` | 404, no such route. Used `/en/student/read` (student home) as dashboard. |
| P4 games catalog | `/en/student/games` | `/en/student/games` |
| P5 unauthorized | `/en/unauthorized` | `/en/unauthorized`. Redirect check: student visit to `/en/teacher/my-classes` lands on `/en/unauthorized`. Pass. |

## Per-page results

### P1 — `/en` landing (public)

- Landmarks: one `<main>`, one `<header>`, one `<footer>`, two `<nav>`. Pass. (`<header>`/`<footer>` lack explicit banner/contentinfo roles; implicit roles apply. Pass.)
- Headings: exactly one `<h1>` ("Primary Advantage"). 25 headings, no skipped levels. Pass.
- Keyboard: 24 tab stops in logical order (header nav → hero → contact form → footer). No traps. Full order logged in `results-followup.json` (`p1_tabSequence`).
- Focus: visible on all sampled stops. Evidence: `p1-landing-focus-2.png` (ring on "About Us"), `p1-landing-focus-1.png`, `p1-landing-focus-3.png`.
- Escape: locale menu opens on Enter (`aria-expanded=true`, listbox appears: `p1-locale-open.png`). Escape closes it and returns focus to the button (`p1-locale-after-escape.png`). Pass.
- Images: 3 logo `<img alt="logo">` (header + footer duplicates). 21 SVGs, 18 `aria-hidden`. Pass with note.
- Contrast (canvas-normalized): body 19.8:1. Primary CTA (white on navy) 14.7:1. Nav links 5.3:1. "Select an option" 4.7:1 (passes, borderline). All pass.
- Skip link: absent. See M1.
- Console/page errors: none.

### P2 — `/en/auth/signin` (public)

- Landmarks: no `<main>`, `<header>`, or `<footer>` (bare auth shell). See m1.
- Headings: exactly one `<h1>`. No skips. Pass.
- Keyboard: tab order is logo → Student tab → tabpanel div → input → Next. All interactive controls reachable. Arrow keys switch Student/Teacher tabs with correct roving tabindex (`p2-teacher-tab.png`). No traps.
- Focus: visible 3px ring on the classroom-code input. Evidence: `p2-signin-focus-input.png`, `p2-signin-focus-1.png`.
- Escape: no menus on this page. N/A.
- Forms: input has a real `<label>` ("Classroom Code", `aria-describedby` wired). Not placeholder-only. Empty submit triggers `role="alert"` ("Classroom code is required"), fires no login request, and moves focus to the invalid input. Pass.
- Images: hero photo `alt="Image"` (generic). See m3. Logo `alt="logo"`.
- Contrast: body 19.8:1. Tabs 18–20:1. Next button 17.2:1. All pass. (One 1.09 reading for the logo link is a sampling artifact: white overlay text on the photo, not on the card background.)
- Skip link: absent. See M1.
- Console/page errors: none.

### P3 — student dashboard `/en/student/read` (authed)

- Note: `/en/student` returns the app 404 page (two `<h1>`s, see m2). The student home is `/en/student/read` (h1 "Article Selection").
- Landmarks: one `<main>`, one `<header>`, two `<nav>`, no `<footer>`. Pass with note.
- Headings: exactly one `<h1>`, but it is the only heading on the page. Card titles and section labels are plain divs. See M3.
- Keyboard: 23 stops, logical order, ends cleanly. No traps. Two article cards are focusable divs without a role. See M2. (Two `NEXTJS-PORTAL` stops and the "1 Issue" badge are dev-server artifacts, not app findings.)
- Focus: visible. Evidence: `p3b-read-focus-1.png` (ring on locale toggle).
- Escape: no expandable menu at desktop width (avatar menu absent). N/A.
- Images: article covers render as black boxes; star-rating badges have no text alternative beyond card text. Observation only.
- Contrast: body 19.8:1. Sidebar section links 2.3:1. See S1.
- Skip link: absent. See M1.
- Console errors: `IntlError: MISSING_MESSAGE ... Sidebar.games` (x2). See M4. No page errors.

### P4 — student games catalog `/en/student/games` (authed)

- Landmarks: **two `<main>` elements** (nested layout + content). Three `<header>`, two `<nav>`, no `<footer>`. See S2.
- Headings: exactly one `<h1>` ("Student games"). No skipped levels among exposed headings. The "empty" h2/h3 readings ("Wizard rewards", wand names) sit inside a collapsed `<details>` disclosure, so they are hidden from AT until opened. Observation, not scored.
- Keyboard: 38 stops (sidebar, class selector, challenge button, game cards). No traps. Sidebar links focus but activate nothing. See C1.
- Focus: visible. Evidence: `p4-games-focus-1.png`, `p4-games-focus-2.png`, `p4-games-focus-3.png`.
- Escape: same hidden mobile "Menu" trigger as other pages; desktop has no openable menu besides locale (covered on P1). N/A.
- Images: game art `<img alt="">` is not inside a link and currently sits in the collapsed rewards `<details>` with adjacent H3 names. Acceptable, observation only.
- Contrast: body 19.8:1. Sidebar links 2.3:1. See S1.
- Skip link: absent. See M1.
- Console errors: `IntlError: MISSING_MESSAGE ... Sidebar.games`. See M4. No page errors.

### P5 — `/en/unauthorized` (authed student)

- Landmarks: no `<main>`, `<header>`, or `<footer>` (bare shell). See m1.
- Headings: exactly one `<h1>` ("Unauthorized"). Pass.
- Keyboard: one stop ("Back to home"). No traps. Pass.
- Focus: visible (default underline + outline). Evidence: `p5-unauthorized-focus-1.png`.
- Escape: N/A (no menus).
- Images: none. Contrast: 19.8:1. Pass.
- Skip link: absent (trivial page; still noted under M1).
- Console/page errors: none.

## Findings

### Critical (1)

- **C1 — Student sidebar links are dead.** Sidebar items (Read, Games, Assignments, Sentences, Vocabulary, Reports, History) render as `<a href="#">`. Mouse click on Assignments and keyboard Enter on Read both leave the URL unchanged (`/en/student/games`). Affects P3 and P4. Screenshots show lock icons, so gating may be intended, but nothing navigates and AT hears ordinary links.

### Serious (2)

- **S1 — Locked sidebar links fail contrast and expose no disabled state.** Grey-on-white links measure 2.3:1 at 14px (needs 4.5:1). They are not programmatically disabled (`aria-disabled`/disabled), so the disabled-element contrast exemption does not apply. They remain keyboard tab stops that lead nowhere. Affects P3 and P4.
- **S2 — Games catalog has two `<main>` landmarks.** The layout `<main class="flex w-full flex-1 ...">` nests the content `<main class="mx-auto ... max-w-5xl ...">`. Screen-reader landmark navigation becomes ambiguous. Affects P4.

### Moderate (4)

- **M1 — No skip link on any page.** 0/5 pages have one. Landing has 24 tab stops; games catalog has 38. Keyboard users must tab through the full header and sidebar on every load.
- **M2 — Article cards are focusable divs without a role.** On P3, two `div[tabindex="0"]` cards ("QA Game Content A/B") expose no role, so AT does not announce them as interactive or convey purpose.
- **M3 — Dashboard has only one heading.** P3 exposes a single `<h1>`; card titles, "Please choose the Type...", and "Leaderboard" are not headings. Heading navigation is useless on this content-heavy page.
- **M4 — Raw i18n key leaks into navigation.** Missing `Sidebar.games` message renders "SidebarGames"/"Sidebar.Games" as the sidebar label and throws `IntlError` console errors on every student page load (P3, P4).

### Minor (4)

- **m1 — Bare shells lack landmarks.** Sign-in, unauthorized, and 404 pages have no `<main>`, `<header>`, or `<footer>`. Legitimate minimal shells, but a `<main>` costs nothing.
- **m2 — `/en/student` is a 404 with two `<h1>`s** ("404" + "Page not found"). Students who land on the parent route get a double-h1 error page.
- **m3 — Sign-in hero image has generic alt.** `alt="Image"` on the large photo. Mark decorative (`alt=""`) or describe it.
- **m4 — Non-interactive tab stops on sign-in.** The `tablist` container div and the active `tabpanel` div both carry `tabindex="0"`, adding two dead stops to a five-stop page.

## Explicit passes (no finding)

Heading levels never skip on any page. No keyboard traps. Visible focus indicators verified by screenshot on all five pages. Escape closes the locale menu and returns focus. Student/Teacher tabs follow the roving-tabindex arrow-key pattern. Sign-in labels, `aria-describedby`, `role="alert"` errors, and focus-to-invalid-input all work. Decorative SVGs are `aria-hidden` (39/43). Body and primary-button contrast pass everywhere except the sidebar (S1). No page errors on any page; no console errors on P1, P2, P5. The teacher-route → `/en/unauthorized` redirect works.

## Totals

- Critical: 1
- Serious: 2
- Moderate: 4
- Minor: 4
- **Total: 11**
