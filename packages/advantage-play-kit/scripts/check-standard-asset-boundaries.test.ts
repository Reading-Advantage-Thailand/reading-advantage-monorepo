import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import {
  DEFAULT_PRODUCTION_SOURCE_ROOTS,
  checkStandardAssetBoundaries,
} from "./check-standard-asset-boundaries.mjs";

const temporaryRoots: string[] = [];

/** Creates an isolated package-shaped fixture and remembers it for cleanup. */
async function createFixture() {
  const root = await mkdtemp(join(tmpdir(), "apk-standard-boundary-"));
  temporaryRoots.push(root);
  await mkdir(join(root, "host"), { recursive: true });
  return root;
}

/** Runs the guard only against the fixture's intentionally finite host root. */
function checkFixture(root: string) {
  return checkStandardAssetBoundaries({
    packageRoot: root,
    sourceRoots: [{ label: "fixture host", root: "host", allowFiles: [] }],
  });
}

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("check-standard-asset-boundaries", () => {
  it("accepts semantic package APIs and ignores files outside its explicit source root", async () => {
    const root = await createFixture();
    await writeFile(join(root, "host", "game.ts"), 'import { createStandardAssetResolver } from "@reading-advantage/advantage-play-kit/assets";\n');
    await mkdir(join(root, "legacy"), { recursive: true });
    await writeFile(join(root, "legacy", "old-edition.ts"), 'import art from "./assets/private/hero.png";\n');

    await expect(checkFixture(root)).resolves.toEqual([]);
  });

  it.each([
    ["STANDARD_PHYSICAL_PATH", 'import hero from "@reading-advantage/advantage-play-kit/assets/standard/hero.png";'],
    ["PRIVATE_PACK_ROOT", 'const hero = new URL("./assets/private/hero.png", import.meta.url);'],
    ["MATERIALIZED_PATH", 'const manifest = "/build/materialized-standard-pack/manifest.json";'],
  ])("rejects %s references in production sources", async (code, source) => {
    const root = await createFixture();
    await writeFile(join(root, "host", "game.ts"), `${source}\n`);

    await expect(checkFixture(root)).resolves.toMatchObject([{ code, file: "host/game.ts", line: 1 }]);
  });

  it("has a finite default scope and current host/cartridge sources satisfy it", async () => {
    expect(DEFAULT_PRODUCTION_SOURCE_ROOTS).toEqual([
      { label: "APK React host", root: "src/react", allowFiles: ["standard-asset-gallery.tsx"] },
      { label: "new game cartridges", root: "../game-cartridges/src", allowFiles: [] },
    ]);
    await expect(checkStandardAssetBoundaries()).resolves.toEqual([]);
  });
});
