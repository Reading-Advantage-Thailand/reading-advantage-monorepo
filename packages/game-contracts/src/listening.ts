import { z } from "zod";

import { vocabularyInputSchema } from "./educational-io.js";

function isHttpUrl(value: string): boolean {
  try {
    const protocol = new URL(value).protocol;
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

/** Maximum educational items in one current APK content response. */
export const MAX_LISTENING_SESSION_ITEMS = 50;

/** Maximum recorded question and clip pairs for four choices across 50 questions. */
export const MAX_ANSWER_AUDIO_EVIDENCE_PAIRS = MAX_LISTENING_SESSION_ITEMS * 4;

/** Browser-safe language tag used by listening configuration and evidence. */
export const listeningLocaleSchema = z
  .string()
  .regex(/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/u);

/** Explicit configuration for the first Listen to Select modality. */
export const listeningSessionConfigSchema = z
  .object({
    modality: z.literal("listen-to-select"),
    sourceLocale: listeningLocaleSchema,
    targetLocale: listeningLocaleSchema,
    scored: z.boolean(),
    targetLocaleFallback: z.enum(["reject", "allow-explicit"]),
  })
  .strict()
  .superRefine((config, context) => {
    if (config.scored && config.targetLocaleFallback !== "reject") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Scored listening must reject target-locale fallback",
        path: ["targetLocaleFallback"],
      });
    }
  });

/** Explicit configuration for written Thai prompts with English audio answers. */
export const readToSelectAudioSessionConfigSchema = z
  .object({
    modality: z.literal("read-to-select-audio"),
    promptLocale: z.literal("th-TH"),
    answerLocale: z.literal("en-US"),
    promptField: z.literal("translation"),
    answerField: z.literal("term"),
    scored: z.boolean(),
  })
  .strict();

const itemPositionSchema = z
  .number()
  .int()
  .min(0)
  .max(MAX_LISTENING_SESSION_ITEMS - 1);

const replayCountSchema = z
  .object({
    itemPosition: itemPositionSchema,
    count: z.number().int().min(1).max(MAX_LISTENING_SESSION_ITEMS),
  })
  .strict();

const audioFailureSchema = z
  .object({
    itemPosition: itemPositionSchema,
    code: z.enum(["load-failed", "decode-failed", "playback-failed"]),
  })
  .strict();

/** One browser-safe prepared speech clip aligned with educational content. */
export const preparedSpeechClipSchema = z.object({
  itemPosition: itemPositionSchema,
  url: z.string().url().refine(isHttpUrl, "Prepared speech URL must use HTTP or HTTPS"),
  mediaType: z.string().regex(/^audio\/[a-z0-9.+-]+$/i),
  sourceLocale: listeningLocaleSchema,
}).strict();

/** Complete prepared speech references for one current content array. */
export const preparedSpeechSchema = z.object({
  clips: z.array(preparedSpeechClipSchema).min(1).max(MAX_LISTENING_SESSION_ITEMS),
}).strict().superRefine((speech, context) => {
  speech.clips.forEach((clip, index) => {
    if (clip.itemPosition !== index) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Prepared speech positions must match the content order",
        path: ["clips", index, "itemPosition"],
      });
    }
  });
});

/** Authenticated Wizard listening response with adjacent prepared speech. */
export const preparedListeningVocabularyResponseSchema = z.object({
  mode: z.literal("vocabulary"),
  source: z.literal("student-flashcards"),
  requestedTargetLocale: z.literal("th"),
  selectedTargetLocales: z.array(z.literal("th")).max(MAX_LISTENING_SESSION_ITEMS),
  content: vocabularyInputSchema.max(MAX_LISTENING_SESSION_ITEMS),
  listeningSession: listeningSessionConfigSchema,
  preparedSpeech: preparedSpeechSchema,
}).strict().superRefine((response, context) => {
  if (response.selectedTargetLocales.length !== response.content.length) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Selected target locales must align with content items",
      path: ["selectedTargetLocales"],
    });
  }
  if (response.preparedSpeech.clips.length !== response.content.length) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Prepared speech must cover every content item",
      path: ["preparedSpeech", "clips"],
    });
  }
  if (response.listeningSession.targetLocale !== response.requestedTargetLocale) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Listening target locale must match the requested target locale",
      path: ["listeningSession", "targetLocale"],
    });
  }
  if (
    response.listeningSession.targetLocaleFallback === "reject"
    && response.selectedTargetLocales.some(
      (locale) => locale !== response.requestedTargetLocale,
    )
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Prepared listening cannot use a rejected target-locale fallback",
      path: ["selectedTargetLocales"],
    });
  }
  response.preparedSpeech.clips.forEach((clip, index) => {
    if (clip.sourceLocale !== response.listeningSession.sourceLocale) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Prepared speech locale must match the listening session",
        path: ["preparedSpeech", "clips", index, "sourceLocale"],
      });
    }
  });
});

