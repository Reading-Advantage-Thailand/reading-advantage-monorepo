/**
 * Phase 4 Red-phase tests for Task 32 of the auth-security-hardening track.
 *
 * Driven by `measure/tracks/auth_security_hardening_20260611/plan.md`
 * Phase 4 Task 32 ("Update packages/auth/README.md"):
 *
 *   Task 32: Update `packages/auth/README.md`
 *     [ ] Add section on session token hashing (raw token in cookie only,
 *         sha256 stored)
 *     [ ] Document `revokeAllUserSessions` and session cap behaviour
 *
 * Why this test is the right shape
 * ────────────────────────────────
 * Phase 4 is the "Generate Docs & Doctor" phase — the documentation IS the
 * deliverable for Task 32, so artifact-level (markdown content) assertions
 * are the only signal available. This matches the precedent set by
 * `packages/auth/src/__tests__/phase-1-docs.test.ts` (audit retention
 * documentation from the audit_log_retention_dsar_20260605 track), which
 * pins the README's mention of `AUDIT_RETENTION_DAYS`, the 2557-day default,
 * the 365-day floor, and the canonical exports.
 *
 * Per test-strategy.md §5 ("Per-Phase Test Approach Notes — Phase 4"):
 *   "type-check + build are the integration gate. No new E2E. Manual smoke:
 *    login → reset-password → confirm old cookie 401s."
 *
 * The live-behaviour proofs that pair with these doc assertions already
 * exist and are green at HEAD (Phase 3 implementation, commit `ca0bc60e`):
 *   - **FR-1 token hashing** — `packages/auth/src/__tests__/session.test.ts`
 *     "Phase 2 — Task 9: FR-1 session token hashing" suite asserts
 *     createSession writes `tokenHash = sha256(token)`, validateSession
 *     looks up by sha256(rawToken), and deleteSession deletes by
 *     sha256(rawToken).
 *   - **FR-7a `revokeAllUserSessions`** — `packages/auth/src/__tests__/
 *     session.test.ts` "Phase 2 — Task 13: FR-7a revokeAllUserSessions"
 *     suite asserts the function deletes all rows for a userId and returns
 *     `{ revoked: <count> }`, and subsequent `validateSession` calls
 *     return null.
 *   - **FR-10 session cap** — `packages/auth/src/__tests__/session.test.ts`
 *     "Phase 2 — Task 10" suite asserts the 10-session cap and oldest-row
 *     eviction.
 *
 * The combination — live behaviour test (Phase 2/3, green) + artifact
 * content test (this file, red at HEAD) — satisfies the test-strategy rule
 * that "Artifact or markdown assertions are allowed only when the phase
 * deliverable is that artifact, and they must be paired with a live-
 * behavior proof".
 *
 * Test scope
 * ──────────
 * Pure static-file analysis — no DB, no network, no Next.js render. We
 * read `packages/auth/README.md` at test time and assert that the
 * following Task 32 deliverables appear in the prose:
 *   1. Session-token hashing is documented:
 *      - the README names `sha256` (or `SHA-256`) as the hashing algorithm
 *      - the README names a `tokenHash` column / field
 *      - the README explains that the **cookie** carries the raw token
 *        while the **database** stores only the hash
 *   2. `revokeAllUserSessions` is documented by name
 *   3. The 10-session cap is documented (the literal `10` plus a hint that
 *      this is a cap / limit / max so operators know what the policy is)
 *
 * RED expectations (2026-06-12)
 * ─────────────────────────────
 *   - `packages/auth/README.md` currently only documents the audit
 *     retention policy (see commit `cd8a89a3` of the audit retention
 *     track) — it has zero mention of session token hashing,
 *     `revokeAllUserSessions`, or the session cap. All four assertions
 *     fail with concrete "Expected README.md to mention X" messages.
 *
 * GREEN expectation (Task 32 close)
 * ─────────────────────────────────
 *   - The README grows a "## Session Management" section (or equivalent)
 *     that documents:
 *       * Token hashing: raw token returned to the caller (set as cookie);
 *         sha256 hex digest stored in the `tokenHash` column.
 *       * `revokeAllUserSessions(db, userId)` — exported for admin password
 *         reset (FR-7a / FR-7b) and DSAR account closure flows.
 *       * Session cap: 10 active sessions per user; oldest row evicted by
 *         `createdAt` when the cap is reached.
 *
 * Test command (targeted, no DB / no network — single file):
 *   cd packages/auth && CI=true node_modules/.bin/vitest run \
 *     src/__tests__/auth-security-phase4-readme.test.ts
 *
 * build-graph notes
 * ─────────────────
 *   - `build-graph search ./graph.db README` returns no results — README
 *     files are not parsed into nodes by the TypeScript scanner, so the
 *     graph cannot directly verify doc coverage. This file is the
 *     machine-readable substitute.
 *   - `build-graph inspect ./graph.db revokeAllUserSessions` confirms the
 *     export lives at `./packages/auth/src/session.ts:171–176` and is
 *     reachable from no caller in the graph (cross-package `calls` edges
 *     are not resolved). The README is the only discoverability surface
 *     for this export, hence the assertion that it must be named.
 *   - `build-graph files ./graph.db packages/auth/src/session.ts` confirms
 *     5 exported functions including `createSession`, `validateSession`,
 *     `deleteSession`, `revokeAllUserSessions`, and `sha256Hex`. The
 *     README must surface the hashing model so a reader knows the
 *     raw-token-in-cookie / hash-in-db invariant.
 */
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// `packages/auth/src/__tests__/<file>.test.ts` → up 4 levels → workspace root.
const ROOT = join(__dirname, "..", "..", "..", "..");
const AUTH_README_PATH = join(ROOT, "packages", "auth", "README.md");

