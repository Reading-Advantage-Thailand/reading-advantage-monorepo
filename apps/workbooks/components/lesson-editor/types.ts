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

/** Editor-shaped vocabulary item, mirroring the legacy VocabularyItemSchema. */
export type VocabularyItem = {
  word: string;
  phonetic?: string;
  definition: string;
  thai_definition?: string;
};

/** Editor-shaped vocabulary matching item, mirroring the legacy MatchItemSchema. */
export type VocabularyMatchItem = {
  number: number;
  word: string;
  letter: string;
  definition: string;
  thai_definition?: string;
};

/** Editor-shaped vocabulary fill item, mirroring the legacy FillItemSchema. */
export type VocabularyFillItem = {
  number: number;
  sentence: string;
};

/** Props for the vocabulary section of the draft lesson editor. */
export interface VocabularyEditorProps {
  /** Vocabulary items, edited as JSON. */
  vocabulary?: VocabularyItem[];
  /** Matching-activity items, edited as JSON. */
  vocab_match?: VocabularyMatchItem[];
  /** Fill-in-the-blank items, edited as JSON. */
  vocab_fill?: VocabularyFillItem[];
  /** Word-bank terms, edited as JSON. */
  vocab_word_bank?: string[];
  /** Called with the legacy field name and new value on every change. */
  onChange: (
    field: "vocabulary" | "vocab_match" | "vocab_fill" | "vocab_word_bank",
    value: VocabularyItem[] | VocabularyMatchItem[] | VocabularyFillItem[] | string[],
  ) => void;
}

/** Props for the pedagogical-connectors section of the draft lesson editor. */
export interface PedagogicalConnectorsEditorProps {
  /** Question connecting the article to the student's experience. */
  connection_question?: string;
  /** Grammar pattern students identify in the article. */
  grammar_search_term?: string;
  /** Phonics focus of the lesson. */
  phonics_focus?: string;
  /** Open-ended question for class discussion. */
  discussion_question?: string;
  /** Called with the legacy field name and new value on every change. */
  onChange: (
    field:
      | "connection_question"
      | "grammar_search_term"
      | "phonics_focus"
      | "discussion_question",
    value: string,
  ) => void;
}

/** Props for the writing-prompt section of the draft lesson editor. */
export interface WritingPromptEditorProps {
  /** Writing prompt shown to students. */
  writing_prompt?: string;
  /** Scaffolding plan prompts, edited as JSON. */
  writing_plan_prompts?: string[];
  /** Sentence frames scaffolding student writing, edited as JSON. */
  writing_sentence_frames?: string[];
  /** Sentence starters scaffolding student writing, edited as JSON. */
  sentence_starters?: string[];
  /** Called with the legacy field name and new value on every change. */
  onChange: (
    field:
      | "writing_prompt"
      | "writing_plan_prompts"
      | "writing_sentence_frames"
      | "sentence_starters",
    value: string | string[],
  ) => void;
}

/** Props for the lesson-reflection section of the draft lesson editor. */
export interface LessonReflectionEditorProps {
  /** Reflection focus prompt shown to students at the end of the lesson. */
  reflection_focus?: string;
  /** Called with the legacy field name and new value on every change. */
  onChange: (field: "reflection_focus", value: string) => void;
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
