export interface UserActivityLog {
  id: string;
  contentId?: string;
  userId: string;
  articleId?: string;
  activityType: string;
  targetId: string;
  timer?: number | null;
  activityStatus?: string;
  completed: boolean;
  timestamp: string;
  timeTaken: number;
  xpEarned: number;
  initialXp?: number;
  finalXp?: number;
  initialLevel?: number;
  finalLevel?: number;
  createdAt: string;
  updatedAt: string;
  details: {
    title?: string;
    level?: number;
    cefr_level?: string;
    type?: string;
    genre?: string;
    subgenre?: string;
    subGenre?: string;
    articleId?: string;
    contentId?: string;
    [key: string]: any;
  };
}

export enum UserXpEarned {
  MC_Question = 2,
  SA_Question = 3,
  LA_Question = 5,
  Article_Rating = 10,
  Chapter_Rating = 10,
  Vocabulary_Flashcards = 15,
  Vocabulary_Matching = 5,
  Sentence_Flashcards = 15,
  Sentence_Matching = 5,
  Sentence_Cloze_Test = 2,
  Sentence_Ordering = 5,
  Sentence_Word_Ordering = 5,
  Lesson_Flashcard = 20,
  Lesson_Sentence_Flashcards = 15,
}

export enum ActivityType {
  ArticleRating = "article_rating",
  ArticleRead = "article_read",
  StoriesRating = "stories_rating",
  StoriesRead = "stories_read",
  LessonRead = "lesson_read",
  LessonRating = "lesson_rating",
  ChapterRating = "chapter_rating",
  ChapterRead = "chapter_read",
  LevelTest = "level_test",
  MC_Question = "mc_question",
  SA_Question = "sa_question",
  LA_Question = "la_question",
  SentenceFlashcards = "sentence_flashcards",
  SentenceMatching = "sentence_matching",
  SentenceOrdering = "sentence_ordering",
  SentenceWordOrdering = "sentence_word_ordering",
  SentenceClozeTest = "sentence_cloze_test",
  VocabularyFlashcards = "vocabulary_flashcards",
  VocabularyMatching = "vocabulary_matching",
  LessonFlashcard = "lesson_flashcard",
  LessonSentenceFlashcards = "lesson_sentence_flashcards",
}

export enum ActivityStatus {
  InProgress = "in_progress",
  Completed = "completed",
}
