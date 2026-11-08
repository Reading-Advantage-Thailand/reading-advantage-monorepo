/**
 * Task 2.2: the 2D and recorded-sound rules of the look (AC-2.3; strategy P2.2, guard test).
 *
 * Storytime is 2D only and plays only recorded files. The test parses every `.ts` and `.tsx`
 * source file under `app/`, `lib/`, and `packages/read-along` (without tests) with the TypeScript
 * compiler API and walks imports, identifiers, call arguments, and JSX tags. A comment or a
 * string is not code (anti-patterns A1 and A7), so a word in a comment never flags.
 *
 * Fact M40: no code holds a WebGL or tone call at the base, so the live scan passes at the base
 * (named guard file). The four self-tests prove that the detector flags real code and ignores a
 * comment; a broken detector fails them.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { parseCss } from "./helpers/css-rules";

const app = resolve(import.meta.dirname, "..");
const readAlong = resolve(app, "../../packages/read-along");
const lookCssPath = resolve(app, "app/look.css");

/** The module names that bring a 3D or game engine. */
const BANNED_MODULES = [/^three(\/|$)/, /^@react-three\//, /^@babylonjs\//, /^pixi\.js$/, /^phaser$/];
/** The identifiers of WebGL, tone, and phone-voice APIs. */
const BANNED_IDENTIFIERS = new Set([
  "WebGLRenderingContext",
  "WebGL2RenderingContext",
  "AudioContext",
  "webkitAudioContext",
  "OscillatorNode",
  "createOscillator",
  "speechSynthesis",
  "SpeechSynthesisUtterance",
]);
/** The context names that open a 3D canvas. */
const WEBGL_CONTEXTS = new Set(["webgl", "webgl2", "experimental-webgl"]);

/**
 * Scans one source text for a 3D call, a synthetic tone, or a phone voice.
 * @param fileName The file name (its extension picks the script kind).
 * @param text The source text.
 * @returns The violations, each with the kind of the hit.
 */
function scanSource(fileName: string, text: string): string[] {
  const kind = fileName.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const source = ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, true, kind);
  const hits: string[] = [];
  const visit = (node: ts.Node): void => {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteralLike(node.moduleSpecifier) &&
      BANNED_MODULES.some((pattern) => pattern.test((node.moduleSpecifier as ts.StringLiteralLike).text))
    ) {
      hits.push(`import ${(node.moduleSpecifier as ts.StringLiteralLike).text}`);
    }
    if (ts.isIdentifier(node) && BANNED_IDENTIFIERS.has(node.text)) hits.push(`identifier ${node.text}`);
    if (ts.isCallExpression(node)) {
      const callee = node.expression;
      const name = ts.isPropertyAccessExpression(callee)
        ? callee.name.text
        : ts.isIdentifier(callee)
          ? callee.text
          : "";
      const first = node.arguments[0];
      if (name === "getContext" && first && ts.isStringLiteralLike(first) && WEBGL_CONTEXTS.has(first.text)) {
        hits.push(`getContext ${first.text}`);
      }
    }
    if (
      (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) &&
      ts.isIdentifier(node.tagName) &&
      node.tagName.text === "canvas"
    ) {
      hits.push("jsx canvas");
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return hits;
}

/**
 * Lists the source files under one folder, without tests and dependency folders.
 * @param directory The folder.
 * @returns The absolute file paths.
 */
function sourceFiles(directory: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === "__tests__" || entry.name === ".next") continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...sourceFiles(path));
    else if (/\.(ts|tsx)$/.test(entry.name) && !/\.test\.(ts|tsx)$/.test(entry.name)) files.push(path);
  }
  return files;
}

describe("2D and recorded sound only (AC-2.3)", () => {
  it("scans the source files with the compiler parser (files_scanned above 40)", () => {
    const files = [...sourceFiles(resolve(app, "app")), ...sourceFiles(resolve(app, "lib")), ...sourceFiles(readAlong)];
    expect(`files_scanned=${files.length}`).toMatch(/^files_scanned=[0-9]+$/);
    expect(files.length, `files_scanned=${files.length} must be above 40`).toBeGreaterThan(40);
  });

  it("no source file imports a 3D engine, opens WebGL, makes a synthetic tone, or speaks", () => {
    const files = [...sourceFiles(resolve(app, "app")), ...sourceFiles(resolve(app, "lib")), ...sourceFiles(readAlong)];
    expect(files.length, "the scan must read files").toBeGreaterThan(40);
    const hits: string[] = [];
    for (const file of files) {
      for (const hit of scanSource(file, readFileSync(file, "utf8"))) hits.push(`${file}: ${hit}`);
    }
    expect(hits).toEqual([]);
  });

  it("look.css holds no url() of an audio file", () => {
    // The file does not exist at the base; the look-assets file fails on its absence. This guard
    // reads the file when it exists, and it records the label so the pass is not silent.
    const present = existsSync(lookCssPath);
    expect(`look_css_present=${present ? 1 : 0}`).toMatch(/^look_css_present=[01]$/);
    if (!present) return;
    const urls: string[] = [];
    for (const rule of parseCss(readFileSync(lookCssPath, "utf8"))) {
      for (const declaration of rule.declarations) {
        for (const match of declaration.value.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)) urls.push(match[1]!);
      }
    }
    expect(urls.filter((url) => /\.(mp3|wav|ogg|m4a|aac|webm|mp4)(\?|#|$)/i.test(url))).toEqual([]);
  });

  it("the detector flags real code and ignores comments (self-test)", () => {
    expect(scanSource("a.ts", 'canvas.getContext("webgl");'), "getContext webgl in code is flagged").toEqual([
      "getContext webgl",
    ]);
    expect(
      scanSource("b.ts", '// canvas.getContext("webgl") and new AudioContext()\n/* speechSynthesis */\nconst x = 1;'),
      "the same text in comments is not flagged",
    ).toEqual([]);
    expect(scanSource("c.ts", "const tone = new AudioContext();"), "new AudioContext is flagged").toEqual([
      "identifier AudioContext",
    ]);
    expect(scanSource("d.ts", 'import { Scene } from "three";'), "an import of three is flagged").toEqual([
      "import three",
    ]);
    expect(scanSource("e.tsx", "export const view = <canvas />;"), "a canvas tag is flagged").toEqual(["jsx canvas"]);
    expect(scanSource("f.ts", 'const text = "getContext(webgl) AudioContext";'), "a string is not code").toEqual([]);
  });
});
