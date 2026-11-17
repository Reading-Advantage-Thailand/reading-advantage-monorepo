/**
 * Real Advantage logos — adversarial tests for Phase 1 (FR-1 to FR-5).
 *
 * Track: www_real_logos_20261008. Role: measure-adversarial-testing.
 *
 * These tests attack the Phase 1 implementation. They read the real files under
 * `public/` and the real generator script. They do not change production code.
 *
 * The attacks:
 * - A4: the removed-literal sweep must read a non-empty file set that holds the
 *   known logo consumers. A sweep of an empty root reports zero hits and proves
 *   nothing.
 * - Wrong kind: a mapped path must hold the artwork of its own kind. The
 *   `square` field must not point at a horizontal file.
 * - Stub file: a mapped file must hold real SVG bytes, not an empty placeholder.
 * - Dead reference: no app-served file outside `src/` may name a removed raster.
 * - A10: the committed manifest must equal the manifest the generator writes.
 */
import { existsSync, mkdtempSync, readFileSync, readdirSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { siteLogos } from "../site-assets";

const APP_ROOT = process.cwd();
const SRC_DIR = join(APP_ROOT, "src");
const PUBLIC_DIR = join(APP_ROOT, "public");
const LOGO_BASE = join(PUBLIC_DIR, "media/brand/logos");
const LOGO_ROOT = join(LOGO_BASE, "vector");
const GENERATOR_PATH = join(APP_ROOT, "scripts/build-site-assets.py");
const MANIFEST_PATH = join(APP_ROOT, "src/lib/site-assets.ts");

const PRODUCT_IDS = [
  "codecamp",
  "mastery",
  "math",
  "primary",
  "reading",
  "science",
  "stem",
  "storytime",
  "tutor",
  "zhongwen",
] as const;

const REMOVED_LITERALS = [
  "/media/brand/logos/svg/",
  "/media/brand/logos/reversed/",
  "/media/brand/logos/lockups/",
  "/math-advantage.png",
  "/science-advantage.png",
  "/stem-advantage.png",
  "/storytime-advantage.png",
  "/tutor-advantage.png",
  "/zhongwen-advantage.png",
  "/primary-advantage logo.png",
  "/reading-advantage.jpg",
] as const;

const MAPPED_KINDS = {
  color: "vector/horizontal",
  reversed: "vector/horizontal-dark-inverse",
  thaiLockup: "vector/lockup-thai",
  square: "vector/square",
} as const;

const EXTRA_KINDS = [
  "vector/lockup-thai-dark",
  "vector/lockup-thai-dark-inverse",
] as const;

const CONSUMER_FILES = [
  "components/products/b2b-solutions.tsx",
  "components/products/tutor-advantage.tsx",
  "app/[locale]/(marketing)/(home)/page.tsx",
  "app/[locale]/(marketing)/mastery-advantage/page.tsx",
  "app/[locale]/(marketing)/products/math-advantage/page.tsx",
  "app/[locale]/(marketing)/products/primary-advantage/page.tsx",
  "app/[locale]/(marketing)/products/reading-advantage/page.tsx",
  "app/[locale]/(marketing)/products/science-advantage/page.tsx",
  "app/[locale]/(marketing)/products/stem-advantage/page.tsx",
  "app/[locale]/(marketing)/products/storytime-advantage/page.tsx",
  "app/[locale]/(marketing)/products/zhongwen-advantage/page.tsx",
] as const;

const APP_ROOT_FILES = [
  "next.config.ts",
  "postcss.config.mjs",
  "eslint.config.mjs",
  "playwright.config.ts",
  "vitest.config.ts",
  "tsconfig.json",
  "package.json",
  "components.json",
] as const;

const SOURCE_EXTENSIONS = /\.(ts|tsx|js|jsx|mjs|cjs|mdx|css|md)$/;
const TEST_FILE_PATTERN = /\.(test|spec)\.[a-z]+$/;
const ASSET_LITERAL_PATTERN =
  /["'`]\/([A-Za-z0-9_\-./()[\] ]+\.(?:svg|png|jpe?g|webp|ico|mp4|webmanifest|woff2?))["'`]/g;

/**
 * Lists every file under a directory. The paths use forward slashes.
 * @param dir The directory to walk.
 * @returns The relative paths of every file under the directory.
 */
function listFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const found: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const abs = join(dir, entry.name);
    if (entry.isDirectory()) {
      for (const nested of listFiles(abs)) {
        found.push(`${entry.name}/${nested}`);
      }
    } else {
      found.push(entry.name);
    }
  }
  return found.sort();
}

