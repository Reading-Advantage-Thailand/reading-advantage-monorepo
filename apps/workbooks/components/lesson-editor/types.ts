/** Props for the basic-information section of the draft lesson editor. */
export interface BasicInfoEditorProps {
  /** Lesson title edited in this section; persists as normalized content title. */
  lesson_title?: string;
  /** CEFR level label; persists as normalized content cefrLevel. */
  cefr_level?: string;
  /** Called with the legacy field name and new value on every change. */
  onChange: (
    field: "lesson_title" | "cefr_level",
    value: string,
  ) => void;
}

/** Props for the article section of the draft lesson editor. */
export interface ArticleEditorProps {
  /** Article body split into numbered paragraphs, edited as JSON. */
  article_paragraphs?: { number: number; text: string }[];
  /** Called with the legacy field name and new value on every change. */
  onChange: (
    field: "article_paragraphs",
    value: { number: number; text: string }[],
  ) => void;
}

/** Props for the comprehension-questions section of the draft lesson editor. */
export interface ComprehensionQuestionsEditorProps {
  /** Multiple-choice comprehension questions, edited as JSON. */
  comprehension_questions?: {
    number: number;
    question: string;
    options: string[];
  }[];
  /** Called with the legacy field name and new value on every change. */
  onChange: (
    field: "comprehension_questions",
    value: { number: number; question: string; options: string[] }[],
  ) => void;
}

/** Field keys the draft lesson editor can mutate through onChange. */

/**
 * Props controlling the transient status banners above the lesson editor.
 * Revision conflicts arrive as a structured domain failure and are rendered
 * distinctly from save success.
 */
export interface LessonStatusBannersProps {
  /** Form-level error message, or undefined when none is active. */
  formError?: string;
  /** Whether the last save succeeded. */
  saveSuccess: boolean;
  /** Whether the last save failed with an optimistic-concurrency conflict. */
  revisionConflict: boolean;
  /** Human explanation of the conflict when one is active. */
  revisionConflictMessage?: string;
}