/** Authenticated Wizard response for written Thai prompts and English answer audio. */
export const preparedReadToSelectAudioVocabularyResponseSchema = z.object({
  mode: z.literal("vocabulary"),
  source: z.literal("student-flashcards"),
  requestedTargetLocale: z.literal("th"),
  selectedTargetLocales: z.array(z.literal("th")).max(MAX_LISTENING_SESSION_ITEMS),
  content: vocabularyInputSchema.max(MAX_LISTENING_SESSION_ITEMS),
  answerAudioSession: readToSelectAudioSessionConfigSchema,
  preparedAnswerAudio: preparedSpeechSchema,
}).strict().superRefine((response, context) => {
  if (response.selectedTargetLocales.length !== response.content.length) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Selected target locales must align with content items",
      path: ["selectedTargetLocales"],
    });
  }
  if (response.preparedAnswerAudio.clips.length !== response.content.length) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Prepared answer audio must cover every content item",
      path: ["preparedAnswerAudio", "clips"],
    });
  }
  response.preparedAnswerAudio.clips.forEach((clip, index) => {
    if (clip.sourceLocale !== response.answerAudioSession.answerLocale) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Prepared answer audio locale must match the answer locale",
        path: ["preparedAnswerAudio", "clips", index, "sourceLocale"],
      });
    }
  });
});

function addPositionIssues(
  values: readonly number[],
  itemCount: number,
  path: string,
  context: z.RefinementCtx,
): void {
  const seen = new Set<number>();
  values.forEach((position, index) => {
    if (position >= itemCount) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Item position must reference the current session",
        path: [path, index],
      });
    }
    if (seen.has(position)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Item positions must be unique",
        path: [path, index],
      });
    }
    seen.add(position);
  });
}

/** Strict host-owned evidence for one completed listening session. */
export const listeningEvidenceSchema = z
  .object({
    schemaVersion: z.literal(1),
    declaredModality: z.literal("listen-to-select"),
    effectiveModality: z.enum(["listen-to-select", "reading-fallback"]),
    sourceLocale: listeningLocaleSchema,
    targetLocale: listeningLocaleSchema,
    itemCount: z.number().int().min(1).max(MAX_LISTENING_SESSION_ITEMS),
    assistedItemPositions: z.array(itemPositionSchema).max(MAX_LISTENING_SESSION_ITEMS),
    fallbackItemPositions: z.array(itemPositionSchema).max(MAX_LISTENING_SESSION_ITEMS),
    replayCounts: z.array(replayCountSchema).max(MAX_LISTENING_SESSION_ITEMS),
    audioFailures: z.array(audioFailureSchema).max(MAX_LISTENING_SESSION_ITEMS),
  })
  .strict()
  .superRefine((evidence, context) => {
    addPositionIssues(
      evidence.assistedItemPositions,
      evidence.itemCount,
      "assistedItemPositions",
      context,
    );
    addPositionIssues(
      evidence.fallbackItemPositions,
      evidence.itemCount,
      "fallbackItemPositions",
      context,
    );
    addPositionIssues(
      evidence.replayCounts.map(({ itemPosition }) => itemPosition),
      evidence.itemCount,
      "replayCounts",
      context,
    );
    addPositionIssues(
      evidence.audioFailures.map(({ itemPosition }) => itemPosition),
      evidence.itemCount,
      "audioFailures",
      context,
    );
    const usedFallback = evidence.fallbackItemPositions.length > 0;
    if (usedFallback !== (evidence.effectiveModality === "reading-fallback")) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Effective modality must identify reading fallback",
        path: ["effectiveModality"],
      });
    }
  });

const answerAudioPlaybackResultSchema = z.enum(["completed", "failed", "cancelled"]);

