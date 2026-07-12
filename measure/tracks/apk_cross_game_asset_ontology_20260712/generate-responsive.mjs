import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));
const corpus = JSON.parse(
  readFileSync(resolve(dir, "game-corpus.json"), "utf8"),
);
const blueprints = JSON.parse(
  readFileSync(resolve(dir, "mechanic-blueprints.json"), "utf8"),
);

const profiles = corpus.games.map((game) => {
  const blueprint = blueprints.find((item) => item.gameId === game.id);
  const spatial =
    /flight|arena|dungeon|maze|village|tower|world|movement|navigation|scroll/i.test(
      blueprint.worldAndControls,
    );
  const compactStrategies = spatial
    ? ["follow", "stage", "panel"]
    : ["reflow", "panel"];
  const wideStrategies = spatial
    ? ["reveal", "follow", "panel"]
    : ["reflow", "panel"];
  return {
    id: `responsive:${game.slug}`,
    gameId: game.id,
    sceneIds: game.sceneIds,
    currentRisk: game.implementationPaths.length
      ? "Legacy fixed coordinates, canvas scaling, HUD overlays, and renderer-specific camera assumptions require rebuild validation."
      : "No current playable implementation; geometry is provisional and must be proven by Red tests.",
    compact: {
      strategies: compactStrategies,
      inputModes: ["touch", "hybrid"],
      reservedRegions: [
        "primary-prompt",
        "primary-status",
        "controls",
        "feedback",
        "navigation",
      ],
      cameraPolicy: spatial
        ? "Preserve world scale and follow the active player/target inside the gameplay region."
        : "Reflow the mechanic into the gameplay region without shrinking text or targets.",
    },
    wide: {
      strategies: wideStrategies,
      inputModes: ["keyboard", "pointer"],
      reservedRegions: [
        "primary-prompt",
        "primary-status",
        "secondary-status",
        "feedback",
        "navigation",
      ],
      cameraPolicy: spatial
        ? "Reveal materially more valid world with bounded camera and wider dead zones."
        : "Use horizontal space for gameplay plus an intentional prompt/status side panel.",
    },
    requiredVisibility: [
      "primary learning prompt",
      "active player or selection",
      "current target or answer choices",
      "immediate hazards",
      "essential status",
    ],
    statePreserved: [
      "current content step",
      "score",
      "attempts",
      "health/lives",
      "timer",
      "active target",
      "completion-once guard",
    ],
    fixtures: {
      englishShort: "cat — แมว",
      englishWorstCase:
        "environmentally sustainable transportation infrastructure",
      thaiShort: "แมว — cat",
      thaiWorstCase:
        "การพัฒนาโครงสร้างพื้นฐานด้านการคมนาคมอย่างยั่งยืนและปลอดภัย",
      enlargedTextScale: 1.5,
    },
    evidenceIds: game.evidenceIds,
  };
});

writeFileSync(
  resolve(dir, "responsive-composition-matrix.json"),
  `${JSON.stringify(profiles, null, 2)}\n`,
);
writeFileSync(
  resolve(dir, "responsive-composition-matrix.md"),
  `# Responsive Composition Matrix\n\nAll ${profiles.length} games declare compact and wide composition under the repository responsive specification. Uniform scaling alone is prohibited.\n\n| Game | Compact | Wide | Current risk |\n|---|---|---|---|\n${profiles.map((item) => `| \`${item.gameId}\` | ${item.compact.strategies.join(", ")} | ${item.wide.strategies.join(", ")} | ${item.currentRisk} |`).join("\n")}\n\n## Shared primitives required\n\nProfile resolver with hysteresis; safe-area/reserved-region planner; gameplay coordinate transforms; camera bounds/follow/dead-zone helpers; semantic HUD/prompt/feedback regions; touch-control reservation; locale-aware Thai/English text measurement; atomic profile transitions; overlap diagnostics; deterministic geometry fixtures and fuzzing.\n`,
);
