// @vitest-environment node
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const API_ROOT = path.resolve(__dirname, "../../app/api");

/** The student API folders (relative to `app/api`). A new write route under one of them needs a guard. */
export const STUDENT_API_FOLDERS = [
  "articles",
  "assignments",
  "assistant",
  "flashcard",
  "lessons",
  "users/activitylog",
  "v1/apk",
  "v1/avatar",
  "v1/quest",
  "voice",
];

/** A write route that needs no student guard, with the reason. Paths are relative to `app/api`. */
export const EXEMPT: Record<string, string> = {
  "assignments/route.ts": "Teacher creates an assignment; writes no student record",
  "assistant/lesson-chatbot/route.ts": "AI reply only; writes no student record",
  "v1/apk/challenges/route.ts": "Teacher creates a challenge (challenges:create)",
  "v1/quest/route.ts": "Teacher assigns a quest (managedClass check in the domain)",
  "v1/quest/[questId]/route.ts": "Teacher cancels a quest (managedClass check in the domain)",
  "v1/quest/[questId]/status/route.ts": "Teacher moves the battle on (managedClass check in the domain)",
};

const GUARD = /\b(assertStudentWriter|guardStudentRoute|guardStudentAction)\(/;
const WRITE_FN = /export\s+(?:async\s+)?(?:function|const)\s+(POST|PUT|PATCH|DELETE)\b/;
const WRITE_DESTRUCTURE = /export\s+const\s*\{([^}]*)\}\s*=/;

/**
 * Tells whether a route source exports a non-GET handler.
 * @param rawSource The route file text; comments are ignored.
 * @returns True when it exports POST, PUT, PATCH, or DELETE.
 */
export function hasWriteHandler(rawSource: string): boolean {
  const source = rawSource.replace(/^\s*\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
  if (WRITE_FN.test(source)) return true;
  const m = WRITE_DESTRUCTURE.exec(source);
  return !!m && /\b(POST|PUT|PATCH|DELETE)\b/.test(m[1]);
}

/**
 * Finds the route files whose source has a write handler and no guard call.
 * @param files Map of relative path to source text.
 * @param exempt Paths that need no guard.
 * @returns The relative paths that break the rule.
 */
export function unguardedWriteRoutes(files: Record<string, string>, exempt: Record<string, string> = {}): string[] {
  return Object.entries(files)
    .filter(([file, src]) => !(file in exempt) && hasWriteHandler(src) && !GUARD.test(src))
    .map(([file]) => file);
}

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (name === "route.ts") out.push(full);
  }
  return out;
}

describe("preview guard coverage", () => {
  const files: Record<string, string> = {};
  for (const folder of STUDENT_API_FOLDERS) {
    const dir = path.join(API_ROOT, folder);
    expect(existsSync(dir), `${folder} exists`).toBe(true);
    for (const file of walk(dir)) files[path.relative(API_ROOT, file)] = readFileSync(file, "utf8");
  }

  it("scans a real set of routes", () => {
    expect(Object.keys(files).length).toBeGreaterThan(20);
  });

  it("guards every non-GET handler under the student API folders", () => {
    expect(unguardedWriteRoutes(files, EXEMPT)).toEqual([]);
  });

  it("keeps the exempt list true: each entry exists and has a write handler", () => {
    for (const file of Object.keys(EXEMPT)) {
      expect(files[file], `${file} exists`).toBeDefined();
      expect(hasWriteHandler(files[file]), `${file} has a write handler`).toBe(true);
      expect(GUARD.test(files[file]), `${file} is guarded, so it needs no exemption`).toBe(false);
    }
  });

  it("detects a counterexample fixture without the guard call", () => {
    const fixture = {
      "voice/new/route.ts": 'export async function POST() { return Response.json({}); }',
      "voice/ok/route.ts": 'export async function POST() { guardStudentRoute(u, "x"); }',
      "voice/read/route.ts": "export async function GET() { return Response.json({}); }",
      "v1/apk/x/route.ts": "export const { GET, POST } = make();",
    };
    expect(unguardedWriteRoutes(fixture)).toEqual(["voice/new/route.ts", "v1/apk/x/route.ts"]);
  });
});
