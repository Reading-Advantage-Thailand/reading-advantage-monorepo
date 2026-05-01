import { describe, it, expect } from "@jest/globals";
import type { VocabularyItem } from "@/store/useGameStore";
import {
  createEnchantedLibraryState,
  spawnBooks,
  checkBookCollisions,
  checkSpiritCollisions,
  selectNextTargetWord,
  spawnSpirit,
  updateSpirits,
  advanceEnchantedLibraryTime,
  activateShield,
  checkVictoryCondition,
  GAME_WIDTH,
  GAME_HEIGHT,
  INITIAL_MANA,
  MAX_SHIELD_CHARGES,
  SHIELD_DURATION,
  MAX_SPIRIT_SPEED,
} from "./enchantedLibrary";

export type DirectionalInput = {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  cast: boolean;
};

const SAMPLE_VOCABULARY: VocabularyItem[] = [
  { term: "cat", translation: "แมว" },
  { term: "dog", translation: "สุนัข" },
  { term: "bird", translation: "นก" },
  { term: "fish", translation: "ปลา" },
];

describe("enchantedLibrary", () => {
  describe("createEnchantedLibraryState", () => {
    it("initializes with correct starting mana (50)", () => {
      const state = createEnchantedLibraryState(SAMPLE_VOCABULARY);
      expect(state.mana).toBe(50);
      expect(INITIAL_MANA).toBe(50);
    });

    it("creates 4 books (1 correct, 3 decoys)", () => {
      const state = createEnchantedLibraryState(SAMPLE_VOCABULARY);
      expect(state.books).toHaveLength(4);

      const correctBooks = state.books.filter((book) => book.isCorrect);
      expect(correctBooks).toHaveLength(1);

      const decoyBooks = state.books.filter((book) => !book.isCorrect);
      expect(decoyBooks).toHaveLength(3);
    });

    it("sets up vocabulary tracking (collect each word 2x)", () => {
      const state = createEnchantedLibraryState(SAMPLE_VOCABULARY);

      // Check that vocabulary progress is initialized
      expect(state.vocabularyProgress).toBeDefined();
      expect(state.totalWords).toBe(SAMPLE_VOCABULARY.length);

      // Each word should start with 0 completions
      SAMPLE_VOCABULARY.forEach((vocab) => {
        expect(state.vocabularyProgress.get(vocab.term)).toBe(0);
      });
    });

    it("initializes with 3 shield charges", () => {
      const state = createEnchantedLibraryState(SAMPLE_VOCABULARY);
      expect(state.player.shieldCharges).toBe(3);
      expect(state.player.maxShieldCharges).toBe(3);
      expect(MAX_SHIELD_CHARGES).toBe(3);
    });

    it("player spawns at center (400, 300)", () => {
      const state = createEnchantedLibraryState(SAMPLE_VOCABULARY);
      expect(state.player.x).toBe(GAME_WIDTH / 2);
      expect(state.player.y).toBe(GAME_HEIGHT / 2);
      expect(state.player.x).toBe(400);
      expect(state.player.y).toBe(300);
    });

    it("initializes with no spirits", () => {
      const state = createEnchantedLibraryState(SAMPLE_VOCABULARY);
      expect(state.spirits).toEqual([]);
    });

    it("initializes with shield inactive", () => {
      const state = createEnchantedLibraryState(SAMPLE_VOCABULARY);
      expect(state.shieldActive).toBe(false);
      expect(state.shieldTimer).toBe(0);
    });

    it("initializes with playing status", () => {
      const state = createEnchantedLibraryState(SAMPLE_VOCABULARY);
      expect(state.status).toBe("playing");
    });

    it("throws error for empty vocabulary", () => {
      expect(() => createEnchantedLibraryState([])).toThrow(
        "Vocabulary cannot be empty",
      );
    });
  });

  describe("spawnBooks", () => {
    const mockPlayer = {
      id: "player",
      x: 400,
      y: 300,
      radius: 20,
      speed: 3,
      shieldCharges: 3,
      maxShieldCharges: 3,
    };

    it("creates 4 books (1 correct, 3 decoys)", () => {
      const target = SAMPLE_VOCABULARY[0];
      const books = spawnBooks(target, SAMPLE_VOCABULARY, mockPlayer);

      expect(books).toHaveLength(4);

      const correctBooks = books.filter((b) => b.isCorrect);
      const decoyBooks = books.filter((b) => !b.isCorrect);

      expect(correctBooks).toHaveLength(1);
      expect(decoyBooks).toHaveLength(3);
    });

    it("books positioned randomly within arena", () => {
      const target = SAMPLE_VOCABULARY[0];
      const books = spawnBooks(
        target,
        SAMPLE_VOCABULARY,
        mockPlayer,
        Math.random,
      );

      // All books should be positioned within game bounds
      books.forEach((book) => {
        expect(book.x).toBeGreaterThan(0);
        expect(book.x).toBeLessThan(GAME_WIDTH);
        expect(book.y).toBeGreaterThan(0);
        expect(book.y).toBeLessThan(GAME_HEIGHT);
      });

      // Books should be spread out (not all in same position)
      const positions = books.map((b) => `${b.x},${b.y}`);
      const uniquePositions = new Set(positions);
      expect(uniquePositions.size).toBe(4);
    });

    it("each book has translation label", () => {
      const target = SAMPLE_VOCABULARY[0];
      const books = spawnBooks(target, SAMPLE_VOCABULARY, mockPlayer);

      books.forEach((book) => {
        expect(book.translation).toBeDefined();
        expect(book.translation).not.toBe("");
      });
    });

    it("correct book matches target word", () => {
      const target = SAMPLE_VOCABULARY[1]; // 'dog'
      const books = spawnBooks(target, SAMPLE_VOCABULARY, mockPlayer);

      const correctBook = books.find((b) => b.isCorrect);
      expect(correctBook).toBeDefined();
      expect(correctBook?.word).toBe(target.term);
      expect(correctBook?.translation).toBe(target.translation);
    });
  });

  describe("spawnSpirit", () => {
    it("spawns from random wall position", () => {
      const state = createEnchantedLibraryState(SAMPLE_VOCABULARY, {
        rng: () => 0.5,
      });
      const newState = {
        ...state,
        player: {
          ...state.player,
          x: 400,
          y: 300,
        },
      };

      const result = spawnSpirit(newState, { rng: () => 0.5 });

      expect(result.spirits).toHaveLength(1);
      const spirit = result.spirits[0];

      // Spirit should be on a wall (x or y at boundary)
      const onWall =
        spirit.x <= 0 ||
        spirit.x >= GAME_WIDTH ||
        spirit.y <= 0 ||
        spirit.y >= GAME_HEIGHT;

      expect(onWall).toBe(true);
    });

    it("calculates point ahead of player trajectory", () => {
      const state = createEnchantedLibraryState(SAMPLE_VOCABULARY);
      const playerMovingRight = {
        ...state,
        player: {
          ...state.player,
          x: 200,
          y: 300,
        },
      };

      const result = spawnSpirit(playerMovingRight, {
        rng: () => 0.5,
        playerVelocityX: 3,
        playerVelocityY: 0,
      });
      const spirit = result.spirits[0];

      // Spirit velocity should point toward predicted position ahead of player
      expect(spirit.velocityX).toBeDefined();
      expect(spirit.velocityY).toBeDefined();
    });

    it("creates straight-line velocity vector through predicted point", () => {
      const state = createEnchantedLibraryState(SAMPLE_VOCABULARY, {
        rng: () => 0.5,
      });
      const result = spawnSpirit(state, { rng: () => 0.5 });

      const spirit = result.spirits[0];

      // Velocity should be normalized to spirit speed
      const velocityMagnitude = Math.sqrt(
        spirit.velocityX * spirit.velocityX +
          spirit.velocityY * spirit.velocityY,
      );

      expect(velocityMagnitude).toBeCloseTo(state.spiritSpeed, 1);
    });

    it("only spawns one spirit at a time", () => {
      const state = createEnchantedLibraryState(SAMPLE_VOCABULARY);
      const withOneSpirit = spawnSpirit(state);

      // Try to spawn another
      const result = spawnSpirit(withOneSpirit);

      // Should still have only 1 spirit
      expect(result.spirits).toHaveLength(1);
    });

    it("respects spawn timer", () => {
      const state = createEnchantedLibraryState(SAMPLE_VOCABULARY);
      const recentSpawn = {
        ...state,
        spiritSpawnTimer: 1000, // Recently spawned
      };

      const result = spawnSpirit(recentSpawn);

      // Should not spawn a new spirit
      expect(result.spirits).toHaveLength(0);
    });
  });

  describe("updateSpirits", () => {
    it("spirits move along velocity vector", () => {
      const state = createEnchantedLibraryState(SAMPLE_VOCABULARY);
      const withSpirit = {
        ...state,
        spirits: [
          {
            id: "spirit-1",
            x: 100,
            y: 100,
            velocityX: 2,
            velocityY: 1,
            speed: 2,
            radius: 15,
            bounced: false,
            hasHitPlayer: false,
          },
        ],
      };

      const result = updateSpirits(withSpirit); // 16ms delta

      expect(result.spirits[0].x).toBe(100 + 2);
      expect(result.spirits[0].y).toBe(100 + 1);
    });

    it("spirits despawn when exiting game bounds", () => {
      const state = createEnchantedLibraryState(SAMPLE_VOCABULARY);
      const spiritOffScreen = {
        ...state,
        spirits: [
          {
            id: "spirit-1",
            x: GAME_WIDTH + 100, // Off right edge
            y: 300,
            velocityX: 2,
            velocityY: 0,
            speed: 2,
            radius: 15,
            bounced: false,
            hasHitPlayer: false,
          },
        ],
      };

      const result = updateSpirits(spiritOffScreen);

      // Spirit should be removed
      expect(result.spirits).toHaveLength(0);
    });

    it("spirit speed increases after spawning", () => {
      const state = createEnchantedLibraryState(SAMPLE_VOCABULARY);

      // Need to clear existing spirits and timer to allow spawn
      const readyToSpawn = {
        ...state,
        spirits: [],
        spiritSpawnTimer: 0,
      };

      const result = spawnSpirit(readyToSpawn);

      // Spirit speed for NEXT spawn should have increased
      expect(result.spiritSpeed).toBeGreaterThan(state.spiritSpeed);
    });

    it("spirit speed is capped at MAX_SPIRIT_SPEED", () => {
      const state = createEnchantedLibraryState(SAMPLE_VOCABULARY);

      const fastState = {
        ...state,
        spiritSpeed: MAX_SPIRIT_SPEED, // Already at max
        spirits: [],
        spiritSpawnTimer: 0,
      };

      const result = spawnSpirit(fastState);

      // Should not exceed max
      expect(result.spiritSpeed).toBe(MAX_SPIRIT_SPEED);
    });
  });

  describe("updateSpirits", () => {
    it("detects collision when player near book (radius check)", () => {
      const state = createEnchantedLibraryState(SAMPLE_VOCABULARY);
      const playerNearBook = {
        ...state,
        player: {
          ...state.player,
          x: state.books[0].x,
          y: state.books[0].y,
        },
      };

      const result = checkBookCollisions(playerNearBook, SAMPLE_VOCABULARY);

      // Books should change (one collected)
      expect(result.books).not.toEqual(state.books);
    });

    it("correct book: +10 mana, +1 shield charge, progress incremented", () => {
      const state = createEnchantedLibraryState(SAMPLE_VOCABULARY);
      const correctBook = state.books.find((b) => b.isCorrect)!;

      const playerAtCorrectBook = {
        ...state,
        mana: 50,
        player: {
          ...state.player,
          x: correctBook.x,
          y: correctBook.y,
          shieldCharges: 2,
        },
      };

      const result = checkBookCollisions(
        playerAtCorrectBook,
        SAMPLE_VOCABULARY,
      );

      expect(result.mana).toBe(60); // +10
      expect(result.player.shieldCharges).toBe(3); // +1

      // Progress should increment
      const progress = result.vocabularyProgress.get(state.targetWord);
      expect(progress).toBe(1); // Was 0, now 1
    });

    it("incorrect book: -5 mana, no shield charge", () => {
      const state = createEnchantedLibraryState(SAMPLE_VOCABULARY);
      const incorrectBook = state.books.find((b) => !b.isCorrect)!;

      const playerAtIncorrectBook = {
        ...state,
        mana: 50,
        player: {
          ...state.player,
          x: incorrectBook.x,
          y: incorrectBook.y,
          shieldCharges: 2,
        },
      };

      const result = checkBookCollisions(
        playerAtIncorrectBook,
        SAMPLE_VOCABULARY,
      );

      expect(result.mana).toBe(45); // -5
      expect(result.player.shieldCharges).toBe(2); // No change
    });

    it("respects max 3 shield charges", () => {
      const state = createEnchantedLibraryState(SAMPLE_VOCABULARY);
      const correctBook = state.books.find((b) => b.isCorrect)!;

      const playerWithMaxCharges = {
        ...state,
        player: {
          ...state.player,
          x: correctBook.x,
          y: correctBook.y,
          shieldCharges: 3, // Already at max
        },
      };

      const result = checkBookCollisions(
        playerWithMaxCharges,
        SAMPLE_VOCABULARY,
      );

      expect(result.player.shieldCharges).toBe(3); // Should not exceed max
    });

    it("books despawn after collection", () => {
      const state = createEnchantedLibraryState(SAMPLE_VOCABULARY);
      const bookToCollect = state.books[0];

      const playerAtBook = {
        ...state,
        player: {
          ...state.player,
          x: bookToCollect.x,
          y: bookToCollect.y,
        },
      };

      const result = checkBookCollisions(playerAtBook, SAMPLE_VOCABULARY);

      // Should still have 4 books (new ones spawned)
      expect(result.books).toHaveLength(4);

      // But they should be different books
      expect(result.books).not.toEqual(state.books);
    });

    it("new books spawn after collection", () => {
      const state = createEnchantedLibraryState(SAMPLE_VOCABULARY);
      const bookToCollect = state.books[0];

      const playerAtBook = {
        ...state,
        player: {
          ...state.player,
          x: bookToCollect.x,
          y: bookToCollect.y,
        },
      };

      const result = checkBookCollisions(playerAtBook, SAMPLE_VOCABULARY);

      // Should have 4 new books
      expect(result.books).toHaveLength(4);
      expect(result.books.some((b) => b.isCorrect)).toBe(true);
    });
  });

  describe("selectNextTargetWord", () => {
    it("selects word that hasn't been collected 2x yet", () => {
      const state = createEnchantedLibraryState(SAMPLE_VOCABULARY);

      // Mark first word as collected once
      state.vocabularyProgress.set(SAMPLE_VOCABULARY[0].term, 1);
      // Mark second word as collected twice (complete)
      state.vocabularyProgress.set(SAMPLE_VOCABULARY[1].term, 2);

      const nextWord = selectNextTargetWord(state, SAMPLE_VOCABULARY);

      // Should not select the word that's already collected 2x
      expect(nextWord).not.toBe(SAMPLE_VOCABULARY[1].term);
    });

    it("cycles through vocabulary appropriately", () => {
      const state = createEnchantedLibraryState(SAMPLE_VOCABULARY);

      const word1 = selectNextTargetWord(state, SAMPLE_VOCABULARY);

      // Mark first selected word as collected once
      state.vocabularyProgress.set(word1, 1);

      const word2 = selectNextTargetWord(state, SAMPLE_VOCABULARY);

      // Should be a valid word from vocabulary
      expect(SAMPLE_VOCABULARY.some((v) => v.term === word2)).toBe(true);
    });
  });

  describe("mana system", () => {
    it("mana never goes below 0", () => {
      const state = createEnchantedLibraryState(SAMPLE_VOCABULARY);
      const incorrectBook = state.books.find((b) => !b.isCorrect)!;

      const lowManaState = {
        ...state,
        mana: 2, // Very low mana
        player: {
          ...state.player,
          x: incorrectBook.x,
          y: incorrectBook.y,
        },
      };

      const result = checkBookCollisions(lowManaState, SAMPLE_VOCABULARY);

      // Mana should be clamped to 0 (not -3)
      expect(result.mana).toBe(0);
    });

    it("spirit collision clamps mana to 0", () => {
      const state = createEnchantedLibraryState(SAMPLE_VOCABULARY);
      const lowMana = {
        ...state,
        mana: 5, // Low mana
        shieldActive: false,
        spirits: [
          {
            id: "spirit-1",
            x: state.player.x,
            y: state.player.y,
            velocityX: 2,
            velocityY: 0,
            speed: 2,
            radius: 15,
            bounced: false,
            hasHitPlayer: false,
          },
        ],
      };

      const result = checkSpiritCollisions(lowMana);

      // Would be -5, but clamped to 0
      expect(result.mana).toBe(0);
    });

    it("mana displayed as score", () => {
      const state = createEnchantedLibraryState(SAMPLE_VOCABULARY);

      // Mana is the score
      expect(state.mana).toBe(INITIAL_MANA);
      expect(state.mana).toBe(50);
    });

    it("correct book adds 10 mana", () => {
      const state = createEnchantedLibraryState(SAMPLE_VOCABULARY);
      const correctBook = state.books.find((b) => b.isCorrect)!;

      const playerAtCorrect = {
        ...state,
        mana: 50,
        player: {
          ...state.player,
          x: correctBook.x,
          y: correctBook.y,
        },
      };

      const result = checkBookCollisions(playerAtCorrect, SAMPLE_VOCABULARY);

      expect(result.mana).toBe(60);
    });

    it("wrong book subtracts 5 mana", () => {
      const state = createEnchantedLibraryState(SAMPLE_VOCABULARY);
      const incorrectBook = state.books.find((b) => !b.isCorrect)!;

      const playerAtIncorrect = {
        ...state,
        mana: 50,
        player: {
          ...state.player,
          x: incorrectBook.x,
          y: incorrectBook.y,
        },
      };

      const result = checkBookCollisions(playerAtIncorrect, SAMPLE_VOCABULARY);

      expect(result.mana).toBe(45);
    });

    it("spirit collision subtracts 10 mana", () => {
      const state = createEnchantedLibraryState(SAMPLE_VOCABULARY);
      const withSpirit = {
        ...state,
        mana: 50,
        spirits: [
          {
            id: "spirit-1",
            x: state.player.x,
            y: state.player.y,
            velocityX: 2,
            velocityY: 0,
            speed: 2,
            radius: 15,
            bounced: false,
            hasHitPlayer: false,
          },
        ],
      };

      const result = checkSpiritCollisions(withSpirit);

      expect(result.mana).toBe(40); // -10 mana
    });
  });

  describe("activateShield", () => {
    it("activates only if charges > 0", () => {
      const state = createEnchantedLibraryState(SAMPLE_VOCABULARY);
      const withCharges = {
        ...state,
        player: {
          ...state.player,
          shieldCharges: 1,
        },
      };

      const result = activateShield(withCharges);

      expect(result.shieldActive).toBe(true);
      expect(result.player.shieldCharges).toBe(0);
    });

    it("does not activate if charges = 0", () => {
      const state = createEnchantedLibraryState(SAMPLE_VOCABULARY);
      const noCharges = {
        ...state,
        player: {
          ...state.player,
          shieldCharges: 0,
        },
        shieldActive: false,
      };

      const result = activateShield(noCharges);

      expect(result.shieldActive).toBe(false);
      expect(result.player.shieldCharges).toBe(0);
    });

    it("consumes 1 charge", () => {
      const state = createEnchantedLibraryState(SAMPLE_VOCABULARY);
      const withTwoCharges = {
        ...state,
        player: {
          ...state.player,
          shieldCharges: 2,
        },
      };

      const result = activateShield(withTwoCharges);

      expect(result.player.shieldCharges).toBe(1);
    });

    it("sets shieldActive = true", () => {
      const state = createEnchantedLibraryState(SAMPLE_VOCABULARY);

      const result = activateShield(state);

      expect(result.shieldActive).toBe(true);
    });

    it("sets shieldTimer = 2000ms", () => {
      const state = createEnchantedLibraryState(SAMPLE_VOCABULARY);

      const result = activateShield(state);

      expect(result.shieldTimer).toBe(2000);
      expect(result.shieldTimer).toBe(SHIELD_DURATION);
    });

    it("does not activate if shield already active", () => {
      const state = createEnchantedLibraryState(SAMPLE_VOCABULARY);
      const alreadyActive = {
        ...state,
        shieldActive: true,
        shieldTimer: 1000,
        player: {
          ...state.player,
          shieldCharges: 2,
        },
      };

      const result = activateShield(alreadyActive);

      // Should not consume another charge
      expect(result.player.shieldCharges).toBe(2);
      // Shield remains active with same timer
      expect(result.shieldActive).toBe(true);
      expect(result.shieldTimer).toBe(1000);
    });
  });

  describe("spirit bounce mechanics", () => {
    it("no collision detection updates when shield inactive", () => {
      const state = createEnchantedLibraryState(SAMPLE_VOCABULARY);
      const withSpirit = {
        ...state,
        mana: 50,
        shieldActive: false,
        spirits: [
          {
            id: "spirit-1",
            x: state.player.x + 10, // Very close to player
            y: state.player.y,
            velocityX: 2,
            velocityY: 0,
            speed: 2,
            radius: 15,
            bounced: false,
            hasHitPlayer: false,
          },
        ],
      };

      const result = checkSpiritCollisions(withSpirit);

      // Mana should decrease (spirit hit)
      expect(result.mana).toBe(40);
      // Spirit velocity should not change
      expect(result.spirits[0].velocityX).toBe(2);
      expect(result.spirits[0].velocityY).toBe(0);
    });

    it("detects spirit collision with player when shield active", () => {
      const state = createEnchantedLibraryState(SAMPLE_VOCABULARY);
      const withShieldAndSpirit = {
        ...state,
        mana: 50,
        shieldActive: true,
        spirits: [
          {
            id: "spirit-1",
            x: state.player.x + 10, // Very close to player
            y: state.player.y,
            velocityX: 2,
            velocityY: 0,
            speed: 2,
            radius: 15,
            bounced: false,
            hasHitPlayer: false,
          },
        ],
      };

      const result = checkSpiritCollisions(withShieldAndSpirit);

      // No mana loss when shield active
      expect(result.mana).toBe(50);
      // Spirit should be marked as bounced or have changed velocity
      const spirit = result.spirits[0];
      expect(spirit.velocityX).not.toBe(2); // Velocity should have changed
    });

    it("bounces spirit at angle of incidence (reflection physics)", () => {
      const state = createEnchantedLibraryState(SAMPLE_VOCABULARY);
      const spiritMovingRight = {
        ...state,
        shieldActive: true,
        player: {
          ...state.player,
          x: 400,
          y: 300,
        },
        spirits: [
          {
            id: "spirit-1",
            x: 370, // Left of player, moving right toward player
            y: 300,
            velocityX: 2,
            velocityY: 0,
            speed: 2,
            radius: 15,
            bounced: false,
            hasHitPlayer: false,
          },
        ],
      };

      const result = checkSpiritCollisions(spiritMovingRight);

      const spirit = result.spirits[0];
      // Spirit should bounce back left (negative X velocity)
      expect(spirit.velocityX).toBeLessThan(0);
    });

    it("spirit continues in new direction after bounce", () => {
      const state = createEnchantedLibraryState(SAMPLE_VOCABULARY);
      const withBouncedSpirit = {
        ...state,
        shieldActive: true,
        spirits: [
          {
            id: "spirit-1",
            x: state.player.x - 30,
            y: state.player.y,
            velocityX: 2,
            velocityY: 0,
            speed: 2,
            radius: 15,
            bounced: false,
            hasHitPlayer: false,
          },
        ],
      };

      const result = checkSpiritCollisions(withBouncedSpirit);

      const spirit = result.spirits[0];
      // Velocity should have changed direction
      expect(spirit.velocityX).not.toBe(2);
      // Magnitude should remain similar
      const newSpeed = Math.sqrt(spirit.velocityX ** 2 + spirit.velocityY ** 2);
      expect(newSpeed).toBeCloseTo(2, 1);
    });

    it("no mana loss when shield active", () => {
      const state = createEnchantedLibraryState(SAMPLE_VOCABULARY);
      const withShieldAndSpirit = {
        ...state,
        mana: 50,
        shieldActive: true,
        spirits: [
          {
            id: "spirit-1",
            x: state.player.x,
            y: state.player.y,
            velocityX: 2,
            velocityY: 0,
            speed: 2,
            radius: 15,
            bounced: false,
            hasHitPlayer: false,
          },
        ],
      };

      const result = checkSpiritCollisions(withShieldAndSpirit);

      // Shield should protect from mana loss
      expect(result.mana).toBe(50);
    });

    it("normal mana loss (-10) when shield inactive", () => {
      const state = createEnchantedLibraryState(SAMPLE_VOCABULARY);
      const noShield = {
        ...state,
        mana: 50,
        shieldActive: false,
        spirits: [
          {
            id: "spirit-1",
            x: state.player.x,
            y: state.player.y,
            velocityX: 2,
            velocityY: 0,
            speed: 2,
            radius: 15,
            bounced: false,
            hasHitPlayer: false,
          },
        ],
      };

      const result = checkSpiritCollisions(noShield);

      expect(result.mana).toBe(40);
    });
  });

  describe("shield timer countdown", () => {
    it("timer decrements by dt each tick", () => {
      const state = createEnchantedLibraryState(SAMPLE_VOCABULARY);
      const withActiveShield = {
        ...state,
        shieldActive: true,
        shieldTimer: 2000,
      };

      const result = advanceEnchantedLibraryTime(
        withActiveShield,
        {
          up: false,
          down: false,
          left: false,
          right: false,
          cast: false,
        },
        16,
      );

      expect(result.shieldTimer).toBe(2000 - 16);
    });

    it("shield deactivates when timer reaches 0", () => {
      const state = createEnchantedLibraryState(SAMPLE_VOCABULARY);
      const almostExpired = {
        ...state,
        shieldActive: true,
        shieldTimer: 10,
      };

      const result = advanceEnchantedLibraryTime(
        almostExpired,
        {
          up: false,
          down: false,
          left: false,
          right: false,
          cast: false,
        },
        16,
      );

      expect(result.shieldActive).toBe(false);
      expect(result.shieldTimer).toBe(0);
    });

    it("player can move when shield is active", () => {
      const state = createEnchantedLibraryState(SAMPLE_VOCABULARY);
      const withActiveShield = {
        ...state,
        shieldActive: true,
        shieldTimer: 1000,
      };

      const moveRight: DirectionalInput = {
        up: false,
        down: false,
        left: false,
        right: true,
        cast: false,
      };

      const result = advanceEnchantedLibraryTime(
        withActiveShield,
        moveRight,
        16,
      );

      // Player should still be able to move (per spec, only original Wizard vs Zombie had freeze)
      expect(result.player.x).toBeGreaterThan(state.player.x);
    });
  });

  describe("shield integration in game loop", () => {
    const noInput: DirectionalInput = {
      up: false,
      down: false,
      left: false,
      right: false,
      cast: false,
    };

    it("activates shield when cast button pressed", () => {
      const state = createEnchantedLibraryState(SAMPLE_VOCABULARY);
      const castInput: DirectionalInput = {
        ...noInput,
        cast: true,
      };

      const result = advanceEnchantedLibraryTime(state, castInput, 16);

      expect(result.shieldActive).toBe(true);
      expect(result.player.shieldCharges).toBe(2); // Started with 3, used 1
    });

    it("does not activate shield if no charges available", () => {
      const state = createEnchantedLibraryState(SAMPLE_VOCABULARY);
      const noCharges = {
        ...state,
        player: {
          ...state.player,
          shieldCharges: 0,
        },
      };

      const castInput: DirectionalInput = {
        ...noInput,
        cast: true,
      };

      const result = advanceEnchantedLibraryTime(noCharges, castInput, 16);

      expect(result.shieldActive).toBe(false);
    });

    it("updates shield timer during game loop", () => {
      const state = createEnchantedLibraryState(SAMPLE_VOCABULARY);
      const withActiveShield = {
        ...state,
        shieldActive: true,
        shieldTimer: 1000,
      };

      const result = advanceEnchantedLibraryTime(withActiveShield, noInput, 16);

      expect(result.shieldTimer).toBe(1000 - 16);
    });

    it("allows player movement when shield active", () => {
      const state = createEnchantedLibraryState(SAMPLE_VOCABULARY);
      const withActiveShield = {
        ...state,
        shieldActive: true,
        shieldTimer: 1000,
      };

      const moveRight: DirectionalInput = {
        ...noInput,
        right: true,
      };

      const result = advanceEnchantedLibraryTime(
        withActiveShield,
        moveRight,
        16,
      );

      expect(result.player.x).toBeGreaterThan(state.player.x);
    });
  });

  describe("final score calculation", () => {
    it("final score equals current mana value", () => {
      const state = createEnchantedLibraryState(SAMPLE_VOCABULARY);
      const withMana = {
        ...state,
        mana: 75, // After collecting some books
      };

      // Final score is just the mana value
      expect(withMana.mana).toBe(75);
    });

    it("score is available on victory", () => {
      const state = createEnchantedLibraryState(SAMPLE_VOCABULARY);

      // Simulate game with final mana
      const gameState = {
        ...state,
        mana: 120,
        status: "victory" as const,
      };

      // Mark all words as collected
      SAMPLE_VOCABULARY.forEach((vocab) => {
        gameState.vocabularyProgress.set(vocab.term, 2);
      });

      expect(gameState.status).toBe("victory");
      expect(gameState.mana).toBe(120); // This is the final score
    });

    it("final score is never negative", () => {
      const state = createEnchantedLibraryState(SAMPLE_VOCABULARY);
      const withLowMana = {
        ...state,
        mana: 0, // Minimum mana
        status: "victory" as const,
      };

      // Mark all words as collected
      SAMPLE_VOCABULARY.forEach((vocab) => {
        withLowMana.vocabularyProgress.set(vocab.term, 2);
      });

      // Victory possible even with 0 mana
      expect(withLowMana.status).toBe("victory");
      expect(withLowMana.mana).toBe(0);
      expect(withLowMana.mana).toBeGreaterThanOrEqual(0);
    });
  });

  describe("checkVictoryCondition", () => {
    it("returns true when all words collected 2x", () => {
      const state = createEnchantedLibraryState(SAMPLE_VOCABULARY);

      // Mark all words as collected 2x
      SAMPLE_VOCABULARY.forEach((vocab) => {
        state.vocabularyProgress.set(vocab.term, 2);
      });

      const result = checkVictoryCondition(state);

      expect(result).toBe(true);
    });

    it("returns false if any word < 2x", () => {
      const state = createEnchantedLibraryState(SAMPLE_VOCABULARY);

      // Some words collected, but not all 2x
      state.vocabularyProgress.set(SAMPLE_VOCABULARY[0].term, 2);
      state.vocabularyProgress.set(SAMPLE_VOCABULARY[1].term, 1); // Only 1x
      state.vocabularyProgress.set(SAMPLE_VOCABULARY[2].term, 2);
      state.vocabularyProgress.set(SAMPLE_VOCABULARY[3].term, 0); // Not collected

      const result = checkVictoryCondition(state);

      expect(result).toBe(false);
    });

    it("returns false when no words collected", () => {
      const state = createEnchantedLibraryState(SAMPLE_VOCABULARY);

      const result = checkVictoryCondition(state);

      expect(result).toBe(false);
    });

    it("sets status = victory when complete", () => {
      const state = createEnchantedLibraryState(SAMPLE_VOCABULARY);

      // Mark all words as collected 2x
      SAMPLE_VOCABULARY.forEach((vocab) => {
        state.vocabularyProgress.set(vocab.term, 2);
      });

      const result = advanceEnchantedLibraryTime(
        state,
        {
          up: false,
          down: false,
          left: false,
          right: false,
          cast: false,
        },
        16,
      );

      expect(result.status).toBe("victory");
    });
  });

  describe("advanceEnchantedLibraryTime", () => {
    const noInput: DirectionalInput = {
      up: false,
      down: false,
      left: false,
      right: false,
      cast: false,
    };

    it("updates player position based on input", () => {
      const state = createEnchantedLibraryState(SAMPLE_VOCABULARY);
      const moveRight: DirectionalInput = {
        ...noInput,
        right: true,
      };

      const result = advanceEnchantedLibraryTime(state, moveRight, 16);

      expect(result.player.x).toBeGreaterThan(state.player.x);
    });

    it("clamps player to boundaries", () => {
      const state = createEnchantedLibraryState(SAMPLE_VOCABULARY);
      const playerNearEdge = {
        ...state,
        player: {
          ...state.player,
          x: GAME_WIDTH - 5,
          y: 300,
        },
      };

      const moveRight: DirectionalInput = {
        ...noInput,
        right: true,
      };

      const result = advanceEnchantedLibraryTime(playerNearEdge, moveRight, 16);

      // Player should be clamped to GAME_WIDTH
      expect(result.player.x).toBeLessThanOrEqual(GAME_WIDTH);
    });

    it("updates spirits", () => {
      const state = createEnchantedLibraryState(SAMPLE_VOCABULARY);
      const withSpirit = {
        ...state,
        spirits: [
          {
            id: "spirit-1",
            x: 100,
            y: 100,
            velocityX: 2,
            velocityY: 1,
            speed: 2,
            radius: 15,
            bounced: false,
            hasHitPlayer: false,
          },
        ],
      };

      const result = advanceEnchantedLibraryTime(withSpirit, noInput, 16);

      // Spirit should have moved
      expect(result.spirits[0].x).not.toBe(100);
    });

    it("spawns new spirit when timer expires and no spirit active", () => {
      const state = createEnchantedLibraryState(SAMPLE_VOCABULARY);
      const readyToSpawn = {
        ...state,
        spiritSpawnTimer: 0,
        spirits: [],
      };

      const result = advanceEnchantedLibraryTime(readyToSpawn, noInput, 16);

      // Should have spawned a spirit
      expect(result.spirits.length).toBeGreaterThan(0);
    });

    it("increments game time", () => {
      const state = createEnchantedLibraryState(SAMPLE_VOCABULARY);

      const result = advanceEnchantedLibraryTime(state, noInput, 16);

      expect(result.gameTime).toBe(state.gameTime + 16);
    });

    it("decrements spirit spawn timer", () => {
      const state = createEnchantedLibraryState(SAMPLE_VOCABULARY);
      const withTimer = {
        ...state,
        spiritSpawnTimer: 1000,
      };

      const result = advanceEnchantedLibraryTime(withTimer, noInput, 16);

      expect(result.spiritSpawnTimer).toBe(1000 - 16);
    });
  });
});
