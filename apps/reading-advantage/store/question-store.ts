import { create } from "zustand";
import {
  QuestionState,
} from "@/components/models/questions-model";
import { QuestionResponse as MCQuestionResponse } from "@/components/questions/mc-question-card";
import { QuestionResponse as SAQuestionResponse } from "@/components/questions/sa-question-card";
import { QuestionResponse as LAQQuestionResponse } from "@/components/questions/laq-question-card";

type Question = {
  mcQuestion: MCQuestionResponse;
  saQuestion: SAQuestionResponse;
  laqQuestion: LAQQuestionResponse;
};

export const useQuestionStore = create<Question>((set) => ({
  mcQuestion: {
    results: [],
    progress: [],
    total: 0,
    state: QuestionState.LOADING,
  },
  saQuestion: {
    result: {
      id: "",
      question: "",
    },
    suggested_answer: "",
    answer: "",
    state: QuestionState.LOADING,
  },
  laqQuestion: {
    result: {
      id: "",
      question: "",
    },
    state: QuestionState.LOADING,
  },
  setMCQuestion: (mcQuestion: MCQuestionResponse) => set({ mcQuestion }),
  setSAQuestion: (saQuestion: SAQuestionResponse) => set({ saQuestion }),
  setLAQQuestion: (laqQuestion: LAQQuestionResponse) => set({ laqQuestion }),
}));
