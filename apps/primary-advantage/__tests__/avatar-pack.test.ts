// @vitest-environment node
/**
 * The avatar pack the app serves (FR-10c, track_id: primary_reedy_preview_20261003): every
 * portrait layer the avatar kit plans must exist under `public/packs/avatar/<version>/`.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { AVATAR_PACK_VERSION, PORTRAIT_INDEX } from "@reading-advantage/avatar-kit";

const root = join(process.cwd(), "public", "packs", "avatar", AVATAR_PACK_VERSION);

describe("avatar pack files", () => {
  it("serves a color and a mask image for every indexed layer", () => {
    const missing = Object.values(PORTRAIT_INDEX).flatMap((l) => [l.color, l.mask]).filter((f) => !existsSync(join(root, f)));
    expect(missing).toEqual([]);
  });

  it("ships the same index as the kit", () => {
    const served = JSON.parse(readFileSync(join(root, "portraits.json"), "utf8")) as { version: string; layers: Record<string, unknown> };
    expect(served.version).toBe(AVATAR_PACK_VERSION);
    expect(Object.keys(served.layers).sort()).toEqual(Object.keys(PORTRAIT_INDEX).sort());
  });
});
