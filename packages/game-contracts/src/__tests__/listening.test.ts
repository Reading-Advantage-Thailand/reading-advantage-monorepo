import { describe, expect, it } from "vitest";

import {
  MAX_ANSWER_AUDIO_EVIDENCE_PAIRS,
  completionMetadataSchema,
  gameCompletionInputSchema,
  gameResultsSchema,
  learningEvidenceSchema,
  listeningEvidenceSchema,
  listeningSessionConfigSchema,
  preparedListeningVocabularyResponseSchema,
  preparedReadToSelectAudioVocabularyResponseSchema,
  readToSelectAudioEvidenceSchema,
  readToSelectAudioSessionConfigSchema,
  vocabularyInputSchema,
} from "../index.js";

const session = {
  modality: "listen-to-select",
  sourceLocale: "en-US",
  targetLocale: "th",
  scored: true,
  targetLocaleFallback: "reject",
} as const;

const evidence = {
  schemaVersion: 1,
  declaredModality: "listen-to-select",
  effectiveModality: "listen-to-select",
  sourceLocale: "en-US",
  targetLocale: "th",
  itemCount: 3,
  assistedItemPositions: [1],
  fallbackItemPositions: [],
  replayCounts: [{ itemPosition: 1, count: 2 }],
  audioFailures: [{ itemPosition: 2, code: "playback-failed" }],
} as const;

const answerAudioSession = {
  modality: "read-to-select-audio",
  promptLocale: "th-TH",
  answerLocale: "en-US",
  promptField: "translation",
  answerField: "term",
  scored: true,
} as const;

const answerAudioEvidence = {
  schemaVersion: 1,
  declaredModality: "read-to-select-audio",
  effectiveModality: "read-to-select-audio",
  promptLocale: "th-TH",
  answerLocale: "en-US",
  promptField: "translation",
  answerField: "term",
  itemCount: 3,
  questions: [{
    questionPosition: 0,
    promptItemPosition: 0,
    selectionAttempts: [
      {
        attemptIndex: 0,
        clipItemPosition: 1,
        playbackResult: "completed",
        submitted: true,
        completedQuestion: false,
      },
      {
        attemptIndex: 1,
        clipItemPosition: 0,
        playbackResult: "completed",
        submitted: true,
        completedQuestion: true,
      },
    ],
  }],
  replayCounts: [{ questionPosition: 0, clipItemPosition: 1, count: 1 }],
  audioFailures: [{ questionPosition: 0, clipItemPosition: 2, code: "playback-failed" }],
} as const;

describe("listening session configuration", () => {
  it("accepts an explicit scored Listen to Select session", () => {
    expect(listeningSessionConfigSchema.parse(session)).toEqual(session);
  });

  it("requires scored sessions to reject target-locale fallback", () => {
    expect(
      listeningSessionConfigSchema.safeParse({
        ...session,
        targetLocaleFallback: "allow-explicit",
      }).success,
    ).toBe(false);
  });

  it.each([
    ["missing source locale", { ...session, sourceLocale: undefined }],
    ["invalid source locale", { ...session, sourceLocale: "english" }],
    ["unknown field", { ...session, provider: "google" }],
  ])("rejects %s", (_label, candidate) => {
    expect(listeningSessionConfigSchema.safeParse(candidate).success).toBe(false);
  });
});

describe("host-owned listening evidence", () => {
  it("accepts bounded item-position evidence", () => {
    expect(listeningEvidenceSchema.parse(evidence)).toEqual(evidence);
  });

  it.each([
    ["out-of-range assistance", { ...evidence, assistedItemPositions: [3] }],
    ["duplicate assistance", { ...evidence, assistedItemPositions: [1, 1] }],
    [
      "duplicate replay entry",
      {
        ...evidence,
        replayCounts: [
          { itemPosition: 1, count: 1 },
          { itemPosition: 1, count: 2 },
        ],
      },
    ],
    ["unknown field", { ...evidence, transcript: "dragon" }],
  ])("rejects %s", (_label, candidate) => {
    expect(listeningEvidenceSchema.safeParse(candidate).success).toBe(false);
  });

  it("requires reading mode when fallback positions exist", () => {
    expect(
      listeningEvidenceSchema.safeParse({
        ...evidence,
        fallbackItemPositions: [2],
      }).success,
    ).toBe(false);
    expect(
      listeningEvidenceSchema.safeParse({
        ...evidence,
        effectiveModality: "reading-fallback",
        fallbackItemPositions: [2],
      }).success,
    ).toBe(true);
  });
});

