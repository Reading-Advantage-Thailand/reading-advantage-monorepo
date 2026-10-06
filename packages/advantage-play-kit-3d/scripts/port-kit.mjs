#!/usr/bin/env node
// Copies the 3D kit runtime from the Forge repository, which owns it, into this package.
// Usage: node scripts/port-kit.mjs <forge-repo-dir> [--check]
//
// The monorepo keeps three parts: the contracts the server also reads (re-exported from
// @reading-advantage/game-contracts), the app host (host/, react/), and its own tests. A Forge
// stylesheet becomes a `.css.ts` text module that `installCss` installs once per page.
//
// --check writes nothing. It reports every kit file that differs from what Forge would give, and
// compares the Forge contract copies with game-contracts by parsing the same fixtures with both
// (every Forge story, its practice part, a saved-flashcard input, evidence, and broken variants).
// It exits 1 on any difference.
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { pathToFileURL } from "node:url";

const args = process.argv.slice(2);
const check = args.includes("--check");
const forge = args.find((a) => !a.startsWith("--"));
if (!forge) throw new Error("Usage: port-kit.mjs <forge-repo-dir> [--check]");
const from = join(forge, "src", "apk3d");
const pkg = join(import.meta.dirname, "..", "src");

/** Kit files the monorepo owns: the contract re-exports and the app host. */
const MONOREPO_OWNED = ["contracts/story-input.ts", "contracts/evidence.ts", "contracts/index.ts", "contracts/story-compat.ts", "factory/renderer-setting.ts"];
const MONOREPO_OWNED_DIRS = ["host/", "react/", "__tests__/"];
const owned = (rel) => MONOREPO_OWNED.includes(rel) || MONOREPO_OWNED_DIRS.some((d) => rel.startsWith(d));

const walk = (dir) =>
  readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });

const cssVar = (name) => name.replace(/-(\w)/g, (_m, c) => c.toUpperCase()) + "Css";

/** `import './a.css';` lines become `.css.ts` imports and `installCss` calls (imports sorted, calls in source order). */
function rewriteCss(src) {
  const lines = src.split("\n");
  const at = lines.findIndex((l) => /^import '\.\/[\w-]+\.css';$/.test(l));
  if (at < 0) return src;
  const names = lines.filter((l) => /^import '\.\/[\w-]+\.css';$/.test(l)).map((l) => l.match(/'\.\/([\w-]+)\.css'/)[1]);
  const block = [
    "import { installCss } from './css.js';",
    ...[...names].sort().map((n) => `import ${cssVar(n)} from './${n}.css.js';`),
    "",
    ...names.map((n) => `installCss('apk3d-${n}', ${cssVar(n)});`),
  ];
  const rest = lines.filter((l, i) => i < at || !/^import '\.\/[\w-]+\.css';$/.test(l));
  rest.splice(at, 0, ...block);
  return rest.join("\n");
}

/** A stylesheet as a text module; its font URLs point at the app's synced fonts. */
const cssModule = (rel, text) =>
  `// Generated from ${rel} (the stylesheet text; installed once by installCss).\nexport default \`${text
    .replace(/url\('\.\/fonts\//g, "url('/assets/apk3d/fonts/")
    .replace(/[`\\]|\$\{/g, "\\$&")}\`;\n`;

/** The package files Forge gives: package-relative path to content. */
const wanted = new Map();
for (const file of walk(from)) {
  const rel = relative(from, file).split("\\").join("/");
  if (owned(rel)) continue;
  if (rel.endsWith(".css")) wanted.set(`${rel}.ts`, cssModule(rel, readFileSync(file, "utf8")));
  else if (rel.endsWith(".ts")) wanted.set(rel, rewriteCss(readFileSync(file, "utf8")));
}

const drift = [];
for (const [rel, text] of wanted) {
  const target = join(pkg, rel);
  const current = existsSync(target) ? readFileSync(target, "utf8") : null;
  if (current === text) continue;
  if (check) drift.push(`${current === null ? "missing" : "differs"} ${rel}`);
  else {
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, text);
    console.log(`wrote ${rel}`);
  }
}
for (const file of walk(pkg)) {
  const rel = relative(pkg, file).split("\\").join("/");
  if (!owned(rel) && !wanted.has(rel)) drift.push(`monorepo only ${rel} (move it to Forge, or list it as monorepo-owned)`);
}

