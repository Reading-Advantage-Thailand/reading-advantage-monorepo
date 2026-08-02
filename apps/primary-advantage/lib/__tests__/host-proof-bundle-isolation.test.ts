import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const APP_ROOT = process.cwd();

const SERVER_FILES = [
  "app/api/host-proof/games/attempts/route.ts",
  "app/api/host-proof/games/attempts/actions/route.ts",
  "app/api/host-proof/games/completions/route.ts",
  "app/[locale]/(host-proof)/layout.tsx",
  "app/[locale]/(host-proof)/student/host-proof/games/page.tsx",
  "lib/host-proof-config.ts",
];

const CLIENT_FILE = "components/host-proof/HostProofGameClient.tsx";
const CLIENT_LOADER_FILE = "lib/host-proof-cartridge-loader.ts";
const SERVER_SELECTION_FILE = "lib/host-proof-selections.ts";

describe("host-proof bundle isolation", () => {
  it.each(SERVER_FILES)("%s does not import a cartridge loader", (relativePath) => {
    const source = readFileSync(resolve(APP_ROOT, relativePath), "utf-8");
    const staticImport = /import\s+.*\s+from\s+["']@reading-advantage\/game-cartridges(?:\/qc|\/host-proof)?["']/.test(source);
    const dynamicImport = /import\s*\(\s*["']@reading-advantage\/game-cartridges(?:\/qc|\/host-proof)?["']\s*\)/.test(source);

    expect(staticImport).toBe(false);
    expect(dynamicImport).toBe(false);
  });

  it("client component dynamically imports only the local explicit Dragon Flight boundary", () => {
    const source = readFileSync(resolve(APP_ROOT, CLIENT_FILE), "utf-8");
    const loaderSource = readFileSync(resolve(APP_ROOT, CLIENT_LOADER_FILE), "utf-8");
    const staticRuntimeImport = /import\s+(?!type\b).*?from\s+["']@reading-advantage\/game-cartridges(?:\/qc|\/host-proof)?["']/.test(source);
    const dynamicImport = /import\s*\(\s*["']@\/lib\/host-proof-cartridge-loader["']\s*\)/.test(source);

    expect(staticRuntimeImport).toBe(false);
    expect(dynamicImport).toBe(true);
    expect(loaderSource).toContain('from "@reading-advantage/game-cartridges/host-proof"');
    expect(loaderSource).not.toMatch(/from\s+["']@reading-advantage\/game-cartridges["']/);
  });

  it("keeps only the selected Dragon Flight edition on the server selection boundary", () => {
    const clientSource = readFileSync(resolve(APP_ROOT, CLIENT_FILE), "utf-8");
    const selectionSource = readFileSync(resolve(APP_ROOT, SERVER_SELECTION_FILE), "utf-8");

    expect(clientSource).not.toContain("standard-pack-release.json");
    expect(selectionSource).toContain('import "server-only"');
    expect(selectionSource).toContain("getDragonFlightHostProofSelectedEdition");
    expect(selectionSource).not.toContain("standard-pack-release.json");
    expect(selectionSource).not.toContain("createDragonFlightHostProofEdition");
  });
});
