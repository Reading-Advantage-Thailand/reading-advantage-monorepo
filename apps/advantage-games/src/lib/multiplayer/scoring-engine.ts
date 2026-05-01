export interface ScoreConfig {
  baseScorePerWord: number;
  timeBonusMax: number;
  timeBonusWindowMs: number;
  comboMultiplier: number;
  maxScorePerRound: number;
}

export interface WordScore {
  word: string;
  baseScore: number;
  timeBonus: number;
  comboBonus: number;
  totalScore: number;
  responseTimeMs: number;
}

export interface PlayerScore {
  playerId: string;
  totalScore: number;
  wordsFound: number;
  averageResponseTimeMs: number;
  bestCombo: number;
  roundScores: Map<number, RoundScore>;
}

export interface RoundScore {
  roundNumber: number;
  score: number;
  wordsFound: number;
  averageResponseTimeMs: number;
  submissions: WordScore[];
}

const DEFAULT_CONFIG: ScoreConfig = {
  baseScorePerWord: 100,
  timeBonusMax: 50,
  timeBonusWindowMs: 5000, // 5 seconds for max time bonus
  comboMultiplier: 0.1, // 10% bonus per consecutive correct answer
  maxScorePerRound: 10000,
};

export class ScoringEngine {
  private config: ScoreConfig;
  private playerScores: Map<string, PlayerScore> = new Map();
  private currentRound: number = 0;
  private roundStartTime: number = 0;
  private playerComboCounts: Map<string, number> = new Map();
  private roundSubmissions: Map<string, WordScore[]> = new Map();

