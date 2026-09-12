import { describe, expect, it, vi } from "vitest";

import {
  createFfmpegSpeechAudioValidator,
  createMmxSpeechProvider,
} from "./mmx-speech-provider.js";

describe("createMmxSpeechProvider", () => {
  it("passes fixed reviewed settings as argv without a shell", async () => {
    const run = vi.fn().mockResolvedValue(undefined);
    const provider = createMmxSpeechProvider({ run });

    await provider.synthesize({
      text: "river; echo unsafe",
      outputPath: "/review/000-river.mp3.partial",
      voice: "English_expressive_narrator",
      model: "speech-2.8-hd",
      speed: 0.9,
      language: "English",
      format: "mp3",
    });

    expect(run).toHaveBeenCalledWith("mmx", [
      "--quiet",
      "--output", "json",
      "speech", "synthesize",
      "--text", "river; echo unsafe",
      "--out", "/review/000-river.mp3.partial",
      "--voice", "English_expressive_narrator",
      "--model", "speech-2.8-hd",
      "--speed", "0.9",
      "--language", "English",
      "--format", "mp3",
    ], { shell: false, timeoutMs: 90_000 });
  });

  it("propagates a provider process failure", async () => {
    const run = vi.fn().mockRejectedValue(new Error("process failed"));
    const provider = createMmxSpeechProvider({ run });

    await expect(provider.synthesize({
      text: "river",
      outputPath: "/review/000-river.mp3.partial",
      voice: "English_expressive_narrator",
      model: "speech-2.8-hd",
      speed: 0.9,
      language: "English",
      format: "mp3",
    })).rejects.toThrow("MMX speech generation failed");
  });
});

describe("createFfmpegSpeechAudioValidator", () => {
  it("decodes one audio frame through argv without a shell", async () => {
    const run = vi.fn().mockResolvedValue(Uint8Array.from([1, 2]));
    const validator = createFfmpegSpeechAudioValidator({ run });

    await expect(validator.validate("/review/clip;unsafe.mp3.partial")).resolves.toBe(true);
    expect(run).toHaveBeenCalledWith("ffmpeg", [
      "-v", "error",
      "-xerror",
      "-i", "/review/clip;unsafe.mp3.partial",
      "-map", "0:a:0",
      "-frames:a", "1",
      "-f", "s16le",
      "-acodec", "pcm_s16le",
      "-",
    ], { shell: false, timeoutMs: 10_000 });
  });

  it("rejects decoder errors and empty decoded output", async () => {
    const failed = createFfmpegSpeechAudioValidator({
      run: vi.fn().mockRejectedValue(new Error("invalid data")),
    });
    const empty = createFfmpegSpeechAudioValidator({
      run: vi.fn().mockResolvedValue(new Uint8Array()),
    });

    await expect(failed.validate("/review/fake.mp3")).resolves.toBe(false);
    await expect(empty.validate("/review/empty.mp3")).resolves.toBe(false);
  });

  it("reports a missing decoder explicitly", async () => {
    const missing = Object.assign(new Error("missing"), { code: "ENOENT" });
    const validator = createFfmpegSpeechAudioValidator({
      run: vi.fn().mockRejectedValue(missing),
    });

    await expect(validator.validate("/review/clip.mp3"))
      .rejects.toThrow("FFmpeg is required to validate prepared speech audio");
  });
});
