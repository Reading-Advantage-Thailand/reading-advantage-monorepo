/** Frozen control contract shared by W4 documentation and tests. */
export interface ArenaWaveControls {
  /** Keyboard codes accepted by the cartridge. */
  readonly keyboard: readonly string[];
  /** Pointer actions accepted by the cartridge. */
  readonly pointer: readonly string[];
  /** Touch actions equivalent to pointer actions. */
  readonly touch: readonly string[];
}

/** Frozen W4 arena cartridge blueprint. */
export interface ArenaWaveBlueprint {
  /** Stable public cartridge identifier. */
  readonly id: "archers-revenge" | "paladins-twin-soul" | "griffin-sky-joust" | "gryphon-patrol" | "realm-carver";
  /** Educational pair-array mode. */
  readonly inputMode: "vocabulary" | "sentence";
  /** Distinct reusable mechanic identity. */
  readonly mechanic: "protected-target-aim" | "paired-hero-arena" | "aerial-ordered-targets" | "patrol-minimap" | "ordered-territory-capture";
  /** Deterministic content used by contracts and QC. */
  readonly contentFixture: readonly { readonly term: string; readonly translation: string }[];
  /** Semantic edition slots required by the scene. */
  readonly requiredAssetSlots: readonly string[];
  /** Equivalent desktop and mobile inputs. */
  readonly controls: ArenaWaveControls;
  /** Stable five-field result mapping. */
  readonly resultMapping: Readonly<Record<"score" | "accuracy" | "correctAnswers" | "totalAttempts" | "xp", string>>;
  /** Host-independent completion rule. */
  readonly completionCondition: string;
  /** Generic authenticated route. */
  readonly productionRoute: "/[locale]/student/arcade/[cartridgeId]";
}

const COMMON_SLOTS = ["world.background", "player.hero", "target.correct", "target.incorrect", "feedback.correct", "feedback.incorrect", "ui.panel"] as const;
const RESULT_MAPPING = {
  score: "max(0, correctAnswers * 100 - incorrectAnswers * 20)",
  accuracy: "correctAnswers / totalAttempts",
  correctAnswers: "correctAnswers",
  totalAttempts: "totalAttempts",
  xp: "floor(max(0, score) / 10)",
} as const;
const ROUTE = "/[locale]/student/arcade/[cartridgeId]" as const;

/** Frozen W4 identities, fixtures, input contracts, slots, and result semantics. */
export const arenaWaveBlueprints = [
  { id: "archers-revenge", inputMode: "vocabulary", mechanic: "protected-target-aim", contentFixture: [{ term: "โล่", translation: "shield" }, { term: "ธนู", translation: "bow" }], requiredAssetSlots: [...COMMON_SLOTS, "projectile.arrow", "structure.wall"], controls: { keyboard: ["ArrowLeft", "ArrowRight", "Space"], pointer: ["aim-and-fire"], touch: ["aim-and-fire"] }, resultMapping: RESULT_MAPPING, completionCondition: "all protected vocabulary targets resolved or wall health depleted", productionRoute: ROUTE },
  { id: "paladins-twin-soul", inputMode: "vocabulary", mechanic: "paired-hero-arena", contentFixture: [{ term: "กล้าหาญ", translation: "brave" }, { term: "ปราสาท", translation: "castle" }], requiredAssetSlots: [...COMMON_SLOTS, "player.companion", "projectile.magic", "enemy.gargoyle"], controls: { keyboard: ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "KeyW", "KeyA", "KeyS", "KeyD", "Space"], pointer: ["move", "fire"], touch: ["move", "fire"] }, resultMapping: RESULT_MAPPING, completionCondition: "all vocabulary waves resolved or paired heroes defeated", productionRoute: ROUTE },
  { id: "griffin-sky-joust", inputMode: "sentence", mechanic: "aerial-ordered-targets", contentFixture: [{ term: "The griffin flies high", translation: "กริฟฟินบินสูง" }], requiredAssetSlots: [...COMMON_SLOTS, "mount.griffin", "target.word", "hazard.lance"], controls: { keyboard: ["ArrowUp", "ArrowLeft", "ArrowRight", "KeyW", "KeyA", "KeyD", "Space"], pointer: ["flap", "choose-target"], touch: ["flap", "choose-target"] }, resultMapping: RESULT_MAPPING, completionCondition: "all sentence targets struck in order or flight health depleted", productionRoute: ROUTE },
  { id: "gryphon-patrol", inputMode: "sentence", mechanic: "patrol-minimap", contentFixture: [{ term: "Guard the bright kingdom", translation: "ปกป้องอาณาจักรที่สดใส" }], requiredAssetSlots: [...COMMON_SLOTS, "mount.gryphon", "indicator.offscreen", "ui.minimap"], controls: { keyboard: ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "KeyW", "KeyA", "KeyS", "KeyD", "Space"], pointer: ["move", "fire"], touch: ["move", "fire"] }, resultMapping: RESULT_MAPPING, completionCondition: "all patrol sentence targets resolved or patrol health depleted", productionRoute: ROUTE },
  { id: "realm-carver", inputMode: "sentence", mechanic: "ordered-territory-capture", contentFixture: [{ term: "Heroes claim the ancient realm", translation: "วีรบุรุษยึดครองอาณาจักรโบราณ" }], requiredAssetSlots: [...COMMON_SLOTS, "terrain.tile", "target.beacon", "ui.minimap"], controls: { keyboard: ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "KeyW", "KeyA", "KeyS", "KeyD", "Space"], pointer: ["move", "capture"], touch: ["move", "capture"] }, resultMapping: RESULT_MAPPING, completionCondition: "all sentence territory beacons captured in order", productionRoute: ROUTE },
] as const satisfies readonly ArenaWaveBlueprint[];
