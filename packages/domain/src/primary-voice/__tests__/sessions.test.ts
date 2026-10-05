import { describe, expect, it } from "vitest";
import type { DB } from "@reading-advantage/db";
import type { UserContext } from "@reading-advantage/auth";
import { createMockDb } from "../../__tests__/mock-db.js";
import { DEFAULT_VOICE_CONFIG } from "../config.js";
import { MockVoiceProvider } from "../provider.js";
import { createVoiceRuntime } from "../runtime.js";
import { finalizeVoiceSession, getVoiceEntitlement, listStudentVoiceSessions, markVoiceSessionConnected, startVoiceSession } from "../sessions.js";

const SCHOOL = "11111111-1111-4111-8111-111111111111";
const ARTICLE = "22222222-2222-4222-8222-222222222222";
const SESSION = "33333333-3333-4333-8333-333333333333";
const student: UserContext = { id: "s1", username: "s1", name: "Ann", role: "STUDENT", schoolId: SCHOOL, xp: 0, level: 1, cefrLevel: "A1" };
const teacher: UserContext = { ...student, id: "t1", role: "TEACHER" };
const now = new Date("2026-10-05T03:00:00.000Z"); // 10:00 in Bangkok, October
const avatarRow = { userId: "s1" };
const sessionRow = (extra: Partial<Record<string, unknown>> = {}) => ({
  id: SESSION,
  schoolId: SCHOOL,
  studentUserId: "s1",
  articleId: ARTICLE,
  month: "2026-10",
  status: "ACTIVE",
  providerCallId: "call_1",
  reservedSeconds: 180,
  consumedSeconds: 0,
  startedAt: null,
  expiresAt: new Date(now.getTime() + 45_000),
  endedAt: null,
  endReason: null,
  summary: null,
  scores: null,
  providerUsage: { model: "gpt-realtime-2.1-mini" },
  createdAt: now,
  ...extra,
});
const lockRow = (session: Record<string, unknown>, expiresAt: Date) => ({ voiceSessionId: SESSION, expiresAt, session });

/** The select answers of an entitlement read: school settings, lock, month usage, avatar. */
const entitlementSelects = (overrides: { school?: unknown[]; lock?: unknown[]; usage?: unknown[]; avatar?: unknown[] } = {}) => [
  overrides.school ?? [],
  overrides.lock ?? [],
  overrides.usage ?? [],
  overrides.avatar ?? [avatarRow],
];
const db = (selects: unknown[][], extra: Parameters<typeof createMockDb>[0] = {}) => createMockDb({ selectSequence: selects, ...extra });
const runtime = () => createVoiceRuntime({ tickMs: 1, log: () => undefined });

