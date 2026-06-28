// @vitest-environment node
/**
 * Red test for Primary Phase 1: order-words practice game completion crash.
 *
 * Mirrors lesson-sentence-order-word.tsx: handleNext calls `update(...)` and
 * reads `session?.user` while only destructuring `{ user }` from useSession().
 * This is the same M1 crash pattern in the practice variant.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const SRC_PATH = resolve(import.meta.dirname, "../order-words-game.tsx");

describe("order-words-game completion crash guard", () => {
  const src = readFileSync(SRC_PATH, "utf-8");

  it("binds update from useSession before calling it", () => {
    const callsUpdate = /\bupdate\s*\(/.test(src);
    const destructuresUpdateFromSession =
      /const\s*\{[^}]*\bupdate\b[^}]*\}\s*=\s*useSession\s*\(/.test(src);

    expect(
      { callsUpdate, destructuresUpdateFromSession },
      "update is called but not bound from useSession",
    ).toEqual({
      callsUpdate: true,
      destructuresUpdateFromSession: true,
    });
  });

  it("binds session from useSession before reading session?.user", () => {
    const readsSessionUser = /session\?\.user/.test(src);
    const destructuresSessionFromSession =
      /const\s*\{[^}]*\bsession\b[^}]*\}\s*=\s*useSession\s*\(/.test(src);

    expect(
      { readsSessionUser, destructuresSessionFromSession },
      "session?.user is read but session is not bound from useSession",
    ).toEqual({
      readsSessionUser: true,
      destructuresSessionFromSession: true,
    });
  });
});
