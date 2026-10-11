import { afterEach, describe, expect, it, vi } from "vitest";

import type { PlayableGame } from "../catalog";
import { answerAudioControllerOf, offersAnswerAudio } from "../answer-audio";

const manifest = (challenge?: { modalities: string[] }) =>
  ({ manifest: challenge ? { challenge: { version: "2026-10-06.1", inputMode: "vocabulary", ...challenge } } : {} }) as unknown as Pick<PlayableGame, "manifest">;

describe("offersAnswerAudio", () => {
  it("offers the mode when the manifest lists the answer audio modality", () => {
    expect(offersAnswerAudio(manifest({ modalities: ["reading", "read-to-select-audio"] }))).toBe(true);
  });

  it("offers no mode for a reading-only game or a game without a challenge capability", () => {
    expect(offersAnswerAudio(manifest({ modalities: ["reading"] }))).toBe(false);
    expect(offersAnswerAudio(manifest())).toBe(false);
  });
});

describe("answerAudioControllerOf", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("plays each word's segment of the article's word audio", async () => {
    const elements: { currentTime: number }[] = [];
    vi.stubGlobal("Audio", class {
      preload = "";
      src = "";
      currentTime = 0;
      private readonly listeners = new Map<string, () => void>();
      constructor() { elements.push(this); }
      addEventListener(name: string, listener: () => void) { this.listeners.set(name, listener); }
      removeEventListener(name: string) { this.listeners.delete(name); }
      load() { this.listeners.get("canplay")?.(); }
      async play() { this.listeners.get("ended")?.(); }
      pause() {}
      removeAttribute() {}
    });
    const url = "https://storage.example/audios/words/article.mp3";
    const controller = answerAudioControllerOf({
      mode: "vocabulary",
      source: "student-flashcards",
      requestedTargetLocale: "th",
      selectedTargetLocales: ["th", "th"],
      content: [{ term: "river", translation: "แม่น้ำ" }, { term: "lantern", translation: "โคมไฟ" }],
      answerAudioSession: { modality: "read-to-select-audio", promptLocale: "th-TH", answerLocale: "en-US", promptField: "translation", answerField: "term", scored: true },
      preparedAnswerAudio: {
        clips: [
          { itemPosition: 0, url, mediaType: "audio/mpeg", sourceLocale: "en-US", startSeconds: 0.5, endSeconds: 1.4 },
          { itemPosition: 1, url, mediaType: "audio/mpeg", sourceLocale: "en-US", startSeconds: 1.4, endSeconds: 2.2 },
        ],
      },
    });

    await controller.playChoice(0, 1);

    expect(elements).toHaveLength(1);
    expect(elements[0]!.currentTime).toBe(1.4);
    controller.destroy();
  });
});
