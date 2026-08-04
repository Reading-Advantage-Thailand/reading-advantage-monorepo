import {
  advanceWizardZombieTime,
  createWizardZombieState,
  InputState,
  WizardZombieState,
} from "./wizardZombie";
import { VocabularyItem } from "@/store/useGameStore";

const FIXED_VOCABULARY: VocabularyItem[] = [
  { term: "Apple", translation: "Manzana" },
  { term: "Banana", translation: "Plátano" },
  { term: "Cherry", translation: "Cereza" },
  { term: "Date", translation: "Dátil" },
  { term: "Elderberry", translation: "Saúco" },
  { term: "Fig", translation: "Higo" },
  { term: "Grape", translation: "Uva" },
  { term: "Honeydew", translation: "Melón" },
];

const DT_MS = 50;
const HORIZON_TICKS = 400;
const SEED_A = 12345;
const SEED_B = 99999;

/**
 * Creates a deterministic seeded PRNG using the mulberry32 algorithm.
 * @param seed The seed value.
 * @returns A function that returns a pseudo-random number in [0, 1).
 */
function mulberry32(seed: number): () => number {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Finds the nearest orb to the player.
 * @param player The player entity.
 * @param orbs The list of orbs.
 * @returns The nearest orb and its distance, or null if no orbs exist.
 */
function findNearestOrb(
  player: WizardZombieState["player"],
  orbs: WizardZombieState["orbs"],
) {
  let nearest: { orb: WizardZombieState["orbs"][number]; dist: number } | null =
    null;
  for (const orb of orbs) {
    const dx = player.x - orb.x;
    const dy = player.y - orb.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (!nearest || dist < nearest.dist) {
      nearest = { orb, dist };
    }
  }
  return nearest;
}

/**
 * Finds the nearest zombie to the player.
 * @param player The player entity.
 * @param zombies The list of zombies.
 * @returns The nearest zombie and its distance, or null if no zombies exist.
 */
function findNearestZombie(
  player: WizardZombieState["player"],
  zombies: WizardZombieState["zombies"],
) {
  let nearest: {
    zombie: WizardZombieState["zombies"][number];
    dist: number;
  } | null = null;
  for (const zombie of zombies) {
    const dx = player.x - zombie.x;
    const dy = player.y - zombie.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (!nearest || dist < nearest.dist) {
      nearest = { zombie, dist };
    }
  }
  return nearest;
}

/**
 * Computes a deterministic input for the given state.
 * @param state The current game state.
 * @returns The input to apply on the next tick.
 */
function chooseInput(state: WizardZombieState): InputState {
  if (state.status === "gameover") {
    return { dx: 0, dy: 0, cast: false };
  }

  const { player, orbs, zombies } = state;
  const nearestZombie = findNearestZombie(player, zombies);
  const nearestOrb = findNearestOrb(player, orbs);

  // If a zombie is very close and we can cast, prioritize survival.
  if (
    nearestZombie !== null &&
    nearestZombie.dist < 80 &&
    player.shockwaveCharges > 0
  ) {
    return { dx: 0, dy: 0, cast: true };
  }

  // Cast shockwave when charged and a zombie is moderately close.
  const shouldCast =
    player.shockwaveCharges > 0 &&
    nearestZombie !== null &&
    nearestZombie.dist < 120;

  if (!nearestOrb) {
    return { dx: 0, dy: 0, cast: shouldCast };
  }

  const dx = Math.sign(nearestOrb.orb.x - player.x);
  const dy = Math.sign(nearestOrb.orb.y - player.y);

  return { dx, dy, cast: shouldCast };
}

/**
 * Runs the simulation for a fixed horizon using a seeded PRNG.
 * @param seed The PRNG seed.
 * @returns The final state and observed witness metrics.
 */
function runSeededSimulation(seed: number): {
  finalState: WizardZombieState;
  maxConcurrentZombies: number;
} {
  const rng = mulberry32(seed);
  let state = createWizardZombieState(FIXED_VOCABULARY, {
    rng,
    difficulty: "medium",
  });
  let maxConcurrentZombies = state.zombies.length;

  for (let tick = 0; tick < HORIZON_TICKS; tick++) {
    const input = chooseInput(state);
    state = advanceWizardZombieTime(state, DT_MS, input, FIXED_VOCABULARY);
    maxConcurrentZombies = Math.max(maxConcurrentZombies, state.zombies.length);
  }

  return { finalState: state, maxConcurrentZombies };
}

describe("wizardZombie determinism", () => {
  it("produces byte-identical state across independent runs with the same seed and inputs", () => {
    const rngA = mulberry32(SEED_A);
    const rngB = mulberry32(SEED_A);
    let stateA = createWizardZombieState(FIXED_VOCABULARY, {
      rng: rngA,
      difficulty: "medium",
    });
    let stateB = createWizardZombieState(FIXED_VOCABULARY, {
      rng: rngB,
      difficulty: "medium",
    });

    const snapshotA = JSON.stringify(stateA);
    const snapshotB = JSON.stringify(stateB);
    if (snapshotA !== snapshotB) {
      throw new Error(
        `States diverge at tick 0 (post-construction)\nA: ${snapshotA}\nB: ${snapshotB}`,
      );
    }

    for (let tick = 1; tick <= HORIZON_TICKS; tick++) {
      const inputA = chooseInput(stateA);
      const inputB = chooseInput(stateB);
      stateA = advanceWizardZombieTime(
        stateA,
        DT_MS,
        inputA,
        FIXED_VOCABULARY,
      );
      stateB = advanceWizardZombieTime(
        stateB,
        DT_MS,
        inputB,
        FIXED_VOCABULARY,
      );

      const snapA = JSON.stringify(stateA);
      const snapB = JSON.stringify(stateB);
      if (snapA !== snapB) {
        throw new Error(`States diverge at tick ${tick}`);
      }
    }
  });

  it("reaches gameplay witnesses within the horizon", () => {
    const { finalState, maxConcurrentZombies } = runSeededSimulation(SEED_A);

    expect(maxConcurrentZombies).toBeGreaterThanOrEqual(3);
    expect(finalState.totalAttempts).toBeGreaterThanOrEqual(1);
    expect(finalState.correctAnswers).toBeGreaterThanOrEqual(1);
  });

  it("produces different states for different seeds", () => {
    const { finalState: finalA } = runSeededSimulation(SEED_A);
    const { finalState: finalB } = runSeededSimulation(SEED_B);

    expect(JSON.stringify(finalA)).not.toBe(JSON.stringify(finalB));
  });
});
