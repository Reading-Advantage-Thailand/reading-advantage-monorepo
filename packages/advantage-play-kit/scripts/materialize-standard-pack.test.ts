import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), "materialize-standard-pack.mjs");

function sha256(value: Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "apk-materializer-"));
  const sourceRoot = join(root, "source");
  const outputRoot = join(root, "output");
  const path = "ui/16x16/icons/coin.png";
  const bytes = Buffer.from("fixture-png-bytes");
  await mkdir(join(sourceRoot, dirname(path)), { recursive: true });
  await writeFile(join(sourceRoot, path), bytes);
  const catalog = {
    version: "2026.08.04",
    digest: "catalog-digest",
    sourceReceiptDigest: "receipt-digest",
    requiredCredit: "Pixel art assets by ElvGames",
    assets: [{
      path,
      key: "ui/16x16/icons/coin",
      physical: { byteSize: bytes.length, sha256: sha256(bytes) },
    }],
  };
  const release = join(root, "release.json");
  await writeFile(release, JSON.stringify(catalog));
  return { bytes, outputRoot, release, root, sourceRoot };
}

function args(fixtureValue: Awaited<ReturnType<typeof fixture>>, digest = "catalog-digest", key = "ui/16x16/icons/coin") {
  return [SCRIPT, "--release", fixtureValue.release, "--source-root", fixtureValue.sourceRoot, "--output-root", fixtureValue.outputRoot, "--version", "2026.08.04", "--catalog-digest", digest, "--source-receipt-digest", "receipt-digest", "--key", key];
}

describe("materialize-standard-pack", () => {
  it("copies only a pinned semantic union and emits its credit-bound manifest", async () => {
    const value = await fixture();
    await execFileAsync(process.execPath, args(value));

    expect(await readFile(join(value.outputRoot, "ui/16x16/icons/coin.png"))).toEqual(value.bytes);
    expect(JSON.parse(await readFile(join(value.outputRoot, "materialization-manifest.json"), "utf8"))).toMatchObject({
      requiredCredit: "Pixel art assets by ElvGames",
      files: [{ key: "ui/16x16/icons/coin", path: "ui/16x16/icons/coin.png" }],
    });
  });

  it("rejects stale bindings and direct physical paths", async () => {
    const value = await fixture();
    await expect(execFileAsync(process.execPath, args(value, "stale"))).rejects.toThrow(/stale/i);
    await expect(execFileAsync(process.execPath, args(value, "catalog-digest", "ui/16x16/icons/coin.png"))).rejects.toThrow(/physical paths/i);
  });

  it("rejects source bytes that no longer match the pinned catalog", async () => {
    const value = await fixture();
    await writeFile(join(value.sourceRoot, "ui/16x16/icons/coin.png"), "changed");

    await expect(execFileAsync(process.execPath, args(value))).rejects.toThrow(/source bytes/i);
  });

  it("rejects stale output files outside the selected semantic union", async () => {
    const value = await fixture();
    await mkdir(join(value.outputRoot, "private"), { recursive: true });
    await writeFile(join(value.outputRoot, "private/stale.png"), "stale");

    await expect(execFileAsync(process.execPath, args(value))).rejects.toThrow(/outside the selected semantic union/i);
  });
});
