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
const CLIENT_LOADER_FILE = "lib/host-proof-qc-loader.ts";
const NEXT_CONFIG_FILE = "next.config.ts";

describe("host-proof bundle isolation", () => {
  it.each(SERVER_FILES)("%s does not import a cartridge loader", (relativePath) => {
    const source = readFileSync(resolve(APP_ROOT, relativePath), "utf-8");
    const staticImport =
      /import\s+.*\s+from\s+["']@reading-advantage\/game-cartridges(?:\/qc)?["']/.test(source);
    const dynamicImport =
      /import\s*\(\s*["']@reading-advantage\/game-cartridges(?:\/qc)?["']\s*\)/.test(source);

    expect(staticImport).toBe(false);
    expect(dynamicImport).toBe(false);
  });

  it("loads the bounded QC cartridge module through a client-only local dynamic boundary", () => {
    const clientSource = readFileSync(resolve(APP_ROOT, CLIENT_FILE), "utf-8");
    const loaderSource = readFileSync(resolve(APP_ROOT, CLIENT_LOADER_FILE), "utf-8");
    const runtimeStaticImport =
      /import\s+(?!type\b).*?\s+from\s+["']@reading-advantage\/game-cartridges\/qc["']/.test(clientSource);
    const rootCartridgeImport =
      /(?:from\s+|import\s*\(\s*)["']@reading-advantage\/game-cartridges["']/.test(clientSource);
    const dynamicLocalLoaderImport =
      /import\s*\(\s*["']@\/lib\/host-proof-qc-loader["']\s*\)/.test(clientSource);
    const loaderRuntimeImport =
      /from\s+["']@reading-advantage\/game-cartridges\/qc["']/.test(loaderSource);

    expect(runtimeStaticImport).toBe(false);
    expect(rootCartridgeImport).toBe(false);
    expect(dynamicLocalLoaderImport).toBe(true);
    expect(loaderRuntimeImport).toBe(true);
  });

  it("transpiles the runtime workspace packages behind the dynamic QC boundary", () => {
    const source = readFileSync(resolve(APP_ROOT, NEXT_CONFIG_FILE), "utf-8");

    for (const packageName of [
      "@reading-advantage/ai",
      "@reading-advantage/advantage-play-kit",
      "@reading-advantage/game-cartridges",
      "@reading-advantage/game-contracts",
    ]) {
      expect(source).toContain(`"${packageName}"`);
    }
  });

  it("allows the local Kimi browser origin during development", () => {
    const source = readFileSync(resolve(APP_ROOT, NEXT_CONFIG_FILE), "utf-8");

    expect(source).toMatch(/allowedDevOrigins:\s*\["127\.0\.0\.1"\]/);
  });
});