const answerAudioSelectionAttemptSchema = z
  .object({
    attemptIndex: z.number().int().min(0).max(MAX_ANSWER_AUDIO_EVIDENCE_PAIRS - 1),
    clipItemPosition: itemPositionSchema,
    playbackResult: answerAudioPlaybackResultSchema,
    submitted: z.boolean(),
    completedQuestion: z.boolean(),
  })
  .strict();

const answerAudioQuestionEvidenceSchema = z
  .object({
    questionPosition: itemPositionSchema,
    promptItemPosition: itemPositionSchema,
    selectionAttempts: z.array(answerAudioSelectionAttemptSchema).max(MAX_ANSWER_AUDIO_EVIDENCE_PAIRS),
  })
  .strict();

const answerAudioReplayCountSchema = z
  .object({
    questionPosition: itemPositionSchema,
    clipItemPosition: itemPositionSchema,
    count: z.number().int().min(1).max(MAX_LISTENING_SESSION_ITEMS),
  })
  .strict();

const answerAudioFailureSchema = z
  .object({
    questionPosition: itemPositionSchema,
    clipItemPosition: itemPositionSchema,
    code: z.enum(["load-failed", "decode-failed", "playback-failed"]),
  })
  .strict();

function addQuestionClipPairIssues(
  values: readonly { questionPosition: number; clipItemPosition: number }[],
  itemCount: number,
  path: "replayCounts" | "audioFailures",
  context: z.RefinementCtx,
): void {
  const seen = new Set<string>();
  values.forEach((value, index) => {
    if (value.questionPosition >= itemCount || value.clipItemPosition >= itemCount) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Question and clip positions must reference the current session",
        path: [path, index],
      });
    }
    const key = `${value.questionPosition}:${value.clipItemPosition}`;
    if (seen.has(key)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Question and clip position pairs must be unique",
        path: [path, index],
      });
    }
    seen.add(key);
  });
}

/** Strict evidence for written Thai questions with English audio answer attempts. */
export const readToSelectAudioEvidenceSchema = z
  .object({
    schemaVersion: z.literal(1),
    declaredModality: z.literal("read-to-select-audio"),
    effectiveModality: z.literal("read-to-select-audio"),
    promptLocale: z.literal("th-TH"),
    answerLocale: z.literal("en-US"),
    promptField: z.literal("translation"),
    answerField: z.literal("term"),
    itemCount: z.number().int().min(1).max(MAX_LISTENING_SESSION_ITEMS),
    questions: z.array(answerAudioQuestionEvidenceSchema).max(MAX_LISTENING_SESSION_ITEMS),
    replayCounts: z.array(answerAudioReplayCountSchema).max(MAX_ANSWER_AUDIO_EVIDENCE_PAIRS),
    audioFailures: z.array(answerAudioFailureSchema).max(MAX_ANSWER_AUDIO_EVIDENCE_PAIRS),
  })
  .strict()
  .superRefine((evidence, context) => {
    const questionPositions = new Set<number>();
    let totalSelectionAttempts = 0;
    evidence.questions.forEach((question, questionIndex) => {
      if (question.questionPosition >= evidence.itemCount || question.promptItemPosition >= evidence.itemCount) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Question positions must reference the current session",
          path: ["questions", questionIndex],
        });
      }
      if (question.promptItemPosition !== question.questionPosition) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Prompt position must match the question position",
          path: ["questions", questionIndex, "promptItemPosition"],
        });
      }
      if (questionPositions.has(question.questionPosition)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Question positions must be unique",
          path: ["questions", questionIndex, "questionPosition"],
        });
      }
      questionPositions.add(question.questionPosition);

      let questionCompleted = false;
      totalSelectionAttempts += question.selectionAttempts.length;
      question.selectionAttempts.forEach((attempt, attemptOffset) => {
        if (attempt.clipItemPosition >= evidence.itemCount) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Clip position must reference the current session",
            path: ["questions", questionIndex, "selectionAttempts", attemptOffset, "clipItemPosition"],
          });
        }
        if (attempt.attemptIndex !== attemptOffset) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Attempt indexes must follow playback order",
            path: ["questions", questionIndex, "selectionAttempts", attemptOffset, "attemptIndex"],
          });
        }
        if (questionCompleted) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: "A completed question cannot contain later attempts",
            path: ["questions", questionIndex, "selectionAttempts", attemptOffset],
          });
        }
        if (attempt.submitted && attempt.playbackResult !== "completed") {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: "A submitted answer requires completed playback",
            path: ["questions", questionIndex, "selectionAttempts", attemptOffset, "submitted"],
          });
        }
        const completesQuestion = attempt.submitted
          && attempt.playbackResult === "completed"
          && attempt.clipItemPosition === question.promptItemPosition;
        if (attempt.completedQuestion !== completesQuestion) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Question completion must identify the submitted matching clip",
            path: ["questions", questionIndex, "selectionAttempts", attemptOffset, "completedQuestion"],
          });
        }
        if (attempt.completedQuestion) questionCompleted = true;
      });
    });
    if (totalSelectionAttempts > MAX_ANSWER_AUDIO_EVIDENCE_PAIRS) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Selection attempt evidence exceeds the session limit",
        path: ["questions"],
      });
    }
    addQuestionClipPairIssues(evidence.replayCounts, evidence.itemCount, "replayCounts", context);
    addQuestionClipPairIssues(evidence.audioFailures, evidence.itemCount, "audioFailures", context);
  });

