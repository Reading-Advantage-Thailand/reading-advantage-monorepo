import { describe, expect, it } from "vitest";
import { consumedVoiceSeconds, voiceMonthKey } from "../time.js";
import { DEFAULT_VOICE_CONFIG, voiceConfigFromEnv } from "../config.js";

describe("voice budget month", () => {
  it("rolls over on the first of the month in Asia/Bangkok, not UTC", () => {
    expect(voiceMonthKey(new Date("2026-10-31T16:59:59.000Z"))).toBe("2026-10");
    expect(voiceMonthKey(new Date("2026-10-31T17:00:00.000Z"))).toBe("2026-11");
    expect(voiceMonthKey(new Date("2026-12-31T17:00:00.000Z"))).toBe("2027-01");
  });
});

describe("voice session usage", () => {
  const start = new Date("2026-09-28T00:00:00.000Z");

  it("charges connected elapsed time, rounded up to a second", () => {
    expect(consumedVoiceSeconds(start, new Date("2026-09-28T00:00:12.250Z"), 180)).toBe(13);
  });

  it("does not charge a pending call or more than the reservation", () => {
    expect(consumedVoiceSeconds(null, new Date("2026-09-28T00:00:12.250Z"), 180)).toBe(0);
    expect(consumedVoiceSeconds(start, new Date("2026-09-28T00:20:00.000Z"), 180)).toBe(180);
  });

  it("never charges negative time", () => {
    expect(consumedVoiceSeconds(start, new Date("2026-09-27T23:59:59.000Z"), 180)).toBe(0);
  });
});

describe("voice config", () => {
  it("is live by default with the spec limits and turns off only on an explicit false", () => {
    expect(voiceConfigFromEnv({})).toEqual(DEFAULT_VOICE_CONFIG);
    expect(voiceConfigFromEnv({ AI_VOICE_ENABLED: "false" }).enabled).toBe(false);
    expect(voiceConfigFromEnv({ AI_VOICE_ENABLED: "true" }).enabled).toBe(true);
  });

  it("reads the limits and rates and ignores bad values", () => {
    const config = voiceConfigFromEnv({ AI_VOICE_MONTH_BUDGET_SECONDS: "600", AI_VOICE_SESSION_CAP_SECONDS: "-5", AI_VOICE_THB_PER_USD: "35.5", AI_VOICE_MODEL: " gpt-realtime-2.1 " });
    expect(config.monthBudgetSeconds).toBe(600);
    expect(config.sessionCapSeconds).toBe(180);
    expect(config.thbPerUsd).toBe(35.5);
    expect(config.model).toBe("gpt-realtime-2.1");
  });
});
