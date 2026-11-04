// @vitest-environment node
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

/**
 * The Red tests of the teacher route flag (plan task 4.1, AC-9.3).
 *
 * The teacher routes `/<locale>/teacher/<level>/<week>` and
 * `/<locale>/teacher/<level>/<week>/<day>` stay off the public service until Daniel decides Q1.
 * A server-side environment flag `STORYTIME_TEACHER_ROUTES` turns them on. The flag is on only
 * when its value is exactly `1`, the same rule as `STORYTIME_SHOW_DRAFT_MEDIA`. Every other value
 * (unset, empty, `0`, `false`, `FALSE`, `true`, `yes`, ` 1`) is off, and every teacher route
 * answers 404 while the flag is off, with and without a valid level, week, and day.
 *
 * No `NEXT_PUBLIC_` flag exists anywhere in the app sources, because the build would inline it.
 * The teacher pages export no `generateStaticParams` and read the flag at request time, so a
 * production build makes no static teacher page. The Docker smoke and the production-build check
 * of the leak stay with task 4.5; this file holds the source checks and the flag rule behavior.
 *
 * Green builds to this contract:
 * - the rule module `apps/storytime/lib/teacher.ts` exports `TEACHER_ROUTES_ENV` (the name
 *   `STORYTIME_TEACHER_ROUTES`) and `teacherRoutesEnabled()` with the exact-`1` rule;
 * - the pages `app/[locale]/teacher/[level]/[week]/page.tsx` and
 *   `app/[locale]/teacher/[level]/[week]/[day]/page.tsx` call `teacherRoutesEnabled()`, call
 *   `notFound()` when it is false, load the week through `loadWeek`, and answer 404 for an
 *   unknown level, week, or day.
 */

const app = resolve(import.meta.dirname, "..");
const teacherDir = resolve(app, "app/[locale]/teacher");
const weekPage = resolve(teacherDir, "[level]/[week]/page.tsx");
const dayPage = resolve(teacherDir, "[level]/[week]/[day]/page.tsx");

/** The name of the teacher route flag. */
const FLAG_ENV = "STORYTIME_TEACHER_ROUTES";

/** Reads a source file that must exist and returns its text. */
function readRequired(path: string, label: string): string {
  expect(existsSync(path), `Missing ${label}: ${path}`).toBe(true);
  return readFileSync(path, "utf8");
}

/** Lists every source file under a folder, excluding build and dependency folders (A7: exact
 * directory names only). */
function sourceFiles(root: string): string[] {
  const out: string[] = [];
  const skip = new Set(["node_modules", ".next", "__tests__", ".turbo", "content", "messages"]);
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry);
      const stat = statSync(path);
      if (stat.isDirectory()) {
        if (!skip.has(entry)) walk(path);
      } else if (/\.(ts|tsx|mts|js|jsx|mjs)$/.test(entry)) {
        out.push(path);
      }
    }
  };
  walk(root);
  return out;
}

/** Loads the teacher flag rule module and reports a missing implementation as an assertion. */
async function loadRule() {
  const modulePath = "../lib/teacher";
  try {
    return await import(/* @vite-ignore */ modulePath);
  } catch (error) {
    expect(
      error,
      "Storytime must add the teacher flag rule module at apps/storytime/lib/teacher.ts",
    ).toBeUndefined();
    throw error;
  }
}

afterEach(() => {
  delete process.env[FLAG_ENV];
});

