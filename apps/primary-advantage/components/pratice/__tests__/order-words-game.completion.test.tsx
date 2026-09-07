// @vitest-environment node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(import.meta.dirname, "../order-words-game.tsx"), "utf-8");

describe("order-words-game session refresh", () => {
  it("refreshes the authoritative session after completion", () => {
    expect(source).toMatch(/const\s*\{[^}]*\brefresh\b[^}]*\}\s*=\s*useAuth\s*\(/);
    expect(source).toMatch(/await refresh\(\)/);
    expect(source).not.toMatch(/\bupdate\s*\(|session\?\.user/);
  });
});
