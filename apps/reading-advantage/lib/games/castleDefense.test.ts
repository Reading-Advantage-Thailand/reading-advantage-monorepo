import {
  createCastleDefenseState,
  movePlayer,
  circlesCollide,
  spawnEnemy,
  advanceCastleDefenseTime,
  collectWords,
  spawnSentenceWords,
  GAME_WIDTH,
  GAME_HEIGHT,
  PLAYER_RADIUS,
  WORD_RADIUS,
  BASE_HP,
  SPAWN_RATE_MS,
  WAVE_CONFIGS,
  MAP_CONFIGS,
  loadMapForWave,
  parseSentenceWords,
  validateWordCollection,
  resetSentenceProgress,
  isSentenceComplete,
  canBuildTower,
  buildTowerAtSlot,
  isWaveComplete,
  calculateCastleDefenseXP,
} from "./castleDefense";

describe("castleDefense", () => {
  describe("parseSentenceWords", () => {
    it("splits a sentence into words", () => {
      expect(parseSentenceWords("The cat sits")).toEqual([
        "The",
        "cat",
        "sits",
      ]);
    });

    it("returns empty array for empty string", () => {
      expect(parseSentenceWords("")).toEqual([]);
    });

    it("handles multiple spaces", () => {
      expect(parseSentenceWords("The   cat   sits")).toEqual([
        "The",
        "cat",
        "sits",
      ]);
    });

    it("strips common punctuation", () => {
      expect(parseSentenceWords("Hello, world!")).toEqual(["Hello", "world"]);
    });
  });

  describe("MAP_CONFIGS", () => {
    it("defines six map configs with paths and tower slots", () => {
      expect(MAP_CONFIGS).toHaveLength(6);
      for (const config of MAP_CONFIGS) {
        expect(config.path.length).toBeGreaterThan(1);
        expect(config.towerSlots.length).toBeGreaterThanOrEqual(3);
      }
    });

    it("keeps tower slots off the road path", () => {
      const isOnPathSegment = (
        slot: { x: number; y: number },
        p1: { x: number; y: number },
        p2: { x: number; y: number },
      ) => {
        if (p1.x === p2.x) {
          return (
            slot.x === p1.x &&
            slot.y >= Math.min(p1.y, p2.y) &&
            slot.y <= Math.max(p1.y, p2.y)
          );
        }
        if (p1.y === p2.y) {
          return (
            slot.y === p1.y &&
            slot.x >= Math.min(p1.x, p2.x) &&
            slot.x <= Math.max(p1.x, p2.x)
          );
        }
        return false;
      };

      for (const config of MAP_CONFIGS) {
        for (const slot of config.towerSlots) {
          const onPath = config.path.some((point, index) => {
            const next = config.path[index + 1];
            if (!next) return false;
            return isOnPathSegment(slot, point, next);
          });
          expect(onPath).toBe(false);
        }
      }
    });
  });

  describe("loadMapForWave", () => {
    it("returns the map config for the requested wave", () => {
      const config = loadMapForWave(3);
      expect(config.wave).toBe(3);
      expect(config.path.length).toBeGreaterThan(1);
    });
  });

  describe("spawnSentenceWords", () => {
    it("returns correct number of word orbs", () => {
      const words = spawnSentenceWords("The cat sits", () => 0.5);
      expect(words).toHaveLength(3);
    });

    it("assigns one sentence word to each orb", () => {
      const words = spawnSentenceWords("The cat sits", () => 0.5);
      expect(words.map((word) => word.translation)).toEqual([
        "The",
        "cat",
        "sits",
      ]);
    });

    it("includes all words from the sentence", () => {
      const words = spawnSentenceWords("The cat sits", () => 0.5);
      expect(new Set(words.map((word) => word.translation))).toEqual(
        new Set(["The", "cat", "sits"]),
      );
    });

    it("spawns orbs within game bounds", () => {
      const words = spawnSentenceWords("The cat sits", () => 0.5);
      for (const word of words) {
        expect(word.x).toBeGreaterThanOrEqual(WORD_RADIUS);
        expect(word.x).toBeLessThanOrEqual(GAME_WIDTH - WORD_RADIUS);
        expect(word.y).toBeGreaterThanOrEqual(WORD_RADIUS);
        expect(word.y).toBeLessThanOrEqual(GAME_HEIGHT - WORD_RADIUS);
      }
    });

    it("spawns orbs within the middle 50% of the board", () => {
      const words = spawnSentenceWords("The cat sits", () => 0.5);
      const minX = GAME_WIDTH * 0.25 + WORD_RADIUS;
      const maxX = GAME_WIDTH * 0.75 - WORD_RADIUS;
      const minY = GAME_HEIGHT * 0.25 + WORD_RADIUS;
      const maxY = GAME_HEIGHT * 0.75 - WORD_RADIUS;

      for (const word of words) {
        expect(word.x).toBeGreaterThanOrEqual(minX);
        expect(word.x).toBeLessThanOrEqual(maxX);
        expect(word.y).toBeGreaterThanOrEqual(minY);
        expect(word.y).toBeLessThanOrEqual(maxY);
      }
    });
  });

  describe("WAVE_CONFIGS", () => {
    it("defines wave configurations for 6 waves", () => {
      expect(WAVE_CONFIGS).toHaveLength(6);
      expect(WAVE_CONFIGS[0].wave).toBe(1);
      expect(WAVE_CONFIGS[5].wave).toBe(6);
    });
  });

  describe("validateWordCollection", () => {
    const sentenceWords = ["The", "cat", "sits"];

    it("allows collecting the first word", () => {
      expect(validateWordCollection([], 0, sentenceWords)).toBe(true);
    });

    it("allows collecting the second word after the first", () => {
      expect(validateWordCollection([0], 1, sentenceWords)).toBe(true);
    });

    it("rejects collecting a later word out of order", () => {
      expect(validateWordCollection([0], 2, sentenceWords)).toBe(false);
    });

    it("rejects collecting an already collected word", () => {
      expect(validateWordCollection([0, 1], 1, sentenceWords)).toBe(false);
    });
  });

  describe("collectWords", () => {
    const sentenceWords = ["The", "cat", "sits"];

    const makeWord = (index: number) => ({
      id: `word-${index}`,
      x: 100,
      y: 100,
      radius: WORD_RADIUS,
      term: sentenceWords[index],
      translation: sentenceWords[index],
      isCorrect: true,
      isCollected: false,
      sentenceIndex: index,
    });

    it("adds the next sequential word index when collected", () => {
      const player = { ...createCastleDefenseState([]).player, x: 100, y: 100 };
      const words = [makeWord(0)];

      const result = collectWords(player, words, sentenceWords, []);

      expect(result.collectedWordIndices).toEqual([0]);
      expect(result.words[0].isCollected).toBe(true);
      expect(result.invalidCollection).toBe(false);
    });

    it("flags invalid collection when a later word is collected", () => {
      const player = { ...createCastleDefenseState([]).player, x: 100, y: 100 };
      const words = [makeWord(2)];

      const result = collectWords(player, words, sentenceWords, [0]);

      expect(result.collectedWordIndices).toEqual([0]);
      expect(result.words[0].isCollected).toBe(false);
      expect(result.invalidCollection).toBe(true);
    });
  });

  describe("resetSentenceProgress", () => {
    it("clears collected indices and respawns sentence words", () => {
      const vocabulary = [{ term: "The cat sits", translation: "แมวนั่งอยู่" }];
      const state = createCastleDefenseState(vocabulary);
      const seededWords = spawnSentenceWords(
        state.currentSentenceEnglish,
        () => 0.5,
      ).map((word, index) => ({
        ...word,
        isCollected: index === 0,
      }));

      const resetState = resetSentenceProgress({
        ...state,
        collectedWordIndices: [0],
        player: { ...state.player, inventory: ["The"] },
        words: seededWords,
      });

      expect(resetState.collectedWordIndices).toEqual([]);
      expect(resetState.player.inventory).toEqual([]);
      expect(resetState.words).toHaveLength(state.sentenceWords.length);
      expect(resetState.words.every((word) => !word.isCollected)).toBe(true);
      expect(new Set(resetState.words.map((word) => word.translation))).toEqual(
        new Set(state.sentenceWords),
      );
    });
  });

  describe("isSentenceComplete", () => {
    it("returns true when all words are collected", () => {
      expect(isSentenceComplete([0, 1, 2], 3)).toBe(true);
    });

    it("returns false when words are missing", () => {
      expect(isSentenceComplete([0, 1], 3)).toBe(false);
    });
  });

  describe("canBuildTower", () => {
    it("returns true when sentence is complete and player is near a tower slot", () => {
      const state = createCastleDefenseState([]);
      const slot = state.towerSlots[0];
      const nearState = {
        ...state,
        sentenceCompleted: true,
        player: { ...state.player, x: slot.x, y: slot.y },
      };

      expect(canBuildTower(nearState)).toBe(true);
    });

    it("returns false when sentence is not complete", () => {
      const state = createCastleDefenseState([]);
      const slot = state.towerSlots[0];
      const nearState = {
        ...state,
        sentenceCompleted: false,
        player: { ...state.player, x: slot.x, y: slot.y },
      };

      expect(canBuildTower(nearState)).toBe(false);
    });

    it("returns false when player is not near a tower slot", () => {
      const state = createCastleDefenseState([]);
      const farState = {
        ...state,
        sentenceCompleted: true,
        player: { ...state.player, x: 0, y: 0 },
      };

      expect(canBuildTower(farState)).toBe(false);
    });
  });

  describe("isWaveComplete", () => {
    it("returns true when all enemies spawned and defeated", () => {
      const state = createCastleDefenseState([]);
      const completeState = {
        ...state,
        enemies: [],
        enemiesSpawnedThisWave: 5,
        totalEnemiesThisWave: 5,
      };

      expect(isWaveComplete(completeState)).toBe(true);
    });

    it("returns false when enemies remain alive", () => {
      const state = createCastleDefenseState([]);
      const incompleteState = {
        ...state,
        enemies: [spawnEnemy(state.path, 1)],
        enemiesSpawnedThisWave: 5,
        totalEnemiesThisWave: 5,
      };

      expect(isWaveComplete(incompleteState)).toBe(false);
    });

    it("returns false when there are still enemies to spawn", () => {
      const state = createCastleDefenseState([]);
      const incompleteState = {
        ...state,
        enemies: [],
        enemiesSpawnedThisWave: 3,
        totalEnemiesThisWave: 5,
      };

      expect(isWaveComplete(incompleteState)).toBe(false);
    });
  });

  describe("buildTowerAtSlot", () => {
    it("creates a tower, consumes sentence completion, and resets progress", () => {
      const vocabulary = [
        { term: "The cat is on the mat", translation: "แมวอยู่บนพรม" },
        { term: "I like to eat apples", translation: "ฉันชอบกินแอปเปิ้ล" },
      ];
      const state = createCastleDefenseState(vocabulary);
      const slot = state.towerSlots[0];
      const seededWords = spawnSentenceWords(
        state.currentSentenceEnglish,
        () => 0.5,
      ).map((word, index) => ({
        ...word,
        isCollected: index === 0,
      }));

      const randomSpy = jest.spyOn(Math, "random").mockReturnValue(0);

      const nextState = buildTowerAtSlot(
        {
          ...state,
          sentenceCompleted: true,
          collectedWordIndices: [0],
          words: seededWords,
        },
        slot.id,
        vocabulary,
      );

      randomSpy.mockRestore();

      expect(
        nextState.towers.some((tower) => tower.id === `tower-${slot.id}`),
      ).toBe(true);
      expect(nextState.sentenceCompleted).toBe(false);
      expect(nextState.collectedWordIndices).toEqual([]);
      expect(nextState.currentSentenceEnglish).not.toBe(
        state.currentSentenceEnglish,
      );
      expect(nextState.words).toHaveLength(nextState.sentenceWords.length);
      expect(nextState.words.every((word) => !word.isCollected)).toBe(true);
    });
  });

  describe("advanceCastleDefenseTime sentence sync", () => {
    it("updates sentence fields after building a tower", () => {
      const vocabulary = [
        { term: "The cat is on the mat", translation: "แมวอยู่บนพรม" },
        { term: "I like to eat apples", translation: "ฉันชอบกินแอปเปิ้ล" },
      ];
      const randomSpy = jest.spyOn(Math, "random").mockReturnValue(0);
      const state = createCastleDefenseState(vocabulary);
      const slot = state.towerSlots[0];

      const readyState = {
        ...state,
        sentenceCompleted: true,
        collectedWordIndices: state.sentenceWords.map((_, idx) => idx),
        player: { ...state.player, x: slot.x, y: slot.y },
      };

      const nextState = advanceCastleDefenseTime(
        readyState,
        0,
        { dx: 0, dy: 0 },
        vocabulary,
      );

      expect(nextState.currentSentenceEnglish).not.toBe(
        state.currentSentenceEnglish,
      );
      expect(nextState.sentenceWords).toEqual(
        parseSentenceWords(nextState.currentSentenceEnglish),
      );

      randomSpy.mockRestore();
    });
  });

  describe("performance metrics", () => {
    const vocabulary = [
      { term: "The cat sits", translation: "แมวนั่งอยู่" },
      { term: "I like apples", translation: "ฉันชอบแอปเปิ้ล" },
    ];

    const makeWord = (index: number, x: number, y: number) => ({
      id: `word-${index}`,
      x,
      y,
      radius: WORD_RADIUS,
      term: vocabulary[0].term.split(" ")[index] ?? "word",
      translation: vocabulary[0].term.split(" ")[index] ?? "word",
      isCorrect: true,
      isCollected: false,
      sentenceIndex: index,
    });

    it("increments correct word collections on valid pickup", () => {
      const baseState = createCastleDefenseState(vocabulary);
      const word = makeWord(0, 100, 100);
      const state = {
        ...baseState,
        player: { ...baseState.player, x: 100, y: 100 },
        words: [word],
        sentenceWords: ["The", "cat", "sits"],
        collectedWordIndices: [],
      };

      const nextState = advanceCastleDefenseTime(
        state,
        0,
        { dx: 0, dy: 0 },
        vocabulary,
      );

      expect(nextState.correctWordCollections).toBe(
        state.correctWordCollections + 1,
      );
      expect(nextState.incorrectWordCollections).toBe(
        state.incorrectWordCollections,
      );
    });

    it("increments incorrect word collections on invalid pickup", () => {
      const baseState = createCastleDefenseState(vocabulary);
      const word = makeWord(2, 100, 100);
      const state = {
        ...baseState,
        player: { ...baseState.player, x: 100, y: 100 },
        words: [word],
        sentenceWords: ["The", "cat", "sits"],
        collectedWordIndices: [],
      };

      const nextState = advanceCastleDefenseTime(
        state,
        0,
        { dx: 0, dy: 0 },
        vocabulary,
      );

      expect(nextState.incorrectWordCollections).toBe(
        state.incorrectWordCollections + 1,
      );
      expect(nextState.correctWordCollections).toBe(
        state.correctWordCollections,
      );
    });

    it("increments total enemies defeated when enemies are removed", () => {
      const baseState = createCastleDefenseState(vocabulary);
      const deadEnemy = { ...spawnEnemy(baseState.path, 1), hp: 0 };
      const state = {
        ...baseState,
        enemies: [deadEnemy],
      };

      const nextState = advanceCastleDefenseTime(
        state,
        0,
        { dx: 0, dy: 0 },
        vocabulary,
      );

      expect(nextState.totalEnemiesDefeated).toBe(
        state.totalEnemiesDefeated + 1,
      );
    });

    it("increments waves completed when advancing to the next wave", () => {
      const baseState = createCastleDefenseState(vocabulary);
      const state = {
        ...baseState,
        enemies: [],
        enemiesSpawnedThisWave: baseState.totalEnemiesThisWave,
        waveCompleteTimer: 1,
        waveMessage: `Wave ${baseState.wave} Complete`,
      };

      const nextState = advanceCastleDefenseTime(
        state,
        1,
        { dx: 0, dy: 0 },
        vocabulary,
      );

      expect(nextState.wave).toBe(baseState.wave + 1);
      expect(nextState.wavesCompleted).toBe(state.wavesCompleted + 1);
    });
  });

  describe("createCastleDefenseState", () => {
    it("should create valid initial state with empty vocabulary", () => {
      const state = createCastleDefenseState([]);

      expect(state.status).toBe("playing");
      expect(state.player.x).toBe(GAME_WIDTH / 2);
      expect(state.player.y).toBe(GAME_HEIGHT - 100);
      expect(state.player.radius).toBe(PLAYER_RADIUS);
      expect(state.player.inventory).toEqual([]);
      expect(state.enemies).toEqual([]);
      expect(state.base.hp).toBe(BASE_HP);
      expect(state.wave).toBe(1);
      expect(state.currentSentenceEnglish).toBe("");
      expect(state.currentSentenceThai).toBe("");
      expect(state.sentenceWords).toEqual([]);
      expect(state.collectedWordIndices).toEqual([]);
      expect(state.sentenceCompleted).toBe(false);
      expect(state.enemiesSpawnedThisWave).toBe(0);
      expect(state.enemiesKilledThisWave).toBe(0);
      expect(state.totalEnemiesThisWave).toBeGreaterThan(0);
      expect(state.waveCompleteTimer).toBe(0);
      expect(state.waveMessage).toBe(null);
      expect(state.wavesCompleted).toBe(0);
      expect(state.totalEnemiesDefeated).toBe(0);
      expect(state.correctWordCollections).toBe(0);
      expect(state.incorrectWordCollections).toBe(0);
    });

    it("should assign target words to tower slots from vocabulary", () => {
      const vocab = [
        { term: "hello", translation: "hola" },
        { term: "world", translation: "mundo" },
      ];
      const state = createCastleDefenseState(vocab);

      expect(state.towerSlots.length).toBeGreaterThan(0);
      expect(state.towerSlots[0].targetWord).toBe("hola");
      expect(state.towerSlots[1].targetWord).toBe("mundo");
    });

    it("should set initial target word from vocabulary", () => {
      const vocab = [{ term: "test", translation: "prueba" }];
      const state = createCastleDefenseState(vocab);

      expect(state.targetWord).toBe("prueba");
    });

    it("should initialize sentence fields from first vocabulary item", () => {
      const vocab = [
        { term: "The cat is on the mat", translation: "แมวอยู่บนพรม" },
        { term: "I like to eat apples", translation: "ฉันชอบกินแอปเปิ้ล" },
      ];
      const state = createCastleDefenseState(vocab);

      const chosen = vocab.find(
        (item) => item.term === state.currentSentenceEnglish,
      );
      expect(chosen).toBeDefined();
      expect(state.currentSentenceThai).toBe(chosen?.translation);
      expect(state.sentenceWords).toEqual(
        parseSentenceWords(state.currentSentenceEnglish),
      );
      expect(state.collectedWordIndices).toEqual([]);
      expect(state.sentenceCompleted).toBe(false);
      expect(state.enemiesSpawnedThisWave).toBe(0);
      expect(state.enemiesKilledThisWave).toBe(0);
      expect(state.totalEnemiesThisWave).toBeGreaterThan(0);
      expect(state.waveCompleteTimer).toBe(0);
      expect(state.waveMessage).toBe(null);
      expect(state.wavesCompleted).toBe(0);
      expect(state.totalEnemiesDefeated).toBe(0);
      expect(state.correctWordCollections).toBe(0);
      expect(state.incorrectWordCollections).toBe(0);
    });
  });

  describe("calculateCastleDefenseXP", () => {
    it("returns 0 when score is 0", () => {
      expect(calculateCastleDefenseXP(0)).toBe(0);
    });

    it("rounds up to the nearest integer", () => {
      expect(calculateCastleDefenseXP(1)).toBe(1);
      expect(calculateCastleDefenseXP(50)).toBe(1);
      expect(calculateCastleDefenseXP(100)).toBe(1);
      expect(calculateCastleDefenseXP(101)).toBe(2);
    });
  });

  describe("movePlayer", () => {
    it("should move player right", () => {
      const player = createCastleDefenseState([]).player;
      const moved = movePlayer(player, { dx: 1, dy: 0 }, 50);
      expect(moved.x).toBeGreaterThan(player.x);
      expect(moved.y).toBe(player.y);
    });

    it("should clamp player to game bounds", () => {
      const player = {
        ...createCastleDefenseState([]).player,
        x: GAME_WIDTH - 5,
      };
      const moved = movePlayer(player, { dx: 1, dy: 0 }, 50);
      expect(moved.x).toBeLessThanOrEqual(GAME_WIDTH - PLAYER_RADIUS);
    });

    it("should normalize diagonal movement", () => {
      const player = createCastleDefenseState([]).player;
      const diagonal = movePlayer(player, { dx: 1, dy: 1 }, 50);
      const straight = movePlayer(player, { dx: 1, dy: 0 }, 50);

      // Diagonal distance should be same as straight distance
      const diagDist = Math.sqrt(
        (diagonal.x - player.x) ** 2 + (diagonal.y - player.y) ** 2,
      );
      const straightDist = straight.x - player.x;
      expect(diagDist).toBeCloseTo(straightDist, 1);
    });
  });

  describe("circlesCollide", () => {
    it("should return true for overlapping circles", () => {
      expect(circlesCollide(0, 0, 10, 15, 0, 10)).toBe(true);
    });

    it("should return false for non-overlapping circles", () => {
      expect(circlesCollide(0, 0, 10, 30, 0, 10)).toBe(false);
    });
  });

  describe("spawnEnemy", () => {
    it("should spawn soldier by default", () => {
      const enemy = spawnEnemy([{ x: 0, y: 100 }], 1, () => 0.5);
      expect(enemy.type).toBe("soldier");
    });

    it("should apply soldier stats for wave config spawns", () => {
      const enemy = spawnEnemy(
        [{ x: 0, y: 100 }],
        1,
        () => 0.5,
        { soldiers: 1, tanks: 0, bosses: 0 },
        0,
      );
      expect(enemy.type).toBe("soldier");
      expect(enemy.hp).toBe(40);
      expect(enemy.speed).toBe(0.8);
    });

    it("should spawn tank after wave 2 with right roll", () => {
      const enemy = spawnEnemy([{ x: 0, y: 100 }], 3, () => 0.2);
      expect(enemy.type).toBe("tank");
    });

    it("should apply tank stats for wave config spawns", () => {
      const enemy = spawnEnemy(
        [{ x: 0, y: 100 }],
        2,
        () => 0.5,
        { soldiers: 0, tanks: 1, bosses: 0 },
        0,
      );
      expect(enemy.type).toBe("tank");
      expect(enemy.hp).toBe(120);
      expect(enemy.speed).toBe(0.7);
    });

    it("should apply boss stats for wave config spawns", () => {
      const enemy = spawnEnemy(
        [{ x: 0, y: 100 }],
        5,
        () => 0.5,
        { soldiers: 0, tanks: 0, bosses: 1 },
        0,
      );
      expect(enemy.type).toBe("boss");
      expect(enemy.hp).toBe(360);
      expect(enemy.speed).toBe(0.6);
    });
  });

  describe("advanceCastleDefenseTime", () => {
    const vocabulary = [
      { term: "hello", translation: "hola" },
      { term: "world", translation: "mundo" },
      { term: "goodbye", translation: "adios" },
      { term: "friend", translation: "amigo" },
    ];

    it("should move player based on input", () => {
      const state = createCastleDefenseState(vocabulary);
      const nextState = advanceCastleDefenseTime(
        state,
        50,
        { dx: 1, dy: 0 },
        vocabulary,
      );
      expect(nextState.player.x).toBeGreaterThan(state.player.x);
    });

    it("should increase game time", () => {
      const state = createCastleDefenseState(vocabulary);
      const nextState = advanceCastleDefenseTime(
        state,
        50,
        { dx: 0, dy: 0 },
        vocabulary,
      );
      expect(nextState.gameTime).toBe(50);
    });

    it("should spawn enemies after spawn timer", () => {
      const state = {
        ...createCastleDefenseState(vocabulary),
        spawnTimer: SPAWN_RATE_MS - 10,
        totalEnemiesThisWave: 10,
      };
      const nextState = advanceCastleDefenseTime(
        state,
        50,
        { dx: 0, dy: 0 },
        vocabulary,
      );
      expect(nextState.enemies.length).toBeGreaterThan(0);
    });

    it("does not respawn words until a tower is built", () => {
      const state = createCastleDefenseState(vocabulary);
      const collectedWords = spawnSentenceWords(
        state.currentSentenceEnglish,
        () => 0.5,
      ).map((word) => ({
        ...word,
        isCollected: true,
      }));
      const nextState = advanceCastleDefenseTime(
        {
          ...state,
          sentenceCompleted: false,
          collectedWordIndices: [],
          words: collectedWords,
        },
        0,
        { dx: 0, dy: 0 },
        vocabulary,
      );

      expect(nextState.words.every((word) => word.isCollected)).toBe(true);
      expect(nextState.currentSentenceEnglish).toBe(
        state.currentSentenceEnglish,
      );
    });

    it("should set gameover when base HP reaches 0", () => {
      const state = {
        ...createCastleDefenseState(vocabulary),
        base: { ...createCastleDefenseState(vocabulary).base, hp: 0 },
      };
      const nextState = advanceCastleDefenseTime(
        state,
        50,
        { dx: 0, dy: 0 },
        vocabulary,
      );
      expect(nextState.status).toBe("gameover");
    });

    it("stops spawning when wave spawn quota is reached", () => {
      const state = {
        ...createCastleDefenseState(vocabulary),
        spawnTimer: SPAWN_RATE_MS,
        enemiesSpawnedThisWave: 3,
        totalEnemiesThisWave: 3,
      };

      const nextState = advanceCastleDefenseTime(
        state,
        50,
        { dx: 0, dy: 0 },
        vocabulary,
      );
      expect(nextState.enemiesSpawnedThisWave).toBe(3);
      expect(nextState.enemies.length).toBe(0);
    });

    it("increments spawned count when enemy spawns", () => {
      const state = {
        ...createCastleDefenseState(vocabulary),
        spawnTimer: SPAWN_RATE_MS,
        enemiesSpawnedThisWave: 0,
        totalEnemiesThisWave: 2,
      };

      const nextState = advanceCastleDefenseTime(
        state,
        50,
        { dx: 0, dy: 0 },
        vocabulary,
      );
      expect(nextState.enemiesSpawnedThisWave).toBe(1);
      expect(nextState.enemies.length).toBe(1);
    });

    it("spawns tank enemies when wave config includes tanks", () => {
      const state = {
        ...createCastleDefenseState(vocabulary),
        wave: 2,
        spawnTimer: SPAWN_RATE_MS,
        enemiesSpawnedThisWave: WAVE_CONFIGS[1].soldiers,
        totalEnemiesThisWave: WAVE_CONFIGS[1].soldiers + 1,
      };

      const nextState = advanceCastleDefenseTime(
        state,
        50,
        { dx: 0, dy: 0 },
        vocabulary,
      );
      expect(nextState.enemies[0]?.type).toBe("tank");
    });

    it("advances to the next wave after completion delay", () => {
      const state = {
        ...createCastleDefenseState(vocabulary),
        wave: 1,
        enemies: [],
        enemiesSpawnedThisWave: 1,
        totalEnemiesThisWave: 1,
        waveCompleteTimer: 0,
        waveMessage: null,
      };

      const withMessage = advanceCastleDefenseTime(
        state,
        0,
        { dx: 0, dy: 0 },
        vocabulary,
      );
      expect(withMessage.waveMessage).toBe("Wave 1 Complete");
      expect(withMessage.waveCompleteTimer).toBeGreaterThan(0);

      const advanced = advanceCastleDefenseTime(
        withMessage,
        2000,
        { dx: 0, dy: 0 },
        vocabulary,
      );
      expect(advanced.wave).toBe(2);
      expect(advanced.enemiesSpawnedThisWave).toBe(0);
      expect(advanced.enemiesKilledThisWave).toBe(0);
      expect(advanced.waveMessage).toBe(null);
      expect(advanced.totalEnemiesThisWave).toBe(
        WAVE_CONFIGS[1].soldiers +
          WAVE_CONFIGS[1].tanks +
          WAVE_CONFIGS[1].bosses,
      );
    });

    it("sets victory status when wave 6 completes", () => {
      const state = {
        ...createCastleDefenseState(vocabulary),
        wave: 6,
        enemies: [],
        enemiesSpawnedThisWave: 1,
        totalEnemiesThisWave: 1,
        waveCompleteTimer: 0,
        waveMessage: null,
      };

      const withMessage = advanceCastleDefenseTime(
        state,
        0,
        { dx: 0, dy: 0 },
        vocabulary,
      );
      const finalState = advanceCastleDefenseTime(
        withMessage,
        2000,
        { dx: 0, dy: 0 },
        vocabulary,
      );
      expect(finalState.status).toBe("victory");
    });

    it("does not set victory before wave 6", () => {
      const state = {
        ...createCastleDefenseState(vocabulary),
        wave: 5,
        enemies: [],
        enemiesSpawnedThisWave: 1,
        totalEnemiesThisWave: 1,
        waveCompleteTimer: 0,
        waveMessage: null,
      };

      const withMessage = advanceCastleDefenseTime(
        state,
        0,
        { dx: 0, dy: 0 },
        vocabulary,
      );
      const nextState = advanceCastleDefenseTime(
        withMessage,
        2000,
        { dx: 0, dy: 0 },
        vocabulary,
      );
      expect(nextState.status).toBe("playing");
      expect(nextState.wave).toBe(6);
    });

    it("marks sentence complete and awards points when all words are collected", () => {
      const baseState = createCastleDefenseState(vocabulary);
      const state = {
        ...baseState,
        sentenceWords: ["hello", "world"],
        collectedWordIndices: [0, 1],
        sentenceCompleted: false,
        words: [],
        enemies: [],
      };

      const nextState = advanceCastleDefenseTime(
        state,
        0,
        { dx: 0, dy: 0 },
        vocabulary,
      );

      expect(nextState.sentenceCompleted).toBe(true);
      expect(nextState.score).toBe(state.score + 50);
    });
  });
});
