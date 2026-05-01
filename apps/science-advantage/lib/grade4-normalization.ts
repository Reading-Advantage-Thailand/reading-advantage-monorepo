import { z } from 'zod';

const QUESTION_TYPE_MAP: Record<string, string> = {
  'multiple_choice': 'MULTIPLE_CHOICE',
  'multiple-select': 'MULTIPLE_SELECT',
  'multiple_select': 'MULTIPLE_SELECT',
  'true_false': 'TRUE_FALSE',
  'true-false': 'TRUE_FALSE',
  'fill_in_blank': 'FILL_IN_BLANK',
  'fill-in-blank': 'FILL_IN_BLANK',
  'vocabulary_match': 'VOCABULARY_MATCH',
  'vocabulary-match': 'VOCABULARY_MATCH',
};

const VALID_QUESTION_TYPES = [
  'MULTIPLE_CHOICE',
  'MULTIPLE_SELECT',
  'TRUE_FALSE',
  'FILL_IN_BLANK',
  'VOCABULARY_MATCH',
] as const;

const QuestionDataSchema = z.object({
  slug: z.string().optional(),
  type: z.string(),
  text: z.string(),
  options: z.unknown().optional(),
  correctAnswer: z.unknown(),
  points: z.number().int().positive(),
  standards: z.array(z.string()),
});

const QuestionsFileSchema = z.object({
  lessonId: z.string(),
  questions: z.array(QuestionDataSchema),
});

export type NormalizedQuestion = {
  slug?: string;
  type: string;
  text: string;
  options?: unknown;
  correctAnswer: unknown;
  points: number;
  standards: string[];
};

export type NormalizationResult = {
  questions: NormalizedQuestion[];
  warnings: string[];
};

/**
 * Normalizes a question type string to the uppercase enum value.
 * Maps lowercase/snake_case variants to the canonical QuestionType enum.
 */
export function normalizeQuestionType(type: string): string {
  const normalized = QUESTION_TYPE_MAP[type.toLowerCase()];
  if (normalized) {
    return normalized;
  }

  const upper = type.toUpperCase().replace(/[-.\s]+/g, '_');
  if (VALID_QUESTION_TYPES.includes(upper as typeof VALID_QUESTION_TYPES[number])) {
    return upper;
  }

  return upper;
}

/**
 * Validates that a question type is a valid QuestionType enum value.
 */
export function isValidQuestionType(type: string): boolean {
  return VALID_QUESTION_TYPES.includes(type as typeof VALID_QUESTION_TYPES[number]);
}

/**
 * Normalizes all question types in a QuestionsFile structure.
 * Returns normalized questions with any warnings about invalid types.
 */
export function normalizeQuestionFile(data: unknown): NormalizationResult {
  const parseResult = QuestionsFileSchema.safeParse(data);
  if (!parseResult.success) {
    throw new Error(`Invalid questions file: ${parseResult.error.message}`);
  }

  const { lessonId, questions } = parseResult.data;
  const warnings: string[] = [];
  const normalizedQuestions: NormalizedQuestion[] = [];

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const normalizedType = normalizeQuestionType(q.type);

    if (!isValidQuestionType(normalizedType)) {
      warnings.push(
        `Lesson ${lessonId}, question ${i + 1}: Unknown type "${q.type}" (normalized to "${normalizedType}")`
      );
    }

    normalizedQuestions.push({
      slug: q.slug,
      type: normalizedType,
      text: q.text,
      options: q.options,
      correctAnswer: q.correctAnswer,
      points: q.points,
      standards: q.standards,
    });
  }

  return { questions: normalizedQuestions, warnings };
}
