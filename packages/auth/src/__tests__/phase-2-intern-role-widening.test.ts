// Red-phase Phase 2 INTERN Role Widening pinning tests.
//
// Per `measure/tracks/ci_typecheck_alignment_20260603/plan.md` Phase 2
// ("Fix `lib/auth/session.ts:40,79` INTERN Role Widening") and
// `test-strategy.md` §1 P2 + §6:
//
//   1. Find the central `UserRole` type → `packages/auth/src/roles.ts`.
//      Verified via build-graph (`build-graph deps roles.ts --downstream
//      --from-package=auth`): roles.ts contains `Role` (type_alias),
//      `ROLE_HIERARCHY` + `ROLE_ROUTES` (schemas), and `roleAtLeast`
//      (function). The `Role` type is the canonical UserRole source;
//      `lib/enums.ts` is a separate per-app legacy enum (out of scope).
//
//   2. Add `'INTERN'` to the type union → the `Role` union is derived
//      from `ROLES` via `(typeof ROLES)[keyof typeof ROLES]`, so
//      adding `INTERN: "INTERN"` to the `ROLES` constant widens the
//      union without an explicit string-literal edit. Pinned at both
//      runtime (value assertions on `ROLES.INTERN`,
//      `ROLE_HIERARCHY.INTERN`, `ROLE_ROUTES.INTERN`) and compile time
//      (assignments `const x: Role = "INTERN"` and
//      `const y: Role = ROLES.INTERN`).
//
//   3. Update any consumer types that use `UserRole` → consumer
//      re-exports route through the canonical source so they inherit
//      the widening automatically:
//        - `apps/science-advantage/lib/auth/types.ts`:
//          `export type { Session, Role as UserRole } from
//          '@reading-advantage/auth';`
//        - `apps/science-advantage/lib/auth/constants.ts`:
//          `export { ROLE_HIERARCHY, ROLE_ROUTES } from
//          '@reading-advantage/auth';` + `Role as UserRole`.
//      Pinned by reading the file contents and asserting the
//      re-export shape + a type-level `const x: Role = "INTERN"`
//      assignment that exercises the consumer-side alias.
//
//   4. Run `pnpm turbo run check-types --filter=science-advantage`;
//      expect 2 errors gone → the check-types gate is exercised by
//      `apps/science-advantage/lib/ci-gates/ci-gates.test.ts` test #1
//      (Phase 0 baseline gate, see that file's test name "Phase 0
//      ci-gates"). The `@reading-advantage/auth` package check-types
//      exit-0 invariant is pinned in this file (the `check-types`
//      script is verified to be defined, and the file passes
//      `tsc --noEmit` at the time of this writing).
//
// Permission cross-cut (track `codecamp` flow): `permissions.ts` lists
// `codecamp:read`, `codecamp:submit`, and `codecamp:chat` as the three
// permissions that explicitly allow `ROLES.INTERN`. Pinned by source-
// content assertions so a refactor that drops INTERN from any of
// those three lists trips the test.
//
// DB cross-cut: `packages/db/src/schema/users.ts` declares the
// `role` pgEnum as `["INTERN", "STUDENT", "TEACHER", "ADMIN",
// "SYSTEM"]`. Pinned so a Drizzle migration that drops INTERN from
// the enum trips the test before runtime errors hit.
//
// RED expectations (2026-06-06):
//   - All assertions in this file pass because the canonical
//     widening has already landed in `packages/auth/src/roles.ts`
//     and the consumer re-exports route through that source. The
//     file documents the contract; a refactor that re-narrows the
//     union (e.g. drops `INTERN` from `ROLES`, or splits the
//     `Role` type away from `(typeof ROLES)[keyof typeof ROLES]`)
//     trips these tests instead of silently breaking the codecamp
//     intern flow.
//
// Run with:
//   cd packages/auth && npx vitest run src/__tests__/phase-2-intern-role-widening.test.ts
//   (no DB; no pnpm; no global vitest setup; runs in <1s)
//
// The test lives at `packages/auth/src/__tests__/` to match the
// established Phase-pin pattern (`phase-1-docs.test.ts`,
// `phase-6-quality-gates.test.ts`, `phase-7-closeout.test.ts`).
// Vitest auto-discovers the file via the package's default test
// pattern (`**/*.test.ts`); no config change required.

