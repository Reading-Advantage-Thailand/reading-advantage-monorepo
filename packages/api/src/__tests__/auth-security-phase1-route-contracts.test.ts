/**
 * Phase 1 Red-phase tests for Tasks 6, 7, 8, and 33 of the
 * auth-security-hardening track.
 *
 * Driven by `measure/tracks/auth_security_hardening_20260611/plan.md`
 * Phase 1 Tasks 6, 7, 8, and 33.
 *
 *   Task 6:  create `packages/api/src/routes/auth/reset-password.ts`
 *            exporting `resetPasswordSchema` and a stub
 *            `handleResetPassword` that returns 501 Not Implemented.
 *   Task 7:  re-export `handleResetPassword` from
 *            `packages/api/src/routes/auth/index.ts` so the consumer
 *            apps can import the route handler from the shared barrel.
 *   Task 8:  add a module-level `DUMMY_HASH` constant to
 *            `packages/api/src/routes/auth/login.ts`. It is a
 *            pre-computed Argon2id hash of a fixed string so FR-4 can
 *            make the unknown-username branch pay the same Argon2id
 *            cost as the wrong-password branch.
 *   Task 33: extract the user-enrichment query from
 *            `packages/api/src/routes/auth/session.ts` into a new
 *            module `packages/api/src/routes/auth/enrich.ts` that
 *            exports `enrichAuthUser(db, user)`.
 *
 * The test-strategy (`measure/tracks/.../test-strategy.md` §1) calls
 * for "types-as-tests" in Phase 1, with the additional requirement
 * that "Stubs must throw 'not implemented' so Phase 2 reds are
 * unambiguous." For the route handlers this means returning 501; for
 * `enrichAuthUser` it means rejecting with `Error("not implemented")`
 * (the body is added in Phase 3 — Task 39).
 *
 * RED expectations (2026-06-12):
 *   - `reset-password.ts` does not exist → the `existsSync` guard in
 *     `loadResetPasswordModule` throws a "scaffold missing" contract
 *     violation (not the original `import.meta.glob` "test-
 *     infrastructure bug" message).
 *   - `handleResetPassword` is not yet in the auth barrel → the
 *     static regex assertion on the barrel source fails.
 *   - `DUMMY_HASH` is not yet exported from login.ts → the import
 *     resolves to `undefined` and the runtime check fails.
 *   - `enrich.ts` does not exist → the `existsSync` guard in
 *     `loadEnrichModule` throws a "scaffold missing" contract
 *     violation.
 *
 * Test command (targeted, no DB / no network):
 *   cd packages/api && npx vitest run src/__tests__/auth-security-phase1-route-contracts.test.ts
 */
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// `packages/api/src/__tests__/<file>.test.ts` → up 3 levels → packages/api
const PACKAGE_ROOT = join(__dirname, "..", "..");
const ROUTES_AUTH_DIR = join(PACKAGE_ROOT, "src", "routes", "auth");
const RESET_PASSWORD_PATH = join(ROUTES_AUTH_DIR, "reset-password.ts");
const LOGIN_TS_PATH = join(ROUTES_AUTH_DIR, "login.ts");
const ENRICH_PATH = join(ROUTES_AUTH_DIR, "enrich.ts");
const AUTH_BARREL_PATH = join(ROUTES_AUTH_DIR, "index.ts");

interface RouteHandlerModule {
  handleResetPassword?: (...args: unknown[]) => Promise<Response>;
  resetPasswordSchema?: { safeParse: (input: unknown) => { success: boolean } };
  enrichAuthUser?: (...args: unknown[]) => Promise<unknown>;
}

// `import.meta.glob` with an explicit path array (the original pattern)
// is evaluated against the filesystem at module-load time: if the
// target file is absent in the Red state, the glob result is `{}` and
// a lookup throws "test-infrastructure bug" instead of a clean contract
// violation. Switch to a direct `existsSync` + dynamic-import pattern
// so the missing-file case surfaces as the contract message Phase 3
// readers will recognise.
async function loadResetPasswordModule(): Promise<RouteHandlerModule> {
  if (!existsSync(RESET_PASSWORD_PATH)) {
    throw new Error(
      "Expected packages/api/src/routes/auth/reset-password.ts to exist — " +
        "Task 6 requires the scaffold (resetPasswordSchema + " +
        "handleResetPassword stub returning 501) by Phase 1 close.",
    );
  }
  return (await import("../routes/auth/reset-password.js")) as RouteHandlerModule;
}

