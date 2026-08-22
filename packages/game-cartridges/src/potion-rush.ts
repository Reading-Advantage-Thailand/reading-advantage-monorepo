import {
  gameResultsSchema,
  sentenceInputSchema,
  type GameResults,
} from "@reading-advantage/game-contracts";
import {
  createActorSpriteLayer,
  createBoundedFrameScheduler,
  createCompletionLatch,
  createInputActionNormalizer,
  createResultAccountant,
  finalizeResult,
  preloadAssetBindings,
  validateNonEmptyContent,
  type ActorSpriteLayer,
  type ActorSpriteLike,
  type APKInputController,
  type CartridgeGameConfigContext,
  type GameTerminalOutcome,
  type InputActionId,
  type RuntimeEdition,
} from "@reading-advantage/advantage-play-kit";
import type { StandardExperienceCartridge } from "@reading-advantage/advantage-play-kit/presentation";

import { createCartridgeStandardExperience } from "./standard-experience.js";

/** Stable public identifier for the Potion Rush cartridge. */
export const POTION_RUSH_ID = "potion-rush" as const;

/** Procedural canvas size used before host scaling. */
export const POTION_RUSH_CANVAS = Object.freeze({ width: 960, height: 540 });

/** Keyboard equivalents for ingredient selection, cauldron selection, and actions. */
export const POTION_RUSH_KEYBOARD_BINDINGS: Readonly<Record<string, InputActionId>> = Object.freeze({
  ArrowLeft: "move-left",
  KeyA: "move-left",
  ArrowRight: "move-right",
  KeyD: "move-right",
  ArrowUp: "move-up",
  KeyW: "move-up",
  ArrowDown: "move-down",
  KeyS: "move-down",
  Enter: "confirm",
  Space: "confirm",
  Escape: "cancel",
  Backspace: "cancel",
});

/** The three fixed brewing stations in Potion Rush. */
export const POTION_RUSH_CAULDRON_COUNT = 3 as const;

/** Lifecycle states for a Potion Rush session. */
export type PotionRushPhase = "playing" | "victory" | "defeat";

/** Lifecycle states for one brewing station. */
export type PotionRushCauldronState = "idle" | "brewing" | "spoiled" | "completed";

/** Lifecycle states for one deterministic customer. */
export type PotionRushCustomerState = "waiting" | "served" | "expired";

/** Outcome of the latest state-changing Potion Rush operation. */
export type PotionRushOutcome = "correct" | "wrong" | "dumped" | "served" | "expired";

/** Canonical sentence request owned by one Potion Rush customer. */
export interface PotionRushRequest {
  /** Source sentence that the player must brew. */
  readonly term: string;
  /** Translation shown above the customer's order. */
  readonly translation: string;
}

/** One ingredient travelling on the deterministic conveyor. */
export interface PotionRushIngredient {
  /** Stable ingredient identity. */
  readonly id: string;
  /** Word printed on the ingredient. */
  readonly word: string;
  /** Source sentence index, or -1 for a deterministic decoy. */
  readonly sentenceIndex: number;
  /** Horizontal scene position on the conveyor. */
  readonly x: number;
  /** Vertical scene position on the conveyor. */
  readonly y: number;
  /** Width of the pointer hit region. */
  readonly width: number;
  /** Whether keyboard or pointer selection highlights the ingredient. */
  readonly selected: boolean;
}

/** One customer in the sentence-ordered queue. */
export interface PotionRushCustomer {
  /** Stable queue identity. */
  readonly id: string;
  /** Position in the original sentence input. */
  readonly sentenceIndex: number;
  /** Sentence request for this customer. */
  readonly request: PotionRushRequest;
  /** Current patience in seconds. */
  readonly patience: number;
  /** Patience at customer arrival. */
  readonly maxPatience: number;
  /** Customer lifecycle state. */
  readonly state: PotionRushCustomerState;
  /** Visible cauldron slot, when the customer is active. */
  readonly slot: number | null;
}

/** One of the three cauldrons used by the controller. */
export interface PotionRushCauldron {
  /** Fixed station index. */
  readonly id: number;
  /** Current brewing state. */
  readonly state: PotionRushCauldronState;
  /** Customer assigned to this station. */
  readonly customerId: string | null;
  /** Sentence input index bound when brewing starts. */
  readonly sentenceIndex: number | null;
  /** Number of correct words already brewed for the assigned customer. */
  readonly nextWordIndex: number;
  /** Words placed into this cauldron, in placement order. */
  readonly currentWords: readonly string[];
}

/** Immutable state exposed by the Potion Rush controller. */
export interface PotionRushSnapshot {
  /** Current session phase. */
  readonly phase: PotionRushPhase;
  /** Compatibility alias for the current session phase. */
  readonly status: PotionRushPhase;
  /** Deterministic session seed. */
  readonly seed: number;
  /** Number of correct words already brewed across all sentences. */
  readonly targetIndex: number;
  /** Number of ordered words across all input sentences. */
  readonly targetCount: number;
  /** Translation prompt for the selected active customer. */
  readonly prompt: string;
  /** Next ordered source word for the selected active customer. */
  readonly answer: string;
  /** Semantic action used to submit the selected ingredient. */
  readonly correctAction: InputActionId;
  /** Semantic actions accepted by the controller. */
  readonly availableActions: readonly InputActionId[];
  /** Complete deterministic customer queue. */
  readonly customers: readonly PotionRushCustomer[];
  /** Customer IDs in queue order. */
  readonly queue: readonly string[];
  /** Three visible customer IDs, one per cauldron slot. */
  readonly activeCustomerIds: readonly (string | null)[];
  /** Three cauldron states. */
  readonly cauldrons: readonly PotionRushCauldron[];
  /** Ingredients currently on the conveyor. */
  readonly conveyor: readonly PotionRushIngredient[];
  /** Currently selected ingredient for keyboard or pointer placement. */
  readonly selectedIngredientId: string | undefined;
  /** Currently selected cauldron for keyboard actions. */
  readonly selectedCauldronIndex: number;
  /** Reputation remaining after expired customers. */
  readonly reputation: number;
  /** Maximum reputation for this session. */
  readonly maxReputation: number;
  /** Shared contract alias for the bounded reputation resource. */
  readonly lives: number;
  /** Shared contract resource representing selected customer patience. */
  readonly energy: number;
  /** Score gained from patience remaining at service. */
  readonly score: number;
  /** Number of correctly placed sentence words. */
  readonly correctAnswers: number;
  /** Number of accepted ingredient placements. */
  readonly totalAttempts: number;
  /** Number of customers served. */
  readonly servedCustomers: number;
  /** Outcome of the latest accepted operation. */
  readonly lastOutcome: PotionRushOutcome | undefined;
  /** First terminal result, when the session has ended. */
  readonly result: GameResults | undefined;
  /** Deterministic hazard cursor retained across responsive restores. */
  readonly hazardCursor: number;
  /** Whether scene cleanup sealed the controller. */
  readonly destroyed: boolean;
}

/** Result returned by a Potion Rush operation. */
export interface PotionRushActionResult {
  /** Whether the operation changed the session. */
  readonly accepted: boolean;
  /** Whether an ingredient placement matched the next ordered word. */
  readonly correct: boolean;
  /** Whether ordered brewing or customer service advanced. */
  readonly progressed: boolean;
  /** Whether this operation produced a terminal result. */
  readonly terminal: boolean;
  /** Alias for terminal used by cartridge hosts. */
  readonly completed: boolean;
  /** Whether this operation served a customer. */
  readonly served: boolean;
  /** First terminal result, when produced by this operation. */
  readonly result?: GameResults;
  /** State after the operation. */
  readonly snapshot: PotionRushSnapshot;
}

/** Transport-independent Potion Rush rules and cleanup controls. */
export interface PotionRushController {
  /** Returns the current immutable session state. */
  snapshot(): PotionRushSnapshot;
  /** Selects one conveyor ingredient. */
  selectIngredient(ingredientId: string): PotionRushSnapshot;
  /** Selects one of the three cauldrons. */
  selectCauldron(cauldronIndex: number): PotionRushSnapshot;
  /** Places an ingredient into a cauldron and validates word order. */
  placeIngredient(ingredientId: string, cauldronIndex: number): PotionRushActionResult;
  /** Alias for pointer and drag adapters that use drop terminology. */
  dropIngredient(ingredientId: string, cauldronIndex: number): PotionRushActionResult;
  /** Dumps a spoiled cauldron and returns its words to the conveyor. */
  dumpCauldron(cauldronIndex: number): PotionRushActionResult;
  /** Serves the exact customer assigned to a completed cauldron. */
  serveCustomer(customerId: string, cauldronIndex: number): PotionRushActionResult;
  /** Applies one keyboard-normalized semantic action. */
  choose(action: InputActionId): PotionRushActionResult;
  /** Applies one deterministic customer-expiry hazard. */
  applyHazard(): PotionRushActionResult;
  /** Advances conveyor movement, customer patience, and expiry rules. */
  tick(deltaSeconds: number, viewportWidth?: number): PotionRushSnapshot;
  /** Captures all mutable state for responsive scene changes. */
  capture(): PotionRushSnapshot;
  /** Restores a validated responsive state. */
  restore(snapshot: PotionRushSnapshot): void;
  /** Seals the session and prevents later mutation or delivery. */
  destroy(): void;
}

