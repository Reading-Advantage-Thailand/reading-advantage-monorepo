/**
 * Quiz scoring/grading utilities.
 *
 * Extracted from the quiz API route so the grading logic can be unit-tested
 * in isolation without requiring database access.
 */

/**
 * Auto-grade a student's answer based on question type.
 *
 * @param questionType - The type of quiz question (MULTIPLE_CHOICE, TRUE_FALSE, etc.)
 * @param studentAnswer - The student's submitted answer
 * @param correctAnswer - The expected correct answer
 * @returns true if the answer is correct, false otherwise
 */
export function gradeAnswer(
  questionType: string,
  studentAnswer: unknown,
  correctAnswer: unknown
): boolean {
  switch (questionType) {
    case 'MULTIPLE_CHOICE':
    case 'TRUE_FALSE':
      // Exact match for single selection
      return studentAnswer === correctAnswer;

    case 'MULTIPLE_SELECT':
      // All correct answers must be selected, no incorrect answers
      if (!Array.isArray(studentAnswer) || !Array.isArray(correctAnswer)) {
        return false;
      }
      if (studentAnswer.length !== correctAnswer.length) {
        return false;
      }
      {
        const sortedStudent = [...studentAnswer].sort();
        const sortedCorrect = [...correctAnswer].sort();
        return sortedStudent.every((ans, idx) => ans === sortedCorrect[idx]);
      }

    case 'FILL_IN_BLANK': {
      // Normalize and compare (case-insensitive, trim whitespace)
      const normalizedStudent = String(studentAnswer || '')
        .toLowerCase()
        .trim()
        .replace(/\s+/g, ' ');
      const normalizedCorrect = String(correctAnswer || '')
        .toLowerCase()
        .trim()
        .replace(/\s+/g, ' ');
      return normalizedStudent === normalizedCorrect;
    }

    case 'VOCABULARY_MATCH':
      // Verify each term is matched to correct definition
      if (
        !studentAnswer ||
        !correctAnswer ||
        typeof studentAnswer !== 'object' ||
        typeof correctAnswer !== 'object'
      ) {
        return false;
      }
      {
        const studentRecord = studentAnswer as Record<string, unknown>;
        const correctRecord = correctAnswer as Record<string, unknown>;
        const studentKeys = Object.keys(studentRecord);
        const correctKeys = Object.keys(correctRecord);
        if (studentKeys.length !== correctKeys.length) {
          return false;
        }
        return studentKeys.every(
          key => studentRecord[key] === correctRecord[key]
        );
      }

    default:
      return false;
  }
}

/**
 * Calculate the total score from an array of graded responses.
 *
 * @param responses - Array of objects with isCorrect and points fields
 * @returns The total points earned
 */
export function calculateTotalScore(
  responses: { isCorrect: boolean; points: number }[]
): number {
  return responses.reduce(
    (sum, r) => sum + (r.isCorrect ? r.points : 0),
    0
  );
}

/**
 * Calculate a percentage score.
 *
 * @param score - Points earned
 * @param maxScore - Maximum possible points
 * @returns Percentage rounded to 2 decimal places
 */
export function calculatePercentage(score: number, maxScore: number): number {
  if (maxScore === 0) return 0;
  return parseFloat(((score / maxScore) * 100).toFixed(2));
}
