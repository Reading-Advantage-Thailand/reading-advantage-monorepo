type RunnerControlContract = {
  readonly keyboard: readonly string[];
  readonly pointer: readonly string[];
  readonly touch: readonly string[];
};

type RunnerResultMapping = {
  readonly score: string;
  readonly accuracy: string;
  readonly durationMs: string;
  readonly completed: string;
  readonly metadata: readonly string[];
};

type RunnerWaveBlueprint = {
  readonly id:
    | "dragon-rider"
    | "spellweavers-run"
    | "griffin-riders-escape"
    | "storm-castle-tower";
  readonly inputMode: "vocabulary" | "sentence";
  readonly mechanic:
    | "two-lane-gate-traversal"
    | "three-lane-ordered-collector"
    | "three-lane-perspective-gates"
    | "vertical-ordered-traversal";
  readonly requiredAssetSlots: readonly string[];
  readonly controls: RunnerControlContract;
  readonly resultMapping: RunnerResultMapping;
  readonly sourceModule: `./cartridges/${string}`;
  readonly productionRoute: "/[locale]/student/arcade/[cartridgeId]";
};

const GENERIC_ARCADE_ROUTE = "/[locale]/student/arcade/[cartridgeId]" as const;
const COMMON_RUNNER_ASSET_SLOTS = [
  "world.background",
  "player.hero",
  "target.correct",
  "target.incorrect",
  "feedback.correct",
  "feedback.incorrect",
  "ui.panel",
] as const;

/** Frozen W3 identities and host-independent cartridge contracts. */
export const runnerWaveBlueprints = [
  {
    id: "dragon-rider",
    inputMode: "vocabulary",
    mechanic: "two-lane-gate-traversal",
    requiredAssetSlots: [
      ...COMMON_RUNNER_ASSET_SLOTS,
      "target.gate",
      "ally.dragon",
      "enemy.boss",
    ],
    controls: {
      keyboard: ["ArrowLeft", "KeyA", "ArrowRight", "KeyD"],
      pointer: ["choose-left-gate", "choose-right-gate"],
      touch: ["choose-left-gate", "choose-right-gate"],
    },
    resultMapping: {
      score: "correctAnswers",
      accuracy: "correctAnswers / totalAttempts",
      durationMs: "elapsedMs",
      completed: "dragonCount >= bossPower",
      metadata: ["dragonCount", "bossPower", "totalAttempts"],
    },
    sourceModule: "./cartridges/dragon-rider",
    productionRoute: GENERIC_ARCADE_ROUTE,
  },
  {
    id: "spellweavers-run",
    inputMode: "sentence",
    mechanic: "three-lane-ordered-collector",
    requiredAssetSlots: [
      ...COMMON_RUNNER_ASSET_SLOTS,
      "lane.marker",
      "target.word-orb",
      "zone.collection",
      "effect.mana",
    ],
    controls: {
      keyboard: ["ArrowLeft", "KeyA", "ArrowDown", "KeyS", "ArrowRight", "KeyD"],
      pointer: ["choose-left-lane", "choose-center-lane", "choose-right-lane"],
      touch: ["choose-left-lane", "choose-center-lane", "choose-right-lane"],
    },
    resultMapping: {
      score: "score",
      accuracy: "correctAnswers / totalAttempts",
      durationMs: "elapsedMs",
      completed: "all sentence words collected",
      metadata: ["combo", "mana", "sentencesCompleted", "totalAttempts"],
    },
    sourceModule: "./cartridges/spellweavers-run",
    productionRoute: GENERIC_ARCADE_ROUTE,
  },
  {
    id: "griffin-riders-escape",
    inputMode: "sentence",
    mechanic: "three-lane-perspective-gates",
    requiredAssetSlots: [
      ...COMMON_RUNNER_ASSET_SLOTS,
      "lane.marker",
      "target.gate",
      "hazard.obstacle",
      "effect.wind",
    ],
    controls: {
      keyboard: ["ArrowLeft", "KeyA", "ArrowRight", "KeyD"],
      pointer: ["move-left", "move-right"],
      touch: ["move-left", "move-right", "swipe-left", "swipe-right"],
    },
    resultMapping: {
      score: "score",
      accuracy: "correctAnswers / totalAttempts",
      durationMs: "elapsedMs",
      completed: "all sentence gates cleared",
      metadata: ["combo", "lives", "totalAttempts"],
    },
    sourceModule: "./cartridges/griffin-riders-escape",
    productionRoute: GENERIC_ARCADE_ROUTE,
  },
  {
    id: "storm-castle-tower",
    inputMode: "sentence",
    mechanic: "vertical-ordered-traversal",
    requiredAssetSlots: [
      ...COMMON_RUNNER_ASSET_SLOTS,
      "terrain.tower",
      "target.window",
      "hazard.oil",
      "hazard.rock",
    ],
    controls: {
      keyboard: [
        "ArrowUp",
        "KeyW",
        "ArrowDown",
        "KeyS",
        "ArrowLeft",
        "KeyA",
        "ArrowRight",
        "KeyD",
        "Space",
        "Enter",
      ],
      pointer: ["move-up", "move-down", "move-left", "move-right", "collect"],
      touch: ["move-up", "move-down", "move-left", "move-right", "collect"],
    },
    resultMapping: {
      score: "correctAnswers",
      accuracy: "correctAnswers / totalAttempts",
      durationMs: "elapsedMs",
      completed: "all sentence windows collected",
      metadata: ["lives", "targetIndex", "totalAttempts"],
    },
    sourceModule: "./cartridges/storm-castle-tower",
    productionRoute: GENERIC_ARCADE_ROUTE,
  },
] as const satisfies readonly RunnerWaveBlueprint[];
