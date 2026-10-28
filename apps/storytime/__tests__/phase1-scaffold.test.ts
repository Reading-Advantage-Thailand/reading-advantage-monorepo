// @vitest-environment node
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const app = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const root = resolve(app, "../..");

/**
 * Read a required artifact.
 * @param path The artifact path.
 * @returns The file text.
 */
function readRequired(path: string): string {
  expect(existsSync(path), `Missing Phase 1 artifact: ${path}`).toBe(true);
  return readFileSync(path, "utf8");
}

/**
 * Find the app's configuration without requiring one module extension.
 * @returns The configuration path.
 */
function nextConfigPath(): string {
  const name = ["next.config.ts", "next.config.mjs", "next.config.js"].find(
    (candidate) => existsSync(resolve(app, candidate)),
  );
  expect(name, "Missing Storytime Next.js configuration").toBeDefined();
  return resolve(app, name!);
}

describe("Phase 1 scaffold prerequisites for AC-1.1", () => {
  it("declares the app and executable quality scripts", () => {
    const pkg = JSON.parse(readRequired(resolve(app, "package.json")));
    expect(pkg.name).toBe("storytime");
    expect(pkg.private).toBe(true);
    for (const name of ["build", "check-types", "lint", "test"]) {
      expect(pkg.scripts?.[name], `Missing ${name} script`).toEqual(expect.any(String));
      expect(pkg.scripts[name]).not.toMatch(/^(?:true|echo\b|exit\s+0)/);
    }
    expect(pkg.scripts.build).toMatch(/\bnext build\b/);
    expect(pkg.scripts.test).toMatch(/\bvitest\b/);
    const dependencies = { ...pkg.dependencies, ...pkg.devDependencies };
    for (const name of ["next", "react", "react-dom", "next-intl", "tailwindcss", "vitest"]) {
      expect(dependencies[name], `Missing ${name} dependency`).toBeTruthy();
    }
    for (const [name, version] of Object.entries(dependencies)) {
      if (name.startsWith("@reading-advantage/")) expect(version).toBe("workspace:*");
    }
    readRequired(resolve(app, "tsconfig.json"));
  });

  it("uses standalone output and traces from the monorepo root", async () => {
    const path = nextConfigPath();
    const { default: config } = await import(/* @vite-ignore */ path);
    expect(config.output).toBe("standalone");
    expect(resolve(config.outputFileTracingRoot)).toBe(root);
  });

  it("uses Thai by default with both locale prefixes", async () => {
    const path = resolve(app, "i18n/routing.ts");
    readRequired(path);
    const { routing } = await import(/* @vite-ignore */ path);
    expect(routing.locales).toEqual(["th", "en"]);
    expect(routing.defaultLocale).toBe("th");
    expect(routing.localePrefix).toBe("always");
  });

  it("loads Tailwind and scans each direct shared package", () => {
    const cssPath = resolve(app, "app/globals.css");
    const css = readRequired(cssPath);
    expect(css).toMatch(/@import\s+["']tailwindcss["']/);
    const pkg = JSON.parse(readRequired(resolve(app, "package.json")));
    const sources = [...css.matchAll(/@source\s+["']([^"']+)["']/g)].map(
      ([, path]) => resolve(dirname(cssPath), path),
    );
    const shared = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies }).filter((name) =>
      name.startsWith("@reading-advantage/"),
    );
    // The scan must read a real set of packages. An empty set would pass the loop below (A4).
    expect(shared.length, "The app depends on no shared workspace package").toBeGreaterThan(0);
    for (const name of shared) {
      const packageDirectory = readdirSync(resolve(root, "packages")).find((entry) => {
        const manifest = resolve(root, "packages", entry, "package.json");
        return existsSync(manifest) && JSON.parse(readFileSync(manifest, "utf8")).name === name;
      });
      expect(packageDirectory, `Unknown workspace package ${name}`).toBeDefined();
      const directory = resolve(root, "packages", packageDirectory!);
      expect(sources.some((path) => path === directory || path.startsWith(`${directory}/`)),
        `Missing Tailwind @source for ${name}`).toBe(true);
    }
  });

  it("has the App Router layout and locale messages", () => {
    readRequired(resolve(app, "app/[locale]/layout.tsx"));
    for (const locale of ["th", "en"]) {
      expect(JSON.parse(readRequired(resolve(app, `messages/${locale}.json`)))).toEqual(expect.any(Object));
    }
  });

  it("answers with notFound for every week before Phase 3", async () => {
    const path = resolve(app, "app/[locale]/st/[level]/[week]/page.tsx");
    readRequired(path);
    const { default: Page } = await import(/* @vite-ignore */ path);
    for (const locale of ["th", "en"]) {
      for (const [level, week] of [["2", "1"], ["2", "8"], ["1", "1"], ["4", "52"], ["bad", "0"]]) {
        await expect(Promise.resolve().then(() => Page({
          params: Promise.resolve({ locale, level, week }),
          searchParams: Promise.resolve({}),
        }))).rejects.toMatchObject({ digest: "NEXT_HTTP_ERROR_FALLBACK;404" });
      }
    }
  });
});
