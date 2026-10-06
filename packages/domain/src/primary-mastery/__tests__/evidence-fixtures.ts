import type { EvidenceResolver } from "../record-evidence.js";
import type { FlashcardReviewEvent, GameCompletionEvent, QuestionAnswerEvent } from "../evidence-contracts.js";

export const SCHOOL = "55555555-5555-4555-8555-555555555555";
export const STUDENT = "student-1";
export const ARTICLE = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
export const ROW = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
export const Q1 = "11111111-1111-4111-8111-111111111111";
export const Q2 = "22222222-2222-4222-8222-222222222222";
export const Q3 = "33333333-3333-4333-8333-333333333333";
export const NOW = "2026-10-06T10:00:00.000Z";

export const R12_1 = "english.gse.skill.young.reading.12.can-read-cardinal-numbers-up-to-ten-writ";
export const R10_2 = "english.gse.skill.young.reading.10.can-recognise-the-use-of-a-question-mark";
export const L19_2 = "english.gse.skill.young.listening.19.can-identify-everyday-objects-people-or";
export const PUPPY = "english.vocabulary.skill.puppy.noun";
export const RUN = "english.vocabulary.skill.run.verb";

/** A resolver over one tagged article: Q1 has R12.1 and L19.2, Q2 has R10.2, Q3 has no tag; the glossary has puppy and run. */
export function sampleResolver(): EvidenceResolver {
  return {
    async questionObjectives(questionIds) {
      const all = new Map([
        [Q1, [{ questionType: "mcq", shortId: "R12.1", nodeId: R12_1 }, { questionType: "mcq", shortId: "L19.2", nodeId: L19_2 }]],
        [Q2, [{ questionType: "saq", shortId: "R10.2", nodeId: R10_2 }]],
      ]);
      return new Map(questionIds.filter((id) => all.has(id)).map((id) => [id, all.get(id)!]));
    },
    async articleWordNodes(articleId) {
      if (articleId !== ARTICLE) return [];
      return [
        { word: "puppy", pos: "noun", nodeId: PUPPY, role: "glossed" },
        { word: "run", pos: "verb", nodeId: RUN, role: "recycled" },
      ];
    },
    async articleQuestions(articleId) {
      if (articleId !== ARTICLE) return [];
      return [{ id: Q1, type: "mcq", question: "What is in the box?" }, { id: Q3, type: "mcq", question: "Who has a box?" }];
    },
  };
}

export function questionEvent(overrides: Partial<QuestionAnswerEvent> = {}): QuestionAnswerEvent {
  return {
    kind: "question-step",
    sourceTable: "user_activity",
    rowId: ROW,
    userId: STUDENT,
    articleId: ARTICLE,
    mode: "independent",
    questions: [{ questionId: Q1, questionType: "mcq", correct: true, firstTry: true }],
    audioPlayed: true,
    occurredAt: NOW,
    ...overrides,
  };
}

export function flashcardEvent(overrides: Partial<FlashcardReviewEvent> = {}): FlashcardReviewEvent {
  return { kind: "flashcard-review", sourceTable: "card_reviews", rowId: ROW, userId: STUDENT, articleId: ARTICLE, word: "puppy", rating: 3, timeSpentMs: 4000, occurredAt: NOW, ...overrides };
}

export function gameEvent(overrides: Partial<GameCompletionEvent> = {}): GameCompletionEvent {
  return {
    kind: "game-run",
    sourceTable: "game_completions",
    rowId: ROW,
    userId: STUDENT,
    gameId: "word-hunt",
    articleId: ARTICLE,
    surface: "game",
    items: [
      { itemId: "w-puppy", kind: "word", label: "puppy", attempts: 1, correctFirstTry: true, solved: true },
      { itemId: "w-run", kind: "word", label: "runs", attempts: 2, correctFirstTry: false, solved: true },
      { itemId: "w-mud", kind: "word", label: "mud", attempts: 3, correctFirstTry: false, solved: false },
      { itemId: "s-1", kind: "sentence", label: "The puppy runs.", attempts: 1, correctFirstTry: true, solved: true },
      { itemId: "q-1", kind: "question", label: "What is in the box?", attempts: 1, correctFirstTry: true, solved: true },
    ],
    occurredAt: NOW,
    ...overrides,
  };
}