/**
 * Builds the path of a logo file under the public logo tree.
 * @param kind The logo kind, for example `vector/square`.
 * @param fileName The file name.
 * @returns The absolute path of the logo file.
 */
function logoPath(kind: string, fileName: string): string {
  return join(LOGO_BASE, kind, fileName);
}

/**
 * Collects the production source files under a root directory.
 * @param root The directory to walk.
 * @returns The relative paths of the production source files.
 */
function collectProductionSources(root: string): string[] {
  const found: string[] = [];
  for (const rel of listFiles(root)) {
    if (!SOURCE_EXTENSIONS.test(rel)) continue;
    if (TEST_FILE_PATTERN.test(rel)) continue;
    if (rel.split("/").includes("__tests__")) continue;
    found.push(rel);
  }
  return found;
}

/**
 * Reads the viewBox width and height of an SVG file.
 * @param path The absolute path of the SVG file.
 * @returns The viewBox width and height.
 */
function viewBoxSize(path: string): { width: number; height: number } {
  const match = /viewBox="([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)"/.exec(
    readFileSync(path, "utf-8"),
  );
  if (!match) throw new Error(`no viewBox in ${path}`);
  return { width: Number(match[3]), height: Number(match[4]) };
}

/**
 * Extracts the lines of a top-level assignment in the generator script.
 * @param name The name of the assignment.
 * @returns The source lines of the assignment.
 */
function generatorBlock(name: string): string {
  const lines = readFileSync(GENERATOR_PATH, "utf-8").split("\n");
  const start = lines.findIndex((line) => line.startsWith(`${name} = `));
  if (start < 0) throw new Error(`no ${name} assignment in the generator`);
  const block: string[] = [];
  for (let index = start; index < lines.length; index += 1) {
    const line = lines[index];
    if (index > start && line.trim() !== "" && !line.startsWith(" ")) break;
    block.push(line);
  }
  return block.join("\n");
}

/**
 * Reads the manifest field to logo kind mapping from the generator script.
 * @returns The manifest field to logo kind mapping.
 */
function generatorLogoSets(): Map<string, { kind: string; pattern: string }> {
  const sets = new Map<string, { kind: string; pattern: string }>();
  const pattern = /"([A-Za-z]+)":\s*\("([^"]+)",\s*"([^"]+)"\)/g;
  for (const match of generatorBlock("LOGO_SETS").matchAll(pattern)) {
    sets.set(match[1], { kind: match[2], pattern: match[3] });
  }
  return sets;
}

/**
 * Reads the quoted names of a generator list assignment.
 * @param name The name of the assignment.
 * @returns The quoted names in the assignment.
 */
function generatorList(name: string): string[] {
  return [...generatorBlock(name).matchAll(/"([^"]+)"/g)].map(
    (match) => match[1],
  );
}

/**
 * Builds the manifest block the generator writes for the logos.
 * @param products The product ids in generator order.
 * @param sets The manifest field to logo kind mapping.
 * @returns The expected `siteLogos` block.
 */
function expectedLogoBlock(
  products: string[],
  sets: Map<string, { kind: string; pattern: string }>,
): string {
  const lines = ["export const siteLogos = {"];
  for (const product of products) {
    const fields = [...sets.entries()].map(
      ([field, spec]) =>
        `${field}: "/media/brand/logos/${spec.kind}/${spec.pattern.replace("{p}", product)}"`,
    );
    lines.push(`  ${product}: { ${fields.join(", ")} },`);
  }
  lines.push("} as const;");
  return lines.join("\n");
}

/**
 * Reads the committed `siteLogos` block from the manifest file.
 * @returns The committed `siteLogos` block.
 */
function committedLogoBlock(): string {
  const text = readFileSync(MANIFEST_PATH, "utf-8");
  const start = text.indexOf("export const siteLogos = {");
  const end = text.indexOf("} as const;", start);
  if (start < 0 || end < 0) throw new Error("no siteLogos block in the manifest");
  return text.slice(start, end + "} as const;".length);
}

const allLogoFiles = [
  ...Object.values(MAPPED_KINDS),
  ...EXTRA_KINDS,
].flatMap((kind) =>
  PRODUCT_IDS.map((id) => logoPath(kind, `${id}-advantage.svg`)),
);

