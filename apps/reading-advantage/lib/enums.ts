// Replaces @prisma/client enum imports after Prisma removal.
// Values must stay in sync with apps/reading-advantage/prisma/schema.prisma.

export const Role = {
  USER: "USER",
  STUDENT: "STUDENT",
  TEACHER: "TEACHER",
  ADMIN: "ADMIN",
  SYSTEM: "SYSTEM",
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const ActivityType = {
  ARTICLE_RATING: "ARTICLE_RATING",
  ARTICLE_READ: "ARTICLE_READ",
  STORIES_RATING: "STORIES_RATING",
  STORIES_READ: "STORIES_READ",
  CHAPTER_RATING: "CHAPTER_RATING",
  CHAPTER_READ: "CHAPTER_READ",
  LEVEL_TEST: "LEVEL_TEST",
  MC_QUESTION: "MC_QUESTION",
  SA_QUESTION: "SA_QUESTION",
  LA_QUESTION: "LA_QUESTION",
  SENTENCE_FLASHCARDS: "SENTENCE_FLASHCARDS",
  SENTENCE_MATCHING: "SENTENCE_MATCHING",
  SENTENCE_ORDERING: "SENTENCE_ORDERING",
  SENTENCE_WORD_ORDERING: "SENTENCE_WORD_ORDERING",
  SENTENCE_CLOZE_TEST: "SENTENCE_CLOZE_TEST",
  VOCABULARY_FLASHCARDS: "VOCABULARY_FLASHCARDS",
  VOCABULARY_MATCHING: "VOCABULARY_MATCHING",
  LESSON_FLASHCARD: "LESSON_FLASHCARD",
  LESSON_SENTENCE_FLASHCARDS: "LESSON_SENTENCE_FLASHCARDS",
  DRAGON_FLIGHT: "DRAGON_FLIGHT",
  MAGIC_DEFENSE: "MAGIC_DEFENSE",
  RPG_BATTLE: "RPG_BATTLE",
  RUNE_MATCH: "RUNE_MATCH",
  WIZARD_ZOMBIE: "WIZARD_ZOMBIE",
  CASTLE_DEFENSE: "CASTLE_DEFENSE",
  POTION_RUSH: "POTION_RUSH",
  ENCHANTED_LIBRARY: "ENCHANTED_LIBRARY",
  DRAGON_RIDER: "DRAGON_RIDER",
} as const;
export type ActivityType = (typeof ActivityType)[keyof typeof ActivityType];

export const Status = {
  NOT_STARTED: "NOT_STARTED",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
} as const;
export type Status = (typeof Status)[keyof typeof Status];

export const LicenseType = {
  BASIC: "BASIC",
  PREMIUM: "PREMIUM",
  ENTERPRISE: "ENTERPRISE",
} as const;
export type LicenseType = (typeof LicenseType)[keyof typeof LicenseType];

export const TeacherRole = {
  OWNER: "OWNER",
  CO_TEACHER: "CO_TEACHER",
} as const;
export type TeacherRole = (typeof TeacherRole)[keyof typeof TeacherRole];

export const QuizStatus = {
  READ: "READ",
  COMPLETED: "COMPLETED",
  COMPLETED_MCQ: "COMPLETED_MCQ",
  COMPLETED_SAQ: "COMPLETED_SAQ",
  COMPLETED_LAQ: "COMPLETED_LAQ",
} as const;
export type QuizStatus = (typeof QuizStatus)[keyof typeof QuizStatus];

export const AnswerStatus = {
  UNANSWERED: "UNANSWERED",
  CORRECT: "CORRECT",
  INCORRECT: "INCORRECT",
} as const;
export type AnswerStatus = (typeof AnswerStatus)[keyof typeof AnswerStatus];

export const GoalType = {
  XP_TOTAL: "XP_TOTAL",
  XP_DAILY: "XP_DAILY",
  XP_WEEKLY: "XP_WEEKLY",
  ARTICLES_READ: "ARTICLES_READ",
  READING_TIME: "READING_TIME",
  VOCABULARY: "VOCABULARY",
  STREAK: "STREAK",
  CEFR_LEVEL: "CEFR_LEVEL",
  CUSTOM: "CUSTOM",
} as const;
export type GoalType = (typeof GoalType)[keyof typeof GoalType];

export const GoalStatus = {
  ACTIVE: "ACTIVE",
  COMPLETED: "COMPLETED",
  PAUSED: "PAUSED",
  CANCELLED: "CANCELLED",
  EXPIRED: "EXPIRED",
} as const;
export type GoalStatus = (typeof GoalStatus)[keyof typeof GoalStatus];

export const GoalPriority = {
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
} as const;
export type GoalPriority = (typeof GoalPriority)[keyof typeof GoalPriority];

export const RecurringPeriod = {
  DAILY: "DAILY",
  WEEKLY: "WEEKLY",
  MONTHLY: "MONTHLY",
} as const;
export type RecurringPeriod = (typeof RecurringPeriod)[keyof typeof RecurringPeriod];

export const AIInsightType = {
  TREND: "TREND",
  ALERT: "ALERT",
  RECOMMENDATION: "RECOMMENDATION",
  ACHIEVEMENT: "ACHIEVEMENT",
  WARNING: "WARNING",
} as const;
export type AIInsightType = (typeof AIInsightType)[keyof typeof AIInsightType];

export const AIInsightScope = {
  STUDENT: "STUDENT",
  TEACHER: "TEACHER",
  CLASSROOM: "CLASSROOM",
  LICENSE: "LICENSE",
  SYSTEM: "SYSTEM",
} as const;
export type AIInsightScope = (typeof AIInsightScope)[keyof typeof AIInsightScope];

export const AIInsightPriority = {
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
  CRITICAL: "CRITICAL",
} as const;
export type AIInsightPriority = (typeof AIInsightPriority)[keyof typeof AIInsightPriority];

export const GameType = {
  DRAGON_FLIGHT: "DRAGON_FLIGHT",
  MAGIC_DEFENSE: "MAGIC_DEFENSE",
  RPG_BATTLE: "RPG_BATTLE",
  RUNE_MATCH: "RUNE_MATCH",
  WIZARD_VS_ZOMBIE: "WIZARD_VS_ZOMBIE",
  CASTLE_DEFENSE: "CASTLE_DEFENSE",
  POTION_RUSH: "POTION_RUSH",
  ENCHANTED_LIBRARY: "ENCHANTED_LIBRARY",
  DRAGON_RIDER: "DRAGON_RIDER",
} as const;
export type GameType = (typeof GameType)[keyof typeof GameType];