describe("Read to Select Audio contracts", () => {
  it("accepts the fixed Thai prompt and English answer configuration", () => {
    expect(readToSelectAudioSessionConfigSchema.parse(answerAudioSession)).toEqual(answerAudioSession);
  });

  it("records ordered wrong and correct submissions for one question", () => {
    expect(readToSelectAudioEvidenceSchema.parse(answerAudioEvidence)).toEqual(answerAudioEvidence);
    expect(learningEvidenceSchema.parse(answerAudioEvidence)).toEqual(answerAudioEvidence);
  });

  it.each([
    ["duplicate question", {
      ...answerAudioEvidence,
      questions: [answerAudioEvidence.questions[0], answerAudioEvidence.questions[0]],
    }],
    ["mismatched prompt position", {
      ...answerAudioEvidence,
      questions: [{ ...answerAudioEvidence.questions[0], promptItemPosition: 1 }],
    }],
    ["duplicate attempt index", {
      ...answerAudioEvidence,
      questions: [{
        ...answerAudioEvidence.questions[0],
        selectionAttempts: [
          answerAudioEvidence.questions[0].selectionAttempts[0],
          { ...answerAudioEvidence.questions[0].selectionAttempts[1], attemptIndex: 0 },
        ],
      }],
    }],
    ["out-of-range clip", {
      ...answerAudioEvidence,
      questions: [{
        ...answerAudioEvidence.questions[0],
        selectionAttempts: [{
          ...answerAudioEvidence.questions[0].selectionAttempts[0], clipItemPosition: 3,
        }],
      }],
    }],
    ["submitted failed playback", {
      ...answerAudioEvidence,
      questions: [{
        ...answerAudioEvidence.questions[0],
        selectionAttempts: [{
          ...answerAudioEvidence.questions[0].selectionAttempts[0], playbackResult: "failed",
        }],
      }],
    }],
    ["false matching completion", {
      ...answerAudioEvidence,
      questions: [{
        ...answerAudioEvidence.questions[0],
        selectionAttempts: [{
          ...answerAudioEvidence.questions[0].selectionAttempts[1], completedQuestion: false,
        }],
      }],
    }],
    ["duplicate replay pair", {
      ...answerAudioEvidence,
      replayCounts: [
        answerAudioEvidence.replayCounts[0],
        { ...answerAudioEvidence.replayCounts[0], count: 2 },
      ],
    }],
    ["out-of-range failure pair", {
      ...answerAudioEvidence,
      audioFailures: [{ ...answerAudioEvidence.audioFailures[0], questionPosition: 3 }],
    }],
    ["attempt after question completion", {
      ...answerAudioEvidence,
      questions: [{
        ...answerAudioEvidence.questions[0],
        selectionAttempts: [
          { ...answerAudioEvidence.questions[0].selectionAttempts[1], attemptIndex: 0 },
          { ...answerAudioEvidence.questions[0].selectionAttempts[0], attemptIndex: 1 },
        ],
      }],
    }],
  ])("rejects %s", (_label, candidate) => {
    expect(readToSelectAudioEvidenceSchema.safeParse(candidate).success).toBe(false);
  });

  it("accepts 200 distinct question and clip replay pairs", () => {
    const replayCounts = Array.from(
      { length: MAX_ANSWER_AUDIO_EVIDENCE_PAIRS },
      (_, index) => ({
        questionPosition: Math.floor(index / 4),
        clipItemPosition: index % 4,
        count: 1,
      }),
    );
    expect(readToSelectAudioEvidenceSchema.safeParse({
      ...answerAudioEvidence,
      itemCount: 50,
      replayCounts,
      audioFailures: [],
    }).success).toBe(true);
  });

  it("rejects more than 200 selection attempts across question records", () => {
    const questions = Array.from({ length: 5 }, (_, questionPosition) => ({
      questionPosition,
      promptItemPosition: questionPosition,
      selectionAttempts: Array.from({ length: 41 }, (_unused, attemptIndex) => ({
        attemptIndex,
        clipItemPosition: (questionPosition + 1) % 5,
        playbackResult: "completed" as const,
        submitted: false,
        completedQuestion: false,
      })),
    }));
    expect(readToSelectAudioEvidenceSchema.safeParse({
      ...answerAudioEvidence,
      itemCount: 5,
      questions,
      replayCounts: [],
      audioFailures: [],
    }).success).toBe(false);
  });

  it("checks answer counts against submitted and completed evidence", () => {
    const completion = {
      gameType: "wizard-vs-zombie",
      difficulty: "medium",
      score: 20,
      accuracy: 0.5,
      correctAnswers: 1,
      totalAttempts: 2,
      duration: 1_000,
      victory: false,
      idempotencyKey: "00000000-0000-4000-8000-000000000001",
      clientTimestamp: 1,
      metadata: { learningEvidence: answerAudioEvidence },
    } as const;

    expect(gameCompletionInputSchema.safeParse(completion).success).toBe(true);
    expect(gameCompletionInputSchema.safeParse({ ...completion, totalAttempts: 1 }).success).toBe(false);
    expect(gameCompletionInputSchema.safeParse({ ...completion, correctAnswers: 2 }).success).toBe(false);
  });
});

