import { ScoringEngine } from './scoring-engine';

describe('ScoringEngine', () => {
  let engine: ScoringEngine;

  beforeEach(() => {
    engine = new ScoringEngine();
    engine.startRound(1);
  });

  describe('calculateWordScore', () => {
    it('should calculate base score for word', () => {
      const score = engine.calculateWordScore('apple', 1000, 'player1');
      expect(score.baseScore).toBe(100);
      expect(score.totalScore).toBeGreaterThanOrEqual(100);
    });

    it('should award time bonus for fast response', () => {
      const fastScore = engine.calculateWordScore('apple', 100, 'player1');
      const slowScore = engine.calculateWordScore('banana', 4000, 'player1');
      expect(fastScore.timeBonus).toBeGreaterThan(slowScore.timeBonus);
    });

    it('should award combo bonus for consecutive answers', () => {
      engine.calculateWordScore('apple', 1000, 'player1');
      const comboScore = engine.calculateWordScore('banana', 1000, 'player1');
      expect(comboScore.comboBonus).toBeGreaterThan(0);
    });

    it('should reset combo when resetCombo called', () => {
      engine.calculateWordScore('apple', 1000, 'player1');
      engine.resetCombo('player1');
      const score = engine.calculateWordScore('banana', 1000, 'player1');
      expect(score.comboBonus).toBe(0);
    });
  });

  describe('submitWord', () => {
    it('should accept valid word submission', () => {
      const result = engine.submitWord('player1', 'apple', 1000);
      expect(result).not.toBeNull();
      expect(result?.word).toBe('apple');
    });

    it('should reject negative response time', () => {
      const result = engine.submitWord('player1', 'apple', -100);
      expect(result).toBeNull();
    });

    it('should reject excessive response time', () => {
      const result = engine.submitWord('player1', 'apple', 70000);
      expect(result).toBeNull();
    });

    it('should reject submission exceeding max round score', () => {
      // Submit many words to approach max score
      for (let i = 0; i < 100; i++) {
        engine.submitWord('player1', `word${i}`, 100);
      }

      // This should be rejected as it would exceed max score
      const result = engine.submitWord('player1', 'final', 100);
      expect(result).toBeNull();
    });

    it('should track player score', () => {
      engine.submitWord('player1', 'apple', 1000);
      engine.submitWord('player1', 'banana', 2000);

      const playerScore = engine.getPlayerScore('player1');
      expect(playerScore).toBeDefined();
      expect(playerScore?.wordsFound).toBe(2);
      expect(playerScore?.totalScore).toBeGreaterThan(0);
    });

    it('should track average response time', () => {
      engine.submitWord('player1', 'apple', 1000);
      engine.submitWord('player1', 'banana', 3000);

      const playerScore = engine.getPlayerScore('player1');
      expect(playerScore?.averageResponseTimeMs).toBe(2000);
    });

    it('should track best combo', () => {
      engine.submitWord('player1', 'apple', 1000);
      engine.submitWord('player1', 'banana', 1000);
      engine.submitWord('player1', 'cherry', 1000);

      const playerScore = engine.getPlayerScore('player1');
      expect(playerScore?.bestCombo).toBe(3);
    });
  });

  describe('round tracking', () => {
    it('should track scores per round', () => {
      engine.submitWord('player1', 'apple', 1000);
      const round1Score = engine.getPlayerRoundScore('player1', 1);
      expect(round1Score).toBeGreaterThan(0);
    });

    it('should separate scores by round', () => {
      engine.submitWord('player1', 'apple', 1000);
      const round1Score = engine.getPlayerRoundScore('player1', 1);

      engine.startRound(2);
      engine.submitWord('player1', 'banana', 1000);
      engine.submitWord('player1', 'cherry', 1000);
      const round2Score = engine.getPlayerRoundScore('player1', 2);

      // Round 2 should have 2 words, so score should be different
      expect(round2Score).toBeGreaterThan(round1Score);
    });

    it('should get round rankings', () => {
      engine.submitWord('player1', 'apple', 1000);
      engine.submitWord('player2', 'banana', 500);

      const rankings = engine.getRoundRankings(1);
      expect(rankings).toHaveLength(2);
      expect(rankings[0].score).toBeGreaterThanOrEqual(rankings[1].score);
    });
  });

  describe('rankings', () => {
    it('should return players sorted by total score', () => {
      engine.submitWord('player1', 'apple', 1000);
      engine.submitWord('player2', 'banana', 500);
      engine.submitWord('player2', 'cherry', 500);

      const rankings = engine.getRankings();
      expect(rankings[0].playerId).toBe('player2');
      expect(rankings[0].totalScore).toBeGreaterThan(rankings[1].totalScore);
    });
  });

  describe('anti-cheat validation', () => {
    it('should validate reasonable first submission', () => {
      const isValid = engine.validateScoreSubmission('player1', 500);
      expect(isValid).toBe(true);
    });

    it('should reject excessive proposed score', () => {
      const isValid = engine.validateScoreSubmission('player1', 15000);
      expect(isValid).toBe(false);
    });

    it('should validate against remaining round capacity', () => {
      engine.submitWord('player1', 'apple', 1000);
      const remainingCapacity = engine.validateScoreSubmission('player1', 500);
      expect(remainingCapacity).toBe(true);
    });
  });

  describe('xp bonus calculation', () => {
    it('should calculate 50% bonus for 1st place', () => {
      const bonus = engine.calculateXpBonus(0, 1000);
      expect(bonus).toBe(500);
    });

    it('should calculate 25% bonus for 2nd place', () => {
      const bonus = engine.calculateXpBonus(1, 1000);
      expect(bonus).toBe(250);
    });

    it('should calculate 10% bonus for 3rd place', () => {
      const bonus = engine.calculateXpBonus(2, 1000);
      expect(bonus).toBe(100);
    });

    it('should calculate 0% bonus for 4th+ place', () => {
      const bonus = engine.calculateXpBonus(3, 1000);
      expect(bonus).toBe(0);
    });
  });

  describe('submissions tracking', () => {
    it('should get all submissions for round', () => {
      engine.submitWord('player1', 'apple', 1000);
      engine.submitWord('player1', 'banana', 2000);

      const submissions = engine.getAllSubmissionsForRound(1);
      expect(submissions.get('player1')).toHaveLength(2);
    });
  });

  describe('configuration', () => {
    it('should use default config', () => {
      const config = engine.getConfig();
      expect(config.baseScorePerWord).toBe(100);
      expect(config.maxScorePerRound).toBe(10000);
    });

    it('should accept custom config', () => {
      const customEngine = new ScoringEngine({ baseScorePerWord: 200 });
      const config = customEngine.getConfig();
      expect(config.baseScorePerWord).toBe(200);
    });
  });
});
