import z from "zod";

export const signInSchema = z.object({
  username: z
    .string({ required_error: "Username is required" })
    .trim()
    .min(1, "Username is required"),
  password: z
    .string({ required_error: "Password is required" })
    .min(1, "Password is required")
    .min(8, "Password must be more than 8 characters")
    .max(128, "Password must be at most 128 characters"),
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
      .max(128, "Password must be at most 128 characters"),
    confirmPassword: z
      .string({ required_error: "Confirm password is required" })
      .min(1, "Confirm password is required")
      .min(8, "Confirm password must be more than 8 characters")
      .max(128, "Confirm password must be at most 128 characters"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

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

/**
 * Body of the classroom PATCH request (admin and teacher edit dialogs).
 * `grade` is optional and is an integer from 1 to 12, sent as a number or as a string.
 * The list returns the integer column, so a dialog can send it back as a number. The parsed value
 * is always the string form that the model stores with `parseInt`.
 */
export const updateClassroomBodySchema = z.object({
  classroomName: z
    .string({ required_error: "Classroom name is required" })
    .trim()
    .min(1, "Classroom name is required")
    .max(100, "Classroom name must be at most 100 characters"),
  grade: z
    .union([
      z.number().int().min(1, "Grade must be from 1 to 12").max(12, "Grade must be from 1 to 12"),
      z.string().regex(/^(?:[1-9]|1[0-2])$/, "Grade must be from 1 to 12"),
    ])
    .transform(String)
    .optional(),
  /** The full list of teacher ids of the class (admin and SYSTEM only). The class owner stays. */
  teacherIds: z.array(z.string().min(1)).max(200).optional(),
});

/** Parsed body of the classroom PATCH request. */
export type UpdateClassroomBody = z.infer<typeof updateClassroomBodySchema>;

/**
 * Body of PATCH /api/users/me. Only the display name can change; other keys are stripped.
 * The maximum of 40 matches the class name list (`student-login/contracts.ts`).
 */
export const updateOwnDisplayNameBodySchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(40, "Name must be at most 40 characters"),
});

/** Parsed body of PATCH /api/users/me. */
export type UpdateOwnDisplayNameBody = z.infer<typeof updateOwnDisplayNameBodySchema>;
