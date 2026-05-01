import type {
  DraggableId,
  DraggableLocation,
  DroppableProvided,
} from "@hello-pangea/dnd";

export type Sentence = {
  articleId: string;
  createdAt: { _seconds: number; _nanoseconds: number };
  endTimepoint: number;
  sentence: string;
  sn: number;
  timepoint: number;
  translation: { th: string };
  userId: string;
  id: string;
  due: string;
};

export type Article = {
  text?: string;
  begin: number;
};

export type Id = string;

export interface Quote {
  id: Id;
  text: string;
  timepoint?: number;
  endTimepoint?: number;
  articleId?: string;
  correctOrder?: boolean;
}

export interface Dragging {
  id: DraggableId;
  location: DraggableLocation;
}

export interface QuoteMap {
  [key: string]: Quote[];
}

export interface Task {
  id: Id;
  content: string;
}

export interface WrapperProps {
  isDraggingOver: boolean;
  isDraggingFrom: boolean;
  isDropDisabled: boolean;
}

export interface InnerListProps {
  dropProvided: DroppableProvided;
  quotes: Quote[];
  listType: string | undefined | null;
}

export interface QuoteListProps {
  quotes: Quote[];
}
