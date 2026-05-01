import { StoryBible } from "@/app/[locale]/(student)/student/stories/[storyId]/page";
import { string } from "zod";

export interface ArticleShowcase {
  average_rating: number;
  cefr_level: string;
  id: string;
  ra_level?: string;
  cefrLevel?: string;
  summary?: string;
  title: string;
  is_read?: boolean;
  is_completed?: boolean;
  is_approved?: boolean;
  type?: string;
  subgenre?: string;
  genre?: string;
  storyBible?: StoryBible;
  author?: { authorId: string | null; name: string | null };
  averageRating?: number;
  rating?: number;
}

export interface StoryChapter {
  storyId: string;
  chapterNumber: string;
  ra_Level: number;
  cefr_level: string;
  type: string;
  genre: string;
  subgenre: string;
  totalChapters: number;
  storyBible: StoryBible;
  chapter: {
    title: string;
    passage: string;
    summary: string;
    "image-description": string;
    rating: number;
    user_rating_count: number;
    analysis: {
      wordCount: number;
      averageSentenceLength: number;
      vocabulary: {
        uniqueWords: number;
        complexWords: number;
        targetWordsUsed: [];
      };
      grammarStructures: [];
      readabilityScore: number;
    };
    questions: {
      type: string;
      question: string;
      options: string[];
      answer: string;
    }[];
  };
  timepoints: Timepoint[];
}

export interface Chapter {
  storyId: string;
  chapterNumber: number;
  ra_Level: number;
  type: string;
  genre: string;
  subgenre: string;
  cefr_level: string;
  totalChapters: number;
  chapter: {
    id: string;
    storyId: string;
    chapterNumber: number;
    type: string;
    genre: string;
    subGenre: string;
    title: string;
    summary: string;
    passage: string;
    translatedSummary: {
      cn: string;
      en: string;
      th: string;
      tw: string;
      vi: string;
      [key: string]: string | undefined;
    };
    translatedPassage: {
      cn: string[];
      en: string[];
      th: string[];
      tw: string[];
      vi: string[];
      [key: string]: string[] | undefined;
    };
    imageDescription: string;
    cefrLevel: string;
    raLevel: number;
    rating: number;
    audioUrl: string;
    audioWordUrl: string;
    sentences: {
      file: string;
      index: number;
      markName: string;
      sentences: string;
      timeSeconds: number;
    }[];
    words: {
      markName: string;
      definition: {
        cn: string;
        en: string;
        th: string;
        tw: string;
        vi: string;
      };
      vocabulary: string;
      timeSeconds: number;
    }[];
    questions: any;
    authorId: string | null;
    createdAt: string;
    updatedAt: string;
    isPublic: boolean;
    wordCount: number;
    userRatingCount: number | null;
  };
  timepoints: {
    file: string;
    index: number;
    markName: string;
    sentences: string;
    timeSeconds: number;
  }[];
}

export interface Article {
  summary: string;
  image_description: string;
  passage: string;
  created_at: string;
  average_rating: number;
  timepoints: Timepoint[];
  type: string;
  title: string;
  cefr_level: string;
  thread_id: string;
  ra_level: number;
  subgenre: string;
  genre: string;
  id: string;
  read_count: number;
  translatedPassage?: Record<string, string[]> | null;
  translatedSummary?: Record<string, string[]> | null;
}

export interface Timepoint {
  timeSeconds: number;
  markName: string;
  file: string;
  index: number;
  sentences: string;
}
