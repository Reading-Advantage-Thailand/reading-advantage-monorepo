// Types for Lesson and Story controllers

export interface LessonPhase {
  status: number; // 0 = not started, 1 = in progress, 2 = completed
  elapsedTime: number;
}

export interface LessonRecord {
  id: string;
  userId: string;
  articleId: string;
  phase1: LessonPhase;
  phase2: LessonPhase;
  phase3: LessonPhase;
  phase4: LessonPhase;
  phase5: LessonPhase;
  phase6: LessonPhase;
  phase7: LessonPhase;
  phase8: LessonPhase;
  phase9: LessonPhase;
  phase10: LessonPhase;
  phase11: LessonPhase;
  phase12: LessonPhase;
  phase13: LessonPhase;
  phase14: LessonPhase;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChapterWithCompletion {
  id: string;
  storyId: string;
  chapterNumber: number;
  title: string;
  content: string;
  summary?: string;
  imageUrl?: string;
  audioUrl?: string;
  rating?: number;
  userRatingCount?: number;
  wordCount?: number;
  sentences?: any;
  words?: any;
  is_read: boolean;
  is_completed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface StoryWithCompletion {
  id: string;
  title: string;
  summary?: string;
  type?: string;
  genre?: string;
  subgenre?: string;
  raLevel: number;
  cefrLevel: string;
  rating?: number;
  averageRating?: number;
  audioUrl?: string;
  imageUrl?: string;
  authorId?: string;
  createdAt: Date;
  updatedAt: Date;
  chapters: ChapterWithCompletion[];
  is_read: boolean;
  is_completed: boolean;
}

export interface QuizRecord {
  id: string;
  userId: string;
  storyId: string;
  chapterNumber: number;
  questionNumber: number;
  question: string;
  userAnswer?: string;
  isCorrect?: boolean;
  score?: number;
  timeSpent?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface MCQRecord extends QuizRecord {
  options: string[];
  correctAnswer: string;
}

export interface SAQRecord extends QuizRecord {
  correctAnswer: string;
}

export interface LAQRecord extends Omit<QuizRecord, 'isCorrect'> {
  feedback?: string;
}