describe("A4: the removed-literal sweep reads a real file set", () => {
  it("reads at least fifty production source files under src/", () => {
    expect(collectProductionSources(SRC_DIR).length).toBeGreaterThanOrEqual(50);
  });

  it("reads the known logo consumers under src/", () => {
    const files = collectProductionSources(SRC_DIR);
    for (const consumer of CONSUMER_FILES) {
      expect(files).toContain(consumer);
    }
  });

  it("reads a consumer file that names the siteLogos manifest", () => {
    const files = collectProductionSources(SRC_DIR);
    const users = files.filter((rel) =>
      readFileSync(join(SRC_DIR, rel), "utf-8").includes("siteLogos."),
    );
    expect(users.length).toBeGreaterThanOrEqual(9);
    expect(users).toContain("components/products/b2b-solutions.tsx");
  });

  it("reports zero hits for an empty root, so a zero-hit sweep alone proves nothing", () => {
    const emptyRoot = mkdtempSync(join(tmpdir(), "real-logos-empty-"));
    const files = collectProductionSources(emptyRoot);
    expect(files).toEqual([]);
    const hits = REMOVED_LITERALS.filter((literal) =>
      files.some((rel) => readFileSync(join(emptyRoot, rel), "utf-8").includes(literal)),
    );
    expect(hits).toEqual([]);
  });
});

describe("FR-5: no production source names a removed path", () => {
  for (const literal of REMOVED_LITERALS) {
    it(`finds no "${literal}" under src/`, () => {
      const hits = collectProductionSources(SRC_DIR).filter((rel) =>
        readFileSync(join(SRC_DIR, rel), "utf-8").includes(literal),
      );
      expect(hits).toEqual([]);
    });
  }
});

describe("FR-5: no app-served file outside src/ names a removed path", () => {
  for (const file of APP_ROOT_FILES) {
    it(`finds no removed path in ${file}`, () => {
      const text = readFileSync(join(APP_ROOT, file), "utf-8");
      const hits = REMOVED_LITERALS.filter((literal) => text.includes(literal));
      expect(hits).toEqual([]);
    });
  }

  it("finds no removed path in a public manifest or JSON file", () => {
    const files = listFiles(PUBLIC_DIR).filter(
      (rel) => rel.endsWith(".webmanifest") || rel.endsWith(".json"),
    );
    const hits: string[] = [];
    for (const rel of files) {
      const text = readFileSync(join(PUBLIC_DIR, rel), "utf-8");
      for (const literal of REMOVED_LITERALS) {
        if (text.includes(literal)) hits.push(`${rel} -> ${literal}`);
      }
    }
    expect(hits).toEqual([]);
  });

  it("resolves every app-served asset literal to a file under public/", () => {
    const missing: string[] = [];
    for (const rel of collectProductionSources(SRC_DIR)) {
      if (rel.startsWith("test/")) continue;
      const text = readFileSync(join(SRC_DIR, rel), "utf-8");
      for (const match of text.matchAll(ASSET_LITERAL_PATTERN)) {
        const asset = match[1];
        if (!existsSync(join(PUBLIC_DIR, asset))) {
          missing.push(`${rel} -> /${asset}`);
        }
      }
    }
    expect(missing).toEqual([]);
  });
});

describe("mapping: each field holds the artwork of its own kind", () => {
  for (const id of PRODUCT_IDS) {
    it(`pins "${id}" square to vector/square`, () => {
      expect(siteLogos[id].square).toBe(
        `/media/brand/logos/vector/square/${id}-advantage.svg`,
      );
      expect(existsSync(join(PUBLIC_DIR, siteLogos[id].square))).toBe(true);
    });

    it(`pins "${id}" color to vector/horizontal`, () => {
      expect(siteLogos[id].color).toBe(
        `/media/brand/logos/vector/horizontal/${id}-advantage.svg`,
      );
      expect(existsSync(join(PUBLIC_DIR, siteLogos[id].color))).toBe(true);
    });

    it(`pins "${id}" reversed to vector/horizontal-dark-inverse`, () => {
      expect(siteLogos[id].reversed).toBe(
        `/media/brand/logos/vector/horizontal-dark-inverse/${id}-advantage.svg`,
      );
      expect(existsSync(join(PUBLIC_DIR, siteLogos[id].reversed))).toBe(true);
    });

    it(`keeps the "${id}" reversed artwork different from the color artwork`, () => {
      const color = readFileSync(join(PUBLIC_DIR, siteLogos[id].color));
      const reversed = readFileSync(join(PUBLIC_DIR, siteLogos[id].reversed));
      expect(reversed.equals(color)).toBe(false);
    });
  }

  for (const kind of EXTRA_KINDS) {
    it(`holds the ten product files under ${kind}`, () => {
      const files = listFiles(join(LOGO_BASE, kind)).filter((rel) =>
        rel.endsWith(".svg"),
      );
      expect(files).toEqual(
        PRODUCT_IDS.map((id) => `${id}-advantage.svg`).slice().sort(),
      );
    });
  }
});

