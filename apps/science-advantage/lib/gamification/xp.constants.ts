const LEVEL_THRESHOLDS = [
  { level: 1, minXp: 0 },
  { level: 2, minXp: 100 },
  { level: 3, minXp: 300 },
  { level: 4, minXp: 600 },
  { level: 5, minXp: 1000 },
  { level: 6, minXp: 1500 },
];

const LEVEL_NAMES: Record<number, string> = {
  1: 'Explorer',
  2: 'Discoverer',
  3: 'Scientist',
  4: 'Researcher',
  5: 'Innovator',
  6: 'Master',
};

export function calculateLevel(xp: number): number {
  let level = 1;
  for (const threshold of LEVEL_THRESHOLDS) {
    if (xp >= threshold.minXp) {
      level = threshold.level;
    }
  }
  return level;
}

export function getLevelName(level: number): string {
  if (level <= 1) return LEVEL_NAMES[1];
  if (level >= 6) return LEVEL_NAMES[6];
  return LEVEL_NAMES[level] || LEVEL_NAMES[1];
}

export function calculateXpForQuiz(
  scorePercentage: number,
  attemptNumber: number
): { baseXp: number; firstAttemptBonus: number; totalXp: number } {
  let baseXp = 0;
  if (scorePercentage >= 90) {
    baseXp = 100;
  } else if (scorePercentage >= 80) {
    baseXp = 75;
  } else if (scorePercentage >= 60) {
    baseXp = 50;
  }

  const firstAttemptBonus = attemptNumber === 1 && scorePercentage >= 80 ? 25 : 0;
  const totalXp = baseXp + firstAttemptBonus;

  return { baseXp, firstAttemptBonus, totalXp };
}
