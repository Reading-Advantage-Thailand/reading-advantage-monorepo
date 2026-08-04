import type { LegacyWorkbookLesson } from "../legacy-workbook-importer.js";
import type { SupportedLanguage } from "./i18n/index.js";

export interface ThemeColors {
  primary: string;
  secondary: string;
  gradient: string;
}

export interface TeacherManualOptions {
  seriesName: string;
  seriesLevel: string;
  cefrLevel: string;
  type?: "primary" | "secondary";
  theme?: ThemeColors;
  lang?: SupportedLanguage;
}

export interface TeachingNote {
  teacherActions: string[];
  teacherLanguage: string[];
  studentActions: string[];
  watchFor: string[];
}

export interface StepInsertData {
  stepNumber: number;
  stepTitle: string;
  lessonData: LegacyWorkbookLesson;
  lessonIndex: number;
}

export interface PeriodPlan {
  periodNumber: number;
  title: string;
  steps: StepInsertData[];
  teachingNotes: Map<number, TeachingNote>;
  bellRinger?: BellRingerActivity;
  spellingActivity?: SpellingActivity;
  onlineComponents: string[];
}

export interface BellRingerActivity {
  type: "flashcard-cutout" | "flashcard-game";
  title: string;
  duration: string;
  instructions: string[];
  gameVariations?: string[];
}

export interface SpellingActivity {
  type: "trace" | "write" | "cover-write";
  title: string;
  instructions: string;
}

export interface LessonPlan {
  lessonNumber: number;
  lessonTitle: string;
  cefrLevel: string;
  genre?: string;
  articleType?: string;
  objectives: string[];
  periods: PeriodPlan[];
  vocabulary: { word: string; definition: string }[];
}

export interface FrontMatterData {
  seriesName: string;
  seriesLevel: string;
  cefrLevel: string;
}

export interface EndMatterData {
  seriesName: string;
  seriesLevel: string;
}

export const STEP_TITLES: Record<number, string> = {
  1: "Before You Read",
  2: "Key Vocabulary",
  3: "Read the Article",
  4: "Collect Vocabulary",
  5: "Deep Reading Notes",
  6: "Collect Sentences",
  7: "Comprehension Check",
  8: "Guided Response",
  9: "Vocabulary Practice",
  10: "Sentence Practice",
  11: "Guided Writing",
  12: "Language Questions",
  13: "Lesson Reflection",
};

export const PERIOD_MAP: Record<number, { steps: number[]; title: string }> = {
  1: { steps: [1, 2, 3, 4], title: "Launch & Vocabulary" },
  2: { steps: [5, 6, 7], title: "Deep Reading & Comprehension" },
  3: { steps: [8, 9, 10], title: "Response & Practice" },
  4: { steps: [11, 12, 13], title: "Writing & Reflection" },
};
