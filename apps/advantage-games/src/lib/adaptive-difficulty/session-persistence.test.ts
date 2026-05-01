import {
  saveSessionHint,
  loadSessionHint,
  clearSessionHint,
  hasSessionHint,
  getAllSessionHints,
  clearAllSessionHints,
  type SessionHint,
} from './session-persistence';

const TEST_GAME_ID = 'test-game';
const STORAGE_KEY = 'adaptive-difficulty-hints';

describe('session-persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('saveSessionHint', () => {
    it('should save parameter hints to localStorage', () => {
      const hint: SessionHint = {
        gameId: TEST_GAME_ID,
        params: {
          speed: 1.5,
          spawnRate: 800,
        },
        timestamp: Date.now(),
      };

      saveSessionHint(hint);

      const stored = localStorage.getItem(STORAGE_KEY);
      expect(stored).not.toBeNull();
      
      const parsed = JSON.parse(stored!);
      expect(parsed[TEST_GAME_ID]).toEqual({
        gameId: TEST_GAME_ID,
        params: { speed: 1.5, spawnRate: 800 },
        timestamp: expect.any(Number),
      });
    });

    it('should overwrite existing hint for same game', () => {
      const hint1: SessionHint = {
        gameId: TEST_GAME_ID,
        params: { speed: 1.0 },
        timestamp: Date.now(),
      };

      const hint2: SessionHint = {
        gameId: TEST_GAME_ID,
        params: { speed: 1.8 },
        timestamp: Date.now(),
      };

      saveSessionHint(hint1);
      saveSessionHint(hint2);

      const loaded = loadSessionHint(TEST_GAME_ID);
      expect(loaded?.params.speed).toBe(1.8);
    });

    it('should preserve hints for other games', () => {
      const hint1: SessionHint = {
        gameId: 'game1',
        params: { speed: 1.5 },
        timestamp: Date.now(),
      };

      const hint2: SessionHint = {
        gameId: 'game2',
        params: { speed: 2.0 },
        timestamp: Date.now(),
      };

      saveSessionHint(hint1);
      saveSessionHint(hint2);

      expect(loadSessionHint('game1')?.params.speed).toBe(1.5);
      expect(loadSessionHint('game2')?.params.speed).toBe(2.0);
    });
  });

  describe('loadSessionHint', () => {
    it('should return null when no hint exists', () => {
      const loaded = loadSessionHint(TEST_GAME_ID);
      expect(loaded).toBeNull();
    });

    it('should load previously saved hint', () => {
      const hint: SessionHint = {
        gameId: TEST_GAME_ID,
        params: {
          speed: 1.5,
          spawnRate: 800,
        },
        timestamp: 1234567890,
      };

      saveSessionHint(hint);
      const loaded = loadSessionHint(TEST_GAME_ID);

      expect(loaded).toEqual(hint);
    });

    it('should return null for different game ID', () => {
      const hint: SessionHint = {
        gameId: 'other-game',
        params: { speed: 1.5 },
        timestamp: Date.now(),
      };

      saveSessionHint(hint);
      const loaded = loadSessionHint(TEST_GAME_ID);

      expect(loaded).toBeNull();
    });

    it('should handle corrupted localStorage gracefully', () => {
      localStorage.setItem(STORAGE_KEY, 'invalid-json');
      
      const loaded = loadSessionHint(TEST_GAME_ID);
      expect(loaded).toBeNull();
    });
  });

  describe('clearSessionHint', () => {
    it('should remove hint for specific game', () => {
      const hint: SessionHint = {
        gameId: TEST_GAME_ID,
        params: { speed: 1.5 },
        timestamp: Date.now(),
      };

      saveSessionHint(hint);
      clearSessionHint(TEST_GAME_ID);

      expect(loadSessionHint(TEST_GAME_ID)).toBeNull();
    });

    it('should preserve hints for other games when clearing one', () => {
      const hint1: SessionHint = {
        gameId: 'game1',
        params: { speed: 1.5 },
        timestamp: Date.now(),
      };

      const hint2: SessionHint = {
        gameId: 'game2',
        params: { speed: 2.0 },
        timestamp: Date.now(),
      };

      saveSessionHint(hint1);
      saveSessionHint(hint2);
      clearSessionHint('game1');

      expect(loadSessionHint('game1')).toBeNull();
      expect(loadSessionHint('game2')).not.toBeNull();
    });

    it('should handle clearing non-existent hint', () => {
      expect(() => clearSessionHint('non-existent')).not.toThrow();
    });
  });

  describe('hasSessionHint', () => {
    it('should return true when hint exists', () => {
      const hint: SessionHint = {
        gameId: TEST_GAME_ID,
        params: { speed: 1.5 },
        timestamp: Date.now(),
      };

      saveSessionHint(hint);
      expect(hasSessionHint(TEST_GAME_ID)).toBe(true);
    });

    it('should return false when no hint exists', () => {
      expect(hasSessionHint(TEST_GAME_ID)).toBe(false);
    });
  });

  describe('fallback behavior', () => {
    it('should return null when localStorage is empty', () => {
      const loaded = loadSessionHint(TEST_GAME_ID);
      expect(loaded).toBeNull();
    });

    it('should handle missing params object', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        [TEST_GAME_ID]: {
          gameId: TEST_GAME_ID,
          timestamp: Date.now(),
          // missing params
        },
      }));

      const loaded = loadSessionHint(TEST_GAME_ID);
      expect(loaded).toBeNull();
    });

    it('should handle empty params object', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        [TEST_GAME_ID]: {
          gameId: TEST_GAME_ID,
          params: {},
          timestamp: Date.now(),
        },
      }));

      const loaded = loadSessionHint(TEST_GAME_ID);
      expect(loaded?.params).toEqual({});
    });

    it('should handle non-object parsed data', () => {
      localStorage.setItem(STORAGE_KEY, '"string-instead-of-object"');
      
      const loaded = loadSessionHint(TEST_GAME_ID);
      expect(loaded).toBeNull();
    });

    it('should handle hint that is not an object', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        [TEST_GAME_ID]: 'not-an-object',
      }));

      const loaded = loadSessionHint(TEST_GAME_ID);
      expect(loaded).toBeNull();
    });

    it('should handle missing gameId', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        [TEST_GAME_ID]: {
          params: { speed: 1.5 },
          timestamp: Date.now(),
          // missing gameId
        },
      }));

      const loaded = loadSessionHint(TEST_GAME_ID);
      expect(loaded).toBeNull();
    });

    it('should handle non-number timestamp', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        [TEST_GAME_ID]: {
          gameId: TEST_GAME_ID,
          params: { speed: 1.5 },
          timestamp: 'not-a-number',
        },
      }));

      const loaded = loadSessionHint(TEST_GAME_ID);
      expect(loaded).toBeNull();
    });
  });

  describe('getAllSessionHints', () => {
    it('should return all valid hints', () => {
      const hint1: SessionHint = {
        gameId: 'game1',
        params: { speed: 1.5 },
        timestamp: Date.now(),
      };

      const hint2: SessionHint = {
        gameId: 'game2',
        params: { speed: 2.0 },
        timestamp: Date.now(),
      };

      saveSessionHint(hint1);
      saveSessionHint(hint2);

      const allHints = getAllSessionHints();
      expect(Object.keys(allHints)).toHaveLength(2);
      expect(allHints['game1']).toEqual(hint1);
      expect(allHints['game2']).toEqual(hint2);
    });

    it('should filter out invalid hints', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        'valid-game': {
          gameId: 'valid-game',
          params: { speed: 1.5 },
          timestamp: Date.now(),
        },
        'invalid-game': 'not-an-object',
      }));

      const allHints = getAllSessionHints();
      expect(Object.keys(allHints)).toHaveLength(1);
      expect(allHints['valid-game']).toBeDefined();
      expect(allHints['invalid-game']).toBeUndefined();
    });

    it('should return empty object when no hints exist', () => {
      const allHints = getAllSessionHints();
      expect(Object.keys(allHints)).toHaveLength(0);
    });
  });

  describe('clearAllSessionHints', () => {
    it('should remove all hints', () => {
      const hint: SessionHint = {
        gameId: TEST_GAME_ID,
        params: { speed: 1.5 },
        timestamp: Date.now(),
      };

      saveSessionHint(hint);
      clearAllSessionHints();

      expect(loadSessionHint(TEST_GAME_ID)).toBeNull();
      expect(hasSessionHint(TEST_GAME_ID)).toBe(false);
    });

    it('should handle clearing when no hints exist', () => {
      expect(() => clearAllSessionHints()).not.toThrow();
      expect(getAllSessionHints()).toEqual({});
    });
  });
});
