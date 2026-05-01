export function calculateXP(
  score: number,
  correctAnswers: number,
  totalAttempts: number
): number {
  if (totalAttempts === 0) return 0;

  const accuracy = correctAnswers / totalAttempts;

  // Formula: correctAnswers * accuracy
  // Example: 8 correct * 0.8 accuracy = 6.4 → 6 XP
  return Math.floor(correctAnswers * accuracy);
}
