import type { Difficulty } from "@/store/useGameStore";

export type ArchersRevengeConfig = {
  player: {
    hp: Record<Difficulty, number>;
  };
  arrow: {
    speed: number;
    fireRateMs: number;
  };
  formation: {
    columns: number;
    rows: Record<Difficulty, number>;
  };
  enemy: {
    horizontalSpeed: Record<Difficulty, number>;
    descendSpeed: Record<Difficulty, number>;
    projectileSpeed: number;
  };
  targetChangeInterval: Record<Difficulty, number>;
  scoring: {
    basePointsPerEnemy: number;
    comboMultiplier: number;
    accuracyBonus: number;
  };
  layout: {
    enemySpacing: { x: number; y: number };
    enemySize: { width: number; height: number };
    playerY: number;
    formationTopMargin: number;
    formationMarginX: number;
  };
};

export const ARCHERS_REVENGE_CONFIG: ArchersRevengeConfig = {
  player: {
    hp: {
      easy: 5,
      medium: 3,
      hard: 2,
    },
  },
  arrow: {
    speed: 400,
    fireRateMs: 500,
  },
  formation: {
    columns: 5,
    rows: {
      easy: 2,
      medium: 3,
      hard: 4,
    },
  },
  enemy: {
    horizontalSpeed: {
      easy: 20,
      medium: 35,
      hard: 50,
    },
    descendSpeed: {
      easy: 10,
      medium: 15,
      hard: 25,
    },
    projectileSpeed: 200,
  },
  targetChangeInterval: {
    easy: 10000,
    medium: 7000,
    hard: 5000,
  },
  scoring: {
    basePointsPerEnemy: 100,
    comboMultiplier: 0.1,
    accuracyBonus: 50,
  },
  layout: {
    enemySpacing: { x: 55, y: 45 },
    enemySize: { width: 50, height: 35 },
    playerY: 750,
    formationTopMargin: 140,
    formationMarginX: 30,
  },
};

export type ArchersRevengeDifficultySettings = {
  playerHp: number;
  rows: number;
  columns: number;
  enemySpeed: number;
  descendSpeed: number;
};

export const getDifficultySettings = (
  difficulty: Difficulty
): ArchersRevengeDifficultySettings => {
  const { player, formation, enemy } = ARCHERS_REVENGE_CONFIG;
  return {
    playerHp: player.hp[difficulty],
    rows: formation.rows[difficulty],
    columns: formation.columns,
    enemySpeed: enemy.horizontalSpeed[difficulty],
    descendSpeed: enemy.descendSpeed[difficulty],
  };
};
