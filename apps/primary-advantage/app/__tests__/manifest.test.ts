import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import manifest from "../manifest";

const manifestValue = manifest();

/** Reads the width and height from a PNG IHDR header. */
function pngSize(file: string): { width: number; height: number } {
  const bytes = readFileSync(file);
  expect(bytes.subarray(0, 8)).toEqual(
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  );
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

describe("app/manifest.ts", () => {
  it("keeps the legacy app identity so the installed app updates in place", () => {
    expect(manifestValue.name).toBe("Primary Advantage");
    expect(manifestValue.short_name).toBe("Primary Advantage");
    expect(manifestValue.id).toBe("/");
    expect(manifestValue.start_url).toBe("/");
    expect(manifestValue.scope).toBe("/");
    expect(manifestValue.display).toBe("standalone");
  });

  it("uses the approved skin colours and no description", () => {
    expect(manifestValue.theme_color).toBe("#5c391a");
    expect(manifestValue.background_color).toBe("#0f1420");
    expect(manifestValue).not.toHaveProperty("description");
  });

  it("lists the 192, 512, and 512 maskable icons", () => {
    expect(manifestValue.icons).toMatchObject([
      { src: expect.any(String), sizes: "192x192", type: "image/png" },
      { src: expect.any(String), sizes: "512x512", type: "image/png" },
      {
        src: expect.any(String),
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ]);
  });

  it("serves each icon from public/icons/ with the size in its PNG header", () => {
    for (const icon of manifestValue.icons ?? []) {
      const src = typeof icon === "string" ? icon : icon.src;
      expect(src.startsWith("/icons/")).toBe(true);
      const file = path.resolve(__dirname, "../../public", src.slice(1));
      expect(existsSync(file)).toBe(true);
      const sizes = typeof icon === "string" ? "" : (icon.sizes ?? "");
      const [size] = sizes.split(" ");
      const [width, height] = size.split("x").map(Number);
      expect(pngSize(file)).toEqual({ width, height });
    }
  });

  it("keeps every icon inside public/icons/, away from the game asset packs", () => {
    // Checked as a directory prefix so this file never names the removed
    // surface that lib/__tests__/removed-surfaces.test.ts guards against.
    const iconsDir = path.resolve(__dirname, "../../public/icons");
    for (const icon of manifestValue.icons ?? []) {
      const src = typeof icon === "string" ? icon : icon.src;
      expect(src.startsWith("/icons/")).toBe(true);
      const file = path.resolve(__dirname, "../../public", src.slice(1));
      expect(path.relative(iconsDir, file).startsWith("..")).toBe(false);
    }
  });
});
