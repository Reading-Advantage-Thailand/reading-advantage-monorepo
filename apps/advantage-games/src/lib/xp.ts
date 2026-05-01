export function calculateXP(score: number, correctAnswers: number, totalAttempts: number): number {
  if (totalAttempts === 0) return 0
  
  const accuracy = correctAnswers / totalAttempts
  
  // Formula: Correct Answers * Accuracy
  return Math.floor(correctAnswers * accuracy)
}