/**
 * The hero picker composed its 15 portraits all at once: about 12 s on a 4x slower CPU, with the
 * page blocked for 6.5 s. Portraits now compose one after the other, one layer per task.
 */
import { describe, expect, it, vi } from "vitest";

const log = vi.hoisted(() => [] as string[]);
vi.mock("@reading-advantage/avatar-kit", () => ({
  AVATAR_PACK_VERSION: "test",
  PORTRAIT_SIZE: 1,
  starterLoadout: (classId: string) => ({ classId }),
  wornLoadout: () => ({ classId: "worn" }),
  portraitFiles: ({ classId }: { classId: string }) =>
    ["a", "b"].map((layer) => ({ color: `${classId}-${layer}.webp`, mask: `${classId}-${layer}.mask.webp`, scales: [] })),
  portraitPixels: async (url: string) => Object.assign(new Uint8ClampedArray(4), { url }),
  recolorLayer: (color: Uint8ClampedArray & { url: string }) => {
    log.push(color.url.split("/").pop()!);
    return color;
  },
  stackLayers: () => new Uint8ClampedArray(4),
}));

import { composePortrait } from "../portrait-canvas";

describe("composePortrait", () => {
  it("composes one portrait after the other, with no layer work in the calling task", async () => {
    log.length = 0;
    const both = Promise.all([composePortrait("ranger", {}), composePortrait("witch", {})]);
    for (let i = 0; i < 20; i++) await Promise.resolve();
    expect(log).toEqual([]);
    await both;
    expect(log).toEqual(["ranger-a.webp", "ranger-b.webp", "witch-a.webp", "witch-b.webp"]);
  });

  it("stops the work of a portrait that the page no longer shows", async () => {
    log.length = 0;
    const work = new AbortController();
    const stopped = composePortrait("knight", {}, work.signal);
    work.abort();
    await expect(stopped).rejects.toThrow();
    expect(log).toEqual([]);
    await expect(composePortrait("knight", {})).resolves.toBeInstanceOf(Uint8ClampedArray);
    expect(log).toEqual(["knight-a.webp", "knight-b.webp"]);
  });
});
