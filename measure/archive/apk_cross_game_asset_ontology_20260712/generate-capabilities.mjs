import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const trackDir = dirname(fileURLToPath(import.meta.url));
const root = resolve(trackDir, "../../..");
const corpus = JSON.parse(
  readFileSync(resolve(trackDir, "game-corpus.json"), "utf8"),
);
const blueprints = JSON.parse(
  readFileSync(resolve(trackDir, "mechanic-blueprints.json"), "utf8"),
);
const scene = (slug) => `scene:${slug}:main`;
const all = corpus.scenes.map((item) => item.id);
const sentence = corpus.games
  .filter((item) => item.inputMode === "sentence")
  .map((item) => item.sceneIds[0]);
const vocabulary = corpus.games
  .filter((item) => item.inputMode === "vocabulary")
  .map((item) => item.sceneIds[0]);
const groups = {
  runner: [
    "dragon-flight",
    "dragon-rider",
    "spellweavers-run",
    "griffin-riders-escape",
    "storm-castle-tower",
    "sorcerer-ziggurat",
  ],
  arena: [
    "archers-revenge",
    "paladins-twin-soul",
    "griffin-sky-joust",
    "astral-mage",
    "gryphon-patrol",
    "realm-carver",
    "wizard-vs-zombie",
    "devourer-slime",
    "abyssal-well",
  ],
  defense: [
    "magic-defense",
    "castle-defense",
    "rpg-battle",
    "wizard-vs-zombie",
    "village-guardian",
    "shadow-gate-dungeon",
  ],
  collector: [
    "dungeon-liberator",
    "enchanted-library",
    "labyrinth-goblin-king",
    "devourer-slime",
    "haunted-library",
    "village-guardian",
    "shadow-gate-dungeon",
  ],
  puzzle: [
    "rune-match",
    "alchemists-synthesis",
    "potion-rush",
    "rune-forge-chamber",
    "babel-architect",
  ],
};
const consumers = (name) => groups[name].map(scene);

const common = (
  id,
  name,
  domain,
  disposition,
  consumerSceneIds,
  owner,
  boundary,
  evidence = "evidence:source:components",
) => ({
  id: `capability:${domain}:${id}`,
  name,
  domain,
  disposition,
  consumerSceneIds,
  owner,
  extensionBoundary: boundary,
  minimumEvidence: [
    "deterministic unit tests",
    "compact/wide geometry tests",
    "real-browser interaction QC",
  ],
  evidenceIds: [evidence],
});

const matrix = [
  common(
    "session",
    "Scene/session lifecycle",
    "lifecycle",
    "standardize",
    all,
    "@reading-advantage/advantage-play-kit",
    "Cartridges supply scenes and rules; APK owns start, pause, restart, completion-once, resize, and teardown.",
  ),
  common(
    "progression",
    "Educational progression",
    "education",
    "standardize",
    all,
    "@reading-advantage/advantage-play-kit",
    "APK validates content identity and attempts; cartridges decide the gameplay consequence of correct and incorrect actions.",
  ),
  common(
    "results",
    "GameResults calculation boundary",
    "education",
    "standardize",
    all,
    "@reading-advantage/game-contracts",
    "Shared contracts compute structural result fields; authoritative XP, identity, tenancy, and persistence remain host-owned.",
  ),
  common(
    "input",
    "Normalized active input mode",
    "input",
    "standardize",
    all,
    "@reading-advantage/advantage-play-kit",
    "APK normalizes keyboard, pointer, touch, and hybrid state; cartridges bind semantic actions and handedness needs.",
  ),
  common(
    "composition",
    "Responsive composition orchestration",
    "responsive",
    "standardize",
    all,
    "@reading-advantage/advantage-play-kit",
    "APK owns profile resolution and regions; each cartridge declares minimum geometry, strategy, visibility, and custom regions.",
  ),
  common(
    "camera",
    "Camera composition and indicators",
    "camera",
    "extend-existing",
    [
      ...new Set([
        ...consumers("runner"),
        ...consumers("arena"),
        ...consumers("collector"),
      ]),
    ],
    "@reading-advantage/advantage-play-kit",
    "Shared bounds, follow, dead-zone, transforms, and indicators remain configurable; world topology and dramatic framing stay cartridge-owned.",
  ),
  common(
    "sequencing",
    "Ordered sentence sequencing",
    "education",
    "standardize",
    sentence,
    "@reading-advantage/advantage-play-kit",
    "Shared ordering, duplicate identity, attempts, and feedback are reusable; physical collection, targeting, escort, and construction remain bespoke.",
  ),
  common(
    "targeting",
    "Vocabulary target validation",
    "education",
    "standardize",
    vocabulary,
    "@reading-advantage/advantage-play-kit",
    "Shared term/translation validation and duplicate-safe identity do not prescribe typing, matching, gate, pickup, or combat presentation.",
  ),
  common(
    "runner",
    "Runner and traversal foundation",
    "mechanic",
    "extend-existing",
    consumers("runner"),
    "@reading-advantage/advantage-play-kit",
    "Share movement, pooling, collision, and scrolling; lane, flight, platform, and isometric step rules remain separate extensions.",
  ),
  common(
    "arena",
    "Arena and target-action foundation",
    "mechanic",
    "standardize",
    consumers("arena"),
    "@reading-advantage/advantage-play-kit",
    "Share bounded movement, target acquisition, projectiles, spawning, pools, and indicators; paired heroes, territory, growth, and breach rules stay bespoke.",
  ),
  common(
    "defense",
    "Defense and combat orchestration",
    "mechanic",
    "extend-existing",
    consumers("defense"),
    "@reading-advantage/advantage-play-kit",
    "Share waves, threats, objectives, health, and timing; tower placement, typed input, turn combat, escort, and stealth rules remain cartridge modules.",
  ),
  common(
    "collector",
    "Free-roam collection foundation",
    "mechanic",
    "standardize",
    consumers("collector"),
    "@reading-advantage/advantage-play-kit",
    "Share pickups, ordered validation, collision feedback, camera, and indicators; rescue, escort, maze, stealth, growth, and doors extend it.",
  ),
  common(
    "puzzle",
    "Puzzle/workstation foundation",
    "mechanic",
    "standardize",
    consumers("puzzle"),
    "@reading-advantage/advantage-play-kit",
    "Share deterministic boards, selections, drag/tap, shuffles, timers, and feedback; match, merge, conveyor, radial, and construction resolution stay distinct.",
  ),
  common(
    "turn-combat",
    "Turn-based typed combat",
    "mechanic",
    "bespoke",
    [scene("rpg-battle")],
    "@reading-advantage/game-cartridges",
    "RPG turn order, actions, combat log, enemy scaling, and animation sequencing remain RPG Battle-owned until another real consumer exists.",
  ),
  common(
    "territory",
    "Territory capture",
    "mechanic",
    "bespoke",
    [scene("realm-carver")],
    "@reading-advantage/game-cartridges",
    "Territory topology and capture semantics remain Realm Carver-owned; only generic movement, camera, sequencing, and feedback are shared.",
  ),
  common(
    "isometric-step",
    "Isometric step graph",
    "mechanic",
    "bespoke",
    [scene("sorcerer-ziggurat")],
    "@reading-advantage/game-cartridges",
    "Projection, valid-step graph, depth ordering, and ritual recovery remain provisional cartridge concerns until corroborated.",
  ),
  common(
    "presentation",
    "HUD, prompts, feedback, and results",
    "presentation",
    "standardize",
    all,
    "@reading-advantage/advantage-play-kit",
    "Shared semantic regions, text classes, collapse priority, diagnostics, and accessibility do not standardize game-specific art direction.",
  ),
  common(
    "audio",
    "Semantic audio roles",
    "audio",
    "standardize",
    all,
    "@reading-advantage/advantage-play-kit",
    "APK owns mute, lifecycle, role lookup, and pooling; cartridges declare cues and themes provide treatments.",
  ),
  common(
    "testing",
    "Deterministic cartridge test kit",
    "testing",
    "standardize",
    all,
    "@reading-advantage/advantage-play-kit",
    "Shared seeded simulation, transition assertions, geometry fuzzing, completion-once, and browser harnesses accept cartridge-specific fixtures.",
  ),
];

