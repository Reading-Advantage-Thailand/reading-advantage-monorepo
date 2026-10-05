// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, cleanup, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithMessages } from "@/components/__tests__/helpers/render-with-messages";

vi.mock("@/components/avatar/portrait-canvas", () => ({ AvatarPortrait: () => <div data-testid="portrait" /> }));
vi.mock("@/i18n/navigation", () => ({ Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a> }));

import { ReedySession, reedyStateForEvent, type ReedyBrowser } from "../reedy-session";

const profile = { classId: "wizard", tints: { skin: "light", hair: "silver", eyes: "violet", cloth: "slate" } } as const;

/** A fake peer connection that connects as soon as the answer arrives. */
class FakePeer {
  static instances: FakePeer[] = [];
  connectionState = "new";
  iceGatheringState = "complete";
  localDescription: { sdp: string } | null = null;
  onconnectionstatechange: (() => void) | null = null;
  ontrack: ((event: { streams: MediaStream[] }) => void) | null = null;
  channel = { onmessage: null as ((m: { data: string }) => void) | null };
  closed = false;
  constructor() { FakePeer.instances.push(this); }
  addTrack() {}
  createDataChannel() { return this.channel; }
  addEventListener() {}
  removeEventListener() {}
  async createOffer() { return { type: "offer", sdp: "v=0 offer" }; }
  async setLocalDescription(offer: { sdp: string }) { this.localDescription = offer; }
  async setRemoteDescription() {
    this.connectionState = "connected";
    this.onconnectionstatechange?.();
  }
  close() { this.closed = true; }
}

const track = { stop: vi.fn(), enabled: true };
const mic = { getTracks: () => [track], getAudioTracks: () => [track] } as unknown as MediaStream;
const json = (status: number, body: unknown) => ({ ok: status < 400, status, json: async () => body }) as Response;
const summaryRecord = { sessionId: "vs1", status: "ENDED", consumedSeconds: 120, scores: { fluency: 4, grammar: 3, vocabulary: 5, pronunciation: 4 }, summary: { summaryTh: "พูดได้ดีมาก", strengths: ["ออกเสียงชัด"], improvements: ["ลองใช้ past tense"], practicedTopics: [] } };

function browser(fetchImpl: ReturnType<typeof vi.fn>, getUserMedia = vi.fn(async () => mic)): ReedyBrowser {
  return { getUserMedia, PeerConnection: FakePeer as unknown as typeof RTCPeerConnection, fetch: fetchImpl as unknown as typeof fetch };
}

beforeEach(() => {
  FakePeer.instances = [];
  track.enabled = true;
  track.stop.mockClear();
});
afterEach(cleanup);