describe("getVoiceEntitlement", () => {
  it("gives the full budget in a new month and the session cap", async () => {
    const result = await getVoiceEntitlement({ db: db(entitlementSelects()) as unknown as DB, user: student, now });
    expect(result).toMatchObject({ enabled: true, month: "2026-10", budgetSeconds: 480, usedSeconds: 0, remainingSeconds: 480, sessionCapSeconds: 180, activeSession: null, blockedBy: null });
  });

  it("subtracts the month's use and blocks at the limit (month rollover reads a new row)", async () => {
    const partly = await getVoiceEntitlement({ db: db(entitlementSelects({ usage: [{ secondsUsed: 300 }] })) as unknown as DB, user: student, now });
    expect(partly.remainingSeconds).toBe(180);
    expect(partly.blockedBy).toBeNull();
    const spent = await getVoiceEntitlement({ db: db(entitlementSelects({ usage: [{ secondsUsed: 480 }] })) as unknown as DB, user: student, now });
    expect(spent).toMatchObject({ remainingSeconds: 0, blockedBy: "QUOTA_EXHAUSTED" });
    const nextMonth = new Date("2026-10-31T17:30:00.000Z"); // 1 November, 00:30 in Bangkok
    const fresh = await getVoiceEntitlement({ db: db(entitlementSelects()) as unknown as DB, user: student, now: nextMonth });
    expect(fresh.month).toBe("2026-11");
    expect(fresh.remainingSeconds).toBe(480);
  });

  it("reports a live lock and reserves its seconds", async () => {
    const mock = db(entitlementSelects({ lock: [lockRow(sessionRow(), new Date(now.getTime() + 30_000))] }));
    const result = await getVoiceEntitlement({ db: mock as unknown as DB, user: student, now });
    expect(result.blockedBy).toBe("SESSION_ACTIVE");
    expect(result.activeSession).toEqual({ sessionId: SESSION, expiresAt: new Date(now.getTime() + 30_000).toISOString(), articleId: ARTICLE });
    expect(result.remainingSeconds).toBe(300);
    expect(mock.update).not.toHaveBeenCalled();
  });

  it("releases an expired lease: the session ends as LEASE_EXPIRED and the student may start", async () => {
    const mock = db(entitlementSelects({ lock: [lockRow(sessionRow(), new Date(now.getTime() - 1000))] }));
    const result = await getVoiceEntitlement({ db: mock as unknown as DB, user: student, now });
    expect(result.blockedBy).toBeNull();
    expect(result.activeSession).toBeNull();
    expect(mock.update).toHaveBeenCalledTimes(1);
    expect(mock.update.mock.results[0]!.value.set).toHaveBeenCalledWith(expect.objectContaining({ status: "ENDED", endReason: "LEASE_EXPIRED", consumedSeconds: 0 }));
    expect(mock.delete).toHaveBeenCalledTimes(1);
  });

  it("blocks a code-only sign-in, a missing avatar, the kill switch, and a disabled school in that order", async () => {
    const codeOnly = await getVoiceEntitlement({ db: db(entitlementSelects()) as unknown as DB, user: student, authStrength: "code_only", now });
    expect(codeOnly.blockedBy).toBe("AUTH_STRENGTH");
    const noAvatar = await getVoiceEntitlement({ db: db(entitlementSelects({ avatar: [] })) as unknown as DB, user: student, now });
    expect(noAvatar.blockedBy).toBe("NO_AVATAR");
    const off = await getVoiceEntitlement({ db: db(entitlementSelects()) as unknown as DB, user: student, now, config: { ...DEFAULT_VOICE_CONFIG, enabled: false } });
    expect(off).toMatchObject({ enabled: false, blockedBy: "DISABLED" });
    const school = await getVoiceEntitlement({ db: db(entitlementSelects({ school: [{ enabled: false }] })) as unknown as DB, user: student, now });
    expect(school).toMatchObject({ enabled: false, blockedBy: "SCHOOL_DISABLED" });
  });

  it("refuses staff", async () => {
    await expect(getVoiceEntitlement({ db: db([]) as unknown as DB, user: teacher, now })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("startVoiceSession", () => {
  const article = { title: "Pip the Curious Puppy", passage: "Pip is a puppy.", summary: null };
  const input = { articleId: ARTICLE, sdp: "v=0\r\noffer" };

  it("reserves the smaller of the cap and the remaining seconds, opens the call, and attaches the guard", async () => {
    const provider = new MockVoiceProvider();
    const rt = runtime();
    // entitlement (4), article, avatar class
    const mock = db([...entitlementSelects({ usage: [{ secondsUsed: 400 }] }), [article], [{ classPreset: "ranger" }]], { insertReturning: [{ id: SESSION }] });
    const result = await startVoiceSession({ db: mock as unknown as DB, user: student, now, provider, runtime: rt, input });
    expect(result).toEqual({ sessionId: SESSION, answerSdp: "v=0\r\nmock-answer", expiresAt: new Date(now.getTime() + 45_000).toISOString(), reservedSeconds: 80, remainingSeconds: 0 });
    const values = mock.insert.mock.results[0]!.value.values.mock.calls;
    expect(values[0]![0]).toMatchObject({ schoolId: SCHOOL, studentUserId: "s1", articleId: ARTICLE, month: "2026-10", status: "PENDING", reservedSeconds: 80 });
    expect(values[1]![0]).toMatchObject({ studentUserId: "s1", voiceSessionId: SESSION });
    expect(provider.calls[0]!.instructions).toContain("ranger");
    expect(provider.calls[0]!.instructions).toContain("Pip is a puppy.");
    expect(provider.calls[0]!.model).toBe("gpt-realtime-2.1-mini");
    expect(mock.update.mock.results[0]!.value.set).toHaveBeenCalledWith(expect.objectContaining({ status: "ACTIVE", providerCallId: "call_1" }));
    expect(rt.get(SESSION)).not.toBeNull();
    expect(rt.timers.has(SESSION)).toBe(true);
    rt.clearExpiry(SESSION);
    rt.release(SESSION);
  });

  it("refuses when blocked and never reserves", async () => {
    const provider = new MockVoiceProvider();
    const mock = db(entitlementSelects({ usage: [{ secondsUsed: 480 }] }));
    await expect(startVoiceSession({ db: mock as unknown as DB, user: student, now, provider, runtime: runtime(), input })).rejects.toMatchObject({ code: "QUOTA_EXHAUSTED", status: 409 });
    expect(mock.insert).not.toHaveBeenCalled();
    await expect(startVoiceSession({ db: db(entitlementSelects({ avatar: [] })) as unknown as DB, user: student, now, provider, runtime: runtime(), input })).rejects.toMatchObject({ code: "AVATAR_REQUIRED" });
    await expect(startVoiceSession({ db: db(entitlementSelects()) as unknown as DB, user: student, authStrength: "code_only", now, provider, runtime: runtime(), input })).rejects.toMatchObject({ code: "AUTH_STRENGTH", status: 403 });
    await expect(startVoiceSession({ db: db(entitlementSelects()) as unknown as DB, user: student, now, provider, runtime: runtime(), input: { ...input, sdp: "hello" } })).rejects.toThrow();
  });

  it("releases the reservation when the provider fails", async () => {
    const provider = new MockVoiceProvider();
    provider.failCalls = true;
    const mock = db([...entitlementSelects(), [article], []], { insertReturning: [{ id: SESSION }] });
    await expect(startVoiceSession({ db: mock as unknown as DB, user: student, now, provider, runtime: runtime(), input })).rejects.toMatchObject({ code: "VOICE_PROVIDER_UNAVAILABLE", status: 503 });
    expect(mock.update.mock.results[0]!.value.set).toHaveBeenCalledWith(expect.objectContaining({ status: "PROVIDER_FAILED", endReason: "PROVIDER_FAILED" }));
    expect(mock.delete).toHaveBeenCalledTimes(1);
  });

  it("maps a lock race to SESSION_ALREADY_ACTIVE", async () => {
    const mock = db(entitlementSelects(), { transactionFn: async () => Promise.reject(Object.assign(new Error("dup"), { code: "23505" })) });
    await expect(startVoiceSession({ db: mock as unknown as DB, user: student, now, provider: new MockVoiceProvider(), runtime: runtime(), input })).rejects.toMatchObject({ code: "SESSION_ALREADY_ACTIVE" });
  });
});

describe("markVoiceSessionConnected", () => {
  it("starts the clock of the reservation once and refuses another student", async () => {
    const rt = runtime();
    const mock = db([[sessionRow()]]);
    const result = await markVoiceSessionConnected({ db: mock as unknown as DB, user: student, now, sessionId: SESSION, provider: new MockVoiceProvider(), runtime: rt });
    expect(result.expiresAt).toBe(new Date(now.getTime() + 180_000).toISOString());
    expect(mock.update).toHaveBeenCalledTimes(2);
    expect(rt.timers.has(SESSION)).toBe(true);
    rt.clearExpiry(SESSION);
    const again = db([[sessionRow({ startedAt: now, expiresAt: new Date(now.getTime() + 180_000) })]]);
    await markVoiceSessionConnected({ db: again as unknown as DB, user: student, now, sessionId: SESSION, provider: new MockVoiceProvider(), runtime: rt });
    expect(again.update).not.toHaveBeenCalled();
    await expect(markVoiceSessionConnected({ db: db([[sessionRow({ studentUserId: "s2" })]]) as unknown as DB, user: student, now, sessionId: SESSION, provider: new MockVoiceProvider(), runtime: rt })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("finalizeVoiceSession", () => {
  const startedAt = new Date(now.getTime() - 100_000);
  const ended = (row: Record<string, unknown>) => ({ ...sessionRow(), ...row, status: "ENDED" });

  it("charges the connected seconds, prices the usage, records the summary, and adds the month", async () => {
    const provider = new MockVoiceProvider();
    const rt = runtime();
    rt.attach(SESSION, provider, "call_1", "Pip");
    const sideband = provider.sidebands.get("call_1")!;
    const usage = { input_token_details: { text_tokens: 1000, audio_tokens: 2000, image_tokens: 0, cached_tokens_details: { text_tokens: 0, audio_tokens: 0, image_tokens: 0 } }, output_token_details: { text_tokens: 100, audio_tokens: 300 } };
    sideband.emit({ type: "response.created" });
    sideband.emit({ type: "response.done", response: { id: "r1", usage } });
    // The summary arrives after the runtime asks for it.
    const summary = { summaryTh: "ดีมาก", strengths: ["effort"], improvements: ["more words"], scores: { fluency: 3, grammar: 2, vocabulary: 4, pronunciation: 7 } };
    const originalSend = sideband.send.bind(sideband);
    sideband.send = (event) => {
      originalSend(event);
      if (event.type === "response.create") sideband.emit({ type: "response.function_call_arguments.done", name: "submit_practice_summary", arguments: JSON.stringify(summary) });
    };
    const endedAt = new Date(now.getTime() + 10_000);
    const row = sessionRow({ startedAt, expiresAt: new Date(startedAt.getTime() + 180_000) });
    const { scores: _scores, ...summaryText } = summary;
    const mock = db([[row]], { updateReturning: [ended({ ...row, consumedSeconds: 110, endedAt, endReason: "USER_ENDED", summary: { ...summaryText, practicedTopics: [] }, scores: { ...summary.scores, pronunciation: 5 } })] });
    const result = await finalizeVoiceSession({ db: mock as unknown as DB, user: student, now: endedAt, sessionId: SESSION, reason: "USER_ENDED", provider, runtime: rt });
    expect(result).toMatchObject({ status: "ENDED", consumedSeconds: 110, endReason: "USER_ENDED", scores: { fluency: 3, grammar: 2, vocabulary: 4, pronunciation: 5 } });
    expect(result.summary?.summaryTh).toBe("ดีมาก");
    expect(provider.hangups).toEqual(["call_1"]);
    const set = mock.update.mock.results[0]!.value.set.mock.calls[0]![0];
    expect(set).toMatchObject({ status: "ENDED", consumedSeconds: 110, endReason: "USER_ENDED", scores: { pronunciation: 5 } });
    expect(set.providerUsage).toMatchObject({ model: "gpt-realtime-2.1-mini", usageComplete: true, estimatedCostThb: 0.92, strictGuard: true });
    expect(set.providerUsage.measuredRealtimeCostUsd).toBeCloseTo(0.02684, 5);
    expect(set.providerUsage.costThb).toBeCloseTo(0.97, 2);
    const monthValues = mock.insert.mock.results[0]!.value.values.mock.calls[0]![0];
    expect(monthValues).toMatchObject({ schoolId: SCHOOL, studentUserId: "s1", month: "2026-10", secondsUsed: 110, sessionCount: 1, costThb: 0.97 });
    expect(mock.delete).toHaveBeenCalledTimes(1);
    expect(rt.get(SESSION)).toBeNull();
  });

  it("grades the guarded transcript with the fallback evaluator when the coach sent no summary", async () => {
    const provider = new MockVoiceProvider();
    const rt = runtime();
    rt.attach(SESSION, provider, "call_1", "Pip");
    const sideband = provider.sidebands.get("call_1")!;
    sideband.emit({ type: "conversation.item.input_audio_transcription.completed", item_id: "i1", transcript: "I like puppies" });
    await new Promise((resolve) => setTimeout(resolve, 10));
    const evaluator = { evaluate: async (title: string, transcript: string) => ({ summaryTh: `${title}: ${transcript}`, strengths: [], improvements: [], scores: { fluency: 1, grammar: 1, vocabulary: 1, pronunciation: 0 } }) };
    const row = sessionRow({ startedAt });
    const mock = db([[row]], { updateReturning: [ended(row)] });
    await finalizeVoiceSession({ db: mock as unknown as DB, now, sessionId: SESSION, reason: "QUOTA_REACHED", provider, evaluator, runtime: rt });
    const set = mock.update.mock.results[0]!.value.set.mock.calls[0]![0];
    expect(set.summary.summaryTh).toBe("Pip: Student: I like puppies");
    expect(set.endReason).toBe("QUOTA_REACHED");
    expect(set.providerUsage.measuredRealtimeCostUsd).toBeNull();
    expect(set.providerUsage.costThb).toBe(set.providerUsage.estimatedCostThb);
  });

  it("records a timeout for a session that never connected, charges nothing, and ends only once", async () => {
    const provider = new MockVoiceProvider();
    const row = sessionRow();
    const mock = db([[row]], { updateReturning: [ended({ ...row, endReason: "CONNECTION_TIMEOUT" })] });
    const result = await finalizeVoiceSession({ db: mock as unknown as DB, now, sessionId: SESSION, reason: "QUOTA_REACHED", provider, runtime: runtime() });
    expect(result.endReason).toBe("CONNECTION_TIMEOUT");
    const set = mock.update.mock.results[0]!.value.set.mock.calls[0]![0];
    expect(set).toMatchObject({ consumedSeconds: 0, endReason: "CONNECTION_TIMEOUT" });
    const done = db([[ended({ endReason: "USER_ENDED" })]]);
    await finalizeVoiceSession({ db: done as unknown as DB, now, sessionId: SESSION, reason: "USER_ENDED", provider, runtime: runtime() });
    expect(done.update).not.toHaveBeenCalled();
    await expect(finalizeVoiceSession({ db: db([[]]) as unknown as DB, now, sessionId: SESSION, reason: "USER_ENDED", provider, runtime: runtime() })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(finalizeVoiceSession({ db: db([[row]]) as unknown as DB, user: { ...student, id: "s2" }, now, sessionId: SESSION, reason: "USER_ENDED", provider, runtime: runtime() })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("listStudentVoiceSessions", () => {
  it("maps the finished sessions and drops a malformed summary", async () => {
    const rows = [sessionRow({ status: "ENDED", consumedSeconds: 90, endReason: "USER_ENDED", summary: { summaryTh: "ok", strengths: [], improvements: [] }, scores: { fluency: 1, grammar: 2, vocabulary: 3, pronunciation: 4 } }), sessionRow({ id: "x", status: "ENDED", summary: { bad: true }, scores: { fluency: 9 } })];
    const result = await listStudentVoiceSessions({ db: db([rows]) as unknown as DB, user: student });
    expect(result[0]).toMatchObject({ sessionId: SESSION, consumedSeconds: 90, summary: { summaryTh: "ok", practicedTopics: [] }, scores: { pronunciation: 4 } });
    expect(result[1]).toMatchObject({ sessionId: "x", summary: null, scores: null });
  });
});
