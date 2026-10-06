/**
 * The five SQL strings Tutor runs against the Primary Advantage database.
 * Copied VERBATIM (whitespace included) from the Tutor repository. Do not edit.
 *
 * Sources:
 * - tutor-advantage/services/learning-service/src/services/PrimaryAdvantageDB.ts
 *   lines 93-120 (article, multiple choice, short answer, flashcard reads).
 * - tutor-advantage/packages/database/import-primary-workbooks.ts
 *   lines 56-58 (published article id and title import read).
 */

/** One Tutor read: a name, its verbatim SQL, and whether it takes the article id as $1. */
export interface TutorReadQuery {
  name: string;
  sql: string;
  takesArticleId: boolean;
}

export const TUTOR_READ_QUERIES: readonly TutorReadQuery[] = [
  {
    name: "article",
    takesArticleId: true,
    sql: `SELECT id, title, summary, passage, cefr_level, ra_level, words, sentences,
              translated_passage, translated_summary, audio_url, audio_word_url, genre, type
         FROM article
        WHERE id = $1 AND is_published = true`,
  },
  {
    name: "multiple_choice_questions",
    takesArticleId: true,
    sql: `SELECT id, question, options, answer
           FROM multiple_choice_questions
          WHERE article_id = $1`,
  },
  {
    name: "short_answer_questions",
    takesArticleId: true,
    sql: `SELECT id, question, answer
           FROM short_answer_questions
          WHERE article_id = $1`,
  },
  {
    name: "sentencs_and_words_for_flashcard",
    takesArticleId: true,
    sql: `SELECT sentence, audio_sentences_url, words, words_url
           FROM sentencs_and_words_for_flashcard
          WHERE article_id = $1
          LIMIT 1`,
  },
  {
    name: "import_published_articles",
    takesArticleId: false,
    sql: "SELECT id, title FROM article WHERE is_published = true",
  },
];