  constructor(config: Partial<ScoreConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  startRound(roundNumber: number): void {
    this.currentRound = roundNumber;
    this.roundStartTime = Date.now();
    this.playerComboCounts.clear();
    this.roundSubmissions.clear();
  }

  calculateWordScore(word: string, responseTimeMs: number, playerId: string): WordScore {
    // Base score
    const baseScore = this.config.baseScorePerWord;

    // Time bonus: faster = more points
    const timeRatio = Math.max(0, 1 - responseTimeMs / this.config.timeBonusWindowMs);
    const timeBonus = Math.floor(this.config.timeBonusMax * timeRatio);

    // Combo bonus: consecutive correct answers
    const currentCombo = (this.playerComboCounts.get(playerId) || 0) + 1;
    this.playerComboCounts.set(playerId, currentCombo);
    const comboBonus = Math.floor(baseScore * this.config.comboMultiplier * (currentCombo - 1));

    const totalScore = baseScore + timeBonus + comboBonus;

    return {
      word,
      baseScore,
      timeBonus,
      comboBonus,
      totalScore,
      responseTimeMs,
    };
  }

  submitWord(playerId: string, word: string, responseTimeMs: number): WordScore | null {
    // Anti-cheat: validate response time is reasonable
    if (responseTimeMs < 0 || responseTimeMs > 60000) {
      return null;
    }

    const wordScore = this.calculateWordScore(word, responseTimeMs, playerId);

    // Anti-cheat: check if this would exceed max score for round
    const currentRoundScore = this.getPlayerRoundScore(playerId, this.currentRound);
    const projectedTotal = currentRoundScore + wordScore.totalScore;
    if (projectedTotal > this.config.maxScorePerRound) {
      return null;
    }

    // Record submission
    if (!this.roundSubmissions.has(playerId)) {
      this.roundSubmissions.set(playerId, []);
    }
    this.roundSubmissions.get(playerId)!.push(wordScore);

    // Update player score
    this.updatePlayerScore(playerId, wordScore);

    return wordScore;
  }

  private updatePlayerScore(playerId: string, wordScore: WordScore): void {
    if (!this.playerScores.has(playerId)) {
      this.playerScores.set(playerId, {
        playerId,
        totalScore: 0,
        wordsFound: 0,
        averageResponseTimeMs: 0,
        bestCombo: 0,
        roundScores: new Map(),
      });
    }

    const playerScore = this.playerScores.get(playerId)!;
    playerScore.totalScore += wordScore.totalScore;
    playerScore.wordsFound += 1;

    // Update average response time
    const totalResponseTime = playerScore.averageResponseTimeMs * (playerScore.wordsFound - 1) + wordScore.responseTimeMs;
    playerScore.averageResponseTimeMs = totalResponseTime / playerScore.wordsFound;

    // Update best combo
    const currentCombo = this.playerComboCounts.get(playerId) || 0;
    if (currentCombo > playerScore.bestCombo) {
      playerScore.bestCombo = currentCombo;
    }

    // Update round score
    if (!playerScore.roundScores.has(this.currentRound)) {
      playerScore.roundScores.set(this.currentRound, {
        roundNumber: this.currentRound,
        score: 0,
        wordsFound: 0,
        averageResponseTimeMs: 0,
        submissions: [],
      });
    }

    const roundScore = playerScore.roundScores.get(this.currentRound)!;
    roundScore.score += wordScore.totalScore;
    roundScore.wordsFound += 1;
    roundScore.submissions.push(wordScore);

    // Update round average response time
    const roundTotalTime = roundScore.averageResponseTimeMs * (roundScore.wordsFound - 1) + wordScore.responseTimeMs;
    roundScore.averageResponseTimeMs = roundTotalTime / roundScore.wordsFound;
  }

  resetCombo(playerId: string): void {
    this.playerComboCounts.set(playerId, 0);
  }

  getPlayerScore(playerId: string): PlayerScore | undefined {
    return this.playerScores.get(playerId);
  }

  getPlayerRoundScore(playerId: string, roundNumber: number): number {
    const playerScore = this.playerScores.get(playerId);
    if (!playerScore) return 0;

    const roundScore = playerScore.roundScores.get(roundNumber);
    return roundScore?.score || 0;
  }

  getRankings(): PlayerScore[] {
    return Array.from(this.playerScores.values())
      .sort((a, b) => b.totalScore - a.totalScore);
  }

  getRoundRankings(roundNumber: number): Array<{ playerId: string; score: number; wordsFound: number }> {
    const rankings: Array<{ playerId: string; score: number; wordsFound: number }> = [];

    this.playerScores.forEach((playerScore) => {
      const roundScore = playerScore.roundScores.get(roundNumber);
      if (roundScore) {
        rankings.push({
          playerId: playerScore.playerId,
          score: roundScore.score,
          wordsFound: roundScore.wordsFound,
        });
      }
    });

    return rankings.sort((a, b) => b.score - a.score);
  }

  getAllSubmissionsForRound(roundNumber: number): Map<string, WordScore[]> {
    const result = new Map<string, WordScore[]>();
    this.playerScores.forEach((playerScore) => {
      const roundScore = playerScore.roundScores.get(roundNumber);
      if (roundScore) {
        result.set(playerScore.playerId, roundScore.submissions);
      }
    });
    return result;
  }

  getConfig(): ScoreConfig {
    return { ...this.config };
  }

  validateScoreSubmission(playerId: string, proposedScore: number): boolean {
    const playerScore = this.playerScores.get(playerId);
    if (!playerScore) {
      // New player, check if proposed score is reasonable for first submission
      return proposedScore <= this.config.maxScorePerRound;
    }

    const currentRoundScore = this.getPlayerRoundScore(playerId, this.currentRound);
    const maxPossibleAdditional = this.config.maxScorePerRound - currentRoundScore;

    return proposedScore <= maxPossibleAdditional;
  }

  calculateXpBonus(rank: number, score: number): number {
    const bonuses = [0.5, 0.25, 0.1, 0];
    const bonusMultiplier = bonuses[Math.min(rank, bonuses.length - 1)];
    return Math.floor(score * bonusMultiplier);
  }
}