async function loadEnrichModule(): Promise<RouteHandlerModule> {
  if (!existsSync(ENRICH_PATH)) {
    throw new Error(
      "Expected packages/api/src/routes/auth/enrich.ts to exist — " +
        "Task 33 requires the enrichAuthUser stub (rejecting with " +
        "Error('not implemented')) by Phase 1 close.",
    );
  }
  return (await import("../routes/auth/enrich.js")) as RouteHandlerModule;
}

// ---------------------------------------------------------------------------
// Task 6 — reset-password route handler scaffold
// ---------------------------------------------------------------------------

describe("Phase 1 — Task 6: packages/api/src/routes/auth/reset-password.ts exists", () => {
  it("the route file exists on disk", () => {
    expect(
      existsSync(RESET_PASSWORD_PATH),
      "Expected packages/api/src/routes/auth/reset-password.ts to exist — " +
        "Task 6 requires the scaffold before the auth barrel can safely " +
        "re-export handleResetPassword.",
    ).toBe(true);
  });

  it("exports a Zod schema named resetPasswordSchema", async () => {
    const mod = await loadResetPasswordModule();
    const schema = mod.resetPasswordSchema;
    expect(
      schema,
      "Expected reset-password.ts to export `resetPasswordSchema` (a Zod " +
        "object) so the route handler can `safeParse` the request body " +
        "with the same shape every other auth route uses.",
    ).toBeDefined();
    expect(
      schema?.safeParse,
      "resetPasswordSchema must expose `safeParse` (the Zod contract).",
    ).toBeTypeOf("function");
  });

  it("the Zod schema accepts { userId, newPassword } and rejects missing fields", async () => {
    const mod = await loadResetPasswordModule();
    const schema = mod.resetPasswordSchema;
    if (!schema) {
      throw new Error(
        "resetPasswordSchema is missing — see the previous assertion.",
      );
    }

    const valid = schema.safeParse({
      userId: "u1",
      newPassword: "Password123!",
    });
    expect(
      valid.success,
      "resetPasswordSchema must accept a body of { userId, newPassword } " +
        "with newPassword ≥ 8 chars (per the plan).",
    ).toBe(true);

    const missingUserId = schema.safeParse({ newPassword: "Password123!" });
    expect(
      missingUserId.success,
      "resetPasswordSchema must reject a body with no `userId` — the " +
        "FR-7b authorization matrix hinges on the target user being " +
        "identified up front.",
    ).toBe(false);

    const shortPassword = schema.safeParse({ userId: "u1", newPassword: "x" });
    expect(
      shortPassword.success,
      "resetPasswordSchema must reject newPasswords shorter than 8 chars " +
        "so the handler never persists a trivially-crackable credential.",
    ).toBe(false);
  });

  it("exports a handleResetPassword function", async () => {
    const mod = await loadResetPasswordModule();
    const handler = mod.handleResetPassword;
    expect(
      handler,
      "Expected reset-password.ts to export `handleResetPassword` — the " +
        "route handler Task 24 will implement in Phase 3.",
    ).toBeTypeOf("function");
  });

  it("the stub handleResetPassword responds with 501 Not Implemented", async () => {
    const mod = await loadResetPasswordModule();
    const handler = mod.handleResetPassword;
    if (typeof handler !== "function") {
      throw new Error(
        "handleResetPassword is missing — see the previous assertion.",
      );
    }

    // The handler signature for Phase 1 is `(request) => Promise<Response>`.
    // We pass `undefined` to assert the 501 path doesn't read the body —
    // if a future Green-phase implementer adds body parsing before the
    // guard, this test stays informative.
    const response = (await handler(undefined)) as Response;
    expect(
      response.status,
      "Phase 1 stub must respond with 501 Not Implemented so the route " +
        "is wired up but every caller sees a clear 'not yet implemented' " +
        "until Phase 3 Task 24 lands.",
    ).toBe(501);
  });
});

// ---------------------------------------------------------------------------
// Task 7 — handleResetPassword is re-exported from the auth barrel
// ---------------------------------------------------------------------------

