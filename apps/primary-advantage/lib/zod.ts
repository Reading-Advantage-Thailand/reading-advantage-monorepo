import z from "zod";

export const signInSchema = z.object({
  email: z
    .string({ required_error: "Email is required" })
    .min(1, "Email is required")
    .email("Invalid email"),
  password: z
    .string({ required_error: "Password is required" })
    .min(1, "Password is required")
    .min(8, "Password must be more than 8 characters")
    .max(32, "Password must be less than 32 characters"),
  type: z.enum(["student", "other"]).optional(),
});

export const signUpSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    email: z
      .string({ required_error: "Email is required" })
      .min(1, "Email is required")
      .email("Invalid email"),
    password: z
      .string({ required_error: "Password is required" })
      .min(1, "Password is required")
      .min(8, "Password must be more than 8 characters")
      .max(32, "Password must be less than 32 characters"),
    confirmPassword: z
      .string({ required_error: "Confirm password is required" })
      .min(1, "Confirm password is required")
      .min(8, "Confirm password must be more than 8 characters")
      .max(32, "Confirm password must be less than 32 characters"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const classCodeSchema = z.object({
  classroomCode: z
    .string({
      required_error: "Classroom code is required",
    })
    .min(1, "Classroom code is required"),
});

export const MCQuestionSchema = z.object({
  questions: z.array(
    z.object({
      question_number: z.number(),
      question: z.string().describe("The question"),
      answer: z.string().describe("The correct answer"),
      options: z
        .array(z.string())
        .length(4)
        .describe(
          "Exactly 4 options including 1 correct answer. An incorrect but plausible answer that is approximately the same length as the correct answer.",
        ),
      textual_evidence: z
        .string()
        .describe(
          "A quote from the reading passage providing textual evidence for the correct answer",
        ),
    }),
  ),
});

export const LAQuestionSchema = z.object({
  question: z.string(),
});

export const SAQuestionSchema = z.object({
  questions: z
    .array(
      z.object({
        question_number: z.number(),
        question: z.string(),
        answer: z.string(),
      }),
    )
    .length(5),
});

export const VocabularySchema = z.array(
  z.object({
    vocabulary: z
      .string()
      .describe("A difficult vocabulary word, phrase, or idiom."),
    definition: z.object({
      en: z
        .string()
        .describe(
          "The English definition of the vocabulary in simple language.",
        ),
      th: z.string().describe("The Thai translation of the vocabulary."),
      cn: z
        .string()
        .describe("The Simplified Chinese translation of the vocabulary."),
      tw: z
        .string()
        .describe("The Traditional Chinese translation of the vocabulary."),
      vi: z.string().describe("The Vietnamese translation of the vocabulary."),
    }),
  }),
);

export const laqFeedbackInputSchema = z.object({
  preferredLanguage: z.string(),
  targetCEFRLevel: z.enum(["A0", "A1", "A2", "B1", "B2", "C1", "C2"]),
  readingPassage: z.string(),
  writingPrompt: z.string(),
  studentResponse: z.string(),
});

export const laqFeedbackOutputSchema = z.object({
  feedback: z.object({
    scores: z.object({
      vocabularyUse: z.number().int().min(1).max(5),
      grammarAccuracy: z.number().int().min(1).max(5),
      clarityAndCoherence: z.number().int().min(1).max(5),
      complexityAndStructure: z.number().int().min(1).max(5),
      contentAndDevelopment: z.number().int().min(1).max(5),
    }),
    overallImpression: z.string(),
    detailedFeedback: z.object({
      vocabularyUse: z.object({
        strengths: z.string(),
        areasForImprovement: z.string(),
        examples: z.string(),
        suggestions: z.string(),
      }),
      grammarAccuracy: z.object({
        strengths: z.string(),
        areasForImprovement: z.string(),
        examples: z.string(),
        suggestions: z.string(),
      }),
      clarityAndCoherence: z.object({
        strengths: z.string(),
        areasForImprovement: z.string(),
        examples: z.string(),
        suggestions: z.string(),
      }),
      complexityAndStructure: z.object({
        strengths: z.string(),
        areasForImprovement: z.string(),
        examples: z.string(),
        suggestions: z.string(),
      }),
      contentAndDevelopment: z.object({
        strengths: z.string(),
        areasForImprovement: z.string(),
        examples: z.string(),
        suggestions: z.string(),
      }),
    }),
    exampleRevisions: z.array(z.string()).min(2).max(3),
    nextSteps: z.array(z.string()).min(2).max(3),
  }),
});

export const saqFeedbackInputSchema = z.object({
  preferredLanguage: z.string(),
  targetCEFRLevel: z.enum(["A0", "A1", "A2", "B1", "B2", "C1", "C2"]),
  article: z.string(),
  question: z.string(),
  suggestedResponse: z.string(),
  studentResponse: z.string(),
});

export const saqFeedbackOutputSchema = z.object({
  feedback: z.string().describe("A single sentence feedback in student's L1"),
  score: z.number().int().min(1).max(5),
});

export const articleGeneratorSchema = z.object({
  brainstorming: z
    .string()
    .describe(
      "Brainstorm various ideas for the article or passage in short phrases.",
    ),
  planning: z
    .string()
    .describe(
      "Planning for the passage: a strategy for incorporating vocabulary and grammar features suited to the specified CEFR level, including sentence structures, common phrases, and appropriate linguistic complexity. For nonfiction, focus on a logical organization of ideas and clear transitions; for fiction, consider narrative techniques, character development, and descriptive language. Provide a bullet-point outline covering the structure, key content points, and any specific stylistic or thematic elements to include.",
    ),
  title: z
    .string()
    .describe(
      "An interesting title for the article written at the same CEFR level",
    ),
  passage: z
    .string()
    .describe(
      "The reading passage written to the supplied specifications for both CEFR and type.Important: The passage should be returned in UTF-8 encoding format. and add some line breaks to make it more readable.and max 3 paragraphs ",
    ),
  summary: z
    .string()
    .describe(
      "A one-sentence summary of the article written at the same CEFR level",
    ),
  imageDesc: z
    .string()
    .describe(
      "A detailed description of an image to go along with the passage",
    ),
  translatedSummary: z.object({
    th: z.string().describe("The Thai translation of the vocabulary."),
    cn: z
      .string()
      .describe("The Simplified Chinese translation of the vocabulary."),
    tw: z
      .string()
      .describe("The Traditional Chinese translation of the vocabulary."),
    vi: z.string().describe("The Vietnamese translation of the vocabulary."),
  }),
  sentences: z.array(z.string()).describe("The sentences of the article"),
  wordlist: z
    .array(
      z.object({
        vocabulary: z.string().describe("The words of the article"),
        definitions: z.object({
          en: z.string().describe("The English definition of the vocabulary"),
          th: z.string().describe("The Thai definition of the vocabulary"),
          cn: z
            .string()
            .describe("The Simplified Chinese definition of the vocabulary"),
          tw: z
            .string()
            .describe("The Traditional Chinese definition of the vocabulary"),
          vi: z
            .string()
            .describe("The Vietnamese definition of the vocabulary"),
        }),
      }),
    )
    .describe(
      "Extract the 3 to 5 most difficult vocabulary words, phrases, or idioms from the article",
    ),
  flashcard: z
    .array(
      z.object({
        sentence: z.string().describe("The sentence of the article"),
        translation: z.object({
          th: z.string().describe("The Thai translation of the sentence"),
          cn: z
            .string()
            .describe("The Simplified Chinese translation of the sentence"),
          tw: z
            .string()
            .describe("The Traditional Chinese translation of the sentence"),
          vi: z.string().describe("The Vietnamese translation of the sentence"),
        }),
      }),
    )
    .describe(
      "Extract the 3 to 5 most difficult sentence, phrases, or idioms from the article",
    ),
  multipleChoiceQuestions: z
    .array(
      z.object({
        question: z.string().describe("The question of the article"),
        options: z.array(z.string()).describe("The options of the question"),
        answer: z.string().describe("The answer of the question"),
      }),
    )
    .describe(
      "Create a series of 10 multiple-choice questions based on the article",
    ),
  shortAnswerQuestions: z
    .array(
      z.object({
        question: z.string().describe("The question of the article"),
        answer: z.string().describe("The answer of the question"),
      }),
    )
    .describe(
      "Create a series of 5 short answer questions based on the article",
    ),
  longAnswerQuestions: z
    .array(
      z.object({
        question: z.string().describe("The question of the article"),
      }),
    )
    .describe(
      "Create a series of 5 long answer questions based on the article",
    ),
});

export const storyGeneratorSchema = z.object({
  topic: z.string().describe("The topic of the story"),
  title: z.string().describe("The title of the story"),
  summary: z.string().describe("The summary of the story"),
  translatedSummary: z.object({
    th: z.string().describe("The Thai translation of the summary"),
    cn: z
      .string()
      .describe("The Simplified Chinese translation of the summary"),
    tw: z
      .string()
      .describe("The Traditional Chinese translation of the summary"),
    vi: z.string().describe("The Vietnamese translation of the summary"),
  }),
  imageDesc: z.string().describe("The image description of the story"),
  chapters: z
    .array(
      z.object({
        chapterNumber: z.number().describe("The chapter number"),
        title: z.string().describe("The title of the chapter"),
        summary: z.string().describe("The summary of the chapter"),
        translatedSummary: z.object({
          th: z.string().describe("The Thai translation of the summary"),
          cn: z
            .string()
            .describe("The Simplified Chinese translation of the summary"),
          tw: z
            .string()
            .describe("The Traditional Chinese translation of the summary"),
          vi: z.string().describe("The Vietnamese translation of the summary"),
        }),
        passage: z.string().describe("The passage of the chapter"),
        wordlist: z
          .array(
            z.object({
              vocabulary: z.string().describe("The vocabulary of the chapter"),
              definition: z
                .string()
                .describe("The definition of the vocabulary"),
            }),
          )
          .describe("The wordlist of the chapter"),
        sentences: z.array(z.string()).describe("The sentences of the chapter"),
        sentencesFlashcard: z
          .array(
            z.object({
              sentence: z.string().describe("The sentence of the chapter"),
              translation: z.object({
                th: z.string().describe("The Thai translation of the sentence"),
                cn: z
                  .string()
                  .describe(
                    "The Simplified Chinese translation of the sentence",
                  ),
                tw: z
                  .string()
                  .describe(
                    "The Traditional Chinese translation of the sentence",
                  ),
                vi: z
                  .string()
                  .describe("The Vietnamese translation of the sentence"),
              }),
            }),
          )
          .describe("The sentences flashcard of the chapter"),
        multipleChoiceQuestions: z
          .array(
            z.object({
              question: z.string().describe("The question of the chapter"),
              options: z
                .array(z.string())
                .describe("The options of the question"),
              answer: z.string().describe("The answer of the question"),
            }),
          )
          .describe("The multiple choice questions of the chapter"),
        shortAnswerQuestions: z
          .array(
            z.object({
              question: z.string().describe("The question of the chapter"),
              answer: z.string().describe("The answer of the question"),
            }),
          )
          .describe("The short answer questions of the chapter"),
        longAnswerQuestions: z
          .array(
            z.object({
              question: z.string().describe("The question of the chapter"),
            }),
          )
          .describe("The long answer questions of the chapter"),
      }),
    )
    .describe("The chapters of the story"),
  characters: z
    .array(
      z.object({
        name: z.string().describe("The name of the character"),
        description: z.string().describe("The description of the character"),
        imageDesc: z
          .string()
          .describe("The image description of the character"),
      }),
    )
    .describe("The characters of the story"),
});

export const articleResponseSchema = z.object({
  id: z.string(),
  title: z.string(),
  summary: z.string(),
  translatedSummary: z.object({
    th: z.string(),
    cn: z.string(),
    tw: z.string(),
    vi: z.string(),
  }),
  passage: z.string(),
  translatedPassage: z.object({
    th: z.array(z.string()),
    cn: z.array(z.string()),
    tw: z.array(z.string()),
    vi: z.array(z.string()),
  }),
  audioUrl: z.string(),
  sentences: z.array(
    z.object({
      words: z.array(
        z.object({
          word: z.string(),
          start: z.number(),
          end: z.number(),
        }),
      ),
      sentence: z.string(),
      startTime: z.number(),
      endTime: z.number(),
    }),
  ),
  genre: z.string(),
  subGenre: z.string().nullable(),
  type: z.string(),
  raLevel: z.number(),
  cefrLevel: z.string(),
  rating: z.number(),
  flashcard: z.object({
    audioWordsUrl: z.string(),
    words: z.array(
      z.object({
        vocabulary: z.string(),
        definition: z.object({
          en: z.string(),
          th: z.string(),
          cn: z.string(),
          tw: z.string(),
          vi: z.string(),
        }),
        timeSeconds: z.number(),
      }),
    ),
    audioSentencesUrl: z.string(),
    sentences: z.array(
      z.object({
        sentence: z.string(),
        timeSeconds: z.number(),
        translation: z.object({
          th: z.string(),
          cn: z.string(),
          tw: z.string(),
          vi: z.string(),
        }),
      }),
    ),
  }),
});