/** Deterministic setup values for one Potion Rush session. */
export interface PotionRushControllerOptions {
  /** Seed used for conveyor choices, ingredient placement, and hazard order. */
  readonly seed?: number;
}

/** Pointer target returned by Potion Rush hit-region mapping. */
export type PotionRushPointerTarget =
  | { readonly kind: "ingredient"; readonly ingredientId: string }
  | { readonly kind: "cauldron"; readonly cauldronIndex: number }
  | { readonly kind: "dump"; readonly cauldronIndex: number }
  | { readonly kind: "none" };

const STARTING_PATIENCE = 60;
const STARTING_REPUTATION = 100;
const EXPIRY_REPUTATION_PENALTY = 25;
const CONVEYOR_SPEED = 90;
const INGREDIENT_WIDTH = 104;
const INGREDIENT_HEIGHT = 54;
const DECOY_WORDS = Object.freeze(["moonleaf", "emberroot", "star-salt"]);
const POTION_RUSH_ACTIONS: readonly InputActionId[] = Object.freeze([
  "move-left",
  "move-right",
  "move-up",
  "move-down",
  "confirm",
  "cancel",
]);
const SEED_MODULUS = 2_147_483_647;

function tokenize(sentence: string): readonly string[] {
  return Object.freeze(sentence.trim().split(/\s+/u).filter(Boolean));
}

function comparableWord(word: string): string {
  return word.toLocaleLowerCase().replace(/[.,!?;:]+$/u, "");
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function normalizeSeed(value: number | undefined): number {
  if (value === undefined) return 0;
  if (!Number.isFinite(value)) throw new Error("Potion Rush seed must be finite");
  return Math.abs(Math.floor(value)) % SEED_MODULUS;
}

function seededUnit(seed: number, index: number, salt: number): number {
  let value = (seed + (index + 1) * 48_271 + (salt + 1) * 12_289) % SEED_MODULUS;
  value = (value * 48_271) % SEED_MODULUS;
  return value / SEED_MODULUS;
}

function shuffleWithSeed<T>(values: readonly T[], seed: number): T[] {
  const shuffled = [...values];
  if (seed === 0) return shuffled;
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(seededUnit(seed, index, 17) * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex]!, shuffled[index]!];
  }
  return shuffled;
}

function validCauldronIndex(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value < POTION_RUSH_CAULDRON_COUNT;
}

function makeEmptyCauldron(id: number, customerId: string | null): PotionRushCauldron {
  return Object.freeze({
    id,
    state: "idle",
    customerId,
    sentenceIndex: null,
    nextWordIndex: 0,
    currentWords: Object.freeze([]),
  });
}

function makeIngredient(
  id: string,
  word: string,
  sentenceIndex: number,
  ordinal: number,
  seed: number,
): PotionRushIngredient {
  return Object.freeze({
    id,
    word,
    sentenceIndex,
    x: 82 + (ordinal % 7) * 126 + (seed === 0 ? 0 : (seededUnit(seed, ordinal, 23) - 0.5) * 48),
    y: 0,
    width: INGREDIENT_WIDTH,
    selected: false,
  });
}

function createActionResult(
  snapshot: PotionRushSnapshot,
  values: Omit<PotionRushActionResult, "snapshot">,
): PotionRushActionResult {
  return Object.freeze({ ...values, snapshot });
}

function activeCustomerFor(
  customers: readonly PotionRushCustomer[],
  activeCustomerIds: readonly (string | null)[],
  slot: number,
): PotionRushCustomer | undefined {
  const customerId = activeCustomerIds[slot];
  return customerId === null || customerId === undefined
    ? undefined
    : customers.find((customer) => customer.id === customerId);
}

function pointerInScene(
  scene: PhaserSceneLike,
  clientX: number,
  clientY: number,
  width: number,
  height: number,
): { readonly x: number; readonly y: number } {
  const rect = scene.game?.canvas?.getBoundingClientRect?.();
  const rectHeight = rect?.height ?? height;
  if (!rect || rect.width <= 0 || rectHeight <= 0) return { x: clientX, y: clientY };
  return {
    x: (clientX - rect.left) * (width / rect.width),
    y: (clientY - (rect.top ?? 0)) * (height / rectHeight),
  };
}

/**
 * Maps a local pointer or touch coordinate to a conveyor ingredient or cauldron.
 * @param pointerX Scene-space horizontal pointer coordinate.
 * @param pointerY Scene-space vertical pointer coordinate.
 * @param sceneWidth Current procedural scene width.
 * @param sceneHeight Current procedural scene height.
 * @param snapshot Current controller state.
 * @returns The nearest active hit region, or none outside the scene controls.
 */
export function getPotionRushPointerTarget(
  pointerX: number,
  pointerY: number,
  sceneWidth: number,
  sceneHeight: number,
  snapshot: PotionRushSnapshot,
): PotionRushPointerTarget {
  const conveyorY = sceneHeight * 0.78;
  if (pointerY >= conveyorY - 42 && pointerY <= conveyorY + 48) {
    const ingredient = snapshot.conveyor.find((candidate) =>
      Math.abs(pointerX - candidate.x) <= candidate.width / 2,
    );
    if (ingredient) return { kind: "ingredient", ingredientId: ingredient.id };
  }

  const dumpX = sceneWidth / 2;
  const dumpY = sceneHeight * 0.7;
  if (Math.abs(pointerX - dumpX) <= 64 && Math.abs(pointerY - dumpY) <= 34) {
    const spoiledIndex = snapshot.cauldrons.findIndex((cauldron) => cauldron.state === "spoiled");
    if (spoiledIndex >= 0) return { kind: "dump", cauldronIndex: spoiledIndex };
  }

  const cauldronY = sceneHeight * 0.48;
  const cauldronWidth = Math.min(230, sceneWidth * 0.25);
  const cauldronHeight = Math.min(144, sceneHeight * 0.27);
  for (let index = 0; index < POTION_RUSH_CAULDRON_COUNT; index += 1) {
    const centerX = sceneWidth * (0.2 + index * 0.3);
    if (
      Math.abs(pointerX - centerX) <= cauldronWidth / 2
      && pointerY >= cauldronY
      && pointerY <= cauldronY + cauldronHeight
    ) {
      return { kind: "cauldron", cauldronIndex: index };
    }
  }
  return { kind: "none" };
}

/**
 * Creates ordered Potion Rush rules from a validated sentence session.
 * @param input Untrusted sentence content supplied by the host or a test.
 * @param deliver Callback that receives the first terminal result and outcome.
 * @param options Deterministic choice, placement, and hazard settings.
 * @returns A controller for deterministic customer service and ordered brewing.
 * @throws When the input is invalid, empty, or contains no usable sentence content.
 */
