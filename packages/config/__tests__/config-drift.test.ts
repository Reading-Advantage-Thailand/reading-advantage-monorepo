/**
 * Config drift test — ensures apps don't reintroduce local copies of
 * configs that should be shared across the monorepo.
 */

import { describe, it, expect } from "vitest";
import { existsSync, readFileSync, readdirSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../..");
const APPS_DIR = path.join(REPO_ROOT, "apps");
const PACKAGES_DIR = path.join(REPO_ROOT, "packages");

function getAppDirs(): string[] {
  const entries = existsSync(APPS_DIR)
    ? readdirSync(APPS_DIR, { withFileTypes: true })
    : [];
  return entries
    .filter((e) => e.isDirectory())
    .map((e) => path.join(APPS_DIR, e.name));
}

describe("config drift prevention", () => {
  const apps = getAppDirs();

  it("no app defines its own tailwind.config.js", () => {
    for (const app of apps) {
      const twConfig = path.join(app, "tailwind.config.js");
      const twConfigTs = path.join(app, "tailwind.config.ts");
      expect(
        existsSync(twConfig),
        `${path.basename(app)} should not have tailwind.config.js`
      ).toBe(false);
      expect(
        existsSync(twConfigTs),
        `${path.basename(app)} should not have tailwind.config.ts`
      ).toBe(false);
    }
  });

  it("no app defines its own cn() helper", () => {
    for (const app of apps) {
      const utilsPaths = [
        path.join(app, "lib/utils.ts"),
        path.join(app, "src/lib/utils.ts"),
      ];
      for (const utilsPath of utilsPaths) {
        if (existsSync(utilsPath)) {
          const content = readFileSync(utilsPath, "utf-8");
          expect(
            content.includes("export function cn("),
            `${path.relative(REPO_ROOT, utilsPath)} should not define cn() locally — use @reading-advantage/utils`
          ).toBe(false);
        }
      }
    }
  });

  it("all packages have ESLint configs", () => {
    const entries = existsSync(PACKAGES_DIR)
      ? readdirSync(PACKAGES_DIR, { withFileTypes: true })
      : [];
    const pkgDirs = entries
      .filter((e) => e.isDirectory())
      .map((e) => path.join(PACKAGES_DIR, e.name));

    for (const pkg of pkgDirs) {
      const pkgJson = path.join(pkg, "package.json");
      if (!existsSync(pkgJson)) continue;

      const content = JSON.parse(readFileSync(pkgJson, "utf-8"));
      if (!content.scripts?.lint) continue;

      const hasConfig =
        existsSync(path.join(pkg, "eslint.config.mjs")) ||
        existsSync(path.join(pkg, "eslint.config.js")) ||
        existsSync(path.join(pkg, ".eslintrc.json"));

      expect(
        hasConfig,
        `${path.basename(pkg)} has lint script but no ESLint config`
      ).toBe(true);
    }
  });
});
