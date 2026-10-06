import { describe, expect, it } from "vitest";

import type { PlayableGame } from "../catalog";
import { offersAnswerAudio } from "../answer-audio";

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