import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  ROLES,
  ROLE_HIERARCHY,
  ROLE_ROUTES,
  roleAtLeast,
  type Role,
} from "../roles.js";
import type { Role as AuthPackageRole } from "@reading-advantage/auth";

const REPO_ROOT = resolve(__dirname, "../../../..//");

const ROLES_PATH = resolve(REPO_ROOT, "packages/auth/src/roles.ts");
const PERMISSIONS_PATH = resolve(
  REPO_ROOT,
  "packages/auth/src/permissions.ts",
);
const USERS_SCHEMA_PATH = resolve(
  REPO_ROOT,
  "packages/db/src/schema/users.ts",
);
const SA_TYPES_PATH = resolve(
  REPO_ROOT,
  "apps/science-advantage/lib/auth/types.ts",
);
const SA_CONSTANTS_PATH = resolve(
  REPO_ROOT,
  "apps/science-advantage/lib/auth/constants.ts",
);
const SA_INDEX_PATH = resolve(
  REPO_ROOT,
  "apps/science-advantage/lib/auth/index.ts",
);
const SA_SERVER_PATH = resolve(
  REPO_ROOT,
  "apps/science-advantage/lib/auth/server.ts",
);
const AUTH_INDEX_PATH = resolve(REPO_ROOT, "packages/auth/src/index.ts");
const AUTH_PACKAGE_JSON = resolve(REPO_ROOT, "packages/auth/package.json");

// ---------------------------------------------------------------------------
// Task 1 — Find the central `UserRole` type
// ---------------------------------------------------------------------------

describe("Phase 2 — Task 1: central UserRole type lives in packages/auth/src/roles.ts", () => {
  it("roles.ts exists at the canonical path", () => {
    expect(
      existsSync(ROLES_PATH),
      "Expected packages/auth/src/roles.ts to exist — it is the " +
        "canonical source for the `Role` union that the consumer " +
        "ecosystem re-exports as `UserRole`.",
    ).toBe(true);
  });

  it("roles.ts derives the `Role` union from `ROLES` (not from a hard-coded string-literal union)", () => {
    // The `Role` union MUST be derived from the `ROLES` constant so
    // adding a new entry to `ROLES` widens the union automatically.
    // A hard-coded union like `type Role = "STUDENT" | "TEACHER" |
    // ...` would force a 2-place edit on every widening and is the
    // failure mode the plan's Task 2 is trying to prevent.
    const source = readFileSync(ROLES_PATH, "utf-8");
    expect(
      source,
      "roles.ts must derive the `Role` union from `ROLES` so adding " +
        "`INTERN` to the constant widens the union transitively.",
    ).toMatch(
      /export\s+type\s+Role\s*=\s*\(typeof\s+ROLES\)\[keyof\s+typeof\s+ROLES\]/,
    );
  });

  it("the `Role` type is re-exported from the package barrel (index.ts)", () => {
    expect(
      existsSync(AUTH_INDEX_PATH),
      "packages/auth/src/index.ts must exist for the Role export to be reachable.",
    ).toBe(true);
    const source = readFileSync(AUTH_INDEX_PATH, "utf-8");
    expect(
      source,
      "packages/auth/src/index.ts must re-export `type Role` so " +
        "consumers can `import type { Role } from '@reading-advantage/auth'`.",
    ).toMatch(/type\s+Role/);
  });

  it("@reading-advantage/auth exposes the check-types script that the gate runs", () => {
    // The Phase 2 plan task #4 says "Run `pnpm turbo run check-types`
    // — expect 2 errors gone". For that gate to be meaningful the
    // auth package must expose the `check-types` script; otherwise
    // turbo silently skips the package.
    expect(
      existsSync(AUTH_PACKAGE_JSON),
      "packages/auth/package.json must exist for the check-types script to be pinned.",
    ).toBe(true);
    const pkg = JSON.parse(readFileSync(AUTH_PACKAGE_JSON, "utf-8")) as {
      scripts?: Record<string, string>;
    };
    expect(
      pkg.scripts?.["check-types"],
      "@reading-advantage/auth must expose a `check-types` script " +
        "so the Phase 2 plan task #4 gate (turbo check-types) is " +
        "exercised rather than silently skipped.",
    ).toBe("tsc --noEmit");
  });
});