export function createPotionRushController(
  input: unknown,
  deliver: (result: GameResults, outcome: Exclude<GameTerminalOutcome, "complete">) => void | Promise<void>,
  options: PotionRushControllerOptions = {},
): PotionRushController {
  const parsed = sentenceInputSchema.parse(input);
  const content = validateNonEmptyContent(parsed, "sentence");
  const seed = normalizeSeed(options.seed);
  const requests = content.items.map((item) => Object.freeze({ term: item.term, translation: item.translation }));
  const wordsBySentence = requests.map((request) => tokenize(request.term));
  const targetCount = wordsBySentence.reduce((count, words) => count + words.length, 0);
  if (targetCount === 0) throw new Error("Potion Rush requires at least one sentence word");
  const customersInitial = requests.map((request, sentenceIndex) => Object.freeze({
    id: `customer:${sentenceIndex}`,
    sentenceIndex,
    request,
    patience: STARTING_PATIENCE,
    maxPatience: STARTING_PATIENCE,
    state: "waiting" as const,
    slot: null,
  }));
  const initialWords = wordsBySentence.flatMap((words, sentenceIndex) => words.map((word) => ({ word, sentenceIndex })));
  const decoys = requests.map((_request, index) => ({ word: DECOY_WORDS[index % DECOY_WORDS.length]!, sentenceIndex: -1 }));
  let customers: PotionRushCustomer[] = [...customersInitial];
  let activeCustomerIds: (string | null)[] = Array.from({ length: POTION_RUSH_CAULDRON_COUNT }, () => null);
  let cauldrons: PotionRushCauldron[] = Array.from({ length: POTION_RUSH_CAULDRON_COUNT }, (_, index) => makeEmptyCauldron(index, null));
  let ingredientOrdinal = initialWords.length + decoys.length;
  const arrangedIngredients = shuffleWithSeed([...initialWords, ...decoys], seed);
  let conveyor: PotionRushIngredient[] = arrangedIngredients.map(({ word, sentenceIndex }, index) =>
    makeIngredient(`ingredient:${index}`, word, sentenceIndex, index, seed),
  );
  let selectedIngredientId: string | undefined = conveyor[0]?.id;
  let selectedCauldronIndex = 0;
  let phase: PotionRushPhase = "playing";
  let reputation = STARTING_REPUTATION;
  let servedCustomers = 0;
  let lastOutcome: PotionRushOutcome | undefined;
  let terminalResult: GameResults | undefined;
  let terminalOutcome: Exclude<GameTerminalOutcome, "complete"> = "victory";
  let hazardCursor = 0;
  const hazardOrder = shuffleWithSeed(
    Array.from({ length: POTION_RUSH_CAULDRON_COUNT }, (_, index) => index),
    seed,
  );
  let destroyed = false;
  let accountant = createResultAccountant();
  const completion = createCompletionLatch<GameResults>((result) => deliver(result, terminalOutcome));

  const queue = (): readonly string[] => customers.map((customer) => customer.id);

  const setSelectedIngredient = (ingredientId: string | undefined): void => {
    selectedIngredientId = conveyor.some((ingredient) => ingredient.id === ingredientId) ? ingredientId : undefined;
    conveyor = conveyor.map((ingredient) => Object.freeze({ ...ingredient, selected: ingredient.id === selectedIngredientId }));
  };

  const nextWaitingCustomer = (): PotionRushCustomer | undefined => customers.find((customer) =>
    customer.state === "waiting" && !activeCustomerIds.includes(customer.id),
  );

  const requeueNextUnservedCustomer = (): PotionRushCustomer | undefined => {
    const next = customers.find((customer) => customer.state === "expired" && !activeCustomerIds.includes(customer.id));
    if (!next) return undefined;
    customers = customers.map((customer) => customer.id === next.id
      ? Object.freeze({ ...customer, patience: STARTING_PATIENCE, state: "waiting" as const, slot: null })
      : customer);
    return customers.find((customer) => customer.id === next.id);
  };

  const fillSlot = (slot: number): boolean => {
    const next = nextWaitingCustomer() ?? requeueNextUnservedCustomer();
    activeCustomerIds[slot] = next?.id ?? null;
    cauldrons[slot] = makeEmptyCauldron(slot, next?.id ?? null);
    if (next) {
      customers = customers.map((customer) => customer.id === next.id ? Object.freeze({ ...customer, slot }) : customer);
    }
    return next !== undefined;
  };

  for (let index = 0; index < POTION_RUSH_CAULDRON_COUNT; index += 1) fillSlot(index);
  setSelectedIngredient(selectedIngredientId);

  const currentTarget = (): { readonly prompt: string; readonly answer: string; readonly energy: number } => {
    const slots = [selectedCauldronIndex, 0, 1, 2].filter((slot, index, values) => values.indexOf(slot) === index);
    for (const slot of slots) {
      const customer = activeCustomerFor(customers, activeCustomerIds, slot);
      const cauldron = cauldrons[slot];
      if (!customer || !cauldron || cauldron.state === "spoiled" || cauldron.state === "completed") continue;
      const targetWords = wordsBySentence[customer.sentenceIndex]!;
      return {
        prompt: customer.request.translation,
        answer: targetWords[cauldron.nextWordIndex] ?? "",
        energy: customer.patience,
      };
    }
    return { prompt: "", answer: "", energy: 0 };
  };

  const snapshot = (): PotionRushSnapshot => Object.freeze({
    phase,
    status: phase,
    seed,
    targetIndex: accountant.correctAnswers,
    targetCount,
    prompt: currentTarget().prompt,
    answer: currentTarget().answer,
    correctAction: "confirm",
    availableActions: POTION_RUSH_ACTIONS,
    customers: Object.freeze(customers.map((customer) => Object.freeze({ ...customer, request: Object.freeze({ ...customer.request }) }))),
    queue: Object.freeze([...queue()]),
    activeCustomerIds: Object.freeze([...activeCustomerIds]),
    cauldrons: Object.freeze(cauldrons.map((cauldron) => Object.freeze({ ...cauldron, currentWords: Object.freeze([...cauldron.currentWords]) }))),
    conveyor: Object.freeze(conveyor.map((ingredient) => Object.freeze({ ...ingredient }))),
    selectedIngredientId,
    selectedCauldronIndex,
    reputation,
    maxReputation: STARTING_REPUTATION,
    lives: reputation,
    energy: currentTarget().energy,
    score: accountant.score,
    correctAnswers: accountant.correctAnswers,
    totalAttempts: accountant.totalAttempts,
    servedCustomers,
    lastOutcome,
    result: terminalResult,
    hazardCursor,
    destroyed,
  });

  const emptyResult = (): PotionRushActionResult => createActionResult(snapshot(), {
    accepted: false,
    correct: false,
    progressed: false,
    terminal: false,
    completed: false,
    served: false,
  });

  const resultForAccountant = (source: ReturnType<typeof createResultAccountant>): GameResults => gameResultsSchema.parse(
    finalizeResult(source, { xpPerCorrect: 20, xpPerAccuracyPoint: 10 }),
  );

  const resultForCounters = (): GameResults => resultForAccountant(accountant);

  const accountantForCounters = (
    state: Pick<PotionRushSnapshot, "correctAnswers" | "totalAttempts" | "score">,
  ): ReturnType<typeof createResultAccountant> => {
    const restoredAccountant = createResultAccountant();
    for (let index = 0; index < state.totalAttempts; index += 1) {
      restoredAccountant.recordAttempt({ correct: index < state.correctAnswers });
    }
    restoredAccountant.addScore(state.score);
    return restoredAccountant;
  };

  const finish = (nextPhase: "victory" | "defeat"): GameResults => {
    if (terminalResult !== undefined) return terminalResult;
    phase = nextPhase;
    terminalOutcome = nextPhase;
    terminalResult = resultForCounters();
    completion.complete(terminalResult);
    return terminalResult;
  };

  const replaceCustomerInSlot = (slot: number): boolean => {
    const oldCustomerId = activeCustomerIds[slot];
    if (oldCustomerId !== null) {
      customers = customers.map((customer) => customer.id === oldCustomerId ? Object.freeze({ ...customer, slot: null }) : customer);
    }
    activeCustomerIds[slot] = null;
    return fillSlot(slot);
  };

  const returnWordsToConveyor = (words: readonly string[]): void => {
    conveyor = [
      ...conveyor,
      ...words.map((word, index) => makeIngredient(
        `ingredient:return:${ingredientOrdinal++}`,
        word,
        -1,
        ingredientOrdinal + index,
        seed,
      )),
    ];
  };

  const selectNextIngredient = (direction: -1 | 1): void => {
    if (conveyor.length === 0) {
      selectedIngredientId = undefined;
      return;
    }
    const currentIndex = Math.max(0, conveyor.findIndex((ingredient) => ingredient.id === selectedIngredientId));
    const nextIndex = (currentIndex + direction + conveyor.length) % conveyor.length;
    setSelectedIngredient(conveyor[nextIndex]!.id);
  };

  const validateRestoredState = (state: PotionRushSnapshot): void => {
    if (state === null || typeof state !== "object") throw new Error("Potion Rush state must be an object");
    if (!["playing", "victory", "defeat"].includes(state.phase) || state.status !== state.phase) {
      throw new Error("Potion Rush phase is invalid");
    }
    if (state.seed !== seed) throw new Error("Potion Rush responsive seed is invalid");
    if (state.customers.length !== customers.length || state.queue.length !== customers.length) {
      throw new Error("Potion Rush customer count is invalid");
    }
    if (state.cauldrons.length !== POTION_RUSH_CAULDRON_COUNT) throw new Error("Potion Rush cauldron count is invalid");
    if (state.activeCustomerIds.length !== POTION_RUSH_CAULDRON_COUNT) throw new Error("Potion Rush active queue is invalid");
    if (!validCauldronIndex(state.selectedCauldronIndex)) throw new Error("Potion Rush selected cauldron is invalid");
    if (state.targetCount !== targetCount || !Number.isInteger(state.targetIndex) || state.targetIndex < 0 || state.targetIndex > targetCount) {
      throw new Error("Potion Rush target progress is invalid");
    }
    if (!Number.isInteger(state.reputation) || state.reputation < 0 || state.reputation > STARTING_REPUTATION || state.maxReputation !== STARTING_REPUTATION) {
      throw new Error("Potion Rush reputation is invalid");
    }
    if (state.lives !== state.reputation || !Number.isFinite(state.energy) || state.energy < 0 || state.energy > STARTING_PATIENCE) {
      throw new Error("Potion Rush shared resources are invalid");
    }
    if (!Number.isInteger(state.score) || state.score < 0) throw new Error("Potion Rush score is invalid");
    if (!Number.isInteger(state.correctAnswers) || state.correctAnswers !== state.targetIndex || state.correctAnswers < 0 || state.correctAnswers > state.totalAttempts) {
      throw new Error("Potion Rush counters are invalid");
    }
    if (!Number.isInteger(state.totalAttempts) || state.totalAttempts < 0) throw new Error("Potion Rush attempts are invalid");
    if (!Number.isInteger(state.servedCustomers) || state.servedCustomers < 0 || state.servedCustomers > customers.length) {
      throw new Error("Potion Rush served count is invalid");
    }
    if (state.correctAction !== "confirm" || state.availableActions.length !== POTION_RUSH_ACTIONS.length || state.availableActions.some((action, index) => action !== POTION_RUSH_ACTIONS[index])) {
      throw new Error("Potion Rush action contract is invalid");
    }
    if (!Number.isInteger(state.hazardCursor) || state.hazardCursor < 0) throw new Error("Potion Rush hazard cursor is invalid");
    if (typeof state.destroyed !== "boolean") throw new Error("Potion Rush destroyed flag is invalid");
    const restoredAccountant = accountantForCounters(state);
    if (state.result !== undefined) {
      const parsedResult = gameResultsSchema.parse(state.result);
      const expectedResult = resultForAccountant(restoredAccountant);
      if (
        parsedResult.accuracy !== expectedResult.accuracy
        || parsedResult.xp !== expectedResult.xp
        || parsedResult.score !== expectedResult.score
        || parsedResult.correctAnswers !== expectedResult.correctAnswers
        || parsedResult.totalAttempts !== expectedResult.totalAttempts
      ) {
        throw new Error("Potion Rush responsive result is inconsistent");
      }
    }
    if (state.phase === "playing" && state.result !== undefined) throw new Error("Potion Rush playing state has a result");
    if (state.phase !== "playing" && state.result === undefined) throw new Error("Potion Rush terminal state has no result");
    if (state.phase === "victory" && (state.servedCustomers !== customers.length || state.targetIndex !== targetCount)) {
      throw new Error("Potion Rush victory is incomplete");
    }
    if (state.phase === "defeat" && state.reputation !== 0) throw new Error("Potion Rush defeat requires zero reputation");

    const knownCustomers = new Map(customers.map((customer) => [customer.id, customer]));
    const seenCustomerIds = new Set<string>();
    for (const [index, customer] of state.customers.entries()) {
      const expected = customers[index];
      if (
        !expected
        || customer.id !== expected.id
        || customer.sentenceIndex !== expected.sentenceIndex
        || customer.request.term !== expected.request.term
        || customer.request.translation !== expected.request.translation
        || seenCustomerIds.has(customer.id)
        || !["waiting", "served", "expired"].includes(customer.state)
        || !Number.isFinite(customer.patience)
        || customer.patience < 0
        || customer.patience > STARTING_PATIENCE
      ) throw new Error("Potion Rush customer identity is invalid");
      seenCustomerIds.add(customer.id);
      if (customer.slot !== null && !validCauldronIndex(customer.slot)) throw new Error("Potion Rush customer slot is invalid");
      if (customer.state !== "waiting" && customer.slot !== null) throw new Error("Potion Rush inactive customer has a slot");
      if (customer.state === "expired" && customer.patience !== 0) throw new Error("Potion Rush expired customer patience is invalid");
      if (state.queue[index] !== customer.id) throw new Error("Potion Rush queue order is invalid");
    }
    if (state.customers.filter((customer) => customer.state === "served").length !== state.servedCustomers) {
      throw new Error("Potion Rush served count is inconsistent");
    }

    const activeIds = new Set<string>();
    for (const [slot, customerId] of state.activeCustomerIds.entries()) {
      if (customerId === null) continue;
      const customer = knownCustomers.get(customerId);
      if (!customer || activeIds.has(customerId)) throw new Error("Potion Rush active customer assignment is invalid");
      const restoredCustomer = state.customers.find((candidate) => candidate.id === customerId);
      if (!restoredCustomer || restoredCustomer.state !== "waiting" || restoredCustomer.slot !== slot) {
        throw new Error("Potion Rush responsive customer assignment is invalid");
      }
      activeIds.add(customerId);
    }
    for (const customer of state.customers) {
      if (customer.slot !== null && state.activeCustomerIds[customer.slot] !== customer.id) {
        throw new Error("Potion Rush responsive customer slot is inconsistent");
      }
      if (customer.state === "waiting" && customer.slot === null && state.activeCustomerIds.includes(customer.id)) {
        throw new Error("Potion Rush waiting customer assignment is inconsistent");
      }
      if (customer.state === "served" && customer.slot !== null) throw new Error("Potion Rush served customer assignment is invalid");
    }

    for (const [slot, cauldron] of state.cauldrons.entries()) {
      if (!validCauldronIndex(cauldron.id) || cauldron.id !== slot || !Array.isArray(cauldron.currentWords) || !Number.isInteger(cauldron.nextWordIndex)) {
        throw new Error("Potion Rush cauldron identity is invalid");
      }
      if (!["idle", "brewing", "spoiled", "completed"].includes(cauldron.state)) throw new Error("Potion Rush cauldron state is invalid");
      const activeCustomerId = state.activeCustomerIds[slot];
      if (cauldron.customerId !== activeCustomerId) throw new Error("Potion Rush cauldron customer assignment is invalid");
      const customer = activeCustomerId === null ? undefined : state.customers.find((candidate) => candidate.id === activeCustomerId);
      if (!customer) {
        if (cauldron.state !== "idle" || cauldron.sentenceIndex !== null || cauldron.nextWordIndex !== 0 || cauldron.currentWords.length > 0) {
          throw new Error("Potion Rush empty cauldron assignment is invalid");
        }
        continue;
      }
      if (cauldron.state === "idle") {
        if (cauldron.sentenceIndex !== null || cauldron.nextWordIndex !== 0 || cauldron.currentWords.length !== 0) {
          throw new Error("Potion Rush idle customer assignment is invalid");
        }
        continue;
      }
      if (cauldron.sentenceIndex !== customer.sentenceIndex) throw new Error("Potion Rush cauldron sentence assignment is invalid");
      const targetWords = wordsBySentence[customer.sentenceIndex]!;
      if (cauldron.nextWordIndex < 0 || cauldron.nextWordIndex > targetWords.length || cauldron.currentWords.length > targetWords.length + 1) {
        throw new Error("Potion Rush cauldron progress is invalid");
      }
      const prefix = targetWords.slice(0, cauldron.nextWordIndex);
      if (prefix.some((word, index) => comparableWord(word) !== comparableWord(cauldron.currentWords[index] ?? ""))) {
        throw new Error("Potion Rush cauldron word order is invalid");
      }
      if (cauldron.state === "brewing" && (cauldron.nextWordIndex === 0 || cauldron.nextWordIndex >= targetWords.length || cauldron.currentWords.length !== cauldron.nextWordIndex)) {
        throw new Error("Potion Rush brewing cauldron progress is invalid");
      }
      if (cauldron.state === "completed" && (cauldron.nextWordIndex !== targetWords.length || cauldron.currentWords.length !== targetWords.length)) {
        throw new Error("Potion Rush completed cauldron progress is invalid");
      }
      if (cauldron.state === "spoiled" && (cauldron.nextWordIndex >= targetWords.length || cauldron.currentWords.length !== cauldron.nextWordIndex + 1 || comparableWord(cauldron.currentWords[cauldron.nextWordIndex] ?? "") === comparableWord(targetWords[cauldron.nextWordIndex] ?? ""))) {
        throw new Error("Potion Rush spoiled cauldron progress is invalid");
      }
    }

    if (!Array.isArray(state.conveyor)) throw new Error("Potion Rush conveyor is invalid");
    const ingredientIds = new Set<string>();
    let selectedCount = 0;
    for (const ingredient of state.conveyor) {
      if (typeof ingredient.id !== "string" || ingredientIds.has(ingredient.id) || typeof ingredient.word !== "string" || !Number.isFinite(ingredient.x) || !Number.isFinite(ingredient.y) || ingredient.width !== INGREDIENT_WIDTH || !Number.isInteger(ingredient.sentenceIndex) || ingredient.sentenceIndex < -1 || ingredient.sentenceIndex >= requests.length || typeof ingredient.selected !== "boolean") {
        throw new Error("Potion Rush conveyor ingredient is invalid");
      }
      ingredientIds.add(ingredient.id);
      if (ingredient.selected) selectedCount += 1;
    }
    if (state.selectedIngredientId !== undefined && !ingredientIds.has(state.selectedIngredientId)) throw new Error("Potion Rush selected ingredient is invalid");
    if (selectedCount > 1 || state.conveyor.some((ingredient) => ingredient.selected !== (ingredient.id === state.selectedIngredientId))) {
      throw new Error("Potion Rush ingredient selection is invalid");
    }

    const targetDescriptor = [state.selectedCauldronIndex, 0, 1, 2]
      .filter((slot, index, slots) => slots.indexOf(slot) === index)
      .map((slot) => {
        const cauldron = state.cauldrons[slot]!;
        const customer = state.customers.find((candidate) => candidate.id === state.activeCustomerIds[slot]);
        if (!customer || cauldron.state === "spoiled" || cauldron.state === "completed") return undefined;
        const targetWords = wordsBySentence[customer.sentenceIndex]!;
        return {
          prompt: customer.request.translation,
          answer: targetWords[cauldron.nextWordIndex] ?? "",
          energy: customer.patience,
        };
      })
      .find((candidate): candidate is { prompt: string; answer: string; energy: number } => candidate !== undefined);
    if (
      state.prompt !== (targetDescriptor?.prompt ?? "")
      || state.answer !== (targetDescriptor?.answer ?? "")
      || state.energy !== (targetDescriptor?.energy ?? 0)
    ) {
      throw new Error("Potion Rush responsive target prompt is invalid");
    }
  };

  const controller: PotionRushController = {
    snapshot,
    selectIngredient(ingredientId: string): PotionRushSnapshot {
      if (!destroyed && phase === "playing") setSelectedIngredient(ingredientId);
      return snapshot();
    },
    selectCauldron(cauldronIndex: number): PotionRushSnapshot {
      if (!destroyed && validCauldronIndex(cauldronIndex)) selectedCauldronIndex = cauldronIndex;
      return snapshot();
    },
    placeIngredient(ingredientId: string, cauldronIndex: number): PotionRushActionResult {
      const before = snapshot();
      if (destroyed || phase !== "playing" || !validCauldronIndex(cauldronIndex)) return createActionResult(before, {
        accepted: false, correct: false, progressed: false, terminal: false, completed: false, served: false,
      });
      const ingredient = conveyor.find((candidate) => candidate.id === ingredientId);
      const cauldron = cauldrons[cauldronIndex]!;
      const customer = activeCustomerFor(customers, activeCustomerIds, cauldronIndex);
      if (!ingredient || !customer || cauldron.state === "spoiled" || cauldron.state === "completed") return emptyResult();

      const targetWords = wordsBySentence[customer.sentenceIndex]!;
      const wordIndex = cauldron.nextWordIndex;
      const correct = comparableWord(ingredient.word) === comparableWord(targetWords[wordIndex] ?? "");
      accountant.recordAttempt({ correct });
      lastOutcome = correct ? "correct" : "wrong";
      conveyor = conveyor.filter((candidate) => candidate.id !== ingredientId);
      selectedIngredientId = conveyor[0]?.id;
      if (correct) {
        const nextWords = [...cauldron.currentWords, ingredient.word];
        accountant.addScore(100);
        cauldrons[cauldronIndex] = Object.freeze({
          ...cauldron,
          state: nextWords.length === targetWords.length ? "completed" : "brewing",
          customerId: customer.id,
          sentenceIndex: customer.sentenceIndex,
          nextWordIndex: wordIndex + 1,
          currentWords: Object.freeze(nextWords),
        });
      } else {
        cauldrons[cauldronIndex] = Object.freeze({
          ...cauldron,
          state: "spoiled",
          customerId: customer.id,
          sentenceIndex: customer.sentenceIndex,
          nextWordIndex: wordIndex,
          currentWords: Object.freeze([...cauldron.currentWords, ingredient.word]),
        });
      }
      setSelectedIngredient(selectedIngredientId);
      const after = snapshot();
      return createActionResult(after, {
        accepted: true,
        correct,
        progressed: correct,
        terminal: false,
        completed: false,
        served: false,
      });
    },
    dropIngredient(ingredientId: string, cauldronIndex: number): PotionRushActionResult {
      return controller.placeIngredient(ingredientId, cauldronIndex);
    },
    dumpCauldron(cauldronIndex: number): PotionRushActionResult {
      const before = snapshot();
      if (destroyed || phase !== "playing" || !validCauldronIndex(cauldronIndex)) return createActionResult(before, {
        accepted: false, correct: false, progressed: false, terminal: false, completed: false, served: false,
      });
      const cauldron = cauldrons[cauldronIndex]!;
      if (cauldron.state !== "spoiled") return createActionResult(before, {
        accepted: false, correct: false, progressed: false, terminal: false, completed: false, served: false,
      });
      returnWordsToConveyor(cauldron.currentWords);
      cauldrons[cauldronIndex] = makeEmptyCauldron(cauldronIndex, activeCustomerIds[cauldronIndex]);
      lastOutcome = "dumped";
      selectedCauldronIndex = cauldronIndex;
      setSelectedIngredient(conveyor[0]?.id);
      return createActionResult(snapshot(), {
        accepted: true, correct: false, progressed: false, terminal: false, completed: false, served: false,
      });
    },
    serveCustomer(customerId: string, cauldronIndex: number): PotionRushActionResult {
      const before = snapshot();
      if (destroyed || phase !== "playing" || !validCauldronIndex(cauldronIndex)) return createActionResult(before, {
        accepted: false, correct: false, progressed: false, terminal: false, completed: false, served: false,
      });
      const cauldron = cauldrons[cauldronIndex]!;
      const customer = customers.find((candidate) => candidate.id === customerId);
      if (
        cauldron.state !== "completed"
        || !customer
        || customer.state !== "waiting"
        || activeCustomerIds[cauldronIndex] !== customerId
        || cauldron.customerId !== customerId
        || cauldron.sentenceIndex !== customer.sentenceIndex
      ) return createActionResult(before, {
        accepted: false, correct: false, progressed: false, terminal: false, completed: false, served: false,
      });

      servedCustomers += 1;
      lastOutcome = "served";
      customers = customers.map((candidate) => candidate.id === customerId
        ? Object.freeze({ ...candidate, state: "served" as const, slot: null })
        : candidate);
      activeCustomerIds[cauldronIndex] = null;
      cauldrons[cauldronIndex] = makeEmptyCauldron(cauldronIndex, null);
      if (servedCustomers === customers.length) {
        const result = finish("victory");
        return createActionResult(snapshot(), {
          accepted: true, correct: true, progressed: true, terminal: true, completed: true, served: true, result,
        });
      }
      fillSlot(cauldronIndex);
      const nextCustomer = activeCustomerIds[cauldronIndex];
      cauldrons[cauldronIndex] = makeEmptyCauldron(cauldronIndex, nextCustomer);
      return createActionResult(snapshot(), {
        accepted: true, correct: true, progressed: true, terminal: false, completed: false, served: true,
      });
    },
    choose(action: InputActionId): PotionRushActionResult {
      const before = snapshot();
      if (destroyed || phase !== "playing") return createActionResult(before, {
        accepted: false, correct: false, progressed: false, terminal: false, completed: false, served: false,
      });
      if (action === "move-left" || action === "move-right") {
        selectNextIngredient(action === "move-left" ? -1 : 1);
        return createActionResult(snapshot(), {
          accepted: true, correct: false, progressed: false, terminal: false, completed: false, served: false,
        });
      }
      if (action === "move-up" || action === "move-down") {
        selectedCauldronIndex = (selectedCauldronIndex + (action === "move-up" ? -1 : 1) + POTION_RUSH_CAULDRON_COUNT) % POTION_RUSH_CAULDRON_COUNT;
        return createActionResult(snapshot(), {
          accepted: true, correct: false, progressed: false, terminal: false, completed: false, served: false,
        });
      }
      if (action === "cancel") {
        const cauldron = cauldrons[selectedCauldronIndex]!;
        if (cauldron.state === "spoiled") return controller.dumpCauldron(selectedCauldronIndex);
        setSelectedIngredient(undefined);
        return createActionResult(snapshot(), {
          accepted: true, correct: false, progressed: false, terminal: false, completed: false, served: false,
        });
      }
      if (action !== "confirm") return createActionResult(before, {
        accepted: false, correct: false, progressed: false, terminal: false, completed: false, served: false,
      });
      const cauldron = cauldrons[selectedCauldronIndex]!;
      if (cauldron.state === "spoiled") return controller.dumpCauldron(selectedCauldronIndex);
      const customerId = activeCustomerIds[selectedCauldronIndex];
      if (cauldron.state === "completed" && customerId) return controller.serveCustomer(customerId, selectedCauldronIndex);
      if (selectedIngredientId) return controller.placeIngredient(selectedIngredientId, selectedCauldronIndex);
      return emptyResult();
    },
    applyHazard(): PotionRushActionResult {
      const before = snapshot();
      if (destroyed || phase !== "playing") return createActionResult(before, {
        accepted: false, correct: false, progressed: false, terminal: false, completed: false, served: false,
      });
      const activeSlots = hazardOrder
        .map((_slot, index) => hazardOrder[(hazardCursor + index) % hazardOrder.length]!)
        .filter((slot) => activeCustomerIds[slot] !== null);
      const slot = activeSlots[0];
      if (slot === undefined) return createActionResult(before, {
        accepted: false, correct: false, progressed: false, terminal: false, completed: false, served: false,
      });
      hazardCursor += 1;
      const customerId = activeCustomerIds[slot];
      if (customerId === null) return createActionResult(before, {
        accepted: false, correct: false, progressed: false, terminal: false, completed: false, served: false,
      });
      const words = cauldrons[slot]?.currentWords ?? [];
      if (words.length > 0) returnWordsToConveyor(words);
      customers = customers.map((customer) => customer.id === customerId
        ? Object.freeze({ ...customer, patience: 0, state: "expired" as const, slot: null })
        : customer);
      reputation = Math.max(0, reputation - EXPIRY_REPUTATION_PENALTY);
      activeCustomerIds[slot] = null;
      cauldrons[slot] = makeEmptyCauldron(slot, null);
      lastOutcome = "expired";
      let result: GameResults | undefined;
      if (reputation > 0) {
        if (!replaceCustomerInSlot(slot)) result = finish("defeat");
      } else {
        result = finish("defeat");
      }
      return createActionResult(snapshot(), {
        accepted: true,
        correct: false,
        progressed: false,
        terminal: result !== undefined,
        completed: result !== undefined,
        served: false,
        ...(result ? { result } : {}),
      });
    },
    tick(deltaSeconds: number, viewportWidth = POTION_RUSH_CANVAS.width): PotionRushSnapshot {
      if (destroyed || phase !== "playing") return snapshot();
      if (!Number.isFinite(deltaSeconds) || deltaSeconds < 0) throw new Error("Potion Rush delta must be nonnegative and finite");
      if (!Number.isFinite(viewportWidth) || viewportWidth <= 0) throw new Error("Potion Rush viewport width must be positive and finite");
      if (deltaSeconds === 0) return snapshot();
      const delta = Math.min(deltaSeconds, 0.05);
      conveyor = conveyor.map((ingredient) => Object.freeze({
        ...ingredient,
        x: ingredient.x - CONVEYOR_SPEED * delta < -ingredient.width
          ? viewportWidth + ingredient.width
          : ingredient.x - CONVEYOR_SPEED * delta,
      }));
      customers = customers.map((customer) => {
        if (customer.state !== "waiting" || customer.slot === null) return customer;
        const remaining = Math.max(0, customer.patience - delta);
        const patience = remaining < 1e-9 ? 0 : remaining;
        return Object.freeze({ ...customer, patience });
      });
      const expiredSlots = hazardOrder.filter((slot) => {
        const customerId = activeCustomerIds[slot];
        return customerId !== null && customers.find((customer) => customer.id === customerId)?.patience === 0;
      });
      for (const expiredSlot of expiredSlots) {
        const expiredCustomer = activeCustomerIds[expiredSlot];
        if (expiredCustomer === null) continue;
        const spoiledWords = cauldrons[expiredSlot]?.currentWords ?? [];
        if (spoiledWords.length > 0) returnWordsToConveyor(spoiledWords);
        customers = customers.map((customer) => customer.id === expiredCustomer
          ? Object.freeze({ ...customer, patience: 0, state: "expired" as const, slot: null })
          : customer);
        reputation = Math.max(0, reputation - EXPIRY_REPUTATION_PENALTY);
        activeCustomerIds[expiredSlot] = null;
        cauldrons[expiredSlot] = makeEmptyCauldron(expiredSlot, null);
        lastOutcome = "expired";
        if (reputation > 0) {
          if (!replaceCustomerInSlot(expiredSlot)) {
            finish("defeat");
            break;
          }
        } else {
          finish("defeat");
          break;
        }
      }
      return snapshot();
    },
    capture: snapshot,
    restore(state: PotionRushSnapshot): void {
      if (destroyed) return;
      if (completion.hasCompleted && state.phase === "playing") throw new Error("Potion Rush cannot restore active state after completion");
      validateRestoredState(state);
      customers = state.customers.map((customer) => Object.freeze({ ...customer, request: Object.freeze({ ...customer.request }) }));
      activeCustomerIds = [...state.activeCustomerIds];
      cauldrons = state.cauldrons.map((cauldron) => Object.freeze({ ...cauldron, currentWords: Object.freeze([...cauldron.currentWords]) }));
      conveyor = state.conveyor.map((ingredient) => Object.freeze({ ...ingredient }));
      selectedIngredientId = state.selectedIngredientId;
      selectedCauldronIndex = state.selectedCauldronIndex;
      reputation = state.reputation;
      servedCustomers = state.servedCustomers;
      lastOutcome = state.lastOutcome;
      terminalResult = state.result;
      hazardCursor = state.hazardCursor;
      accountant = accountantForCounters(state);
      phase = state.phase;
      if (state.phase !== "playing" || state.destroyed) completion.sealWithoutDelivery();
      destroyed = state.destroyed;
    },
    destroy(): void {
      if (destroyed) return;
      destroyed = true;
      completion.sealWithoutDelivery();
    },
  };

  return Object.freeze(controller);
}