/** Accepted learning evidence for existing and answer-audio sessions. */
export const learningEvidenceSchema = z.union([
  listeningEvidenceSchema,
  readToSelectAudioEvidenceSchema,
]);

/** Completion metadata that validates the reserved listening evidence key. */
export const completionMetadataSchema = z
  .record(z.string(), z.unknown())
  .superRefine((metadata, context) => {
    if (!Object.prototype.hasOwnProperty.call(metadata, "learningEvidence")) return;
    const parsed = learningEvidenceSchema.safeParse(metadata.learningEvidence);
    if (!parsed.success) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Completion learning evidence is invalid",
        path: ["learningEvidence"],
      });
    }
  });

/** Explicit configuration for one Listen to Select session. */
export type ListeningSessionConfig = z.infer<typeof listeningSessionConfigSchema>;

/** Configuration for written Thai prompts with English audio answers. */
export type ReadToSelectAudioSessionConfig = z.infer<typeof readToSelectAudioSessionConfigSchema>;

/** Host-owned completion evidence for one listening session. */
export type ListeningEvidence = z.infer<typeof listeningEvidenceSchema>;

/** Evidence for written Thai questions with English audio answer attempts. */
export type ReadToSelectAudioEvidence = z.infer<typeof readToSelectAudioEvidenceSchema>;

/** Existing or answer-audio learning evidence accepted by completion metadata. */
export type LearningEvidence = z.infer<typeof learningEvidenceSchema>;

/** Counts derived from validated answer-audio evidence. */
export type ReadToSelectAudioCompletionCounts = {
  readonly correctAnswers: number;
  readonly totalAttempts: number;
};

/**
 * Derives authoritative completion counts from valid answer-audio evidence.
 * @param evidence Untrusted learning evidence from completion metadata.
 * @returns Submitted and completed counts, or undefined for another modality or invalid evidence.
 */
export function getReadToSelectAudioCompletionCounts(
  evidence: unknown,
): ReadToSelectAudioCompletionCounts | undefined {
  const parsed = readToSelectAudioEvidenceSchema.safeParse(evidence);
  if (!parsed.success) return undefined;
  const attempts = parsed.data.questions.flatMap(({ selectionAttempts }) =>
    selectionAttempts).filter(({ submitted }) => submitted);
  return {
    correctAnswers: attempts.filter(({ completedQuestion }) => completedQuestion).length,
    totalAttempts: attempts.length,
  };
}

/** One prepared speech clip aligned with the current content array. */
export type PreparedSpeechClip = z.infer<typeof preparedSpeechClipSchema>;

/** Complete prepared speech references for one session. */
export type PreparedSpeech = z.infer<typeof preparedSpeechSchema>;

/** Strict authenticated response for Wizard vocabulary listening. */
export type PreparedListeningVocabularyResponse = z.infer<
  typeof preparedListeningVocabularyResponseSchema
>;

/** Strict authenticated response for written Thai prompts and English answer audio. */
export type PreparedReadToSelectAudioVocabularyResponse = z.infer<
  typeof preparedReadToSelectAudioVocabularyResponseSchema
>;

/** Legacy-compatible completion metadata with reserved evidence validation. */
export type CompletionMetadata = z.infer<typeof completionMetadataSchema>;
