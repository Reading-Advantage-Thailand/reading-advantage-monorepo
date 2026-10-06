import { describe, expect, it } from "vitest";
import { MockVoiceProvider } from "../provider.js";
import { createVoiceRuntime, normalizeProviderSummary } from "../runtime.js";

const tick = () => new Promise((resolve) => setTimeout(resolve, 15));

/** A runtime with a sideband of one session. */
function live() {
  const provider = new MockVoiceProvider();
  const runtime = createVoiceRuntime({ tickMs: 1, log: () => undefined });
  runtime.attach("s", provider, "call_1", "Pip");
  const sideband = provider.sidebands.get("call_1")!;
  const turn = (transcript: string, itemId = "i1") => sideband.emit({ type: "conversation.item.input_audio_transcription.completed", item_id: itemId, transcript });
  return { provider, runtime, sideband, turn, state: runtime.get("s")! };
}

describe("strict guard", () => {
  it("replies to a safe turn with guidance and a response, and keeps the turn in the transcript", async () => {
    const { sideband, turn, state } = live();
    turn("I like puppies");
    await tick();
    expect(sideband.sent.map((e) => e.type)).toEqual(["conversation.item.create", "response.create"]);
    expect((sideband.sent[0] as { item: { role: string } }).item.role).toBe("system");
    expect(state.transcript).toEqual(["Student: I like puppies"]);
    expect(state.safetyEvents).toEqual({});
  });

  it("deletes a blocked turn and answers out of band without the content", async () => {
    const { provider, sideband, turn, state } = live();
    provider.flaggedWords = { fight: "violence" };
    turn("my phone number is 081-234-5678");
    await tick();
    // The first out-of-band reply has finished before the next turn.
    sideband.emit({ type: "response.done", response: { id: "r1", status: "cancelled" } });
    turn("let's fight", "i2");
    await tick();
    expect(state.safetyEvents).toEqual({ PERSONAL_DATA: 1, VIOLENCE: 1 });
    expect(state.transcript).toEqual([]);
    const deletes = sideband.sent.filter((e) => e.type === "conversation.item.delete").map((e) => e.item_id);
    expect(deletes).toEqual(["i1", "i2"]);
    const responses = sideband.sent.filter((e) => e.type === "response.create") as { response: { conversation?: string; instructions?: string } }[];
    expect(responses).toHaveLength(2);
    expect(responses[0]!.response.conversation).toBe("none");
    expect(responses[0]!.response.instructions).not.toContain("081");
  });

  it("fails closed when moderation is down and treats silence as no speech", async () => {
    const { provider, turn, state } = live();
    provider.moderationDown = true;
    turn("hello");
    turn("", "i2");
    await tick();
    expect(state.safetyEvents).toEqual({ MODERATION_UNAVAILABLE: 1, NO_SPEECH: 1 });
  });

  it("waits for a running response and for the rest of a split answer", async () => {
    const { sideband, turn, state } = live();
    sideband.emit({ type: "input_audio_buffer.speech_started", item_id: "i1", audio_start_ms: 0 });
    sideband.emit({ type: "input_audio_buffer.speech_stopped", item_id: "i1", audio_end_ms: 2500 });
    sideband.emit({ type: "input_audio_buffer.speech_started", item_id: "i2", audio_start_ms: 3000 });
    turn("I like");
    await tick();
    // The learner is still speaking: no reply yet.
    expect(sideband.sent).toEqual([]);
    sideband.emit({ type: "input_audio_buffer.speech_stopped", item_id: "i2", audio_end_ms: 4000 });
    state.inflightResponses = 1;
    turn("puppies", "i2");
    await new Promise((resolve) => setTimeout(resolve, 120));
    // A response was running: it is cancelled, then (after the wait) the new one is created.
    expect(sideband.sent.map((e) => e.type)).toEqual(["response.cancel", "conversation.item.create", "response.create"]);
    expect(state.transcriptionSeconds.get("i1")).toBe(2.5);
    expect(state.transcriptionSeconds.get("i2")).toBe(1);
  });

  it("counts a response from its create and frees it when the server rejects a second one", async () => {
    const { runtime, sideband, state } = live();
    sideband.emit({ type: "conversation.item.input_audio_transcription.completed", item_id: "i1", transcript: "Hello" });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(sideband.sent.map((e) => e.type)).toEqual(["conversation.item.create", "response.create"]);
    expect(state.inflightResponses).toBe(1);
    sideband.emit({ type: "error", error: { code: "conversation_already_has_active_response" } });
    expect(state.inflightResponses).toBe(0);
    sideband.emit({ type: "response.done", response: { id: "r0", status: "cancelled" } });
    expect(state.inflightResponses).toBe(0);
    runtime.release("s");
  });

  it("sums usage once per response and marks it incomplete when a response has none", () => {
    const { sideband, state } = live();
    const usage = { input_token_details: { text_tokens: 10, audio_tokens: 20, cached_tokens_details: {} }, output_token_details: { text_tokens: 1, audio_tokens: 2 } };
    sideband.emit({ type: "response.done", response: { id: "r1", usage } });
    sideband.emit({ type: "response.done", response: { id: "r1", usage } });
    expect(state.usage.responses).toBe(1);
    expect(state.usageComplete).toBe(true);
    sideband.emit({ type: "response.done", response: { id: "r2", status: "completed" } });
    expect(state.usageComplete).toBe(false);
    sideband.emit({ type: "conversation.item.input_audio_transcription.completed", item_id: "i9", transcript: "", usage: { type: "duration", seconds: 4.5 } });
    expect(state.transcriptionSeconds.get("i9")).toBe(4.5);
  });

  it("asks for the summary once and stores a normalized one", async () => {
    const { runtime, sideband, state } = live();
    sideband.emit({ type: "response.function_call_arguments.done", name: "submit_practice_summary", arguments: JSON.stringify({ summaryTh: "early", scores: {} }) });
    expect(state.summary).toBeNull();
    const requested = runtime.requestSummary("s");
    await expect(requested).resolves.toBe(true);
    expect(sideband.sent.at(-1)).toMatchObject({ type: "response.create", response: { tool_choice: { name: "submit_practice_summary" } } });
    sideband.emit({ type: "response.function_call_arguments.done", name: "submit_practice_summary", arguments: JSON.stringify({ summaryTh: "x".repeat(2000), strengths: ["a", "b", "c", "d"], improvements: 5, scores: { fluency: 9, grammar: -1, vocabulary: 2.6 } }) });
    await runtime.awaitSummary("s");
    expect(state.summary).toEqual({ summaryTh: "x".repeat(1000), strengths: ["a", "b", "c"], improvements: [], practicedTopics: [], scores: { fluency: 5, grammar: 0, vocabulary: 3, pronunciation: 0 } });
    runtime.release("s");
    expect(runtime.get("s")).toBeNull();
    expect(sideband.isOpen()).toBe(false);
    expect(normalizeProviderSummary("no")).toBeNull();
  });
});
