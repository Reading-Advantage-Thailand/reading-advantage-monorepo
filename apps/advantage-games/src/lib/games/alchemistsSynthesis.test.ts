import {
  createAlchemistsSynthesisState,
  advanceAlchemistsSynthesisTime,
  handleAnswer,
  getAlchemistsSynthesisResults,
  generateOptions,
  GAME_WIDTH,
  GAME_HEIGHT,
} from "./alchemistsSynthesis";
import type { VocabularyItem } from "@/store/useGameStore";

const mockVocabulary: VocabularyItem[] = [
  { term: "Run", translation: "Correr" },
  { term: "Jump", translation: "Saltar" },
  { term: "Eat", translation: "Comer" },
  { term: "Sleep", translation: "Dormir" },
  { term: "Play", translation: "Jugar" },
];

describe("alchemistsSynthesis", () => {
  describe("createAlchemistsSynthesisState", () => {
    it("should create initial state with idle status", () => {
      const state = createAlchemistsSynthesisState(mockVocabulary, "normal");
      expect(state.status).toBe("idle");
      expect(state.score).toBe(0);
      expect(state.correctAnswers).toBe(0);
      expect(state.totalAttempts).toBe(0);
      expect(state.difficulty).toBe("normal");
      expect(state.maxRounds).toBe(7);
    });

    it("should set easy difficulty to 5 rounds", () => {
      const state = createAlchemistsSynthesisState(mockVocabulary, "easy");
      expect(state.maxRounds).toBe(5);
    });

    it("should set hard difficulty to 10 rounds", () => {
      const state = createAlchemistsSynthesisState(mockVocabulary, "hard");
      expect(state.maxRounds).toBe(10);
    });

    it("should generate options for current word", () => {
      const state = createAlchemistsSynthesisState(mockVocabulary, "normal");
      expect(state.currentWord).toBeTruthy();
      expect(state.options.length).toBeGreaterThan(0);
    });
  });

  describe("generateOptions", () => {
    it("should return empty array for null current word", () => {
      const options = generateOptions(null, mockVocabulary);
      expect(options).toEqual([]);
    });

    it("should include current word in options", () => {
      const currentWord = mockVocabulary[0];
      const options = generateOptions(currentWord, mockVocabulary);
      expect(options.some((o) => o.term === currentWord.term)).toBe(true);
    });

    it("should not include duplicate terms", () => {
      const currentWord = mockVocabulary[0];
      const options = generateOptions(currentWord, mockVocabulary);
      const terms = options.map((o) => o.term);
      const uniqueTerms = [...new Set(terms)];
      expect(terms.length).toBe(uniqueTerms.length);
    });
  });

  describe("advanceAlchemistsSynthesisTime", () => {
    it("should not advance time when not playing", () => {
      const state = createAlchemistsSynthesisState(mockVocabulary, "normal");
      const newState = advanceAlchemistsSynthesisTime(state, 1000, mockVocabulary);
      expect(newState).toBe(state);
    });

    it("should advance game time when playing", () => {
      const state = {
        ...createAlchemistsSynthesisState(mockVocabulary, "normal"),
        status: "playing" as const,
      };
      const newState = advanceAlchemistsSynthesisTime(state, 1000, mockVocabulary);
      expect(newState.gameTime).toBe(1000);
    });

    it("should end game after 60 seconds", () => {
      const state = {
        ...createAlchemistsSynthesisState(mockVocabulary, "normal"),
        status: "playing" as const,
      };
      const newState = advanceAlchemistsSynthesisTime(state, 61000, mockVocabulary);
      expect(newState.status).toBe("gameover");
    });
  });

  describe("handleAnswer", () => {
    it("should not process answer when not playing", () => {
      const state = createAlchemistsSynthesisState(mockVocabulary, "normal");
      const newState = handleAnswer(state, mockVocabulary[0], mockVocabulary);
      expect(newState).toBe(state);
    });

    it("should increment score and correct answers for correct answer", () => {
      const state = {
        ...createAlchemistsSynthesisState(mockVocabulary, "normal"),
        status: "playing" as const,
      };
      const correctWord = state.currentWord!;
      const newState = handleAnswer(state, correctWord, mockVocabulary);
      expect(newState.score).toBe(10);
      expect(newState.correctAnswers).toBe(1);
      expect(newState.totalAttempts).toBe(1);
    });

    it("should increment total attempts for incorrect answer", () => {
      const state = {
        ...createAlchemistsSynthesisState(mockVocabulary, "normal"),
        status: "playing" as const,
      };
      const incorrectWord = mockVocabulary.find(
        (v) => v.term !== state.currentWord!.term
      )!;
      const newState = handleAnswer(state, incorrectWord, mockVocabulary);
      expect(newState.score).toBe(0);
      expect(newState.correctAnswers).toBe(0);
      expect(newState.totalAttempts).toBe(1);
    });

    it("should advance to next round", () => {
      const state = {
        ...createAlchemistsSynthesisState(mockVocabulary, "normal"),
        status: "playing" as const,
      };
      const correctWord = state.currentWord!;
      const newState = handleAnswer(state, correctWord, mockVocabulary);
      expect(newState.round).toBe(2);
    });

    it("should end game after max rounds", () => {
      const state = {
        ...createAlchemistsSynthesisState(mockVocabulary, "easy"),
        status: "playing" as const,
        round: 5,
        maxRounds: 5,
        correctAnswers: 3,
      };
      const correctWord = state.currentWord!;
      const newState = handleAnswer(state, correctWord, mockVocabulary);
      expect(newState.status).toBe("victory");
    });

    it("should result in defeat when less than half correct", () => {
      const state = {
        ...createAlchemistsSynthesisState(mockVocabulary, "easy"),
        status: "playing" as const,
        round: 5,
        maxRounds: 5,
        correctAnswers: 1,
      };
      const incorrectWord = mockVocabulary.find(
        (v) => v.term !== state.currentWord!.term
      )!;
      const newState = handleAnswer(state, incorrectWord, mockVocabulary);
      expect(newState.status).toBe("gameover");
    });
  });

  describe("getAlchemistsSynthesisResults", () => {
    it("should calculate results correctly", () => {
      const state = {
        ...createAlchemistsSynthesisState(mockVocabulary, "normal"),
        status: "playing" as const,
        score: 20,
        correctAnswers: 2,
        totalAttempts: 3,
        gameTime: 15000,
      };
      const results = getAlchemistsSynthesisResults(state);
      expect(results.score).toBe(20);
      expect(results.correctAnswers).toBe(2);
      expect(results.totalAttempts).toBe(3);
      expect(results.accuracy).toBeCloseTo(0.667, 2);
      expect(results.xp).toBe(1);
      expect(results.gameTime).toBe(15000);
      expect(results.difficulty).toBe("normal");
    });

    it("should return zero accuracy when no attempts", () => {
      const state = createAlchemistsSynthesisState(mockVocabulary, "normal");
      const results = getAlchemistsSynthesisResults(state);
      expect(results.accuracy).toBe(0);
      expect(results.xp).toBe(0);
    });
  });

  describe("constants", () => {
    it("should have correct game dimensions", () => {
      expect(GAME_WIDTH).toBe(390);
      expect(GAME_HEIGHT).toBe(844);
    });
  });
});
