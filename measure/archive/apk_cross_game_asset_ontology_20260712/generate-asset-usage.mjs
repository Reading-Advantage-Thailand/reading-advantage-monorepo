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
  [
    "creature",
    "mount-or-companion",
    ["idle", "move", "action", "damage"],
    "world",
    "world-scaled",
    "semantic body when present",
  ],
  [
    "terrain",
    "traversable-terrain",
    ["base", "edge", "blocked"],
    "world",
    "tileable and seam-safe",
    "world collision surface",
  ],
  [
    "structure",
    "objective-or-station",
    ["idle", "active", "damaged", "complete"],
    "world",
    "world-scaled or reflow-safe",
    "objective interaction bounds",
  ],
  [
    "prop",
    "interactive-prop",
    ["idle", "highlighted", "used"],
    "world",
    "world-scaled",
    "interaction bounds",
  ],
  [
    "hazard",
    "gameplay-hazard",
    ["telegraph", "active", "impact", "disabled"],
    "world",
    "minimum readable size",
    "damage or avoidance bounds",
  ],
  [
    "pickup",
    "collectible-content",
    ["available", "active", "collected", "incorrect"],
    "world",
    "prompt-readable",
    "pickup bounds",
  ],
  [
    "weapon",
    "player-action-tool",
    ["idle", "windup", "active", "cooldown"],
    "world",
    "actor-relative",
    "action bounds when applicable",
  ],
  [
    "projectile",
    "gameplay-projectile",
    ["spawn", "travel", "impact"],
    "world",
    "minimum readable size",
    "projectile body",
  ],
  [
    "background",
    "composable-background",
    ["base", "ambient"],
    "world",
    "tileable or focal-crop safe",
    "none",
  ],
  [
    "indicator",
    "offscreen-and-objective-indicator",
    ["hidden", "active", "warning", "complete"],
    "screen",
    "screen-space accessible",
    "none",
  ],
];

const optionalConsumers = {
  "mount-or-companion": [
    "dragon-rider",
    "dragon-flight",
    "griffin-riders-escape",
    "griffin-sky-joust",
    "gryphon-patrol",
    "paladins-twin-soul",
  ],
  "objective-or-station": [
    "castle-defense",
    "magic-defense",
    "potion-rush",
    "rune-forge-chamber",
    "village-guardian",
    "haunted-library",
    "sorcerer-ziggurat",
    "babel-architect",
  ],
  "interactive-prop": [
    "rune-match",
    "alchemists-synthesis",
    "potion-rush",
    "rune-forge-chamber",
    "dungeon-liberator",
    "enchanted-library",
    "haunted-library",
    "babel-architect",
  ],
  "gameplay-hazard": [
    "dragon-rider",
    "dragon-flight",
    "spellweavers-run",
    "griffin-riders-escape",
    "storm-castle-tower",
    "wizard-vs-zombie",
    "shadow-gate-dungeon",
    "labyrinth-goblin-king",
    "gryphon-patrol",
    "realm-carver",
    "abyssal-well",
  ],
  "collectible-content": [
    "dragon-rider",
    "spellweavers-run",
    "dungeon-liberator",
    "enchanted-library",
    "shadow-gate-dungeon",
    "village-guardian",
    "labyrinth-goblin-king",
    "realm-carver",
    "devourer-slime",
    "haunted-library",
  ],
  "player-action-tool": [
    "magic-defense",
    "rpg-battle",
    "castle-defense",
    "archers-revenge",
    "paladins-twin-soul",
    "griffin-sky-joust",
    "astral-mage",
    "wizard-vs-zombie",
    "abyssal-well",
  ],
  "gameplay-projectile": [
    "magic-defense",
    "castle-defense",
    "archers-revenge",
    "paladins-twin-soul",
    "astral-mage",
    "wizard-vs-zombie",
    "abyssal-well",
  ],
  "offscreen-and-objective-indicator": [
    "dragon-rider",
    "dragon-flight",
    "spellweavers-run",
    "griffin-riders-escape",
    "storm-castle-tower",
    "dungeon-liberator",
    "enchanted-library",
    "shadow-gate-dungeon",
    "village-guardian",
    "labyrinth-goblin-king",
    "realm-carver",
    "devourer-slime",
    "haunted-library",
    "gryphon-patrol",
    "astral-mage",
  ],
};

const usages = corpus.games.flatMap((game) => {
  const sceneId = game.sceneIds[0];
  const capabilityIds = capabilities
    .filter((item) => item.consumerSceneIds.includes(sceneId))
    .map((item) => item.id);
  return roles
    .filter(
      ([, role]) =>
        !optionalConsumers[role] || optionalConsumers[role].includes(game.slug),
    )
    .map(([family, role, states, view, scale, collision]) => ({
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
