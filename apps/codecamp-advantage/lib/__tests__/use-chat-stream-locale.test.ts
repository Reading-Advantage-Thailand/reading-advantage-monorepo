import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

describe("useChatStream includes locale in request body", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("sends locale in request body when locale option is provided", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ response: "test" }), {
        headers: { "content-type": "application/json" },
      })
    );

    const { useChatStream } = await import("../use-chat-stream");

    const { result } = renderHook(() =>
      useChatStream({
        locale: "th",
        lessonId: "550e8400-e29b-41d4-a716-446655440000",
        moduleId: "550e8400-e29b-41d4-a716-446655440001",
      })
    );

    await act(async () => {
      await result.current.sendMessage("hello");
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const call = fetchSpy.mock.calls[0];
    const body = JSON.parse(call[1]?.body as string);
    expect(body.locale).toBe("th");
    expect(body.message).toBe("hello");
    expect(body.lessonId).toBe("550e8400-e29b-41d4-a716-446655440000");
    expect(body.moduleId).toBe("550e8400-e29b-41d4-a716-446655440001");
  });

  it("sends undefined locale when not provided", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ response: "test" }), {
        headers: { "content-type": "application/json" },
      })
    );

    const { useChatStream } = await import("../use-chat-stream");

    const { result } = renderHook(() =>
      useChatStream({
        lessonId: "550e8400-e29b-41d4-a716-446655440000",
      })
    );

    await act(async () => {
      await result.current.sendMessage("hello");
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const call = fetchSpy.mock.calls[0];
    const body = JSON.parse(call[1]?.body as string);
    expect(body.locale).toBeUndefined();
    expect(body.message).toBe("hello");
  });

  it("sends en locale when locale is set to en", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ response: "test" }), {
        headers: { "content-type": "application/json" },
      })
    );

    const { useChatStream } = await import("../use-chat-stream");

    const { result } = renderHook(() =>
      useChatStream({
        locale: "en",
        lessonId: "550e8400-e29b-41d4-a716-446655440000",
      })
    );

    await act(async () => {
      await result.current.sendMessage("hello");
    });

    const call = fetchSpy.mock.calls[0];
    const body = JSON.parse(call[1]?.body as string);
    expect(body.locale).toBe("en");
  });
});