describe("ReedySession", () => {
  it("maps Realtime events to the coach states", () => {
    expect(reedyStateForEvent("input_audio_buffer.speech_started", "idle")).toBe("listening");
    expect(reedyStateForEvent("input_audio_buffer.speech_stopped", "listening")).toBe("thinking");
    expect(reedyStateForEvent("output_audio_buffer.started", "thinking")).toBe("speaking");
    expect(reedyStateForEvent("output_audio_buffer.stopped", "speaking")).toBe("listening");
    expect(reedyStateForEvent("session.updated", "speaking")).toBe("speaking");
  });

  it("explains a denied microphone and offers another try (FR-11)", async () => {
    const denied = vi.fn(async () => { throw Object.assign(new Error("denied"), { name: "NotAllowedError" }); });
    renderWithMessages(<ReedySession profile={profile} articleId={null} remainingSeconds={300} blockedBy={null} browser={browser(vi.fn(), denied)} />, { locale: "en" });
    await userEvent.click(screen.getByRole("button", { name: "Start talking" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("The microphone is off.");
    expect(screen.getByRole("button", { name: "Talk again" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to home" })).toHaveAttribute("href", "/student/home");
  });

  it("runs the call through the voice routes, mutes, ends, and shows the kind summary (FR-12)", async () => {
    const fetchImpl = vi.fn(async (url: string, init?: RequestInit) => {
      if (url === "/api/voice/sessions") {
        expect(JSON.parse(String(init?.body))).toEqual({ articleId: "a1", sdp: "v=0 offer" });
        return json(201, { sessionId: "vs1", answerSdp: "v=0 answer", expiresAt: new Date(Date.now() + 90_000).toISOString(), reservedSeconds: 180, remainingSeconds: 120 });
      }
      if (url === "/api/voice/sessions/vs1/connected") return json(200, { sessionId: "vs1", expiresAt: new Date(Date.now() + 90_000).toISOString() });
      if (url === "/api/voice/sessions/vs1/end") {
        expect(JSON.parse(String(init?.body))).toEqual({ reason: "USER_ENDED" });
        return json(200, summaryRecord);
      }
      throw new Error(`unexpected ${url}`);
    });
    renderWithMessages(<ReedySession profile={profile} articleId="a1" remainingSeconds={300} blockedBy={null} browser={browser(fetchImpl)} />, { locale: "en" });
    await userEvent.click(screen.getByRole("button", { name: "Start talking" }));
    await screen.findByRole("button", { name: "Finish" });
    expect(screen.getByRole("timer")).toHaveTextContent(/left/);
    act(() => FakePeer.instances[0]!.channel.onmessage?.({ data: JSON.stringify({ type: "input_audio_buffer.speech_started" }) }));
    expect(screen.getByRole("figure")).toHaveAttribute("data-state", "listening");
    await userEvent.click(screen.getByRole("button", { name: "Mute" }));
    expect(track.enabled).toBe(false);
    expect(screen.getByRole("figure")).toHaveAttribute("data-state", "muted");
    await userEvent.click(screen.getByRole("button", { name: "Unmute" }));
    expect(track.enabled).toBe(true);
    await userEvent.click(screen.getByRole("button", { name: "Finish" }));
    expect(await screen.findByRole("heading", { name: "Great talking with you!" })).toBeInTheDocument();
    expect(screen.getAllByRole("img", { name: "4 of 5" })).toHaveLength(2);
    expect(screen.getByRole("img", { name: "3 of 5" })).toBeInTheDocument();
    expect(screen.getByText("พูดได้ดีมาก")).toBeInTheDocument();
    expect(screen.getByText(/ลองใช้ past tense/)).toBeInTheDocument();
    expect(screen.getByRole("figure")).toHaveAttribute("data-state", "celebrating");
    expect(track.stop).toHaveBeenCalled();
    expect(FakePeer.instances[0]!.closed).toBe(true);
    expect(screen.getByRole("button", { name: "Talk again" })).toBeInTheDocument();
  });

  it("shows the stop screen when the server refuses a session over the quota (FR-9)", async () => {
    const fetchImpl = vi.fn(async () => json(409, { error: "QUOTA_EXHAUSTED" }));
    renderWithMessages(<ReedySession profile={profile} articleId={null} remainingSeconds={0} blockedBy={null} browser={browser(fetchImpl)} />, { locale: "th" });
    await userEvent.click(screen.getByRole("button", { name: "เริ่มคุย" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("นาทีคุยกับรีดี้ของเดือนนี้หมดแล้ว");
    expect(screen.queryByRole("button", { name: "คุยอีกครั้ง" })).not.toBeInTheDocument();
    expect(FakePeer.instances[0]!.closed).toBe(true);
  });

  it("starts closed with the reason when the page passes a block", async () => {
    renderWithMessages(<ReedySession profile={profile} articleId={null} remainingSeconds={300} blockedBy="NO_AVATAR" browser={browser(vi.fn())} />, { locale: "en" });
    expect(screen.getByRole("alert")).toHaveTextContent("Make your avatar first");
    expect(screen.getByRole("link", { name: "Make your avatar first, then talk to Reedy." })).toHaveAttribute("href", "/student/avatar?from=reedy");
    await waitFor(() => expect(screen.queryByRole("button", { name: "Start talking" })).not.toBeInTheDocument());
  });
});
