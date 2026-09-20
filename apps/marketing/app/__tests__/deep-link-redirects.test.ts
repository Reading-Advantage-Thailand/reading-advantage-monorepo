// @vitest-environment node
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));
const APP_ROOT = resolve(__dirname, "..");

const LOGIN_REDIRECT_CALL_SITES = [
  "campaigns/page.tsx",
  "campaigns/[id]/page.tsx",
  "campaigns/[id]/video/page.tsx",
  "settings/page.tsx",
] as const;

/**
 * Reads a Marketing application source file by its path relative to app/.
 * @param relativePath The source path below the Marketing app directory.
 * @returns The source file contents.
 */
function readAppSource(relativePath: string): string {
  return readFileSync(resolve(APP_ROOT, relativePath), "utf8");
}

describe("Marketing deep-link call sites", () => {
  it.each(LOGIN_REDIRECT_CALL_SITES)(
    "routes the %s login redirect through the shared helper",
    (relativePath) => {
      const source = readAppSource(relativePath);

      expect(source).toMatch(/from ["']@\/lib\/login-redirect["']/);
      expect(source).toMatch(/\bhandleAuthFailure\s*\(/);
      expect(source).not.toMatch(
        /window\.location\.href\s*=\s*["']\/login["']/,
      );
    },
  );

  it("forwards the login page returnTo value to the start route", () => {
    const source = readAppSource("login/page.tsx");

    expect(source).toMatch(/\breturnTo\b/);
    expect(source).toMatch(/api\/auth\/company\/start/);
  });
});
