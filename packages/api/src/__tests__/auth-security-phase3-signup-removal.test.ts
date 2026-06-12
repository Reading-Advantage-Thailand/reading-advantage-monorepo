/**
 * Phase 3 Red-phase tests for Task 43 of the auth-security-hardening track.
 *
 * Driven by `measure/tracks/auth_security_hardening_20260611/plan.md`
 * Phase 3 Task 43 (FR-16 cleanup):
 *
 *   Task 43: Remove reading-advantage self-signup (FR-16)
 *     [~] Remove apps/reading-advantage/components/user-signup-form.tsx and
 *         the page/route that renders it; replace the signup entry point
 *         with a "contact your teacher" notice
 *     [~] `grep` confirms no remaining `register(` consumers of auth-client
 *         across apps
 *     [~] `pnpm --filter reading-advantage check-types` passes
 *
 * Why this matters
 * ────────────────
 * FR-16 makes registration an admin-only operation gated by a TEACHER/ADMIN
 * session (Task 22 + Task 42). Task 42 already removed the `register` action
 * from the auth-client `AuthActions` interface and provider, so any consumer
 * that still destructures `register` from `useAuth()` produces a TypeScript
 * error at build time. `apps/reading-advantage/components/user-signup-form.tsx`
 * is the last such consumer in the monorepo — its presence:
 *   1. Breaks `pnpm --filter reading-advantage check-types` (the auth-client
 *      context no longer carries `register`).
 *   2. Exposes a user-facing "Create an account" page (`/auth/signup`) that
 *      the FR-16 design says should not exist for self-service — the new
 *      flow is "contact your teacher" so the teacher can use the
 *      TEACHER/ADMIN-gated `handleRegister` endpoint.
 *
 * Per test-strategy.md §3 "FR-6 ↔ FR-16", Task 22 + Task 42 + Task 43 must
 * land in the same commit or contiguous PR window — otherwise the
 * reading-advantage signup path is broken at runtime. Tasks 22 + 42 are
 * already Green; this file is the Red gate for Task 43.
 *
 * Test scope
 * ──────────
 * Pure static-source analysis — no DB, no network, no Next.js render. We
 * assert three facts on disk:
 *   1. `apps/reading-advantage/components/user-signup-form.tsx` is gone.
 *   2. `apps/reading-advantage/app/[locale]/(auth)/auth/signup/page.tsx`
 *      either no longer exists or no longer renders `<UserSignUpForm>`.
 *      The plan says "replace the signup entry point with a 'contact your
 *      teacher' notice", so a `contact your teacher` (case-insensitive)
 *      string is required if the page still exists.
 *   3. No file under `apps/**` (excluding `node_modules`, `.next`, `dist`,
 *      `.opencode`, generated `coverage` dirs, and test files) destructures
 *      a `register` symbol from a `useAuth()` call. This is the
 *      machine-checkable form of the plan's "`grep` confirms no remaining
 *      `register(` consumers of auth-client across apps" sub-task.
 *
 * RED expectations (this commit)
 * ──────────────────────────────
 *   - user-signup-form.tsx still exists → assertion 1 fails.
 *   - signup/page.tsx still imports + renders UserSignUpForm and lacks the
 *     "contact your teacher" notice → assertion 2 fails.
 *   - user-signup-form.tsx still destructures `register` from `useAuth()`
 *     on line 14 → the consumer-scan assertion lists it as the offender.
 *
 * GREEN expectation (Task 43 close)
 * ─────────────────────────────────
 *   - user-signup-form.tsx is deleted.
 *   - signup/page.tsx is either deleted or shows a "contact your teacher"
 *     notice instead of rendering UserSignUpForm.
 *   - The auth-client register consumer scan returns an empty list and
 *     `pnpm --filter reading-advantage check-types` passes as a side
 *     effect (the only type error caused by Task 42's `register` removal
 *     was inside the now-deleted form).
 *
 * Test command (targeted, no DB / no network — same loop the Phase 1
 * route-contract tests use):
 *   cd packages/api && npx vitest run src/__tests__/auth-security-phase3-signup-removal.test.ts
 *
 * build-graph notes (test-strategy.md §6 + a fresh inspect):
 *   - `interface:AuthActions` lives at
 *     `./packages/auth-client/src/context.ts:22–25`. After Task 42 it
 *     contains only `login` and `logout`, so any `register` destructure
 *     produces `TS2339: Property 'register' does not exist on type
 *     AuthContextValue`.
 *   - Component files (.tsx) are not parsed into renders edges in the
 *     current graph, so `UserSignUpForm` returns no nodes; assertion 1
 *     intentionally falls back to a direct `existsSync` check.
 *   - The static `apps/**` scan below substitutes for the missing
 *     cross-package `references` edges (per test-strategy §6: "Treat
 *     caller lists as incomplete — supplement with `rg` before Task 39").
 */
