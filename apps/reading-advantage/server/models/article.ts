import { DocumentData } from "firebase/firestore";
import { ArticleType } from "./enum";

export enum ArticleCefrLevel {
  A1MINUS = "A1-",
  A1 = "A1",
  A1PLUS = "A1+",
  A2MINUS = "A2-",
  A2 = "A2",
  A2PLUS = "A2+",
  B1MINUS = "B1-",
  B1 = "B1",
  B1PLUS = "B1+",
  B2MINUS = "B2-",
  B2 = "B2",
  B2PLUS = "B2+",
  C1MINUS = "C1-",
  C1 = "C1",
  C1PLUS = "C1+",
  C2MINUS = "C2-",
  C2 = "C2",
  C2PLUS = "C2+",
}

export interface ArticleTimepoint {
  file: string;
  index: number;
  markName: string;
  timeSeconds: number;
}

export interface Article extends DocumentData {
  average_rating: number;
  cefr_level: ArticleCefrLevel;
  created_at: string; // ISO string
  genre: string;
  id: string;
  image_description: string;
  passage: string;
  ra_level: number;
  read_count: number;
  subgenre: string;
  summary: string;
  thead_id?: string;
  timepoints: ArticleTimepoint[];
  title: string;
  type: ArticleType;
}

export interface ArticleQuestion extends DocumentData {
  question: string;
}

export interface ArticleLAQuestion extends ArticleQuestion {}

export interface ArticleMCQuestion extends ArticleQuestion {
  correct_answer: string;
  distractor_1: string;
  distractor_2: string;
  distractor_3: string;
  question_number: number;
}

export interface ArticleSAQuestion extends ArticleQuestion {
  question_number: number;
  suggested_answer: string;
}