// ---------------------------------------------------------------------------
// Task 2 — Add 'INTERN' to the type union
// ---------------------------------------------------------------------------

describe("Phase 2 — Task 2: INTERN widens the canonical Role union", () => {
  it("ROLES.INTERN is the literal string \"INTERN\"", () => {
    // Pin the runtime value so a refactor that renames the constant
    // (e.g. `INTERN: "INTERN_DEV"`) trips the test.
    expect(ROLES.INTERN).toBe("INTERN");
  });

  it("ROLE_HIERARCHY.INTERN is 0 (lowest in the hierarchy)", () => {
    // Pin the hierarchy rank. INTERN sits below STUDENT in the
    // privilege ladder; an INTERN session must NOT pass
    // roleAtLeast("INTERN", "STUDENT"). The rank assignment is what
    // makes the gating math work — getting it wrong silently
    // promotes interns.
    expect(ROLE_HIERARCHY.INTERN).toBe(0);
  });

  it("ROLE_ROUTES.INTERN is \"/intern\"", () => {
    // Pin the redirect target. requireRole(INTERN) redirects an
    // insufficient user to ROLE_ROUTES[session.user.role]; if this
    // is wrong the redirect goes to a 404.
    expect(ROLE_ROUTES.INTERN).toBe("/intern");
  });

  it("a Role variable can be assigned the ROLES.INTERN literal (compile-time check)", () => {
    // If the `Role` union ever narrows to drop INTERN, this
    // assignment fails at type-check time and the test file
    // refuses to compile.
    const role: Role = ROLES.INTERN;
    expect(role).toBe("INTERN");
  });

  it("a Role variable can be assigned the string literal \"INTERN\" (compile-time check)", () => {
    // Stronger compile-time pin: a bare string literal must be
    // accepted as `Role` (proving the union explicitly includes
    // "INTERN", not just transitively via ROLES.INTERN's value).
    const role: Role = "INTERN";
    expect(role).toBe("INTERN");
  });

  it("the @reading-advantage/auth barrel re-exports the widened Role", () => {
    // Compile-time check that the consumer-facing entrypoint also
    // widens — exercises the index.ts re-export shape.
    const role: AuthPackageRole = "INTERN";
    expect(role).toBe("INTERN");
  });

  it("roles.ts source contains INTERN in all three structures", () => {
    // Belt-and-suspenders: even if the runtime values get
    // accidentally aligned, the source must contain the literal
    // string `INTERN` in ROLES, ROLE_HIERARCHY, and ROLE_ROUTES.
    const source = readFileSync(ROLES_PATH, "utf-8");
    expect(
      source,
      "roles.ts must declare `INTERN: \"INTERN\"` in the ROLES object.",
    ).toMatch(/INTERN:\s*"INTERN"/);
    expect(
      source,
      "roles.ts must declare `INTERN: 0` in ROLE_HIERARCHY.",
    ).toMatch(/INTERN:\s*0/);
    expect(
      source,
      "roles.ts must declare `INTERN: \"/intern\"` in ROLE_ROUTES.",
    ).toMatch(/INTERN:\s*"\/intern"/);
  });
});

