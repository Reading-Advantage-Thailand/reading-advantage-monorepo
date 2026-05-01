import {
  advanceDragonFlightTime,
  calculateBossPower,
  createDragonFlightState,
  getDragonFlightResults,
  selectGate,
} from "./dragonFlight";
import type { VocabularyItem } from "@/store/useGameStore";

const createRng = (values: number[]) => {
  let index = 0;
  return () => {
    const value = values[index] ?? 0;
    index += 1;
    return value;
  };
};

describe("dragonFlight core logic", () => {
  const vocabulary: VocabularyItem[] = [
    { term: "Apple", translation: "Manzana" },
    { term: "Banana", translation: "Platano" },
  ];

  it("initializes state with a gate round and baseline counts", () => {
    const rng = createRng([0.1, 0.9, 0.2]);
    const state = createDragonFlightState(vocabulary, {
      rng,
      durationMs: 30000,
    });

    expect(state.status).toBe("running");
    expect(state.durationMs).toBe(30000);
    expect(state.elapsedMs).toBe(0);
    expect(state.attempts).toBe(0);
    expect(state.correctAnswers).toBe(0);
    expect(state.dragonCount).toBe(1);
    expect(state.round.term).toBe("Apple");
    expect(state.round.correctTranslation).toBe("Manzana");
    expect(state.round.decoyTranslation).toBe("Platano");
    expect(state.round.correctSide).toBe("left");
  });

  it("updates attempts and dragon count on gate selection", () => {
    const rng = createRng([0.1, 0.9, 0.7]);
    const state = createDragonFlightState(vocabulary, { rng });

    const next = selectGate(
      state,
      "right",
      vocabulary,
      createRng([0.9, 0.1, 0.3]),
    );

    expect(next.attempts).toBe(1);
    expect(next.correctAnswers).toBe(1);
    expect(next.dragonCount).toBe(2);
    expect(next.round.term).toBe("Banana");
  });

  it("prevents dragon count from dropping below one", () => {
    const rng = createRng([0.1, 0.9, 0.7]);
    const state = createDragonFlightState(vocabulary, { rng });

    const next = selectGate(
      state,
      "left",
      vocabulary,
      createRng([0.9, 0.1, 0.3]),
    );

    expect(next.attempts).toBe(1);
    expect(next.correctAnswers).toBe(0);
    expect(next.dragonCount).toBe(1);
  });

  it("advances time and transitions to boss when duration ends", () => {
    const rng = createRng([0.1, 0.9, 0.2]);
    const state = createDragonFlightState(vocabulary, {
      rng,
      durationMs: 1000,
    });

    const next = advanceDragonFlightTime(state, 1200);

    expect(next.status).toBe("boss");
    expect(next.elapsedMs).toBe(1000);
  });

  it("calculates boss power from attempts", () => {
    expect(calculateBossPower(0)).toBe(3);
    expect(calculateBossPower(5)).toBe(3);
    expect(calculateBossPower(6)).toBe(4);
  });

  it("builds results with accuracy, boss outcome, and XP", () => {
    const results = getDragonFlightResults({
      correctAnswers: 6,
      totalAttempts: 10,
      dragonCount: 4,
      difficulty: "normal",
    });

    expect(results.accuracy).toBeCloseTo(0.6);
    expect(results.bossPower).toBe(6);
    expect(results.victory).toBe(false);
    expect(results.xp).toBe(3);
  });
});
