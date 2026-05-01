// Firebase Firestore data model for questions
export interface QuestionsRecord {
  multiple_choice_questions: MCQRecord[];
  short_answer_questions: SARecord[];
  long_answer_questions: LARecord[];
}

export interface MCQRecord {
  question_number: number;
  question: string;
  correct_answer: string;
  distractor_1: string;
  distractor_2: string;
  distractor_3: string;
  textual_evidence: string;
}

export interface SARecord {
  question_number: number;
  question: string;
  suggested_answer: string;
}

export interface LARecord {
  question: string;
}

export enum AnswerStatus {
  CORRECT = 0,
  INCORRECT = 1,
  UNANSWERED = 2,
}

export enum QuestionState {
  LOADING = 0,
  INCOMPLETE = 1,
  COMPLETED = 2,
  ERROR = 3,
}

export enum QuizStatus {
  READ = 0,
  COMPLETED_MCQ = 1,
  COMPLETED_SAQ = 2,
  COMPLETED_LAQ = 3,
  UNRATED = 4,
}

// Web data model for questions
export interface Questions {
  mcqs: MultipleChoiceQuestion[];
  shortAnswer: ShortAnswerQuestion;
}

export interface MultipleChoiceQuestion {
  id: string;
  question: string;
  options: string[];
  textual_evidence: string;
}

export interface ShortAnswerQuestion {
  id: string;
  question: string;
}

export interface LongAnswerQuestion {
  id: string;
  question: string;
}
