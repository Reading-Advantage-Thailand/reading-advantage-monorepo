/**
 * PB-7 Red Test — Typed request context for reports
 *
 * Evidence refs: Reading M-RA-PB-7; site-closures/M-RA-PB-7.md.
 *
 * Today `class-accuracy-controller.ts` reads session/params through
 * `(req as any).session` and `(req as any).params?.classroomId`. The fix
 * must pass a typed context object from the route handler instead.
 *
 * Falsification conditions:
 *  - If `(req as any)` casts remain in report controllers, the source-scan
 *    assertion fails.
 *  - If `requireRole([...]) as any` casts remain, the source-scan assertion
 *    fails.
 *
 * @jest-environment node
 */

import { readFileSync, readdirSync } from "fs";
import { join } from "path";

const CONTROLLERS_DIR = "server/controllers";

const REPORT_CONTROLLER_PREFIXES = [
  "class-accuracy",
  "class-dashboard",
  "assignment",
  "teacher-assignment",
  "metrics",
  "metrics-extended",
  "dashboard-summary",
];

function listReportControllers(): string[] {
  const root = process.cwd();
  const entries = readdirSync(join(root, CONTROLLERS_DIR), { withFileTypes: true });
  return entries
    .filter(
      (e) =>
        e.isFile() &&
        e.name.endsWith(".ts") &&
        REPORT_CONTROLLER_PREFIXES.some((prefix) =>
          e.name.startsWith(prefix)
        )
    )
    .map((e) => join(root, CONTROLLERS_DIR, e.name));
}

describe("PB-7 typed request context for reports (Red)", () => {
  it("report controllers contain no (req as any) or (request as any) casts", () => {
    const violations: string[] = [];
    for (const file of listReportControllers()) {
      const content = readFileSync(file, "utf-8");
      const lines = content.split("\n");
      lines.forEach((line, idx) => {
        if (/\(req\s+as\s+any\)|\(request\s+as\s+any\)/.test(line)) {
          violations.push(`${file}:${idx + 1}: ${line.trim()}`);
        }
      });
    }

    expect(violations).toEqual([]);
  });

  it("report controllers contain no requireRole(...as any) casts", () => {
    const violations: string[] = [];
    for (const file of listReportControllers()) {
      const content = readFileSync(file, "utf-8");
      const lines = content.split("\n");
      lines.forEach((line, idx) => {
        if (/requireRole\s*\([^)]*as\s+any/.test(line)) {
          violations.push(`${file}:${idx + 1}: ${line.trim()}`);
        }
      });
    }

    expect(violations).toEqual([]);
  });
});
