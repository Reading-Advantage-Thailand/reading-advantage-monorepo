// @vitest-environment node
/**
 * Red test for Primary Phase 1: sentence-ordering game completion crash.
 *
 * The component's handleNext callback invokes `update(...)` and references
 * `session?.user`, but the hook is destructured as `const { user } = useSession()`.
 * At runtime `update` and `session` are undefined, producing a ReferenceError
 * when the student finishes the game.
 *
 * Green: destructure `update` and `session` from `useSession()` (or otherwise
 * bind them from an auth-client contract) before invoking them.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const SRC_PATH = resolve(
  import.meta.dirname,
  "../lesson-sentence-order-word.tsx",
);

describe("lesson-sentence-order-word completion crash guard", () => {
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
