import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { siteImages, siteLogos, siteVideos } from "../site-assets";

const publicPath = (url: string) => join(process.cwd(), "public", url);

describe("site assets manifest", () => {
  it("lists only files that exist in public/", () => {
    const urls = [
      ...Object.values(siteImages).flatMap((i) => [i.sm, i.lg]),
      ...Object.values(siteLogos).flatMap((l) => Object.values(l)),
      ...Object.values(siteVideos).flatMap((v) => [v.src, v.poster]),
    ];
    const missing = urls.filter((u) => !existsSync(publicPath(u)));
    expect(missing).toEqual([]);
  });

  it("keeps Chibi Quest art to the primary and tutor pages", () => {
    const chibi = Object.entries(siteImages).filter(([k]) => k.startsWith("chibi"));
    expect(chibi.length).toBeGreaterThan(0);
    for (const [, image] of chibi) {
      expect([...image.tags].sort()).toEqual(["primary", "tutor"]);
    }
  });
});
