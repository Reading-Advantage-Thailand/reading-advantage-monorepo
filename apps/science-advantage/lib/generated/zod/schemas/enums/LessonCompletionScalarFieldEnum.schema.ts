import * as z from 'zod';

export const LessonCompletionScalarFieldEnumSchema = z.enum(['id', 'studentId', 'lessonId', 'status', 'completedAt', 'attemptsCount', 'bestScore', 'bestScorePercentage', 'mostRecentScore', 'mostRecentScorePercentage', 'totalTimeSpentSeconds', 'lastAttemptAt', 'createdAt', 'updatedAt'])

export type LessonCompletionScalarFieldEnum = z.infer<typeof LessonCompletionScalarFieldEnumSchema>;