describe("completion metadata compatibility", () => {
  it("validates the reserved learningEvidence value", () => {
    expect(
      completionMetadataSchema.parse({
        contentSource: "student-flashcards",
        learningEvidence: evidence,
      }),
    ).toEqual({
      contentSource: "student-flashcards",
      learningEvidence: evidence,
    });
    expect(
      completionMetadataSchema.safeParse({
        learningEvidence: { ...evidence, itemCount: 0 },
      }).success,
    ).toBe(false);
    expect(completionMetadataSchema.safeParse({ learningEvidence: answerAudioEvidence }).success).toBe(true);
    expect(completionMetadataSchema.safeParse({
      learningEvidence: {
        ...answerAudioEvidence,
        questions: [{
          ...answerAudioEvidence.questions[0],
          selectionAttempts: [{
            ...answerAudioEvidence.questions[0].selectionAttempts[0],
            playbackResult: "failed",
          }],
        }],
      },
    }).success).toBe(false);
  });

  it("preserves unrelated legacy metadata", () => {
    const legacy = { edition: "primary-chibi", custom: { round: 2 } };
    expect(completionMetadataSchema.parse(legacy)).toEqual(legacy);
  });

  it("preserves the strict educational ABIs", () => {
    expect(
      vocabularyInputSchema.safeParse([
        { term: "dragon", translation: "มังกร", audioUrl: "/dragon.mp3" },
      ]).success,
    ).toBe(false);
    expect(
      gameResultsSchema.safeParse({
        accuracy: 1,
        xp: 2,
        score: 10,
        correctAnswers: 1,
        totalAttempts: 1,
        learningEvidence: evidence,
      }).success,
    ).toBe(false);
  });
});

