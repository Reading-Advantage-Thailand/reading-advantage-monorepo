/**
 * Phase 1 Red-phase tests for Tasks 4 and 5 of the
 * auth-security-hardening track.
 *
 * Driven by `measure/tracks/auth_security_hardening_20260611/plan.md`
 * Phase 1 Tasks 4 and 5.
 *
 *   Task 4: define a module-level `sha256Hex(s)` helper in
 *           `packages/auth/src/session.ts` using `node:crypto`.
 *   Task 5: stub `revokeAllUserSessions(db, userId)` (throws
 *           `"not implemented"`) AND extend `createSession` to accept
 *           an optional third `opts?: { ipAddress?: string;
 *           userAgent?: string }` argument, exporting the new
 *           function from the package barrel.
 *
 * The test-strategy (`measure/tracks/.../test-strategy.md` §1) calls
 * for "types-as-tests" in Phase 1. The tests below are exactly that:
 *   - sha256Hex is unexported, so we read the source file and assert
 *     on the import + function declaration. A missing import is a
 *     direct trip of Task 4.
 *   - revokeAllUserSessions is a runtime test that imports the
 *     symbol from the package barrel, asserts the function shape,
 *     and confirms the stub throws "not implemented". The stub
 *     also makes Phase 2 reds unambiguous — the test-strategy §1
 *     requires "Stubs must throw 'not implemented' so Phase 2 reds
 *     are unambiguous."
 *   - createSession arity is a pure types-as-test: we read
 *     `createSession.length` and assert it has grown from 2 to 3
 *     to accommodate the new opts arg.
 *
 * RED expectations (2026-06-12):
 *   - session.ts has no `node:crypto` import → 2 source-file assertions fail.
 *   - `revokeAllUserSessions` is not yet exported from the barrel → the
 *     "is exported" + "throws 'not implemented'" + "returns
 *     { revoked: number } shape" assertions all fail.
 *   - `createSession` still has arity 2 → the "accepts an opts third arg"
 *     assertion fails.
 *
 * Test command (targeted, no DB / no network):
 *   cd packages/auth && npx vitest run src/__tests__/auth-security-phase1-session-contracts.test.ts
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as authExports from "../index.js";
import { createSession } from "../session.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// `packages/auth/src/__tests__/<file>.test.ts` → up 3 levels → packages/auth
const PACKAGE_ROOT = join(__dirname, "..", "..");
const SESSION_TS_PATH = join(PACKAGE_ROOT, "src", "session.ts");
const SESSION_TS_SOURCE = readFileSync(SESSION_TS_PATH, "utf8");

// ---------------------------------------------------------------------------
// Task 4 — sha256Hex helper exists in session.ts
// ---------------------------------------------------------------------------

describe("Phase 1 — Task 4: sha256Hex helper is defined in session.ts", () => {
  it("imports createHash from node:crypto", () => {
    expect(
      SESSION_TS_SOURCE,
      "Expected packages/auth/src/session.ts to import `createHash` from " +
        "`node:crypto`. The sha256Hex helper is a 3-line wrapper around " +
        "`createHash('sha256').update(s).digest('hex')` and the import is " +
        "the load-bearing piece.",
    ).toMatch(/from\s+["']node:crypto["']/);
  });

  it("imports createHash by name (not a namespace import)", () => {
    expect(
      SESSION_TS_SOURCE,
      "Expected the crypto import to be a named import of `createHash`. " +
        "A namespace import (`import * as crypto from 'node:crypto'`) " +
        "would be a code-style regression vs. the other auth modules.",
    ).toMatch(/import\s*\{\s*createHash\s*\}\s*from\s+["']node:crypto["']/);
  });

  it("declares a function called sha256Hex that takes a string and returns a string", () => {
    // Match `function sha256Hex(<ident>: <type>): <type>` so the
    // signature is pinned without coupling to whitespace.
    const decl = /function\s+sha256Hex\s*\(\s*\w+\s*:\s*string\s*\)\s*:\s*string/.test(
      SESSION_TS_SOURCE,
    );
    expect(
      decl,
      "Expected packages/auth/src/session.ts to declare " +
        "`function sha256Hex(s: string): string` so Phase 3 can call it " +
        "from createSession / validateSession / deleteSession without " +
        "sprinkling crypto calls across the file.",
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Task 5 — revokeAllUserSessions stub is exported from the package barrel
// ---------------------------------------------------------------------------

describe("Phase 1 — Task 5: revokeAllUserSessions is exported as a stub", () => {
  it("is exported from the @reading-advantage/auth package barrel", () => {
    const fn = (
      authExports as unknown as Record<
        string,
        unknown
      >
    )["revokeAllUserSessions"];

    expect(
      fn,
      "Expected `@reading-advantage/auth` to export `revokeAllUserSessions` " +
        "so route handlers in packages/api can call it without reaching " +
        "into the unexported session module directly.",
    ).toBeTypeOf("function");
  });

  it("the stub signature is (db, userId) => Promise<{ revoked: number }>", () => {
    // Pinning arity guards against accidental param drift: Phase 2
    // must not extend the signature without updating callers in
    // packages/api. The return-shape assertion is a string check on
    // Function.prototype.toString — cheap and good-enough for a stub.
    const fn = (
      authExports as unknown as {
        revokeAllUserSessions?: (...args: unknown[]) => unknown;
      }
    ).revokeAllUserSessions;

    if (typeof fn !== "function") {
      throw new Error(
        "revokeAllUserSessions is not exported — see the previous " +
          "assertion. The arity check is moot until the symbol exists.",
      );
    }

    expect(
      fn.length,
      "revokeAllUserSessions must accept exactly two positional args " +
        "(db, userId) so callers cannot silently start passing options " +
        "that the Green-phase implementer never agreed to support.",
    ).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Task 5 — createSession opts: third arg
// ---------------------------------------------------------------------------

describe("Phase 1 — Task 5: createSession accepts an opts third argument", () => {
  it("createSession has arity 3 (db, userId, opts?)", () => {
    // `function.length` counts parameters up to (and including) the
    // first default, so an optional `opts?` is counted. This is the
    // types-as-test the plan asks for — it pins the contract without
    // coupling to the body of createSession, which Phase 3 will rewrite.
    expect(
      createSession.length,
      "Expected createSession to accept a third `opts?` argument of shape " +
        "`{ ipAddress?: string; userAgent?: string }`. The current " +
        "signature only takes (db, userId).",
    ).toBe(3);
  });

  it("the third parameter is named opts in the source signature", () => {
    // Defensive check: arity alone could be satisfied by a stray
    // third positional param. The plan specifies `opts?` as the
    // name, so pin it.
    const sig = SESSION_TS_SOURCE.match(
      /export\s+async\s+function\s+createSession\s*\([^)]*\)/,
    );
    expect(
      sig?.[0],
      "Expected to find `export async function createSession(...)` in " +
        "session.ts. Did the function get renamed?",
    ).toBeDefined();

    expect(
      sig?.[0],
      "Expected the third parameter of createSession to be named `opts` " +
        "so callers can write `createSession(db, userId, { ipAddress })` " +
        "without surprises.",
    ).toMatch(/opts\?/);
  });
});