if (check) drift.push(...(await contractDrift()));
for (const line of drift) console.log(line);
if (drift.length) {
  console.log(`port-kit: ${drift.length} difference(s)`);
  process.exit(1);
}
console.log(check ? "port-kit: the kit matches Forge" : "port-kit: copied the kit from Forge");

/** Parses the same fixtures with the Forge contract copies and with game-contracts; lists every disagreement. */
async function contractDrift() {
  const { tsImport } = await import("tsx/esm/api");
  const forgeContracts = await tsImport(pathToFileURL(join(from, "contracts", "index.ts")).href, import.meta.url);
  const contracts = await import("@reading-advantage/game-contracts");
  const stories = join(forge, "demo", "public", "stories");
  const storyFiles = readdirSync(stories).filter((d) => existsSync(join(stories, d, "story.json")));
  const fixtures = [];
  for (const id of storyFiles) {
    const story = JSON.parse(readFileSync(join(stories, id, "story.json"), "utf8"));
    const practice = { schemaVersion: 1, id: story.id, level: story.level, vocabulary: story.vocabulary, sentences: story.sentences };
    fixtures.push(
      ["storyInputSchema", `${id}`, story],
      ["storyInputSchema", `${id} with an unknown key`, { ...story, extra: 1 }],
      ["storyInputSchema", `${id} without paragraphs`, { ...story, paragraphs: [] }],
      ["storyInputSchema", `${id} at level C2`, { ...story, level: "C2" }],
      ["practiceInputSchema", `${id} practice part`, practice],
      ["practiceInputSchema", `${id} practice part with a story key`, { ...practice, title: story.title }],
    );
    if (story.vocabulary.length) {
      fixtures.push(["practiceInputSchema", `${id} repeated word id`, { ...practice, vocabulary: [story.vocabulary[0], story.vocabulary[0]] }]);
    }
  }
  const saved = {
    schemaVersion: 1,
    id: "saved",
    level: "A1",
    vocabulary: [{ id: "00000000-0000-4000-8000-000000000001", term: "river", translation: "แม่น้ำ" }],
    sentences: [{ id: "00000000-0000-4000-8000-000000000002", text: "The river is wide.", words: ["The", "river", "is", "wide."] }],
  };
  const evidence = {
    schemaVersion: 1,
    kind: "story-game",
    gameId: "labyrinth",
    inputId: "saved",
    level: "A1",
    seed: 7,
    durationMs: 1000,
    items: [{ itemId: saved.sentences[0].id, itemKind: "sentence", label: "The river is wide.", attempts: 2, correctFirstTry: false, solved: true }],
    practice: ["The river is wide."],
  };
  fixtures.push(
    ["practiceInputSchema", "saved flashcards", saved],
    ["practiceInputSchema", "saved flashcards with broken words", { ...saved, sentences: [{ ...saved.sentences[0], words: ["The"] }] }],
    ["storyGameEvidenceSchema", "evidence", evidence],
    ["storyGameEvidenceSchema", "evidence with storyId", { ...evidence, storyId: "x", inputId: undefined }],
    ["storyGameEvidenceSchema", "evidence with a one-letter input id", { ...evidence, inputId: "s" }],
    ["storyGameEvidenceSchema", "evidence without items", { ...evidence, items: [], practice: [] }],
    ["storyGameEvidenceSchema", "evidence first try but unsolved", { ...evidence, items: [{ ...evidence.items[0], correctFirstTry: true, solved: false }] }],
  );
  const out = [];
  for (const [schema, label, value] of fixtures) {
    const a = forgeContracts[schema].safeParse(value);
    const b = contracts[schema].safeParse(value);
    if (a.success !== b.success) out.push(`contract ${schema}: "${label}" ${a.success ? "passes" : "fails"} in Forge, ${b.success ? "passes" : "fails"} in game-contracts`);
    else if (a.success && JSON.stringify(a.data) !== JSON.stringify(b.data)) out.push(`contract ${schema}: "${label}" parses to different values`);
  }
  return out;
}