describe("prepared listening vocabulary response", () => {
  const response = {
    mode: "vocabulary",
    source: "student-flashcards",
    requestedTargetLocale: "th",
    selectedTargetLocales: ["th", "th"],
    content: [
      { term: "river", translation: "แม่น้ำ" },
      { term: "river", translation: "ลำธาร" },
    ],
    listeningSession: session,
    preparedSpeech: {
      clips: [
        {
          itemPosition: 0,
          url: "https://cdn.example/river-0.mp3",
          mediaType: "audio/mpeg",
          sourceLocale: "en-US",
        },
        {
          itemPosition: 1,
          url: "https://cdn.example/river-1.mp3",
          mediaType: "audio/mpeg",
          sourceLocale: "en-US",
        },
      ],
    },
  } as const;

  it("accepts exact indexed clips beside the strict educational ABI", () => {
    expect(preparedListeningVocabularyResponseSchema.parse(response)).toEqual(response);
    expect(vocabularyInputSchema.parse(response.content)).toEqual(response.content);
  });

  it.each([
    ["missing clip", { ...response, preparedSpeech: { clips: response.preparedSpeech.clips.slice(0, 1) } }],
    ["duplicate index", {
      ...response,
      preparedSpeech: {
        clips: [response.preparedSpeech.clips[0], {
          ...response.preparedSpeech.clips[1], itemPosition: 0,
        }],
      },
    }],
    ["wrong source locale", {
      ...response,
      preparedSpeech: {
        clips: [response.preparedSpeech.clips[0], {
          ...response.preparedSpeech.clips[1], sourceLocale: "en-GB",
        }],
      },
    }],
    ["malformed clip URL", {
      ...response,
      preparedSpeech: {
        clips: [response.preparedSpeech.clips[0], {
          ...response.preparedSpeech.clips[1], url: "not a URL",
        }],
      },
    }],
    ["fallback target locale", { ...response, selectedTargetLocales: ["th", "en"] }],
    ["educational field expansion", {
      ...response,
      content: [{ ...response.content[0], audioUrl: "https://cdn.example/river.mp3" }, response.content[1]],
    }],
  ])("rejects %s", (_label, candidate) => {
    expect(preparedListeningVocabularyResponseSchema.safeParse(candidate).success).toBe(false);
  });
});

describe("prepared Read to Select Audio response", () => {
  const response = {
    mode: "vocabulary",
    source: "student-flashcards",
    requestedTargetLocale: "th",
    selectedTargetLocales: ["th", "th"],
    content: [
      { term: "river", translation: "แม่น้ำ" },
      { term: "bridge", translation: "สะพาน" },
    ],
    answerAudioSession,
    preparedAnswerAudio: {
      clips: [
        {
          itemPosition: 0,
          url: "https://cdn.example/river.mp3",
          mediaType: "audio/mpeg",
          sourceLocale: "en-US",
        },
        {
          itemPosition: 1,
          url: "https://cdn.example/bridge.mp3",
          mediaType: "audio/mpeg",
          sourceLocale: "en-US",
        },
      ],
    },
  } as const;

  it("accepts English clips aligned with written Thai targets", () => {
    expect(preparedReadToSelectAudioVocabularyResponseSchema.parse(response)).toEqual(response);
    expect(vocabularyInputSchema.parse(response.content)).toEqual(response.content);
  });

  it.each([
    ["missing answer clip", {
      ...response,
      preparedAnswerAudio: { clips: response.preparedAnswerAudio.clips.slice(0, 1) },
    }],
    ["misaligned answer clip", {
      ...response,
      preparedAnswerAudio: {
        clips: [response.preparedAnswerAudio.clips[0], {
          ...response.preparedAnswerAudio.clips[1], itemPosition: 0,
        }],
      },
    }],
    ["non-English answer clip", {
      ...response,
      preparedAnswerAudio: {
        clips: [response.preparedAnswerAudio.clips[0], {
          ...response.preparedAnswerAudio.clips[1], sourceLocale: "th-TH",
        }],
      },
    }],
    ["fallback Thai target", { ...response, selectedTargetLocales: ["th", "en"] }],
    ["expanded educational item", {
      ...response,
      content: [{ ...response.content[0], audioUrl: response.preparedAnswerAudio.clips[0].url }, response.content[1]],
    }],
  ])("rejects %s", (_label, candidate) => {
    expect(preparedReadToSelectAudioVocabularyResponseSchema.safeParse(candidate).success).toBe(false);
  });
});
