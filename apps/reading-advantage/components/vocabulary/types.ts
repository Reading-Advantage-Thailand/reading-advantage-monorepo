import { State } from "ts-fsrs";

export type Word = {
  articleId: string;
  createdAt?: { _seconds: number; _nanoseconds: number };
  difficulty: number; // Reflects the inherent difficulty of the card content
  due: Date; // Date when the card is next due for review
  elapsed_days: number; // Days since the card was last reviewed
  lapses: number; // Times the card was forgotten or remembered incorrectly
  reps: number; // Total number of times the card has been reviewed
  scheduled_days: number; // The interval at which the card is next scheduled
  stability: number; // A measure of how well the information is retained
  state: State; // The current state of the card (New, Learning, Review, Relearning)
  userId: string;
  word: {
    vocabulary: string;
    definition: {
      en: string;
      th: string;
      cn: string;
      tw: string;
      vi: string;
    };
    sn: number;
    timepoint: number;
    startTime: number;
    endTime: number;
    audioUrl: string;
  };
  id?: string;
  last_review?: Date; // The most recent review date, if applicable
};
