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
 *   `app/[locale]/teacher/[level]/[week]/[day]/page.tsx` run the fixed guard order through
 *   `guardTeacherPage` of `lib/teacher.ts` (session, flag, role; the remediation round 1 of
 *   finding F416 replaced the inline sequence), call `notFound()` for the off gate, and answer
 *   404 for an unknown level, week, or day. The behavior cases of this file replaced the two
 *   source regexes of the flag-off case and the flag-read case (finding F413); the meaning of
 *   both cases stays.
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

  it("reads the flag in both teacher pages before any week content renders", async () => {
    const rule = await loadRule();
    expect(
      typeof rule.guardTeacherPage,
      "lib/teacher.ts must export guardTeacherPage for the flag check of the pages",
    ).toBe("function");
    // Behavior: the guard of the pages reads the flag before it returns any content, so a
    // teacher session with the flag off gets no content (the pages map the off gate to 404).
    process.env[FLAG_ENV] = "1";
    const ok = await rule.guardTeacherPage(async () => ({
      id: "u-teach",
      username: "teach-01",
      role: "teacher",
    }), "/th/teacher/2/1");
    expect(ok, "the guard must pass a teacher session with the flag on").toEqual({
      kind: "ok",
      teacher: { id: "u-teach", username: "teach-01", role: "teacher" },
    });
    delete process.env[FLAG_ENV];
    const off = await rule.guardTeacherPage(async () => ({
      id: "u-teach",
      username: "teach-01",
      role: "teacher",
    }), "/th/teacher/2/1");
    expect(
      off,
      "the guard must read the flag before it returns content, even for a teacher session",
    ).toEqual({ kind: "off" });
    for (const [path, label] of [
      [weekPage, "teacher week view"],
      [dayPage, "teacher lesson flow"],
    ] as const) {
      const source = readRequired(path, label);
      expect(
        source,
        `${label} must run the flag check through the guard of lib/teacher.ts`,
      ).toMatch(/guardTeacherPage/);
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

  it("answers 404 from every teacher route when the flag is off", async () => {
    const rule = await loadRule();
    expect(
      typeof rule.guardTeacherPage,
      "lib/teacher.ts must export guardTeacherPage for the flag-off rule",
    ).toBe("function");
    // Behavior (finding F413 replaced the source regex of this case; the meaning stays):
    // with the flag off the guard answers off for every session, and each page maps the off
    // gate to notFound, so every teacher route answers 404.
    let sessionCalls = 0;
    const off = await rule.guardTeacherPage(async () => {
      sessionCalls += 1;
      return { id: "u-teach", username: "teach-01", role: "teacher" };
    }, "/th/teacher/2/1/1");
    expect(off, "the day route must be off with the flag off, for every session").toEqual({
      kind: "off",
    });
    expect(
      sessionCalls,
      "the session check must still run before the flag check (the recorded order)",
    ).toBe(1);
    for (const [path, label] of [
      [weekPage, "teacher week view"],
      [dayPage, "teacher lesson flow"],
    ] as const) {
      const source = readRequired(path, label);
      expect(
        source,
        `${label} must map the off gate to notFound`,
      ).toMatch(/gate\.kind === "off"\s*\)\s*notFound\(\)/);
    }
  });

  it("runs the day-route guard in the recorded order session, flag, role (behavior)", async () => {
    const rule = await loadRule();
    expect(
      typeof rule.guardTeacherPage,
      "lib/teacher.ts must export guardTeacherPage for the fixed guard order",
    ).toBe("function");
    const teacher = { id: "u-teach", username: "teach-01", role: "teacher" as const };
    let sessionCalls = 0;
    const requireTeacher = async () => {
      sessionCalls += 1;
      return teacher;
    };

    process.env[FLAG_ENV] = "1";
    const ok = await rule.guardTeacherPage(requireTeacher, "/th/teacher/2/1/1");
    expect(sessionCalls, "the guard must read the session once").toBe(1);
    expect(
      ok,
      "a teacher session with the flag on must pass the guard",
    ).toEqual({ kind: "ok", teacher });

    delete process.env[FLAG_ENV];
    sessionCalls = 0;
    const off = await rule.guardTeacherPage(requireTeacher, "/th/teacher/2/1/1");
    expect(
      sessionCalls,
      "the session check must come before the flag check, so a flag-off request still reads the session",
    ).toBe(1);
    expect(
      off,
      "the day route must be off with the flag off (an inverted gate fails here)",
    ).toEqual({ kind: "off" });

    process.env[FLAG_ENV] = "1";
    const forbidden = await rule.guardTeacherPage(async () => null, "/th/teacher/2/1/1");
    expect(
      forbidden,
      "a session of another role must get the 403 view with the flag on",
    ).toEqual({ kind: "forbidden" });

    for (const [path, label] of [
      [weekPage, "teacher week view"],
      [dayPage, "teacher lesson flow"],
    ] as const) {
      const source = readRequired(path, label);
      expect(
        source,
        `${label} must run its checks through the one guard of lib/teacher.ts`,
      ).toMatch(/guardTeacherPage/);
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
