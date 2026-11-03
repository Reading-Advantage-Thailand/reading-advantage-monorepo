import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useChatStream } from "../use-chat-stream";

/** Builds a streaming SSE response from raw text chunks. */
function sse(chunks: string[]): Response {
  const encoder = new TextEncoder();
  return new Response(new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  }), { headers: { "content-type": "text/event-stream; charset=utf-8" } });
}

describe("useChatStream message flow", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("ignores blank messages without calling the endpoint", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const { result } = renderHook(() => useChatStream());

    await act(async () => { await result.current.sendMessage("   "); });

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result.current.messages).toEqual([]);
  });

  it("assembles streamed chunks into one assistant message and persists it once", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(sse(["Hel", "lo", " there"]));
    const onSend = vi.fn();
    const onComplete = vi.fn();
    const { result } = renderHook(() => useChatStream({ endpoint: "/api/custom", onSend, onComplete }));

    await act(async () => { await result.current.sendMessage("hi"); });

    expect(globalThis.fetch).toHaveBeenCalledWith("/api/custom", expect.objectContaining({ method: "POST", credentials: "include" }));
    expect(onSend).toHaveBeenCalledWith("hi");
    expect(result.current.messages).toEqual([
      { role: "user", content: "hi" },
      { role: "assistant", content: "Hello there" },
    ]);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith("Hello there");
    expect(result.current.isLoading).toBe(false);
  });

  it("does not persist an empty streamed answer", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(sse([]));
    const onComplete = vi.fn();
    const { result } = renderHook(() => useChatStream({ onComplete }));

    await act(async () => { await result.current.sendMessage("hi"); });

    expect(result.current.messages.at(-1)).toEqual({ role: "assistant", content: "" });
    expect(onComplete).not.toHaveBeenCalled();
  });

  it("keeps chatting when user and assistant persistence fail", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ response: "fallback" }), { headers: { "content-type": "application/json" } }));
    const onSend = vi.fn().mockRejectedValue(new Error("persist user"));
    const onComplete = vi.fn().mockRejectedValue(new Error("persist assistant"));
    const { result } = renderHook(() => useChatStream({ onSend, onComplete }));

    await act(async () => { await result.current.sendMessage("hi"); });

    expect(result.current.messages).toEqual([
      { role: "user", content: "hi" },
      { role: "assistant", content: "fallback" },
    ]);
    expect(onComplete).toHaveBeenCalledWith("fallback");
  });

  it("does not persist a JSON reply without a response field", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({}), { headers: { "content-type": "application/json" } }));
    const onComplete = vi.fn();
    const { result } = renderHook(() => useChatStream({ onComplete }));

    await act(async () => { await result.current.sendMessage("hi"); });

    expect(onComplete).not.toHaveBeenCalled();
  });

  it.each([
    ["th", "ขออภัย ขณะนี้ไม่สามารถตอบกลับได้"],
    ["en", "Sorry, I'm having trouble responding right now."],
  ])("shows a localized error for a failed response in %s", async (locale, text) => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 429 }));
    const onComplete = vi.fn();
    const { result } = renderHook(() => useChatStream({ locale, onComplete }));

    await act(async () => { await result.current.sendMessage("hi"); });

    expect(result.current.messages.at(-1)).toEqual({ role: "assistant", content: text });
    expect(onComplete).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
  });

  it("shows the error message when the network request rejects", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("offline"));
    const { result } = renderHook(() => useChatStream({ locale: "en" }));

    await act(async () => { await result.current.sendMessage("hi"); });

    expect(result.current.messages.at(-1)?.content).toBe("Sorry, I'm having trouble responding right now.");
  });

  it("loads late initial messages only before the learner sends anything", async () => {
    const history = [{ role: "assistant" as const, content: "Welcome back" }];
    const { result, rerender } = renderHook(({ initialMessages }) => useChatStream({ initialMessages }), {
      initialProps: { initialMessages: undefined as typeof history | undefined },
    });
    expect(result.current.messages).toEqual([]);

    rerender({ initialMessages: history });
    expect(result.current.messages).toEqual(history);

    rerender({ initialMessages: [{ role: "assistant" as const, content: "Replaced" }] });
    expect(result.current.messages).toEqual(history);
  });
});