import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// `packages/api/src/__tests__/<file>.test.ts` → up 4 levels → monorepo root
const REPO_ROOT = join(__dirname, "..", "..", "..", "..");
const APPS_DIR = join(REPO_ROOT, "apps");

const USER_SIGNUP_FORM_PATH = join(
  REPO_ROOT,
  "apps",
  "reading-advantage",
  "components",
  "user-signup-form.tsx",
);

const SIGNUP_PAGE_PATH = join(
  REPO_ROOT,
  "apps",
  "reading-advantage",
  "app",
  "[locale]",
  "(auth)",
  "auth",
  "signup",
  "page.tsx",
);

/**
 * Directory names anywhere in the path that should be skipped by the
 * `apps/**` scan — build output, vendor code, IDE caches, coverage
 * reports, and the agent sandbox node_modules under apps/advantage-games
 * (`.opencode`).
 */
const SCAN_SKIP_DIRS: ReadonlySet<string> = new Set([
  "node_modules",
  ".next",
  "dist",
  ".opencode",
  "coverage",
  ".turbo",
  ".cache",
  ".git",
]);

/**
 * Suffixes that mark a file as a test rather than production source —
 * tests are allowed to mention `register` from auth-client in mocks /
 * negative assertions (e.g. the Phase 2 auth-client contract test
 * deliberately checks that `register` is NOT a key of AuthActions).
 */
const TEST_FILE_SUFFIXES = [
  ".test.ts",
  ".test.tsx",
  ".spec.ts",
  ".spec.tsx",
];

const SOURCE_EXTENSIONS = [".ts", ".tsx"];

/**
 * Recursively collects TypeScript source files under `dir`, skipping
 * vendor / build / cache / test directories. Returns absolute paths.
 */
function collectAppSources(dir: string): string[] {
  const out: string[] = [];
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (SCAN_SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      out.push(...collectAppSources(full));
      continue;
    }
    if (!st.isFile()) continue;
    if (TEST_FILE_SUFFIXES.some((s) => entry.endsWith(s))) continue;
    if (!SOURCE_EXTENSIONS.some((s) => entry.endsWith(s))) continue;
    out.push(full);
  }
  return out;
}

/**
 * Matches a destructure of `register` (the auth-client action) from a
 * call to `useAuth()`. The pattern is intentionally narrow:
 *
 *   const { register, isLoading } = useAuth();
 *   const { register } = useAuth();
 *   const { isLoading, register, login } = useAuth();
 *
 * It does NOT match:
 *   - `useForm({ ... })` from react-hook-form (the dominant `register`
 *     consumer in the monorepo — sa-question-card.tsx, laq-question-card.tsx,
 *     lesson-saq.tsx, etc.). Those destructure from `useForm`, not
 *     `useAuth`.
 *   - Locale strings ("register an account") in marketing copy.
 *   - The literal `cash-register` sound effect identifier in games.
 *
 * The `[\s\S]*?` permits whitespace, newlines, and other destructured
 * fields between `{` and `register`.
 */