// Read once — markdown is a static artifact, not a stateful resource.
const readmeExists = existsSync(AUTH_README_PATH);
const readmeSource = readmeExists ? readFileSync(AUTH_README_PATH, "utf8") : "";

// ---------------------------------------------------------------------------
// Task 32 — session token hashing documentation
// ---------------------------------------------------------------------------

describe("Phase 4 — Task 32: README documents session token hashing (FR-1)", () => {
  it("README.md exists at packages/auth/README.md", () => {
    expect(
      readmeExists,
      "Expected packages/auth/README.md to exist — Task 32 cannot " +
        "document the session security model if the README is missing. " +
        "The retention-policy track already created this file; Task 32 " +
        "extends it.",
    ).toBe(true);
  });

  it("README names sha256 (or SHA-256) as the session token hashing algorithm", () => {
    // The hashing algorithm is operationally significant — a future
    // engineer planning a password-rotation policy or a security
    // audit needs to know the hash function by name. A vague
    // mention of "hashed" is not enough.
    expect(
      /\bsha[- ]?256\b/i.test(readmeSource),
      "Expected packages/auth/README.md to name `sha256` (or `SHA-256`) " +
        "as the algorithm used to hash session tokens. FR-1 introduced " +
        "the `tokenHash` column (`packages/db/drizzle/0019_session_token_" +
        "hash.sql`) and the `sha256Hex` helper in `session.ts` — the " +
        "doc must surface the algorithm by name so operators auditing " +
        "the session model can validate it without reading the code.",
    ).toBe(true);
  });

  it("README names the tokenHash column / field", () => {
    // The column name is what an operator will see when querying
    // `sessions` directly (e.g. during forensics or a DSAR pull) —
    // the README must name it so the operator does not have to grep
    // the migration SQL.
    expect(
      /\btokenHash\b|\btoken_hash\b/.test(readmeSource),
      "Expected packages/auth/README.md to reference the `tokenHash` " +
        "(camelCase) or `token_hash` (snake_case) column where the " +
        "sha256 digest of the session token is stored. FR-1 added this " +
        "column in migration `0019_session_token_hash.sql`; the README " +
        "must name it so an operator inspecting the `sessions` table " +
        "knows which column carries the hash.",
    ).toBe(true);
  });

  it("README explains the raw-token-in-cookie / hash-in-database invariant", () => {
    // The single most important contract of FR-1 is that the raw token
    // is NEVER stored — only the hash is. If the database is dumped, the
    // tokens cannot be replayed. The README must explain this invariant
    // so an operator who is asked "is a sessions table dump a session
    // hijack vector?" can answer "no" with citation.
    const cookieSignals = [/cookie/i];
    const rawSignals = [/\braw\b/i, /\bplaintext\b/i, /\bcleartext\b/i];
    const dbSignals = [/\bdatabase\b/i, /\bdb\b/i, /\bsessions\s+table\b/i];
    const hashSignals = [/\bhash(ed|es)?\b/i, /\bsha[- ]?256\b/i, /\bdigest\b/i];

    const hasCookie = cookieSignals.some((re) => re.test(readmeSource));
    const hasRaw = rawSignals.some((re) => re.test(readmeSource));
    const hasDb = dbSignals.some((re) => re.test(readmeSource));
    const hasHash = hashSignals.some((re) => re.test(readmeSource));

    expect(
      hasCookie && hasRaw && hasDb && hasHash,
      "Expected packages/auth/README.md to document the FR-1 invariant: " +
        "the **raw** token is returned to the caller (set as a **cookie**), " +
        "while the **database** stores only the **hash**. The README must " +
        "contain all four signal categories so a reader cannot misread the " +
        "model. Missing signals — " +
        `cookie: ${hasCookie}, raw/plaintext/cleartext: ${hasRaw}, ` +
        `database/db/sessions-table: ${hasDb}, hash/sha256/digest: ${hasHash}.`,
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Task 32 — revokeAllUserSessions documentation
// ---------------------------------------------------------------------------

describe("Phase 4 — Task 32: README documents revokeAllUserSessions (FR-7a)", () => {
  it("README names the revokeAllUserSessions export", () => {
    // `revokeAllUserSessions` is the FR-7a primitive that backs the
    // FR-7b admin password-reset flow (TEACHER/ADMIN forces a target
    // user's sessions to expire after a password change). It is also
    // the building block for any future DSAR account-closure flow.
    // The README must name it by export-name so a consumer can grep
    // their imports and find the right symbol.
    expect(
      /revokeAllUserSessions/.test(readmeSource),
      "Expected packages/auth/README.md to reference `revokeAllUserSessions` " +
        "by name. FR-7a added this export at `packages/auth/src/session.ts` " +
        "as the primitive that backs admin password-reset (FR-7b) — " +
        "without a doc mention, a consumer needs to read the source to " +
        "discover it. The phase-1-docs.test.ts precedent for the audit " +
        "retention track requires the same export-naming discipline.",
    ).toBe(true);
  });

  it("README explains when revokeAllUserSessions is invoked (admin password reset / DSAR)", () => {
    // Naming the export is necessary but not sufficient — the README
    // must also tell the reader **why** it exists, so they know when
    // to call it. The FR-7a/FR-7b pairing is the canonical use case
    // (admin resets a target user's password; the reset handler calls
    // this primitive to expire stale cookies). DSAR account closure is
    // the secondary use case.
    const useCaseSignals = [
      /password\s+reset/i,
      /reset\s+password/i,
      /admin\s+reset/i,
      /\bDSAR\b/i,
      /account\s+closure/i,
      /\brevoke\b/i,
    ];
    expect(
      useCaseSignals.some((re) => re.test(readmeSource)),
      "Expected packages/auth/README.md to explain when " +
        "`revokeAllUserSessions` should be invoked — at minimum one of " +
        "the canonical use cases (admin password reset, DSAR account " +
        "closure, or session revocation). Without the use-case " +
        "context, a reader knows the symbol exists but not when to " +
        "call it. The FR-7b handler in `packages/api/src/routes/auth/" +
        "reset-password.ts` is the canonical caller.",
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Task 32 — session cap (FR-10) documentation
// ---------------------------------------------------------------------------

describe("Phase 4 — Task 32: README documents the 10-session cap (FR-10)", () => {
  it("README mentions the numeric session cap of 10 in a session-policy context", () => {
    // The cap of 10 is the policy a help-desk operator must explain to
    // a user who hits "you've been logged out of an older session".
    // The README must name the number so the operator can cite it
    // without grepping the source.
    //
    // We require `10` to co-occur with a session-keyword in the SAME
    // line — a bare `\b10\b` would pass accidentally on unrelated
    // copy (the existing retention section says "Extend to 10 years"
    // for AUDIT_RETENTION_DAYS, which has nothing to do with the
    // session cap). Co-occurrence keeps the Red signal honest.
    const sessionLineWith10 = readmeSource
      .split("\n")
      .some((line) => /\b10\b/.test(line) && /session/i.test(line));
    expect(
      sessionLineWith10,
      "Expected packages/auth/README.md to mention the literal `10` on " +
        "a line that also mentions `session` (case-insensitive) — the " +
        "per-user active-session cap from FR-10 enforced in `createSession`. " +
        "A bare `10` elsewhere in the file (e.g. `Extend to 10 years` " +
        "in the retention section) does not satisfy this test. Without " +
        "the number in a session-policy sentence, an operator answering " +
        "a 'why was I logged out' help-desk ticket must read the source.",
    ).toBe(true);
  });

  it("README frames 10 as a cap / limit / maximum (not a magic number)", () => {
    // The number on its own is ambiguous (`10` could be a retry count,
    // a max page size, etc.). The doc must use a word that frames it
    // as a session-count policy so a casual reader does not misread
    // the table.
    const policySignals = [
      /\bcap\b/i,
      /\blimit\b/i,
      /\bmax(imum)?\b/i,
      /\bcap(ped|s|ping)\b/i,
      /\bactive\s+sessions?\b/i,
    ];
    expect(
      policySignals.some((re) => re.test(readmeSource)),
      "Expected packages/auth/README.md to frame the 10-session number " +
        "as a `cap`, `limit`, `max`, or `active sessions` policy. A bare " +
        "`10` in a sentence reads as a magic number; readers need the " +
        "policy framing to know it is enforced by the implementation.",
    ).toBe(true);
  });

  it("README mentions eviction of the oldest session when the cap is reached", () => {
    // The eviction rule is the second half of the cap policy — without
    // it, a reader does not know what happens when a user's 11th login
    // hits an account at the cap. The README must say "oldest is
    // evicted" so the behaviour is predictable.
    const evictionSignals = [
      /\bevict(ed|ion|s)?\b/i,
      /\boldest\b/i,
      /\boldest\s+session\b/i,
      /\bdelete[sd]?\s+the\s+oldest\b/i,
      /\brolling\s+window\b/i,
    ];
    expect(
      evictionSignals.some((re) => re.test(readmeSource)),
      "Expected packages/auth/README.md to explain that the oldest " +
        "session is evicted when the 10-session cap is reached. " +
        "`createSession` deletes the row with the smallest `createdAt` " +
        "for that userId; the doc must surface this rule so a reader " +
        "can predict the behaviour without reading the source.",
    ).toBe(true);
  });
});
