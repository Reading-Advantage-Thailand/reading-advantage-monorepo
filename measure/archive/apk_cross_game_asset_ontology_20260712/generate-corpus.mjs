import {
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const trackDir = dirname(fileURLToPath(import.meta.url));
const root = resolve(trackDir, "../../..");
const catalogPath = "apps/advantage-games/src/lib/gameCards.ts";
const source = readFileSync(resolve(root, catalogPath), "utf8");
const revision = "ab80f58c55285c164c1b3cdbc3b9ed5b2a03c0ee";

const walk = (relativeRoot) => {
  const absoluteRoot = resolve(root, relativeRoot);
  if (!existsSync(absoluteRoot)) return [];
  return readdirSync(absoluteRoot).flatMap((name) => {
    const relativePath = `${relativeRoot}/${name}`;
    return statSync(resolve(root, relativePath)).isDirectory()
      ? walk(relativePath)
      : [relativePath];
  });
};

const advantageFiles = walk("apps/advantage-games/src");
const readingFiles = [
  ...walk("apps/reading-advantage/components/games"),
  ...walk("apps/reading-advantage/lib/games"),
  ...walk("apps/reading-advantage/app/[locale]/(student)/student/games"),
  ...walk("apps/reading-advantage/app/api/v1/games"),
];

const withdrawn = new Set(
  source
    .match(/const withdrawnApkGameIds = new Set\(\[([\s\S]*?)\]\)/)?.[1]
    ?.match(/'[^']+'/g)
    ?.map((value) => value.slice(1, -1)) ?? [],
);

const sentenceIds = new Set([
  "castle-defense",
  "potion-rush",
  "dungeon-liberator",
  "spellweavers-run",
  "shadow-gate-dungeon",
  "rune-forge-chamber",
  "village-guardian",
  "labyrinth-goblin-king",
  "storm-castle-tower",
  "griffin-sky-joust",
  "realm-carver",
  "griffin-riders-escape",
  "astral-mage",
  "devourer-slime",
  "sorcerer-ziggurat",
  "haunted-library",
  "gryphon-patrol",
]);

const componentIds = new Set([
  "castle-defense",
  "magic-defense",
  "rpg-battle",
  "dragon-flight",
  "wizard-vs-zombie",
  "enchanted-library",
  "rune-match",
  "alchemists-synthesis",
  "potion-rush",
  "dungeon-liberator",
  "shadow-gate-dungeon",
  "rune-forge-chamber",
  "village-guardian",
  "labyrinth-goblin-king",
  "devourer-slime",
  "haunted-library",
]);

const readingCopyIds = new Set([
  "castle-defense",
  "dragon-rider",
  "magic-defense",
  "rpg-battle",
  "dragon-flight",
  "wizard-vs-zombie",
  "enchanted-library",
  "rune-match",
  "potion-rush",
]);

const evidence = [
  [
    "source:catalog",
    "source",
    catalogPath,
    "27-row current catalog plus 14-row withdrawal override",
  ],
  [
    "source:components",
    "source",
    "apps/advantage-games/src/components/games/",
    "raw gameplay components",
  ],
  [
    "source:logic",
    "source",
    "apps/advantage-games/src/lib/games/",
    "deterministic rules, configs, and tests",
  ],
  [
    "route:advantage-games",
    "route",
    "apps/advantage-games/src/app/[locale]/(student)/student/games/",
    "current localized routes",
  ],
  [
    "test:catalog",
    "test",
    "apps/advantage-games/src/lib/gameCards.test.ts",
    "catalog withdrawal assertions",
  ],
  [
    "source:reading-copies",
    "source",
    "apps/reading-advantage/components/games/",
    "imported copy evidence; not separate identities",
  ],
  [
    "source:primary-lessons",
    "source",
    "apps/primary-advantage/components/lesson/games/",
    "Primary lesson activities outside catalog boundary",
  ],
  [
    "measure:roadmap",
    "measure",
    "measure/archive/advantage_play_kit_20260710/catalog-rebuild-roadmap.md",
    "27-game mechanic recovery and deleted-source discrepancies",
  ],
  [
    "measure:abyssal",
    "measure",
    "apps/advantage-games/measure/tracks/r3f_rendering_tier_20260708/review-2026-07-10.md",
    "cancelled Abyssal Well evidence",
  ],
  [
    "measure:babel",
    "measure",
    "apps/advantage-games/measure/archive/babel-architect-compliance-audit_20260426/report.md",
    "Babel Architect placeholder evidence",
  ],
  [
    "history:catalog",
    "history",
    catalogPath,
    "catalog withdrawal and removal history",
  ],
].map(([id, kind, path, note]) => ({
  id: `evidence:${id}`,
  kind,
  path,
  revision: id === "history:catalog" ? "05bb6d29" : "ab80f58c",
  confidence: kind === "measure" ? "medium" : "high",
  note,
}));

const blocks = source.match(/  \{\n    id: '[\s\S]*?\n  \},/g) ?? [];
const games = blocks.map((block) => {
  const slug = block.match(/id: '([^']+)'/)?.[1];
  const title = block
    .match(/title: (?:'([^']+)'|"([^"]+)")/)
    ?.slice(1)
    .find(Boolean);
  const href = block.match(/href: '([^']+)'/)?.[1];
  const evidenceIds = ["evidence:source:catalog"];
  if (componentIds.has(slug))
    evidenceIds.push("evidence:source:components", "evidence:source:logic");
  else evidenceIds.push("evidence:measure:roadmap");
  if (readingCopyIds.has(slug))
    evidenceIds.push("evidence:source:reading-copies");
  if (withdrawn.has(slug)) evidenceIds.push("evidence:history:catalog");
  return {
    id: `game:${slug}`,
    slug,
    title,
    inputMode: sentenceIds.has(slug) ? "sentence" : "vocabulary",
    catalogState: withdrawn.has(slug) ? "withdrawn" : "playable",
    routeState: withdrawn.has(slug)
      ? href
        ? "withdrawn"
        : "missing"
      : "present",
    confidence: componentIds.has(slug) ? "high" : "medium",
    evidenceIds,
    sceneIds: [`scene:${slug}:main`],
    implementationPaths: advantageFiles.filter((path) =>
      path
        .toLowerCase()
        .replaceAll(/[^a-z0-9]/g, "")
        .includes(slug.replaceAll("-", "")),
    ),
    importedCopyPaths: readingFiles.filter((path) =>
      path
        .toLowerCase()
        .replaceAll(/[^a-z0-9]/g, "")
        .includes(slug.replaceAll("-", "")),
    ),
    measureEvidencePaths: componentIds.has(slug)
      ? []
      : [
          "measure/archive/advantage_play_kit_20260710/catalog-rebuild-roadmap.md",
        ],
    assetRoots: [
      `apps/advantage-games/public/games/${sentenceIds.has(slug) ? "sentence" : "vocabulary"}/${slug}`,
      `apps/advantage-games/public/games/cover`,
    ].filter((path) => existsSync(resolve(root, path))),
  };
});

games.push(
  {
    id: "game:abyssal-well",
    slug: "abyssal-well",
    title: "The Abyssal Well",
    inputMode: "sentence",
    catalogState: "stale",
    routeState: "withdrawn",
    confidence: "medium",
    evidenceIds: [
      "evidence:measure:abyssal",
      "evidence:measure:roadmap",
      "evidence:history:catalog",
    ],
    sceneIds: ["scene:abyssal-well:main"],
    implementationPaths: [],
    importedCopyPaths: [],
    measureEvidencePaths: [
      "apps/advantage-games/measure/tracks/r3f_rendering_tier_20260708/review-2026-07-10.md",
    ],
    assetRoots: [],
  },
  {
    id: "game:babel-architect",
    slug: "babel-architect",
    title: "Babel Architect",
    inputMode: "sentence",
    catalogState: "stale",
    routeState: "missing",
    confidence: "medium",
    evidenceIds: [
      "evidence:measure:babel",
      "evidence:measure:roadmap",
      "evidence:history:catalog",
    ],
    sceneIds: ["scene:babel-architect:main"],
    implementationPaths: [],
    importedCopyPaths: [],
    measureEvidencePaths: [
      "apps/advantage-games/measure/archive/babel-architect-compliance-audit_20260426/report.md",
    ],
    assetRoots: [],
  },
);

const scenes = games.map((game) => ({
  id: game.sceneIds[0],
  gameId: game.id,
  name: "main",
  evidenceIds: [
    game.evidenceIds.find((id) => id !== "evidence:source:catalog") ??
      game.evidenceIds[0],
  ],
}));

const discrepancies = [
  [
    "catalog:withdrawn-playable",
    undefined,
    "Fourteen raw cards say playable but the exported catalog withdraws them.",
    "Use exported catalog state and preserve raw literals as discrepancy evidence.",
    ["evidence:source:catalog", "evidence:test:catalog"],
    "high",
  ],
  [
    "abyssal-well:deleted-source",
    "game:abyssal-well",
    "Abyssal Well existed in earlier source but is absent now.",
    "Retain stale requirements pending explicit retirement or successor decision.",
    ["evidence:measure:abyssal", "evidence:history:catalog"],
    "medium",
  ],
  [
    "babel-architect:deleted-source",
    "game:babel-architect",
    "Babel Architect had catalog and cancelled exemplar evidence but no accepted implementation.",
    "Retain provisional requirements without restoring a route.",
    ["evidence:measure:babel", "evidence:history:catalog"],
    "medium",
  ],
  [
    "imports:duplicate-copies",
    undefined,
    "Reading contains copied implementations that could inflate corpus count.",
    "Treat copies as evidence for canonical IDs.",
    ["evidence:source:catalog", "evidence:source:reading-copies"],
    "high",
  ],
].map(([id, gameId, claim, resolution, evidenceIds, confidence]) => ({
  id: `discrepancy:${id}`,
  ...(gameId ? { gameId } : {}),
  claim,
  resolution,
  evidenceIds,
  confidence,
}));

const dataset = {
  version: "apk-corpus.v1",
  sourceRevision: revision,
  evidence,
  games,
  scenes,
  discrepancies,
};
writeFileSync(
  resolve(trackDir, "game-corpus.json"),
  `${JSON.stringify(dataset, null, 2)}\n`,
);

const rows = games.map((game) => {
  const implementation = componentIds.has(game.slug)
    ? "raw component + logic"
    : readingCopyIds.has(game.slug)
      ? "Reading imported copy"
      : game.catalogState === "stale"
        ? "historical/cancelled evidence"
        : "archived roadmap evidence";
  return `| \`${game.slug}\` | ${game.title} | ${game.inputMode} | ${game.catalogState} | ${game.routeState} | ${implementation} | ${game.confidence} |`;
});

const markdown = `# APK Canonical Game Corpus

Generated from \`game-corpus.json\` at source revision \`${revision}\`. The machine file is authoritative for identifiers and cross-artifact validation; this document is the review surface.

## Boundary

- **29 canonical identities:** 27 live catalog rows plus Abyssal Well and Babel Architect as stale historical requirements.
- Reading copies are evidence for the same canonical IDs, not additional games.
- Primary lesson activities remain outside the APK catalog unless a later product decision promotes them.
- Exported catalog state outranks raw \`catalogCards\` literals: 14 invalid APK cards are withdrawn at export time.

## Corpus

| Game ID | Title | Input | Catalog state | Route state | Strongest implementation evidence | Confidence |
|---|---|---|---|---|---|---|
${rows.join("\n")}

## Discrepancies

${discrepancies.map((item) => `- **\`${item.id}\`:** ${item.claim} ${item.resolution}`).join("\n")}

## Copy and host evidence

- Reading has imported copies for Castle Defense, Dragon Rider, Magic Defense, RPG Battle, Dragon Flight, Wizard vs Zombie, Enchanted Library, Rune Match, and Potion Rush. These copies demonstrate deployment history and copy debt.
- Primary currently exposes lesson-level sentence/vocabulary activities, not this APK catalog. They inform content and audience constraints but do not create duplicate catalog identities.
- Current Advantage Games route, API, component, logic, test, and asset roots remain independently inventoried through evidence records in the JSON.

## Acceptance decisions required

1. Confirm the 29-identity boundary, including retaining Abyssal Well and Babel Architect as stale requirement evidence rather than restoring them.
2. Confirm exported withdrawal state is the current routing truth for the 14 invalid cartridges.
3. Confirm Reading copies and Primary lesson activities do not inflate the canonical APK game count.
`;

writeFileSync(resolve(trackDir, "game-corpus.md"), markdown);