const AUTH_CLIENT_REGISTER_CONSUMER = /const\s*\{[\s\S]*?\bregister\b[\s\S]*?\}\s*=\s*useAuth\s*\(/;

describe("Phase 3 — Task 43: reading-advantage self-signup form is removed", () => {
  it("apps/reading-advantage/components/user-signup-form.tsx no longer exists", () => {
    expect(
      existsSync(USER_SIGNUP_FORM_PATH),
      "Expected apps/reading-advantage/components/user-signup-form.tsx to " +
        "be deleted. After FR-16 Task 42 removed `register` from the " +
        "auth-client AuthActions interface, this file's " +
        "`const { register, isLoading } = useAuth()` destructure produces " +
        "a TypeScript error and `pnpm --filter reading-advantage " +
        "check-types` fails. FR-16 makes registration an admin operation " +
        "gated by a TEACHER/ADMIN session, so the self-service signup " +
        "form must be removed entirely — see test-strategy.md §3 " +
        "'FR-6 ↔ FR-16'.",
    ).toBe(false);
  });
});

describe("Phase 3 — Task 43: reading-advantage signup page is replaced with a 'contact your teacher' notice", () => {
  it("the signup page either is deleted or no longer renders <UserSignUpForm>", () => {
    if (!existsSync(SIGNUP_PAGE_PATH)) {
      // Page deleted entirely — fully satisfies the plan.
      return;
    }
    const source = readFileSync(SIGNUP_PAGE_PATH, "utf8");
    // The signup page currently does `import { UserSignUpForm } from
    // "@/components/user-signup-form";` then renders `<UserSignUpForm />`.
    // Both must be gone — the import would be a dangling reference to the
    // deleted component, and the JSX would crash at render time.
    expect(
      /UserSignUpForm/.test(source),
      "Expected apps/reading-advantage/app/[locale]/(auth)/auth/signup/page.tsx " +
        "to no longer reference UserSignUpForm. The plan says " +
        '"replace the signup entry point with a \'contact your teacher\' ' +
        'notice" — keeping either the `import { UserSignUpForm } from ' +
        '"@/components/user-signup-form"` line or a `<UserSignUpForm />` ' +
        "JSX node creates a dangling reference to the deleted component " +
        "and breaks `pnpm --filter reading-advantage check-types`.",
    ).toBe(false);
  });

  it("if the signup page still exists, it shows a 'contact your teacher' notice", () => {
    if (!existsSync(SIGNUP_PAGE_PATH)) {
      // Page deleted entirely — no notice to check.
      return;
    }
    const source = readFileSync(SIGNUP_PAGE_PATH, "utf8");
    expect(
      /contact\s+your\s+teacher/i.test(source),
      "Expected apps/reading-advantage/app/[locale]/(auth)/auth/signup/page.tsx " +
        "to contain a 'contact your teacher' notice. FR-16 makes " +
        "registration an admin operation — a student or anonymous user " +
        "landing on /auth/signup needs concrete guidance on how to get an " +
        "account (their teacher uses the TEACHER/ADMIN-gated " +
        "handleRegister endpoint). Either delete the page or render the " +
        "notice; do not leave an empty 'Create an account' shell.",
    ).toBe(true);
  });
});

describe("Phase 3 — Task 43: no apps/** source destructures `register` from useAuth()", () => {
  it("scans apps/** and reports zero auth-client register consumers", () => {
    const sources = collectAppSources(APPS_DIR);
    expect(
      sources.length,
      "Expected the apps/** source scan to find files. If this is zero, " +
        "the test infrastructure is broken (skip filter too aggressive) " +
        "and the green/red signal below cannot be trusted.",
    ).toBeGreaterThan(0);

    const offenders: string[] = [];
    for (const file of sources) {
      let source: string;
      try {
        source = readFileSync(file, "utf8");
      } catch {
        continue;
      }
      // Cheap pre-filter: skip files that mention neither `useAuth` nor
      // `register` at all. The combined regex is anchored by `useAuth(`,
      // so any survivor is a real candidate.
      if (!source.includes("useAuth") || !source.includes("register")) {
        continue;
      }
      if (AUTH_CLIENT_REGISTER_CONSUMER.test(source)) {
        offenders.push(relative(REPO_ROOT, file));
      }
    }

    expect(
      offenders,
      `Expected no apps/** source to destructure \`register\` from ` +
        `useAuth() — after FR-16 / Task 42 the auth-client context no ` +
        `longer exposes a \`register\` action. Each file in the offender ` +
        `list must either drop the destructure (if it never called ` +
        `register) or be deleted as part of Task 43. The plan's ` +
        `sub-task "grep confirms no remaining register( consumers of ` +
        `auth-client across apps" is satisfied iff this list is empty. ` +
        `Offenders: ${offenders.length === 0 ? "(none — green)" : offenders.join(", ")}`,
    ).toEqual([]);
  });
});
