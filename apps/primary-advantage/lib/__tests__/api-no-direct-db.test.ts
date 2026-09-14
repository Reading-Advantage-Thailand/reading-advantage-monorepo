// @vitest-environment node
/**
 * AC-1 static invariant (track_id: primary_structural_alignment_20260912)
 *
 * Routes must reach the database through the domain layer (createTenantDB /
 * TenantDB), not by importing the `@reading-advantage/db` client barrel
 * directly. Per the track spec, a NEW direct import in `app/api` fails this
 * static test; the APK (`v1/apk`) and host-proof surfaces are excluded.
 *
 * Routes that still carried the direct import when this ratchet landed are
 * listed in DIRECT_DB_BASELINE. The list only shrinks: when a route migrates
 * off the client barrel, its entry must be removed in the same change.
 */
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "fs";
import { dirname, join, relative, sep } from "path";
import { fileURLToPath } from "url";

const appDir = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const apiDir = join(appDir, "app", "api");

/**
 * Direct client-barrel specifier. Matches the `@reading-advantage/db` barrel
 * and the `@reading-advantage/db/client` subpath (both export the live `db`
 * handle). The `/schema` subpath is not matched.
 */
const DIRECT_DB_IMPORT = /["']@reading-advantage\/db(?:\/client)?["']/;

/** Surfaces already reviewed against TenantDB; outside this invariant. */
const EXCLUDED_SEGMENTS = ["v1/apk", "host-proof"] as const;

/**
 * Routes that still import the db client directly today. Reviewed baseline —
 * add nothing here; remove entries as routes migrate to createTenantDB.
 */
const DIRECT_DB_BASELINE: readonly string[] = [];

/**
 * Collects every route.ts under a directory, recursively.
 * @param dir The directory to scan.
 * @param out Accumulator for the recursion.
 * @returns Absolute paths of all route.ts files.
 */
function walkRouteFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      walkRouteFiles(fullPath, out);
    } else if (entry.name === "route.ts") {
      out.push(fullPath);
    }
  }
  return out;
}

/** Posix-style path relative to the app root, for stable baseline keys. */
function appRelative(absolutePath: string): string {
  return relative(appDir, absolutePath).split(sep).join("/");
}

function isExcluded(routePath: string): boolean {
  return EXCLUDED_SEGMENTS.some((segment) => routePath.includes(segment));
}

const allRoutes = walkRouteFiles(apiDir).map(appRelative);
const guardedRoutes = allRoutes.filter((route) => !isExcluded(route));
const baseline = new Set(DIRECT_DB_BASELINE);

describe("AC-1: no direct @reading-advantage/db imports in app/api routes", () => {
  it("scans a non-empty route population so the invariant cannot pass vacuously", () => {
    expect(guardedRoutes.length).toBeGreaterThan(0);
  });

  it("excludes the APK and host-proof surfaces from the invariant", () => {
    for (const route of guardedRoutes) {
      expect(isExcluded(route), `${route} must be excluded`).toBe(false);
    }
  });

  it("fails a NEW direct @reading-advantage/db import in a route.ts", () => {
    const offenders: string[] = [];
    for (const route of guardedRoutes) {
      if (baseline.has(route)) continue;
      const source = readFileSync(join(appDir, route), "utf8");
      if (DIRECT_DB_IMPORT.test(source)) {
        offenders.push(route);
      }
    }
    expect(
      offenders,
      `Direct db-client import count: ${offenders.length}. ` +
        `Routes must reach the database through createTenantDB ` +
        `(see measure/tracks/primary_structural_alignment_20260912 AC-1): ` +
        `${offenders.join(", ")}`,
    ).toEqual([]);
  });

  it("keeps the baseline honest: entries exist and still carry the import", () => {
    const stale: string[] = [];
    for (const route of DIRECT_DB_BASELINE) {
      expect(isExcluded(route), `${route} belongs in the exclusion list`).toBe(
        false,
      );
      const fullPath = join(appDir, route);
      if (!existsSync(fullPath) || !DIRECT_DB_IMPORT.test(readFileSync(fullPath, "utf8"))) {
        stale.push(route);
      }
    }
    expect(
      stale,
      `Stale baseline entries: ${stale.join(", ")}. ` +
        `Remove them — the ratchet only shrinks.`,
    ).toEqual([]);
  });
});