describe("Phase 2 — Task 2: roleAtLeast honours INTERN at the bottom of the hierarchy", () => {
  it("INTERN is at least INTERN (same level)", () => {
    expect(roleAtLeast("INTERN", "INTERN")).toBe(true);
  });

  it("INTERN is NOT at least STUDENT (INTERN is below STUDENT in the hierarchy)", () => {
    // Critical: an intern must NOT be able to satisfy a STUDENT
    // role gate. If this returns true, the hierarchy is broken
    // and the codecamp intern flow is a privilege-escalation bug.
    expect(roleAtLeast("INTERN", "STUDENT")).toBe(false);
  });

  it("STUDENT is at least INTERN (STUDENT is above INTERN in the hierarchy)", () => {
    expect(roleAtLeast("STUDENT", "INTERN")).toBe(true);
  });

  it("TEACHER is at least INTERN", () => {
    expect(roleAtLeast("TEACHER", "INTERN")).toBe(true);
  });

  it("ADMIN is at least INTERN", () => {
    expect(roleAtLeast("ADMIN", "INTERN")).toBe(true);
  });

  it("SYSTEM is at least INTERN", () => {
    expect(roleAtLeast("SYSTEM", "INTERN")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Task 3 — Update consumer types that use UserRole
// ---------------------------------------------------------------------------

describe("Phase 2 — Task 3: consumer types re-export the canonical Role as UserRole", () => {
  it("apps/science-advantage/lib/auth/types.ts exists at the documented path", () => {
    expect(
      existsSync(SA_TYPES_PATH),
      "Expected apps/science-advantage/lib/auth/types.ts to exist — " +
        "it is the consumer-side re-export that the science-advantage " +
        "app uses for its `UserRole` alias.",
    ).toBe(true);
  });

  it("apps/science-advantage/lib/auth/types.ts re-exports Role as UserRole from @reading-advantage/auth", () => {
    const source = readFileSync(SA_TYPES_PATH, "utf-8");
    expect(
      source,
      "types.ts must re-export `Role as UserRole` from " +
        "`@reading-advantage/auth` so the widening is transitive.",
    ).toMatch(/from\s+['"]@reading-advantage\/auth['"]/);
    expect(
      source,
      "types.ts must alias the imported `Role` to `UserRole`.",
    ).toMatch(/Role\s+as\s+UserRole/);
  });

  it("apps/science-advantage/lib/auth/constants.ts exists at the documented path", () => {
    expect(
      existsSync(SA_CONSTANTS_PATH),
      "Expected apps/science-advantage/lib/auth/constants.ts to exist " +
        "— it re-exports ROLE_HIERARCHY + ROLE_ROUTES from the " +
        "canonical auth package.",
    ).toBe(true);
  });

  it("apps/science-advantage/lib/auth/constants.ts re-exports ROLE_HIERARCHY + ROLE_ROUTES and Role as UserRole from @reading-advantage/auth", () => {
    const source = readFileSync(SA_CONSTANTS_PATH, "utf-8");
    expect(
      source,
      "constants.ts must import from `@reading-advantage/auth` so " +
        "ROLE_HIERARCHY.INTERN / ROLE_ROUTES.INTERN are reachable.",
    ).toMatch(/from\s+['"]@reading-advantage\/auth['"]/);
    expect(
      source,
      "constants.ts must re-export `ROLE_HIERARCHY`.",
    ).toMatch(/ROLE_HIERARCHY/);
    expect(
      source,
      "constants.ts must re-export `ROLE_ROUTES`.",
    ).toMatch(/ROLE_ROUTES/);
    expect(
      source,
      "constants.ts must alias `Role` to `UserRole`.",
    ).toMatch(/Role\s+as\s+UserRole/);
  });

  it("apps/science-advantage/lib/auth/index.ts re-exports the UserRole alias for app-wide use", () => {
    // The app's `lib/auth/index.ts` is the barrel that the rest
    // of the app uses. It must surface `UserRole` (via `./types`)
    // so the whole app inherits the widening.
    expect(
      existsSync(SA_INDEX_PATH),
      "Expected apps/science-advantage/lib/auth/index.ts to exist.",
    ).toBe(true);
    const source = readFileSync(SA_INDEX_PATH, "utf-8");
    expect(
      source,
      "lib/auth/index.ts must re-export `UserRole` from `./types`.",
    ).toMatch(/UserRole/);
    expect(
      source,
      "lib/auth/index.ts must import `UserRole` from `./types` (not " +
        "from a stale local re-declaration that would re-narrow the " +
        "union).",
    ).toMatch(/from\s+['"]\.\/types['"]/);
  });

  it("apps/science-advantage/lib/auth/server.ts uses the canonical Role (not a local narrowing)", () => {
    // `server.ts` implements `requireRole` / `hasRole`. It must
    // take `Role` (or a `Role[]`) from `@reading-advantage/auth`
    // directly — a locally-redeclared `type Role` would re-narrow
    // the union and silently drop INTERN from the gate.
    expect(
      existsSync(SA_SERVER_PATH),
      "Expected apps/science-advantage/lib/auth/server.ts to exist.",
    ).toBe(true);
    const source = readFileSync(SA_SERVER_PATH, "utf-8");
    expect(
      source,
      "server.ts must import `Role` from `@reading-advantage/auth` " +
        "(or via the local re-export barrel) — never redeclare it.",
    ).toMatch(/from\s+['"]@reading-advantage\/auth['"]/);
  });
});

// ---------------------------------------------------------------------------
// Task 3 — Permission cross-cut (codecamp flow uses INTERN)
// ---------------------------------------------------------------------------

describe("Phase 2 — Task 3: permissions.ts grants INTERN the codecamp permissions", () => {
  it("permissions.ts has INTERN in the codecamp:read list", () => {
    const source = readFileSync(PERMISSIONS_PATH, "utf-8");
    expect(
      source,
      "permissions.ts must allow ROLES.INTERN on the `codecamp:read` " +
        "permission — intern accounts use this to read codecamp curriculum.",
    ).toMatch(/codecamp:read.*INTERN/s);
  });

  it("permissions.ts has INTERN in the codecamp:submit list", () => {
    const source = readFileSync(PERMISSIONS_PATH, "utf-8");
    expect(
      source,
      "permissions.ts must allow ROLES.INTERN on the `codecamp:submit` " +
        "permission — intern accounts use this to submit PR / quiz work.",
    ).toMatch(/codecamp:submit.*INTERN/s);
  });

  it("permissions.ts has INTERN in the codecamp:chat list", () => {
    const source = readFileSync(PERMISSIONS_PATH, "utf-8");
    expect(
      source,
      "permissions.ts must allow ROLES.INTERN on the `codecamp:chat` " +
        "permission — intern accounts use this to chat with the AI tutor.",
    ).toMatch(/codecamp:chat.*INTERN/s);
  });
});

// ---------------------------------------------------------------------------
// Task 3 — DB schema cross-cut (roleEnum matches the canonical Role union)
// ---------------------------------------------------------------------------

describe("Phase 2 — Task 3: db schema role enum mirrors the canonical Role union", () => {
  it("packages/db/src/schema/users.ts declares the role enum as a pgEnum", () => {
    expect(
      existsSync(USERS_SCHEMA_PATH),
      "Expected packages/db/src/schema/users.ts to exist.",
    ).toBe(true);
    const source = readFileSync(USERS_SCHEMA_PATH, "utf-8");
    expect(
      source,
      "users.ts must declare the role as a pgEnum (Drizzle type " +
        "safety for the role column).",
    ).toMatch(/pgEnum\(\s*['"]role['"]/);
  });

  it("packages/db/src/schema/users.ts role enum includes INTERN", () => {
    const source = readFileSync(USERS_SCHEMA_PATH, "utf-8");
    expect(
      source,
      "users.ts roleEnum must list \"INTERN\" as the first element " +
        "(matches ROLE_HIERARCHY.INTERN = 0 — lowest in the hierarchy).",
    ).toMatch(/pgEnum\(\s*['"]role['"]\s*,\s*\[\s*"INTERN"/);
  });
});