interface PhaserGraphicsLike {
  clear(): this;
  fillStyle(color: number, alpha?: number): this;
  fillRect(x: number, y: number, width: number, height: number): this;
  fillCircle(x: number, y: number, radius: number): this;
  fillRoundedRect(x: number, y: number, width: number, height: number, radius?: number): this;
  lineStyle(lineWidth: number, color: number, alpha?: number): this;
  strokeRoundedRect(x: number, y: number, width: number, height: number, radius?: number): this;
  destroy(): void;
}

interface PhaserTextLike {
  setPosition(x: number, y: number): this;
  setText(value: string): this;
  destroy(): void;
}

interface PhaserCanvasLike {
  getBoundingClientRect?(): { readonly left: number; readonly top?: number; readonly width: number; readonly height?: number };
}

interface PhaserSceneLike {
  add?: {
    graphics(): PhaserGraphicsLike;
    text(x: number, y: number, value: string, style?: Readonly<Record<string, unknown>>): PhaserTextLike;
    image?(x: number, y: number, key: string, frame?: number): ActorSpriteLike;
    sprite?(x: number, y: number, key: string, frame?: number): ActorSpriteLike;
    tileSprite?(x: number, y: number, width: number, height: number, key: string): ActorSpriteLike;
  };
  load?: {
    image?(key: string, url: string): unknown;
    spritesheet?(key: string, url: string, config: { frameWidth: number; frameHeight: number }): unknown;
    audio?(key: string, urls: string | string[]): unknown;
  };
  events?: { once(event: string, listener: () => void): void };
  game?: { readonly canvas?: PhaserCanvasLike };
  scale?: { readonly width?: number; readonly height?: number };
}

