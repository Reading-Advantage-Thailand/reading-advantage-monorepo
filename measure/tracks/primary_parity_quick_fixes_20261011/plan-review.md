# Plan review — primary_parity_quick_fixes_20261011

## Phase 1: Design

Phase review of `git diff 0048f9620..HEAD`: two files in the track folder (plan.md, captures.md). No code changed.
Plan compliance: all Phase 1 tasks done. Critical and High findings: none.

Medium and Low findings:

- M-1 (Medium). The look check is pending (owner, async). The build phases follow the design in plan.md. A change
  after the owner look check can change FR-8, FR-11, and FR-13 markup.
- L-1 (Low). The `StatusChip` dark tones do not read well on parchment at night. FR-11 uses an ink-on-parchment chip
  with fixed colors. The build phase must not use `StatusChip tone="info"` for the saved chip on the article page.
- L-2 (Low). The captures use harness compositions of the real chrome, with fixture text. They do not use the real
  page data flow. The side-by-side check of the acceptance kit stays the proof for behavior.
- L-3 (Low). The scroll icon (`ART.scroll`) is small in the old-link note (FR-13). The build phase can use a bigger
  size or the `Bubble` component.
- L-4 (Low). New message keys named in the design: `Settings.userProfile.displayName`, `displayNameDescription`,
  `signInUsername`, `signInUsernameDescription`, `codeOnlyError`, and `StudentSignIn.code.oldLink`. Each needs five locales (R-3).
- Shortcut: the grade select lists grades 3 to 12 as the create dialog does, while the contract accepts 1 to 12.
- Lesson: `pnpm` is not needed for a capture harness. `node_modules/.bin/esbuild`, `@tailwindcss/postcss`, and
  `playwright-core` with `/usr/bin/google-chrome` are enough. The Playwright browser cache of this machine is empty.
