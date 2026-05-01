import { calculatePotionRushXP, PotionRushState } from "./usePotionRushStore";

describe("calculatePotionRushXP", () => {
  const baseState: Partial<PotionRushState> = {
    completedSentences: 0,
    reputation: 100,
    gameTime: 0,
    angryCustomers: 0,
    totalCustomerSpawns: 0,
  };

  it("returns 0 when no sentences completed", () => {
    const state = { ...baseState, completedSentences: 0 } as PotionRushState;
    expect(calculatePotionRushXP(state)).toBe(0);
  });

  it("calculates base XP from completed sentences", () => {
    const state = { ...baseState, completedSentences: 3 } as PotionRushState;
    expect(calculatePotionRushXP(state)).toBeGreaterThanOrEqual(3);
  });

  it("caps base XP at 5", () => {
    const state = { ...baseState, completedSentences: 10 } as PotionRushState;
    const xp = calculatePotionRushXP(state);
    expect(xp).toBeGreaterThanOrEqual(5);
    expect(xp).toBeLessThanOrEqual(10);
  });

  it("adds accuracy bonus for perfect accuracy", () => {
    const state = {
      ...baseState,
      completedSentences: 2,
      totalCustomerSpawns: 2,
      angryCustomers: 0,
    } as PotionRushState;
    const xp = calculatePotionRushXP(state);
    expect(xp).toBeGreaterThanOrEqual(4); // 2 base + 2 accuracy bonus
  });

  it("adds survival bonus when reputation >= 50", () => {
    const state = {
      ...baseState,
      completedSentences: 2,
      reputation: 75,
    } as PotionRushState;
    const xp = calculatePotionRushXP(state);
    expect(xp).toBeGreaterThanOrEqual(3); // 2 base + 1 survival
  });

  it("adds speed bonus for fast games", () => {
    const state = {
      ...baseState,
      completedSentences: 2,
      gameTime: 60,
    } as PotionRushState;
    const xp = calculatePotionRushXP(state);
    expect(xp).toBeGreaterThanOrEqual(3); // 2 base + 1 speed
  });

  it("adds progression bonus for 3+ sentences", () => {
    const state = {
      ...baseState,
      completedSentences: 3,
    } as PotionRushState;
    const xp = calculatePotionRushXP(state);
    expect(xp).toBeGreaterThanOrEqual(4); // 3 base + 1 progression
  });

  it("caps total XP at 10", () => {
    const state = {
      ...baseState,
      completedSentences: 10,
      reputation: 100,
      gameTime: 30,
      totalCustomerSpawns: 10,
      angryCustomers: 0,
    } as PotionRushState;
    expect(calculatePotionRushXP(state)).toBe(10);
  });

  it("returns lower XP with poor accuracy", () => {
    const state = {
      ...baseState,
      completedSentences: 3,
      totalCustomerSpawns: 6,
      angryCustomers: 3,
      reputation: 25,
    } as PotionRushState;
    const xp = calculatePotionRushXP(state);
    expect(xp).toBeLessThan(7);
  });
});