describe("artwork: each mapped file holds the right shape and real bytes", () => {
  for (const id of PRODUCT_IDS) {
    it(`draws "${id}" square as a square`, () => {
      const size = viewBoxSize(logoPath("vector/square", `${id}-advantage.svg`));
      expect(size.width).toBe(size.height);
    });

    for (const kind of ["vector/horizontal", "vector/horizontal-dark-inverse", "vector/lockup-thai"]) {
      it(`draws "${id}" ${kind} wider than tall`, () => {
        const size = viewBoxSize(logoPath(kind, `${id}-advantage.svg`));
        expect(size.width).toBeGreaterThan(size.height);
      });
    }
  }

  it("keeps every mapped logo file non-empty and real SVG bytes", () => {
    const problems: string[] = [];
    for (const path of allLogoFiles) {
      const name = relative(APP_ROOT, path);
      if (!existsSync(path)) {
        problems.push(`${name} missing`);
        continue;
      }
      const size = statSync(path).size;
      if (size < 1024 || size > 35840) problems.push(`${name} size ${size}`);
      const text = readFileSync(path, "utf-8");
      if (!text.startsWith("<svg") && !text.startsWith("<?xml")) {
        problems.push(`${name} no svg root`);
      }
      if (!text.includes("<svg")) problems.push(`${name} no svg element`);
      if (!text.includes('viewBox="')) problems.push(`${name} no viewBox`);
      if (!text.includes('role="img"')) problems.push(`${name} no role`);
      if (!text.includes("<title")) problems.push(`${name} no title`);
      if (text.includes("<text")) problems.push(`${name} holds a text element`);
      if (text.includes("<image")) problems.push(`${name} holds an image element`);
      if (text.includes("xlink:href")) problems.push(`${name} holds an external link`);
    }
    expect(problems).toEqual([]);
  });
});

describe("A10: the committed manifest matches the generator script", () => {
  it("reads four manifest fields from the generator", () => {
    const sets = generatorLogoSets();
    expect([...sets.keys()].sort()).toEqual(
      Object.keys(MAPPED_KINDS).slice().sort(),
    );
    for (const [field, spec] of sets) {
      expect(spec.kind).toBe(MAPPED_KINDS[field as keyof typeof MAPPED_KINDS]);
      expect(spec.pattern).toBe("{p}-advantage.svg");
    }
  });

  it("reads the two extra lockup kinds from the generator", () => {
    expect(generatorList("LOGO_EXTRA_SETS")).toEqual([...EXTRA_KINDS]);
  });

  it("reads the ten product ids from the generator", () => {
    expect(generatorList("PRODUCTS")).toEqual([...PRODUCT_IDS]);
  });

  it("reads the favicon source and both favicon targets from the generator", () => {
    const source = [...generatorBlock("FAVICON_SRC").matchAll(/"([^"]+)"/g)]
      .map((match) => match[1])
      .join("/");
    expect(source).toBe("logos/png/favicon/reading-advantage.ico");
    const targets = [
      ...generatorBlock("FAVICON_DESTS").matchAll(/os\.path\.join\(([^)]*)\)/g),
    ].map((match) =>
      [...match[1].matchAll(/"([^"]+)"/g)].map((part) => part[1]).join("/"),
    );
    expect(targets).toEqual([
      "public/favicon.ico",
      "src/app/[locale]/favicon.ico",
    ]);
  });

  it("writes the same siteLogos block the committed manifest holds", () => {
    const sets = generatorLogoSets();
    const products = generatorList("PRODUCTS");
    expect(expectedLogoBlock(products, sets)).toBe(committedLogoBlock());
  });

  it("copies every logo kind that the public tree holds", () => {
    const sets = generatorLogoSets();
    const generatorKinds = [
      ...[...sets.values()].map((spec) => spec.kind),
      ...generatorList("LOGO_EXTRA_SETS"),
    ].map((kind) => kind.split("/").pop() as string);
    const onDisk = listFiles(LOGO_ROOT)
      .map((rel) => rel.split("/")[0])
      .filter((kind, index, all) => all.indexOf(kind) === index);
    expect(onDisk.sort()).toEqual([...new Set(generatorKinds)].sort());
  });
});