describe("Phase 1 — Task 7: handleResetPassword is exported from the auth barrel", () => {
  it("the auth barrel re-exports handleResetPassword", async () => {
    const barrel = readFileSync(AUTH_BARREL_PATH, "utf8");
    expect(
      barrel,
      "Expected packages/api/src/routes/auth/index.ts to re-export " +
        "`handleResetPassword` so the consumer apps can import the route " +
        "handler from `@reading-advantage/api/routes/auth`.",
    ).toMatch(/export\s*\{[^}]*handleResetPassword[^}]*\}/);
  });

  it("the re-exported symbol resolves to a function at runtime", async () => {
    // The barrel re-export chain (login → db client, session → db
    // client) is heavy and hangs in test environments without a real
    // Postgres. Skip the runtime check when the underlying module
    // doesn't exist yet (Red state) — the static regex check above
    // already pins the barrel contract, and the runtime check is
    // belt-and-suspenders for the Green state.
    if (!existsSync(RESET_PASSWORD_PATH)) {
      throw new Error(
        "Expected packages/api/src/routes/auth/reset-password.ts to exist " +
          "so the auth barrel can re-export handleResetPassword — Task 6 " +
          "is the contract owner, Task 7 is the barrel wiring. " +
          "Skipping the runtime check would let a re-export regression " +
          "slip past the static regex assertion above.",
      );
    }
    const barrel = (await import("../routes/auth/index.js")) as {
      handleResetPassword?: (...args: unknown[]) => Promise<Response>;
    };
    expect(
      barrel.handleResetPassword,
      "Expected the auth barrel's `handleResetPassword` re-export to " +
        "resolve to a function at runtime — a missing or non-function " +
        "value would break the route mount in the consumer apps.",
    ).toBeTypeOf("function");
  });
});

// ---------------------------------------------------------------------------
// Task 8 — DUMMY_HASH constant on login.ts
// ---------------------------------------------------------------------------

describe("Phase 1 — Task 8: login.ts exports a DUMMY_HASH constant", () => {
  it("login.ts declares a module-level DUMMY_HASH constant", () => {
    const source = readFileSync(LOGIN_TS_PATH, "utf8");
    // Match either `const DUMMY_HASH = ...` or `export const DUMMY_HASH = ...`.
    // The plan does not require the constant to be exported from the
    // module — it is module-internal — but the declaration must be
    // present at the top level so every login code path can refer to it.
    const decl = /(?:export\s+)?const\s+DUMMY_HASH\s*=\s*["'`]/;
    expect(
      decl.test(source),
      "Expected packages/api/src/routes/auth/login.ts to declare a " +
        "module-level `DUMMY_HASH` constant — Phase 1 stubs it as a " +
        "string literal of a pre-computed Argon2id hash. FR-4 uses it " +
        "to equalize the unknown-username / wrong-password cost.",
    ).toBe(true);
  });

  it("DUMMY_HASH is a non-empty string at runtime", async () => {
    // The login module is the source of truth; we re-import it after
    // the import.meta.glob loaders above so the side-effect of
    // reading `db` doesn't blow up the test (the module imports
    // `@reading-advantage/db` at the top level).
    const login = (await import("../routes/auth/login.js")) as {
      DUMMY_HASH?: unknown;
    };
    expect(
      login.DUMMY_HASH,
      "Expected login.ts to export a `DUMMY_HASH` constant so FR-4 can " +
        "`await verifyPassword(password, DUMMY_HASH)` in the unknown-" +
        "username branch.",
    ).toBeDefined();
    expect(
      typeof login.DUMMY_HASH,
      "DUMMY_HASH must be a string — verifyPassword expects a hash, not a " +
        "buffer or a function.",
    ).toBe("string");
    expect(
      (login.DUMMY_HASH as string).length,
      "DUMMY_HASH must be non-empty (Argon2id hashes are ≥ 20 chars).",
    ).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Task 33 — enrichAuthUser helper
// ---------------------------------------------------------------------------

describe("Phase 1 — Task 33: enrichAuthUser is exported from enrich.ts", () => {
  it("packages/api/src/routes/auth/enrich.ts exists on disk", () => {
    expect(
      existsSync(ENRICH_PATH),
      "Expected packages/api/src/routes/auth/enrich.ts to exist — Task 33 " +
        "requires the enrichAuthUser scaffold before the auth barrel can " +
        "safely re-export it.",
    ).toBe(true);
  });

  it("enrich.ts exports a function called enrichAuthUser", async () => {
    const mod = await loadEnrichModule();
    const fn = mod.enrichAuthUser;
    expect(
      fn,
      "Expected packages/api/src/routes/auth/enrich.ts to export " +
        "`enrichAuthUser` — Task 33 extracts the enrichment query " +
        "(xp, level, cefrLevel, email, image, schoolId) from session.ts.",
    ).toBeTypeOf("function");
  });

  it("the stub enrichAuthUser rejects with Error('not implemented')", async () => {
    const mod = await loadEnrichModule();
    const fn = mod.enrichAuthUser;
    if (typeof fn !== "function") {
      throw new Error(
        "enrichAuthUser is missing — see the previous assertion.",
      );
    }

    // The signature is `(db, user)` per the plan. Pass placeholders —
    // the stub never reads them.
    await expect(
      fn({}, { id: "u1" }),
      "Phase 1 requires the enrichAuthUser stub to reject with " +
        "`Error('not implemented')` (test-strategy §1) so Phase 2 reds " +
        "are unambiguous.",
    ).rejects.toThrow(/not implemented/);
  });
});
