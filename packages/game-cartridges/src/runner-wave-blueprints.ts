type RunnerControlContract = {
  readonly keyboard: readonly string[];
  readonly pointer: readonly string[];
  readonly touch: readonly string[];
};

type RunnerResultMapping = {
  readonly accuracy: string;
  readonly xp: string;
  readonly score: string;
  readonly correctAnswers: string;
  readonly totalAttempts: string;
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
  readonly contentFixture: readonly {
    readonly term: string;
    readonly translation: string;
  }[];
  readonly requiredAssetSlots: readonly string[];
  readonly controls: RunnerControlContract;
  readonly resultMapping: RunnerResultMapping;
  readonly completionCondition: string;
  readonly diagnosticMetadata: readonly string[];
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
    contentFixture: [
      { term: "สวัสดี", translation: "Hello" },
      { term: "ขอบคุณ", translation: "Thank you" },
      { term: "หนังสือ", translation: "Book" },
      { term: "ดวงจันทร์", translation: "Moon" },
    ],
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
      accuracy: "correctAnswers / totalAttempts",
      xp: "floor(max(0, score) / 10)",
      score: "max(0, correctAnswers * 100 - incorrectAnswers * 20)",
      correctAnswers: "correctAnswers",
      totalAttempts: "totalAttempts",
    },
    completionCondition: "all vocabulary gates resolved and boss threshold evaluated",
    diagnosticMetadata: ["dragonCount", "bossPower", "elapsedMs"],
    sourceModule: "./cartridges/dragon-rider",
    productionRoute: GENERIC_ARCADE_ROUTE,
  },
  {
    id: "spellweavers-run",
    inputMode: "sentence",
    mechanic: "three-lane-ordered-collector",
    contentFixture: [
      { term: "The cat sits on the mat", translation: "แมวนั่งบนเสื่อ" },
      { term: "We play games together", translation: "พวกเราเล่นเกมด้วยกัน" },
    ],
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
      accuracy: "correctAnswers / totalAttempts",
      xp: "floor(max(0, score) / 10)",
      score: "max(0, score)",
      correctAnswers: "correctAnswers",
      totalAttempts: "totalAttempts",
    },
    completionCondition: "all sentence words collected or mana depleted",
    diagnosticMetadata: ["combo", "mana", "sentencesCompleted", "elapsedMs"],
    sourceModule: "./cartridges/spellweavers-run",
    productionRoute: GENERIC_ARCADE_ROUTE,
  },
  {
    id: "griffin-riders-escape",
    inputMode: "sentence",
    mechanic: "three-lane-perspective-gates",
    contentFixture: [
      { term: "The knight rides the griffin", translation: "อัศวินขี่กริฟฟิน" },
      { term: "Fly through the golden gates", translation: "บินผ่านประตูสีทอง" },
    ],
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
      accuracy: "correctAnswers / totalAttempts",
      xp: "floor(max(0, score) / 10)",
      score: "max(0, score)",
      correctAnswers: "correctAnswers",
      totalAttempts: "totalAttempts",
    },
    completionCondition: "all sentence gates cleared or lives depleted",
    diagnosticMetadata: ["combo", "lives", "elapsedMs"],
    sourceModule: "./cartridges/griffin-riders-escape",
    productionRoute: GENERIC_ARCADE_ROUTE,
  },
  {
    id: "storm-castle-tower",
    inputMode: "sentence",
    mechanic: "vertical-ordered-traversal",
    contentFixture: [
      { term: "The bird flies in the sky", translation: "นกบินบนท้องฟ้า" },
      { term: "The sun is shining bright", translation: "ดวงอาทิตย์ส่องแสงสว่าง" },
    ],
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
      accuracy: "correctAnswers / totalAttempts",
      xp: "floor(max(0, score) / 10)",
      score: "max(0, correctAnswers * 100 - incorrectAnswers * 20)",
      correctAnswers: "correctAnswers",
      totalAttempts: "totalAttempts",
    },
    completionCondition: "all sentence windows collected or lives depleted",
    diagnosticMetadata: ["lives", "targetIndex", "elapsedMs"],
    sourceModule: "./cartridges/storm-castle-tower",
    productionRoute: GENERIC_ARCADE_ROUTE,
  },
] as const satisfies readonly RunnerWaveBlueprint[];
