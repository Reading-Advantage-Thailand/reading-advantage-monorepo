import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { verifyStandardPackParity } from "./verify-standard-pack-parity.mjs";

const temporaryRoots: string[] = [];

/** Builds a minimal standard-pack fixture with one image and one audio asset. */
async function createFixture() {
  const root = await mkdtemp(join(tmpdir(), "apk-standard-parity-"));
  temporaryRoots.push(root);
  await mkdir(join(root, "audio"), { recursive: true });
  await mkdir(join(root, "images"), { recursive: true });
  const image = Buffer.alloc(24);
  image.write("89504e470d0a1a0a", 0, "hex");
  image.write("IHDR", 12, "ascii");
  image.writeUInt32BE(16, 16);
  image.writeUInt32BE(8, 20);
  await writeFile(join(root, "images", "hero.png"), image);
  await writeFile(join(root, "audio", "hit.ogg"), "sound");
  await writeFile(join(root, "IMPORT-RECEIPT.tsv"), [
    "destination\tsource_archive\tnested_archive_chain\tsource_member\tcell_size",
    "images/hero.png\tsource.zip\t\thero.png\t16x8",
  ].join("\n"));
  await writeFile(join(root, "CURATED-RECEIPT.tsv"), [
    "destination\tsource_archive\tnested_archive_chain\tsource_member\tcell_size",
    "audio/hit.ogg\tsource.zip\t\thit.ogg\tnative",
  ].join("\n"));
  const imageSha = "439b855c0a7b8d7cb41a3cc9ded221f14895fe3785721bbeefa25e123e9f26da";
  const audioSha = "dd29442deca69f52c50006b831cb216edf78a7da33748f0a80ff19f2ebe57ecd";
  await writeFile(join(root, "catalog.json"), JSON.stringify({
    assets: [
      { path: "images/hero.png", sourceReceiptLocator: "IMPORT-RECEIPT.tsv:2", physical: { kind: "image", byteSize: 24, sha256: imageSha, dimensions: { width: 16, height: 8 }, frameGrid: null } },
      { path: "audio/hit.ogg", sourceReceiptLocator: "CURATED-RECEIPT.tsv:2", physical: { kind: "audio", byteSize: 5, sha256: audioSha, dimensions: null, frameGrid: null } },
    ],
  }));
  return root;
}

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("verifyStandardPackParity", () => {
  it("proves a one-to-one filesystem, receipt, catalog, and physical-metadata mapping", async () => {
    const root = await createFixture();
    await expect(verifyStandardPackParity({ standardRoot: root, catalogPath: join(root, "catalog.json") })).resolves.toEqual({ assets: 2, images: 1, audio: 1, fonts: 0 });
  });

  it("rejects missing and extra receipt or catalog records", async () => {
    const root = await createFixture();
    await writeFile(join(root, "CURATED-RECEIPT.tsv"), "destination\tsource_archive\tnested_archive_chain\tsource_member\tcell_size\nghost.ogg\tsource.zip\t\tghost.ogg\tnative");
    await expect(verifyStandardPackParity({ standardRoot: root, catalogPath: join(root, "catalog.json") })).rejects.toThrow("Receipt paths do not match filesystem paths");

    const secondRoot = await createFixture();
    const catalogPath = join(secondRoot, "catalog.json");
    const catalog = JSON.parse(await readFile(catalogPath, "utf8"));
    catalog.assets.pop();
    await writeFile(catalogPath, JSON.stringify(catalog));
    await expect(verifyStandardPackParity({ standardRoot: secondRoot, catalogPath })).rejects.toThrow("Catalog paths do not match filesystem paths");

  });

  it("rejects tampered bytes, SHA-256 values, and encoded image dimensions", async () => {
    const root = await createFixture();
    const catalogPath = join(root, "catalog.json");
    const catalog = JSON.parse(await readFile(catalogPath, "utf8"));
    catalog.assets[0].physical.sha256 = "0".repeat(64);
    await writeFile(catalogPath, JSON.stringify(catalog));
    await expect(verifyStandardPackParity({ standardRoot: root, catalogPath })).rejects.toThrow("SHA-256");

    catalog.assets[0].physical.sha256 = "439b855c0a7b8d7cb41a3cc9ded221f14895fe3785721bbeefa25e123e9f26da";
    catalog.assets[0].physical.dimensions.width = 17;
    await writeFile(catalogPath, JSON.stringify(catalog));
    await expect(verifyStandardPackParity({ standardRoot: root, catalogPath })).rejects.toThrow("dimensions");

    catalog.assets[0].physical.dimensions.width = 16;
    catalog.assets[0].physical.byteSize = 23;
    await writeFile(catalogPath, JSON.stringify(catalog));
    await expect(verifyStandardPackParity({ standardRoot: root, catalogPath })).rejects.toThrow("byte size");
  });
});
