import { describe, expect, it, vi } from "vitest";
import { OpenAIVoiceProvider, parseProviderCallId } from "../openai.js";

const request = { sdp: "v=0\r\noffer", instructions: "Be Reedy.", model: "gpt-realtime-2.1-mini", transcriptionModel: "gpt-transcribe" };

describe("OpenAI voice provider", () => {
  it("posts the offer and the strict-guard session and reads the answer and call id", async () => {
    const fetchFn = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      expect(String(url)).toBe("https://api.openai.com/v1/realtime/calls");
      expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer sk-test");
      const form = init?.body as FormData;
      expect(form.get("sdp")).toBe(request.sdp);
      const session = JSON.parse(String(form.get("session")));
      expect(session.audio.input.turn_detection).toEqual({ type: "server_vad", create_response: false, interrupt_response: true });
      expect(session.tools.map((t: { name: string }) => t.name)).toEqual(["submit_practice_summary"]);
      return new Response("v=0\r\nanswer", { status: 201, headers: { location: "/v1/realtime/calls/call_abc" } });
    });
    const provider = new OpenAIVoiceProvider({ apiKey: "sk-test", fetch: fetchFn as typeof fetch });
    await expect(provider.createCall(request)).resolves.toEqual({ answerSdp: "v=0\r\nanswer", providerCallId: "call_abc", model: request.model });
  });

  it("refuses a missing key, a failed call, and a non-SDP answer", async () => {
    await expect(new OpenAIVoiceProvider({ apiKey: " " }).createCall(request)).rejects.toThrow("not configured");
    const failing = new OpenAIVoiceProvider({ apiKey: "sk", fetch: (async () => new Response("no", { status: 500 })) as typeof fetch });
    await expect(failing.createCall(request)).rejects.toThrow("500");
    const odd = new OpenAIVoiceProvider({ apiKey: "sk", fetch: (async () => new Response("<html>", { status: 200, headers: { location: "/v1/realtime/calls/x" } })) as typeof fetch });
    await expect(odd.createCall(request)).rejects.toThrow("invalid session");
    expect(parseProviderCallId(null)).toBeNull();
  });

  it("maps a moderation result and fails closed on an endpoint error", async () => {
    const ok = new OpenAIVoiceProvider({ apiKey: "sk", fetch: (async () => Response.json({ results: [{ flagged: true, categories: { violence: true } }] })) as typeof fetch });
    await expect(ok.moderate("hit")).resolves.toEqual({ flagged: true, categories: { violence: true } });
    const down = new OpenAIVoiceProvider({ apiKey: "sk", fetch: (async () => new Response("", { status: 503 })) as typeof fetch });
    await expect(down.moderate("hi")).rejects.toThrow("503");
  });

  it("opens the sideband with the key in the auth header and queues events until open", () => {
    const sockets: FakeSocket[] = [];
    class FakeSocket {
      readyState = 0;
      sent: string[] = [];
      listeners: Record<string, ((e: unknown) => void)[]> = {};
      constructor(
        public url: string,
        public options: { headers: Record<string, string> },
      ) {
        sockets.push(this);
      }
      addEventListener(name: string, fn: (e: unknown) => void) {
        (this.listeners[name] ??= []).push(fn);
      }
      send(m: string) {
        this.sent.push(m);
      }
      close() {
        this.readyState = 3;
        this.listeners.close?.forEach((fn) => fn({}));
      }
      fire(name: string, e: unknown) {
        this.listeners[name]?.forEach((fn) => fn(e));
      }
    }
    const provider = new OpenAIVoiceProvider({ apiKey: "sk-test", WebSocket: (url, options) => new FakeSocket(url, options) });
    const sideband = provider.openSideband("call_1")!;
    const socket = sockets[0]!;
    expect(socket.url).toBe("wss://api.openai.com/v1/realtime?call_id=call_1");
    expect(socket.options.headers).toEqual({ Authorization: "Bearer sk-test", "OpenAI-Beta": "realtime=v1" });
    sideband.send({ type: "response.create" });
    expect(socket.sent).toEqual([]);
    socket.readyState = 1;
    socket.fire("open", {});
    expect(socket.sent).toEqual(['{"type":"response.create"}']);
    const events: unknown[] = [];
    sideband.onEvent((e) => events.push(e));
    socket.fire("message", { data: '{"type":"response.done","response":{}}' });
    socket.fire("message", { data: "not json" });
    expect(events).toEqual([{ type: "response.done", response: {} }]);
    let closed = false;
    sideband.onClose(() => (closed = true));
    sideband.close();
    expect(closed).toBe(true);
    expect(sideband.isOpen()).toBe(false);
  });
});