describe("Phase 4 teacher route group and flag (AC-9.3)", () => {
  it("creates the teacher route group with the week view and the lesson flow", () => {
    expect(existsSync(teacherDir), "Missing teacher route group: app/[locale]/teacher/").toBe(true);
    readRequired(weekPage, "teacher week view route");
    readRequired(dayPage, "teacher lesson flow route");
  });

  it("names the server-side flag STORYTIME_TEACHER_ROUTES in the rule module", async () => {
    const rule = await loadRule();
    expect(
      rule.TEACHER_ROUTES_ENV,
      "the rule module must export the flag name as TEACHER_ROUTES_ENV",
    ).toBe(FLAG_ENV);
    expect(
      typeof rule.teacherRoutesEnabled,
      "the rule module must export teacherRoutesEnabled()",
    ).toBe("function");
  });

  it("reads the flag in both teacher pages before any week content renders", () => {
    for (const [path, label] of [
      [weekPage, "teacher week view"],
      [dayPage, "teacher lesson flow"],
    ] as const) {
      const source = readRequired(path, label);
      expect(
        source,
        `${label} must read the server-side teacher flag`,
      ).toMatch(/teacherRoutesEnabled|TEACHER_ROUTES_ENV/);
    }
  });

  it("turns the flag on only when the value is exactly 1", async () => {
    const rule = await loadRule();
    const original = process.env[FLAG_ENV];
    try {
      delete process.env[FLAG_ENV];
      expect(rule.teacherRoutesEnabled(), "an unset flag must be off").toBe(false);
      for (const value of ["", "0", "false", "FALSE", "true", "yes", " 1", "1 ", "01"]) {
        process.env[FLAG_ENV] = value;
        expect(
          rule.teacherRoutesEnabled(),
          `the flag value ${JSON.stringify(value)} must be off`,
        ).toBe(false);
      }
      process.env[FLAG_ENV] = "1";
      expect(rule.teacherRoutesEnabled(), 'the flag value "1" must be on').toBe(true);
    } finally {
      if (original === undefined) delete process.env[FLAG_ENV];
      else process.env[FLAG_ENV] = original;
    }
  });

  it("keeps the same exact-1 rule as STORYTIME_SHOW_DRAFT_MEDIA", () => {
    const content = readRequired(resolve(app, "lib/content.ts"), "the week loader");
    expect(
      content,
      "the draft-media switch must keep the exact-1 rule that the teacher flag copies",
    ).toMatch(/process\.env\[DRAFT_MEDIA_ENV\]\s*===\s*"1"/);
  });

  it("answers 404 from every teacher route when the flag is off", () => {
    for (const [path, label] of [
      [weekPage, "teacher week view"],
      [dayPage, "teacher lesson flow"],
    ] as const) {
      const source = readRequired(path, label);
      expect(source, `${label} must call notFound when the flag is off`).toMatch(/notFound/);
      expect(
        source,
        `${label} must gate on the flag before the week content renders`,
      ).toMatch(/teacherRoutesEnabled\(\)[\s\S]*notFound|notFound[\s\S]*teacherRoutesEnabled\(\)/);
    }
  });

  it("answers 404 for an unknown level, week, or day with the flag on", () => {
    for (const [path, label] of [
      [weekPage, "teacher week view"],
      [dayPage, "teacher lesson flow"],
    ] as const) {
      const source = readRequired(path, label);
      expect(
        source,
        `${label} must load the week and map an absent week to notFound, never crash`,
      ).toMatch(/loadWeek/);
      expect(source, `${label} must answer notFound for a week that does not exist`).toMatch(
        /notFound/,
      );
    }
  });

  it("exports no generateStaticParams and reads the flag at request time", () => {
    for (const [path, label] of [
      [weekPage, "teacher week view"],
      [dayPage, "teacher lesson flow"],
    ] as const) {
      const source = readRequired(path, label);
      expect(source, `${label} must not export generateStaticParams`).not.toMatch(
        /generateStaticParams/,
      );
      expect(
        source,
        `${label} must read the flag at request time (force-dynamic or an equal runtime read)`,
      ).toMatch(/force-dynamic/);
    }
  });

  it("never reads a NEXT_PUBLIC_ flag in the app sources", () => {
    const files = sourceFiles(app);
    expect(files.length, "the app must hold source files to scan (A4)").toBeGreaterThan(0);
    for (const path of files) {
      const source = readFileSync(path, "utf8");
      const rel = path.slice(app.length + 1);
      expect(source, `${rel} must not read a NEXT_PUBLIC_ value`).not.toMatch(
        /process\.env\.NEXT_PUBLIC_/,
      );
      expect(
        source,
        `${rel} must not name a NEXT_PUBLIC_ storytime or teacher flag`,
      ).not.toMatch(/NEXT_PUBLIC_(STORYTIME|TEACHER)/);
    }
  });
});
