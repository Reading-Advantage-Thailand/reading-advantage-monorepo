import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import {
  GameSpeechPreparationError,
  createConfiguredSpeechObjectResolver,
  createStoredSpeechClipLookup,
  preparedGameAnswerAudioLearningContentResultSchema,
  preparedGameLearningContentResultSchema,
  prepareGameAnswerAudio,
  prepareGameSpeech,
} from "../games/speech-preparation.js";

const assertCan = vi.hoisted(() => vi.fn());

vi.mock("@reading-advantage/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@reading-advantage/auth")>()),
  assertCan,
}));

const user = {
  id: "student-1", username: "student1", name: "Student", role: "STUDENT" as const,
  schoolId: "school-1", xp: 0, level: 1, cefrLevel: "A1",
};
const tenant = { schoolId: "school-1" };
const session = {
  modality: "listen-to-select", sourceLocale: "en-US", targetLocale: "th",
  scored: true, targetLocaleFallback: "reject",
} as const;
const content = [{ term: "river", translation: "แม่น้ำ" }] as const;
const answerAudioSession = {
  modality: "read-to-select-audio",
  promptLocale: "th-TH",
  answerLocale: "en-US",
  promptField: "translation",
  answerField: "term",
  scored: true,
} as const;

describe("prepareGameSpeech", () => {
  beforeEach(() => assertCan.mockClear());

  it("returns an aligned prepared clip for the exact student term", async () => {
    const lookup = { find: vi.fn().mockResolvedValue({
      url: "https://cdn.example/river.mp3", mediaType: "audio/mpeg", sourceLocale: "en-US",
    }) };

    const result = await prepareGameSpeech({
      user, tenant, session, content, lookup, preparationTimeoutMs: 1_000,
    });

    expect(result).toEqual({ clips: [{
      itemPosition: 0, url: "https://cdn.example/river.mp3",
      mediaType: "audio/mpeg", sourceLocale: "en-US",
    }] });
    expect(lookup.find).toHaveBeenCalledWith(expect.objectContaining({
      itemPosition: 0, text: "river", sourceLocale: "en-US",
      userId: user.id, schoolId: tenant.schoolId,
    }));
    expect(assertCan).toHaveBeenCalledWith(user, "games:read:own", tenant);
  });

  it("rejects missing prepared audio without a reading fallback", async () => {
    await expect(prepareGameSpeech({
      user, tenant, session, content, lookup: { find: vi.fn().mockResolvedValue(undefined) },
      preparationTimeoutMs: 1_000,
    })).rejects.toMatchObject({ code: "missing-audio", itemPosition: 0 });
  });

  it("rejects a prepared clip with the wrong source locale", async () => {
    await expect(prepareGameSpeech({
      user, tenant, session, content,
      lookup: { find: vi.fn().mockResolvedValue({
        url: "https://cdn.example/river.mp3", mediaType: "audio/mpeg", sourceLocale: "th",
      }) },
      preparationTimeoutMs: 1_000,
    })).rejects.toMatchObject({ code: "locale-mismatch", itemPosition: 0 });
  });

  it("stops stale preparation after cancellation", async () => {
    let resolveLookup: ((value: { url: string; mediaType: "audio/mpeg"; sourceLocale: "en-US" }) => void) | undefined;
    const abort = new AbortController();
    const preparation = prepareGameSpeech({
      user, tenant, session, content,
      lookup: { find: vi.fn(() => new Promise((resolve) => { resolveLookup = resolve; })) },
      preparationTimeoutMs: 1_000,
      signal: abort.signal,
    });
    abort.abort();
    resolveLookup?.({ url: "https://cdn.example/river.mp3", mediaType: "audio/mpeg", sourceLocale: "en-US" });

    await expect(preparation).rejects.toMatchObject({ code: "stale-preparation" });
  });

  it("does not call storage when authorization fails", async () => {
    assertCan.mockImplementationOnce(() => { throw new Error("forbidden"); });
    const storage = { exists: vi.fn(), getSignedUrl: vi.fn() };
    const lookup = createStoredSpeechClipLookup({
      storage,
      resolveObject: () => ({ key: "speech/river.mp3", sourceLocale: "en-US", mediaType: "audio/mpeg" }),
    });

    await expect(prepareGameSpeech({
      user, tenant, session, content, lookup, preparationTimeoutMs: 1_000,
    })).rejects.toThrow("forbidden");
    expect(storage.exists).not.toHaveBeenCalled();
  });

  it("returns undefined when configured storage has no prepared object", async () => {
    const storage = { exists: vi.fn().mockResolvedValue(false), getSignedUrl: vi.fn() };
    const lookup = createStoredSpeechClipLookup({
      storage,
      resolveObject: () => ({ key: "speech/river.mp3", sourceLocale: "en-US", mediaType: "audio/mpeg" }),
    });

    await expect(lookup.find({
      itemPosition: 0, text: "river", sourceLocale: "en-US", userId: user.id,
      schoolId: tenant.schoolId, signal: new AbortController().signal,
    })).resolves.toBeUndefined();
    expect(storage.getSignedUrl).not.toHaveBeenCalled();
  });

  it("keeps duplicate terms aligned by item position", async () => {
    const duplicateContent = [content[0], content[0]] as const;
    const lookup = { find: vi.fn(async ({ itemPosition }: { itemPosition: number }) => ({
      url: `https://cdn.example/river-${itemPosition}.mp3`,
      mediaType: "audio/mpeg" as const,
      sourceLocale: "en-US",
    })) };

    const result = await prepareGameSpeech({
      user, tenant, session, content: duplicateContent, lookup, preparationTimeoutMs: 1_000,
    });

    expect(result.clips.map(({ itemPosition, url }) => ({ itemPosition, url }))).toEqual([
      { itemPosition: 0, url: "https://cdn.example/river-0.mp3" },
      { itemPosition: 1, url: "https://cdn.example/river-1.mp3" },
    ]);
  });

  it("rejects a non-HTTP prepared clip URL", async () => {
    await expect(prepareGameSpeech({
      user, tenant, session, content,
      lookup: { find: vi.fn().mockResolvedValue({
        url: "file:///tmp/river.mp3", mediaType: "audio/mpeg", sourceLocale: "en-US",
      }) },
      preparationTimeoutMs: 1_000,
    })).rejects.toThrow("Prepared speech URL must use HTTP or HTTPS");
  });

  it("rejects a malformed prepared clip URL without throwing from validation", async () => {
    await expect(prepareGameSpeech({
      user, tenant, session, content,
      lookup: { find: vi.fn().mockResolvedValue({
        url: "not a URL", mediaType: "audio/mpeg", sourceLocale: "en-US",
      }) },
      preparationTimeoutMs: 1_000,
    })).rejects.toBeInstanceOf(z.ZodError);
  });

  it("reports a bounded lookup timeout", async () => {
    await expect(prepareGameSpeech({
      user, tenant, session, content,
      lookup: { find: vi.fn(() => new Promise(() => undefined)) },
      preparationTimeoutMs: 100,
    })).rejects.toMatchObject({ code: "preparation-timeout", itemPosition: 0 });
  });

  it("uses one preparation deadline across multiple content items", async () => {
    vi.useFakeTimers();
    try {
      const lookup = { find: vi.fn(({ itemPosition }: { itemPosition: number }) => (
        itemPosition === 0
          ? new Promise((resolve) => setTimeout(() => resolve({
            url: "https://cdn.example/river.mp3",
            mediaType: "audio/mpeg",
            sourceLocale: "en-US",
          }), 80))
          : new Promise(() => undefined)
      )) };
      const preparation = prepareGameSpeech({
        user,
        tenant,
        session,
        content: [content[0], { term: "hill", translation: "เนินเขา" }],
        lookup,
        preparationTimeoutMs: 100,
      });
      const assertion = expect(preparation).rejects.toMatchObject({
        code: "preparation-timeout",
        itemPosition: 1,
      });

      await vi.advanceTimersByTimeAsync(101);
      await assertion;
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not probe storage for a configured locale mismatch", async () => {
    const storage = { exists: vi.fn(), getSignedUrl: vi.fn() };
    const lookup = createStoredSpeechClipLookup({
      storage,
      resolveObject: () => ({ key: "speech/river.mp3", sourceLocale: "en-GB", mediaType: "audio/mpeg" }),
    });

    await expect(lookup.find({
      itemPosition: 0, text: "river", sourceLocale: "en-US", userId: user.id,
      schoolId: tenant.schoolId, signal: new AbortController().signal,
    })).resolves.toBeUndefined();
    expect(storage.exists).not.toHaveBeenCalled();
  });
});

describe("prepareGameAnswerAudio", () => {
  beforeEach(() => assertCan.mockClear());

  it("resolves English term clips without changing educational content", async () => {
    const lookup = { find: vi.fn().mockResolvedValue({
      url: "https://cdn.example/river.mp3", mediaType: "audio/mpeg", sourceLocale: "en-US",
    }) };

    await expect(prepareGameAnswerAudio({
      user,
      tenant,
      session: answerAudioSession,
      content,
      lookup,
      preparationTimeoutMs: 1_000,
    })).resolves.toEqual({ clips: [{
      itemPosition: 0,
      url: "https://cdn.example/river.mp3",
      mediaType: "audio/mpeg",
      sourceLocale: "en-US",
    }] });
    expect(lookup.find).toHaveBeenCalledWith(expect.objectContaining({
      itemPosition: 0,
      text: "river",
      sourceLocale: "en-US",
    }));
    expect(content).toEqual([{ term: "river", translation: "แม่น้ำ" }]);
  });

  it("rejects an altered direction before lookup", async () => {
    const lookup = { find: vi.fn() };

    await expect(prepareGameAnswerAudio({
      user,
      tenant,
      session: { ...answerAudioSession, answerLocale: "th-TH" } as never,
      content,
      lookup,
      preparationTimeoutMs: 1_000,
    })).rejects.toBeInstanceOf(z.ZodError);
    expect(lookup.find).not.toHaveBeenCalled();
  });
});

describe("GameSpeechPreparationError", () => {
  it("keeps its stable code", () => {
    expect(new GameSpeechPreparationError("missing-audio", "missing", 0)).toMatchObject({
      code: "missing-audio", itemPosition: 0,
    });
  });
});

describe("createConfiguredSpeechObjectResolver", () => {
  it("matches only an exact prepared term and locale", () => {
    const resolve = createConfiguredSpeechObjectResolver(JSON.stringify({
      schemaVersion: 1,
      clips: [{
        text: "river", sourceLocale: "en-US", key: "apk/speech/en-US/river.mp3",
        mediaType: "audio/mpeg",
      }],
    }));
    const request = {
      itemPosition: 0, text: "river", sourceLocale: "en-US",
      userId: user.id, schoolId: tenant.schoolId,
    };

    expect(resolve(request)).toEqual({
      key: "apk/speech/en-US/river.mp3", sourceLocale: "en-US", mediaType: "audio/mpeg",
    });
    expect(resolve({ ...request, text: "River" })).toBeUndefined();
    expect(resolve({ ...request, sourceLocale: "en-GB" })).toBeUndefined();
  });

  it.each([
    ["malformed JSON", "{"],
    ["duplicate term and locale", JSON.stringify({
      schemaVersion: 1,
      clips: [
        { text: "river", sourceLocale: "en-US", key: "one.mp3", mediaType: "audio/mpeg" },
        { text: "river", sourceLocale: "en-US", key: "two.mp3", mediaType: "audio/mpeg" },
      ],
    })],
    ["non-audio media type", JSON.stringify({
      schemaVersion: 1,
      clips: [{ text: "river", sourceLocale: "en-US", key: "river.mp3", mediaType: "text/plain" }],
    })],
  ])("rejects %s", (_label, manifest) => {
    expect(() => createConfiguredSpeechObjectResolver(manifest)).toThrow(
      expect.objectContaining({ code: "invalid-configuration" }),
    );
  });
});

describe("preparedGameLearningContentResultSchema", () => {
  const response = {
    mode: "vocabulary" as const,
    source: "student-flashcards" as const,
    requestedTargetLocale: "th" as const,
    selectedTargetLocales: ["th" as const],
    content,
    listeningSession: session,
    preparedSpeech: { clips: [{
      itemPosition: 0,
      url: "https://cdn.example/river.mp3",
      mediaType: "audio/mpeg" as const,
      sourceLocale: "en-US",
    }] },
  };

  it("accepts complete indexed listening content", () => {
    expect(preparedGameLearningContentResultSchema.safeParse(response).success).toBe(true);
  });

  it("rejects missing clip positions", () => {
    expect(preparedGameLearningContentResultSchema.safeParse({
      ...response,
      content: [...content, { term: "hill", translation: "เนินเขา" }],
      selectedTargetLocales: ["th", "th"],
    }).success).toBe(false);
  });

  it("rejects misaligned clip positions", () => {
    expect(preparedGameLearningContentResultSchema.safeParse({
      ...response,
      preparedSpeech: { clips: [{ ...response.preparedSpeech.clips[0], itemPosition: 1 }] },
    }).success).toBe(false);
  });

  it("rejects a clip locale that differs from the session", () => {
    expect(preparedGameLearningContentResultSchema.safeParse({
      ...response,
      preparedSpeech: { clips: [{ ...response.preparedSpeech.clips[0], sourceLocale: "en-GB" }] },
    }).success).toBe(false);
  });

  it("accepts the distinct answer-audio response", () => {
    const answerAudioResponse = {
      mode: "vocabulary",
      source: "student-flashcards",
      requestedTargetLocale: "th",
      selectedTargetLocales: ["th"],
      content,
      answerAudioSession,
      preparedAnswerAudio: response.preparedSpeech,
    };

    expect(preparedGameAnswerAudioLearningContentResultSchema.safeParse(answerAudioResponse).success)
      .toBe(true);
    expect(preparedGameLearningContentResultSchema.safeParse(answerAudioResponse).success).toBe(true);
  });
});
