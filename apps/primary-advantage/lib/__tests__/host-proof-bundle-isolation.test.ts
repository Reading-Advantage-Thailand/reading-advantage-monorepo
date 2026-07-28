import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const APP_ROOT = process.cwd();

const SERVER_FILES = [
  "app/api/host-proof/games/completions/route.ts",
  "app/[locale]/(host-proof)/layout.tsx",
  "app/[locale]/(host-proof)/student/host-proof/games/page.tsx",
  "lib/host-proof-config.ts",
];

const CLIENT_FILE = "components/host-proof/HostProofGameClient.tsx";

describe("host-proof bundle isolation", () => {
  it.each(SERVER_FILES)("%s does not statically import the QC loader", (relativePath) => {
    const source = readFileSync(resolve(APP_ROOT, relativePath), "utf-8");
    const staticImport = /import\s+.*\s+from\s+["']@reading-advantage\/game-cartridges(?:\/qc)?["']/.test(source);
    const dynamicImport = /import\s*\(\s*["']@reading-advantage\/game-cartridges(?:\/qc)?["']\s*\)/.test(source);

    expect(staticImport).toBe(false);
    expect(dynamicImport).toBe(false);
  });

  it("client component only dynamically imports the QC loader", () => {
    const source = readFileSync(resolve(APP_ROOT, CLIENT_FILE), "utf-8");
    const staticImport = /import\s+.*\s+from\s+["']@reading-advantage\/game-cartridges\/qc["']/.test(source);
    const dynamicImport = /import\s*\(\s*["']@reading-advantage\/game-cartridges\/qc["']\s*\)/.test(source);

    expect(staticImport).toBe(false);
    expect(dynamicImport).toBe(true);
  });
});