interface SceneResources {
  readonly art: ActorSpriteLayer;
  readonly graphics: PhaserGraphicsLike;
  readonly title: PhaserTextLike;
  readonly prompt: PhaserTextLike;
  readonly progress: PhaserTextLike;
  readonly feedback: PhaserTextLike;
  readonly instructions: PhaserTextLike;
  readonly dump: PhaserTextLike;
  readonly customers: readonly PhaserTextLike[];
  readonly cauldrons: readonly PhaserTextLike[];
  readonly ingredients: readonly PhaserTextLike[];
}

interface PotionRushSceneContext {
  readonly edition: RuntimeEdition;
  readonly controller: PotionRushController;
  readonly inputController: APKInputController;
  readonly composition: CartridgeGameConfigContext["composition"];
  readonly sessionMode: NonNullable<CartridgeGameConfigContext["sessionMode"]>;
  readonly diagnostic: CartridgeGameConfigContext["diagnostic"];
}

function dimensions(scene: PhaserSceneLike): { readonly width: number; readonly height: number } {
  return {
    width: scene.scale?.width ?? POTION_RUSH_CANVAS.width,
    height: scene.scale?.height ?? POTION_RUSH_CANVAS.height,
  };
}

function createScene(context: PotionRushSceneContext): Readonly<Record<string, unknown>> {
  let resources: SceneResources | undefined;
  let composition = context.composition;
  let previousKeys = new Set<string>();
  let animationMs = 0;
  let cleaned = false;
  const normalize = createInputActionNormalizer({
    keyboard: POTION_RUSH_KEYBOARD_BINDINGS,
    pointerTap: { action: "confirm" },
  });
  const frameScheduler = createBoundedFrameScheduler((deltaMs) => {
    animationMs = (animationMs + deltaMs) % 3000;
  });

  const diagnosticAction = (before: PotionRushSnapshot, after: PotionRushSnapshot): void => {
    if (before.totalAttempts === after.totalAttempts && before.lastOutcome === after.lastOutcome) return;
    context.diagnostic({
      level: "info",
      code: after.phase === "victory" || after.phase === "defeat" ? "POTION_RUSH_TERMINAL" : "POTION_RUSH_ACTION",
      message: "Potion Rush processed a shop action.",
      details: { phase: after.phase, outcome: after.lastOutcome, totalAttempts: after.totalAttempts },
    });
  };

  const applyAction = (action: InputActionId): void => {
    const before = context.controller.snapshot();
    const result = context.controller.choose(action);
    if (result.accepted) diagnosticAction(before, result.snapshot);
  };

  const updateView = (scene: PhaserSceneLike): void => {
    if (!resources || !scene.add) return;
    const activeResources = resources;
    const { width, height } = dimensions(scene);
    const state = context.controller.snapshot();
    const cauldronY = height * 0.48;
    const cauldronWidth = Math.min(230, width * 0.25);
    const cauldronHeight = Math.min(144, height * 0.27);
    const beltY = height * 0.78;
    const pulse = Math.sin(animationMs / 420) * 4;

    activeResources.graphics.clear();
    if (!activeResources.art.ground("world:ground", width, height)) activeResources.graphics.fillStyle(0x160f2c, 1).fillRect(0, 0, width, height);
    activeResources.graphics.fillStyle(0x2a1e4d, 1).fillRect(0, height * 0.18, width, height * 0.58);
    activeResources.graphics.fillStyle(0x3e2b5c, 1).fillRect(0, height * 0.76, width, height * 0.24);
    for (let shelf = 0; shelf < 3; shelf += 1) {
      const shelfY = height * (0.25 + shelf * 0.12);
      activeResources.graphics.fillStyle(0x573a58, 1).fillRect(width * 0.06, shelfY, width * 0.88, 10);
      for (let jar = 0; jar < 9; jar += 1) {
        const jarX = width * 0.08 + jar * width * 0.1;
        activeResources.graphics.fillStyle([0x7dd3fc, 0xfbbf24, 0xa78bfa][(jar + shelf) % 3]!, 0.75)
          .fillCircle(jarX, shelfY - 14, 8 + (jar % 3));
      }
    }

    for (let slot = 0; slot < POTION_RUSH_CAULDRON_COUNT; slot += 1) {
      const centerX = width * (0.2 + slot * 0.3);
      const cauldron = state.cauldrons[slot]!;
      const fill = cauldron.state === "spoiled" ? 0x8b2635 : cauldron.state === "completed" ? 0x34d399 : cauldron.state === "brewing" ? 0x7c3aed : 0x334155;
      activeResources.graphics.fillStyle(fill, 0.96).fillRoundedRect(centerX - cauldronWidth / 2, cauldronY, cauldronWidth, cauldronHeight, 22);
      activeResources.graphics.lineStyle(slot === state.selectedCauldronIndex ? 5 : 2, slot === state.selectedCauldronIndex ? 0xfde68a : 0xc4b5fd, 0.9)
        .strokeRoundedRect(centerX - cauldronWidth / 2, cauldronY, cauldronWidth, cauldronHeight, 22);
      if (cauldron.state === "brewing") activeResources.graphics.fillCircle(centerX, cauldronY + 46 + pulse, 13);
      const customer = activeCustomerFor(state.customers, state.activeCustomerIds, slot);
      if (customer) {
        const patienceRatio = customer.patience / customer.maxPatience;
        activeResources.graphics.fillStyle(0x111827, 0.9).fillRoundedRect(centerX - 42, height * 0.34, 84, 9, 5);
        activeResources.graphics.fillStyle(patienceRatio > 0.5 ? 0x4ade80 : patienceRatio > 0.2 ? 0xfacc15 : 0xef4444, 1)
          .fillRoundedRect(centerX - 42, height * 0.34, 84 * patienceRatio, 9, 5);
        if (!activeResources.art.place(`customer:${slot}`, "enemy:idle", {
          x: centerX,
          y: height * 0.39,
          width: 52,
          depth: 7,
          alpha: patienceRatio > 0.2 ? 1 : 0.7,
        })) {
          activeResources.graphics.fillStyle(0xf9a8d4, 1).fillCircle(centerX, height * 0.39, 20);
        }
      }
      if (slot === state.selectedCauldronIndex) {
        // The alchemist stands at the cauldron the player has selected.
        activeResources.art.place("player", "player:idle", {
          x: centerX,
          y: cauldronY + cauldronHeight + 26,
          width: 58,
          depth: 8,
        });
      }
      activeResources.customers[slot]?.setText(customer ? `${customer.request.translation}\n${Math.ceil(customer.patience)}s` : "Queue open")
        .setPosition(centerX - cauldronWidth / 2 + 12, height * 0.38);
      activeResources.cauldrons[slot]?.setText(`${cauldron.state.toUpperCase()}\n${cauldron.currentWords.join(" ") || "empty"}`)
        .setPosition(centerX - cauldronWidth / 2 + 14, cauldronY + 18);
    }

    activeResources.graphics.fillStyle(0x111827, 1).fillRoundedRect(width * 0.04, beltY - 16, width * 0.92, 82, 18);
    activeResources.graphics.lineStyle(3, 0x94a3b8, 0.8).strokeRoundedRect(width * 0.04, beltY - 16, width * 0.92, 82, 18);
    activeResources.graphics.fillStyle(0x6b21a8, 0.9).fillCircle(width / 2, height * 0.7, 28 + pulse);
    activeResources.graphics.lineStyle(3, 0xd8b4fe, 0.9).strokeRoundedRect(width / 2 - 42, height * 0.7 - 30, 84, 60, 18);
    activeResources.dump.setText("DUMP").setPosition(width / 2 - 23, height * 0.7 - 8);
    for (const [index, ingredient] of state.conveyor.entries()) {
      if (index >= activeResources.ingredients.length) break;
      const x = clamp(ingredient.x, INGREDIENT_WIDTH / 2, width - INGREDIENT_WIDTH / 2);
      activeResources.graphics.fillStyle(ingredient.selected ? 0xf59e0b : ingredient.sentenceIndex < 0 ? 0x64748b : 0x0ea5e9, 1)
        .fillRoundedRect(x - ingredient.width / 2, beltY - INGREDIENT_HEIGHT / 2, ingredient.width, INGREDIENT_HEIGHT, 12);
      activeResources.ingredients[index]?.setText(ingredient.word).setPosition(x - ingredient.width / 2 + 8, beltY - 8);
    }

    const active = activeCustomerFor(state.customers, state.activeCustomerIds, state.selectedCauldronIndex);
    activeResources.title.setText("POTION RUSH").setPosition(26, 20);
    activeResources.prompt.setText(active ? `Brew in order for: ${active.request.translation}` : "Serve the waiting shop").setPosition(26, 62);
    activeResources.progress.setText(
      `${composition?.profile === "compact" ? "Compact shop" : "Potion shop"}  •  Served ${state.servedCustomers}/${state.customers.length}  •  Reputation ${state.reputation}%  •  Score ${state.score}`,
    ).setPosition(26, 102);
    activeResources.feedback.setText(
      state.phase === "victory"
        ? "Every customer is served!"
        : state.phase === "defeat"
          ? "The shop has lost its reputation."
          : state.lastOutcome === "wrong"
            ? "Spoiled cauldron: dump it before brewing again."
            : state.lastOutcome === "served"
              ? "A happy customer leaves with a fresh potion."
              : "Select or drag the next ingredient into its cauldron.",
    ).setPosition(26, height - 68);
    activeResources.instructions.setText("Keyboard: A/D choose ingredient • W/S choose cauldron • Enter brew or serve • Escape dump • Tap or drag").setPosition(26, height - 34);
    activeResources.art.sweep();
  };

  const handlePointer = (scene: PhaserSceneLike, input: ReturnType<APKInputController["snapshot"]>): void => {
    if (!input.pointer.released || input.pointer.cancelled) return;
    const { width, height } = dimensions(scene);
    const pointer = pointerInScene(scene, input.pointer.x, input.pointer.y, width, height);
    const start = pointerInScene(scene, input.pointer.startX, input.pointer.startY, width, height);
    const state = context.controller.snapshot();
    const target = getPotionRushPointerTarget(pointer.x, pointer.y, width, height, state);
    const startTarget = getPotionRushPointerTarget(start.x, start.y, width, height, state);
    const tapAction = normalize({ modality: "pointer", phase: "up", x: pointer.x, y: pointer.y })[0];
    if (tapAction?.action !== "confirm") return;

    if (startTarget.kind === "ingredient" && target.kind === "cauldron") {
      context.controller.selectIngredient(startTarget.ingredientId);
      const before = context.controller.snapshot();
      const result = context.controller.placeIngredient(startTarget.ingredientId, target.cauldronIndex);
      if (result.accepted) diagnosticAction(before, result.snapshot);
      return;
    }
    if (startTarget.kind === "cauldron" && target.kind === "dump") {
      context.controller.dumpCauldron(startTarget.cauldronIndex);
      return;
    }
    if (target.kind === "ingredient") {
      context.controller.selectIngredient(target.ingredientId);
      return;
    }
    if (target.kind === "dump") {
      context.controller.dumpCauldron(target.cauldronIndex);
      return;
    }
    if (target.kind !== "cauldron") return;
    context.controller.selectCauldron(target.cauldronIndex);
    const current = context.controller.snapshot();
    const cauldron = current.cauldrons[target.cauldronIndex]!;
    if (cauldron.state === "spoiled") {
      context.controller.dumpCauldron(target.cauldronIndex);
    } else if (cauldron.state === "completed" && cauldron.customerId) {
      const before = current;
      const result = context.controller.serveCustomer(cauldron.customerId, target.cauldronIndex);
      if (result.accepted) diagnosticAction(before, result.snapshot);
    } else if (current.selectedIngredientId) {
      const before = current;
      const result = context.controller.placeIngredient(current.selectedIngredientId, target.cauldronIndex);
      if (result.accepted) diagnosticAction(before, result.snapshot);
    }
  };

  const cleanup = (): void => {
    if (cleaned) return;
    cleaned = true;
    frameScheduler.cancel();
    context.inputController.cancelActiveGesture();
    context.controller.destroy();
    if (!resources) return;
    const activeResources = resources;
    resources = undefined;
    activeResources.graphics.destroy();
    activeResources.title.destroy();
    activeResources.prompt.destroy();
    activeResources.progress.destroy();
    activeResources.feedback.destroy();
    activeResources.instructions.destroy();
    activeResources.dump.destroy();
    for (const text of activeResources.customers) text.destroy();
    for (const text of activeResources.cauldrons) text.destroy();
    for (const text of activeResources.ingredients) text.destroy();
    previousKeys = new Set<string>();
  };


  const artKeys = ["world:ground", "player:idle", "enemy:idle"] as const;

  const preload = function (this: PhaserSceneLike): void {
    if (!this.load) return;
    preloadAssetBindings(
      this.load,
      context.edition,
      artKeys.filter((key) => context.edition.bindings[key]),
    );
  };

  const create = function (this: PhaserSceneLike): void {
    if (!this.add) throw new Error("Potion Rush requires Phaser display services");
    const style = { fontFamily: "Arial", color: "#f8fbff", fontSize: "18px" };
    resources = {
      graphics: this.add.graphics(),
      art: createActorSpriteLayer(this, context.edition),
      title: this.add.text(0, 0, "", { ...style, fontSize: "30px", fontStyle: "bold" }),
      prompt: this.add.text(0, 0, "", { ...style, fontSize: "23px", wordWrap: { width: 860 } }),
      progress: this.add.text(0, 0, "", { ...style, fontSize: "16px", color: "#dbeafe" }),
      feedback: this.add.text(0, 0, "", { ...style, fontSize: "17px", color: "#fde68a" }),
      instructions: this.add.text(0, 0, "", { ...style, fontSize: "14px", color: "#cbd5e1" }),
      dump: this.add.text(0, 0, "", { ...style, fontSize: "13px", fontStyle: "bold" }),
      customers: Array.from({ length: POTION_RUSH_CAULDRON_COUNT }, () => this.add!.text(0, 0, "", { ...style, fontSize: "15px", align: "center" })),
      cauldrons: Array.from({ length: POTION_RUSH_CAULDRON_COUNT }, () => this.add!.text(0, 0, "", { ...style, fontSize: "15px", align: "center" })),
      ingredients: Array.from({ length: 24 }, () => this.add!.text(0, 0, "", { ...style, fontSize: "15px", align: "center" })),
    };
    this.events?.once("shutdown", cleanup);
    this.events?.once("destroy", cleanup);
    updateView(this);
  };

  const update = function (this: PhaserSceneLike, _time = 0, delta = 0): void {
    if (!resources || cleaned) return;
    frameScheduler.tick(delta);
    if (context.sessionMode === "playing") {
      const input = context.inputController.snapshot();
      const pressed = input.pressed ?? input.keys.filter((key) => !previousKeys.has(key));
      previousKeys = new Set(input.keys);
      for (const code of pressed) {
        const action = normalize({ modality: "keyboard", code })[0]?.action;
        if (action) applyAction(action);
      }
      handlePointer(this, input);
      context.controller.tick(Math.min(delta, 50) / 1000, dimensions(this).width);
    }
    updateView(this);
  };

  return {
    key: POTION_RUSH_ID,
    preload,
    create,
    update,
    extend: {
      apkCaptureResponsiveState: () => context.controller.capture(),
      apkRestoreResponsiveState: (state: unknown) => {
        if (typeof state !== "object" || state === null) throw new Error("Potion Rush responsive state is invalid");
        context.controller.restore(state as PotionRushSnapshot);
      },
      apkRecompose: (nextComposition: PotionRushSceneContext["composition"]) => {
        composition = nextComposition;
      },
    },
  };
}

