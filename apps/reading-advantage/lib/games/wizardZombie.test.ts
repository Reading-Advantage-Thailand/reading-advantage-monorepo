import {
  createWizardZombieState,
  GAME_WIDTH,
  GAME_HEIGHT,
  INITIAL_HP,
} from "./wizardZombie";
import { VocabularyItem } from "@/store/useGameStore";

const mockVocabulary: VocabularyItem[] = [
  { term: "Apple", translation: "Manzana" },
  { term: "Banana", translation: "Plátano" },
  { term: "Cherry", translation: "Cereza" },
];

describe("wizardZombie game logic", () => {
  describe("createWizardZombieState", () => {
    it("should initialize state correctly", () => {
      const state = createWizardZombieState(mockVocabulary);

      expect(state.status).toBe("playing");
      expect(state.player.x).toBe(GAME_WIDTH / 2);
      expect(state.player.y).toBe(GAME_HEIGHT / 2);
      expect(state.player.hp).toBe(INITIAL_HP);
      expect(state.player.shockwaveCharges).toBe(0);
      expect(state.zombies).toHaveLength(0);
      expect(state.orbs).toHaveLength(4);
      expect(mockVocabulary.map((v) => v.term)).toContain(state.targetWord);
      expect(state.score).toBe(0);
    });
  });
});
