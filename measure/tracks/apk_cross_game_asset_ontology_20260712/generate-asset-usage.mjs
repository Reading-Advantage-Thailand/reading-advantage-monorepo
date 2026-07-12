import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));
const corpus = JSON.parse(
  readFileSync(resolve(dir, "game-corpus.json"), "utf8"),
);
const capabilities = JSON.parse(
  readFileSync(resolve(dir, "capability-usage-matrix.json"), "utf8"),
);

const roles = [
  [
    "character",
    "player-avatar",
    ["idle", "move", "success", "damage"],
    "world",
    "world-scaled",
    "solid gameplay body",
  ],
  [
    "environment",
    "gameplay-environment",
    ["base", "boundary", "ambient"],
    "world",
    "tileable or focal-crop safe",
    "world bounds only",
  ],
  [
    "target",
    "learning-target",
    ["available", "active", "correct", "incorrect", "consumed"],
    "world",
    "prompt-readable at minimum viewport",
    "semantic interaction bounds",
  ],
  [
    "vfx",
    "gameplay-feedback",
    ["correct", "incorrect", "impact", "completion"],
    "world and screen",
    "bounded transient effect",
    "non-blocking",
  ],
  [
    "ui",
    "hud-and-prompt",
    ["default", "warning", "complete", "disabled"],
    "screen",
    "nine-slice/text-safe",
    "screen-space only",
  ],
  [
    "audio",
    "semantic-audio-cues",
    ["start", "correct", "incorrect", "damage", "complete"],
    "non-visual",
    "semantic role binding",
    "none",
  ],
  [
    "control",
    "active-input-controls",
    ["idle", "pressed", "disabled"],
    "screen",
    "touch-target safe",
    "screen-space hit area",
  ],
];

const usages = corpus.games.flatMap((game) => {
  const sceneId = game.sceneIds[0];
  const capabilityIds = capabilities
    .filter((item) => item.consumerSceneIds.includes(sceneId))
    .map((item) => item.id);
  return roles.map(([family, role, states, view, scale, collision]) => ({
    id: `asset-usage:${game.slug}:${role}`,
    family,
    semanticRole: role,
    consumerSceneIds: [sceneId],
    capabilityIds,
    states,
    directions:
      family === "character"
        ? ["left", "right", "up", "down"]
        : ["not-applicable"],
    view,
    scale,
    animation:
      family === "audio" ? "cue lifecycle" : "state-dependent when required",
    collision,
    profileUsage: ["compact", "wide"],
    reusePotential:
      role === "learning-target"
        ? "shared contract with game-specific treatment"
        : "cross-game semantic family",
    disposition: "gap",
    evidenceIds: game.evidenceIds,
  }));
});

writeFileSync(
  resolve(dir, "game-asset-usage-matrix.json"),
  `${JSON.stringify(usages, null, 2)}\n`,
);
writeFileSync(
  resolve(dir, "existing-asset-audit.md"),
  `# Existing Asset Audit\n\n## Current decision\n\nNo current candidate is automatically accepted as a production semantic asset. Legacy files remain mechanic/visual evidence until each file has verified dimensions, provenance/license, visible-content inspection, required states, focal/crop behavior, compact/wide suitability, and both-theme contract fit.\n\n## Inventoried roots\n\n- \`apps/advantage-games/public/games/\` — legacy game and cover assets.\n- \`apps/advantage-games/public/sounds/\` — legacy audio cues and music.\n- \`apps/reading-advantage/public/games/\` and copied component imports — deployment evidence.\n- \`packages/advantage-play-kit/\` and \`packages/game-cartridges/\` — current semantic contract/runtime evidence.\n\n## Rejection policy\n\nReject cover art, placeholders, procedural stand-ins presented as final art, baked text, baked checkerboards, unverifiable provenance, incomplete directional/state coverage, unsafe fixed borders, and imagery that cannot satisfy compact and wide composition. Unknown provenance or uninspected visible content remains **unknown/gap**, never reusable.\n\n## Usage coverage\n\nThe machine matrix contains ${usages.length} scene usages across ${corpus.scenes.length} scenes. Every usage currently resolves to a visible production gap; Phase 6 may normalize these roles but cannot convert a candidate to reuse without recorded inspection evidence.\n`,
);