/**
 * Creates the runtime-compatible procedural Potion Rush cartridge.
 * @returns A sentence-mode cartridge with the standard briefing and tutorial lifecycle.
 */
export function createPotionRushCartridge(): StandardExperienceCartridge {
  let activeController: PotionRushController | undefined;
  const standardExperience = createCartridgeStandardExperience({
    id: POTION_RUSH_ID,
    title: "Potion Rush",
    description: "Brew sentence ingredients in order and serve the waiting customers.",
    inputMode: "sentence",
    objective: "Serve every customer by brewing each sentence in exact word order.",
    mechanicInstruction: "Select or drag ingredients into the matching cauldron, dump spoiled brews, then serve.",
    keyboardKeys: ["A / D", "W / S", "Enter", "Escape"],
    executeTutorialAction: (actionId) => {
      const controller = activeController;
      if (!controller) return;
      let state = controller.snapshot();
      const cauldronIndex = state.selectedCauldronIndex;
      if (actionId === "action:select-incorrect") {
        const customer = activeCustomerFor(state.customers, state.activeCustomerIds, cauldronIndex);
        const expected = customer ? comparableWord(tokenize(customer.request.term)[0] ?? "") : "";
        const wrong = state.conveyor.find((ingredient) => comparableWord(ingredient.word) !== expected);
        if (wrong) controller.placeIngredient(wrong.id, cauldronIndex);
        return;
      }
      if (state.cauldrons[cauldronIndex]?.state === "spoiled") controller.dumpCauldron(cauldronIndex);
      state = controller.snapshot();
      const customer = activeCustomerFor(state.customers, state.activeCustomerIds, cauldronIndex);
      const expected = customer ? comparableWord(tokenize(customer.request.term)[state.cauldrons[cauldronIndex]?.currentWords.length ?? 0] ?? "") : "";
      const correct = state.conveyor.find((ingredient) => comparableWord(ingredient.word) === expected);
      if (correct) controller.placeIngredient(correct.id, cauldronIndex);
    },
  });

  return {
    manifest: {
      id: POTION_RUSH_ID,
      title: "Potion Rush",
      description: "Brew sentence ingredients in order and serve the waiting customers.",
      runtimeApiVersion: "1.0.0",
      inputMode: "sentence",
      requiredAssetBindings: ["potion-rush/customer-cauldron"],
      capabilities: [
        "capability:cauldron-brewing",
        "capability:deterministic-customer-queue",
        "capability:conveyor-ingredients",
        "capability:spoiled-cauldron-dump",
        "capability:matching-customer-service",
        "capability:patience-reputation",
        "capability:bounded-frame-delta",
        "capability:input-action-normalization",
        "capability:nonempty-content-precondition",
        "capability:result-accounting",
        "capability:single-completion-emission",
      ],
    },
    standardExperience,
    createGameConfig(context: CartridgeGameConfigContext): Readonly<Record<string, unknown>> {
      const input = sentenceInputSchema.parse(context.input);
      const sessionMode = context.sessionMode ?? "playing";
      const controller = createPotionRushController(
        input,
         sessionMode === "playing"
           ? (result, outcome) => context.complete(result, outcome)
           : () => undefined,
        { seed: context.seed },
      );
      activeController = controller;
      context.diagnostic({
        level: "debug",
        code: "POTION_RUSH_READY",
        message: "Potion Rush customer queue is ready.",
        details: { cartridgeId: POTION_RUSH_ID, editionId: context.edition.id, customerCount: input.length },
      });
      return {
        width: POTION_RUSH_CANVAS.width,
        height: POTION_RUSH_CANVAS.height,
        render: { antialias: true, pixelArt: false },
        scene: createScene({
          controller,
          edition: context.edition,
          inputController: context.inputController,
          composition: context.composition,
          sessionMode,
          diagnostic: context.diagnostic,
        }),
      };
    },
  };
}