writeFileSync(
  resolve(trackDir, "capability-usage-matrix.json"),
  `${JSON.stringify(matrix, null, 2)}\n`,
);

const sourceFiles = [
  ...new Set(corpus.games.flatMap((game) => game.implementationPaths)),
];
const measurements = sourceFiles
  .filter((path) => existsSync(resolve(root, path)))
  .map((path) => ({
    path,
    lines: readFileSync(resolve(root, path), "utf8").split("\n").length,
  }));
const totalLines = measurements.reduce((sum, item) => sum + item.lines, 0);
const largest = [...measurements]
  .sort((a, b) => b.lines - a.lines)
  .slice(0, 15);

writeFileSync(
  resolve(trackDir, "developer-effort-baseline.md"),
  `# Developer Effort Baseline

Measured from the exact current implementation paths in \`game-corpus.json\` at \`${corpus.sourceRevision}\`.

- ${sourceFiles.length} distinct matched implementation files.
- ${totalLines.toLocaleString()} physical source lines across those files.
- ${corpus.games.filter((game) => game.importedCopyPaths.length > 0).length} games have Reading copy evidence, creating duplicate maintenance surfaces.
- Current authoring requires catalog, page/route, component, logic/config, tests, assets, host copy/integration, responsive CSS/canvas work, and browser QC to be coordinated manually.

## Largest matched files

| File | Lines |
|---|---:|
${largest.map((item) => `| \`${item.path}\` | ${item.lines} |`).join("\n")}

## Required improvement proof

The shared kit must reduce lifecycle, input, progression, responsive, camera, HUD, audio, diagnostics, and test harness code without merging distinctive mechanics. Successor tracks must compare cartridge-specific files and steps against this baseline.
`,
);

writeFileSync(
  resolve(trackDir, "developer-capability-ontology.md"),
  `# APK Developer Capability Ontology

## Decision rule

Capabilities are standardized only with at least two concrete consumers. Shared foundations expose extension boundaries; single-consumer or provisional behavior remains bespoke.

| Capability | Domain | Disposition | Consumers | Owner |
|---|---|---|---:|---|
${matrix.map((item) => `| \`${item.id}\` | ${item.domain} | ${item.disposition} | ${item.consumerSceneIds.length} | \`${item.owner}\` |`).join("\n")}

## Boundaries and acceptance

${matrix.map((item) => `### ${item.name}\n\n${item.extensionBoundary}\n\nMinimum evidence: ${item.minimumEvidence.join("; ")}.`).join("\n\n")}
`,
);
