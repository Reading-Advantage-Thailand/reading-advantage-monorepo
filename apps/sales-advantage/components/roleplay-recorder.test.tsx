import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RoleplayRecorder } from "./roleplay-recorder";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

const scenario = {
  id: "scenario-1",
  personaName: "CFO",
  personaRole: "Finance Director",
  situation: "Budget review",
  objective: "Defend the budget",
};

describe("RoleplayRecorder recording type", () => {
  const start = vi.fn();
  const stop = vi.fn();
  const recorderConstructor = vi.fn();
  const getUserMedia = vi.fn();
  const createObjectURL = vi.fn();
  const revokeObjectURL = vi.fn();
  const stopTrack = vi.fn();
  let lastOnStop: (() => void) | null = null;
  let recorderMimeType = "audio/webm;codecs=opus";
  const stream = {
    getTracks: vi.fn(() => [{ readyState: "live", stop: stopTrack }]),
  } as unknown as MediaStream;

  beforeEach(() => {
    vi.restoreAllMocks();
    recorderConstructor.mockReset();
    start.mockReset();
    stop.mockReset();
    getUserMedia.mockReset();
    createObjectURL.mockReset();
    createObjectURL.mockReturnValue("blob:roleplay");
    revokeObjectURL.mockReset();
    stopTrack.mockReset();
    lastOnStop = null;
    recorderMimeType = "audio/webm;codecs=opus";
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: createObjectURL,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: revokeObjectURL,
    });
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia: getUserMedia.mockResolvedValue(stream) },
    });
    vi.stubGlobal(
      "MediaRecorder",
      class MockMediaRecorder {
        static isTypeSupported = vi.fn(() => true);
        state = "recording";
        get mimeType() {
          return recorderMimeType;
        }
        ondataavailable: ((event: BlobEvent) => void) | null = null;

        set onstop(handler: (() => void) | null) {
          lastOnStop = handler;
        }

        get onstop() {
          return lastOnStop;
        }

        constructor(...args: unknown[]) {
          recorderConstructor(...args);
        }

        start = start;
        stop = stop;
      },
    );
  });

  it("passes audio/webm when the browser supports it", async () => {
    render(<RoleplayRecorder scenario={scenario} />);

    fireEvent.click(screen.getByRole("button", { name: "record" }));

    await waitFor(() => expect(start).toHaveBeenCalled());
    expect(MediaRecorder.isTypeSupported).toHaveBeenCalledWith("audio/webm");
    expect(recorderConstructor).toHaveBeenCalledWith(stream, {
      mimeType: "audio/webm",
    });
  });

  it("uses the browser default when audio/webm is unsupported", async () => {
    vi.mocked(MediaRecorder.isTypeSupported).mockReturnValue(false);

    render(<RoleplayRecorder scenario={scenario} />);

    fireEvent.click(screen.getByRole("button", { name: "record" }));

    await waitFor(() => expect(start).toHaveBeenCalled());
    expect(MediaRecorder.isTypeSupported).toHaveBeenCalledWith("audio/webm");
    expect(recorderConstructor).toHaveBeenCalledWith(stream);
  });

  it.each([
    ["audio/webm;codecs=opus", "audio/webm", "attempt.webm"],
    ["audio/mp4", "audio/mp4", "attempt.mp4"],
  ])("uploads a %s recording as %s", async (recorded, uploadedType, fileName) => {
    recorderMimeType = recorded;
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ attemptId: "attempt-1", evaluation: null }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<RoleplayRecorder scenario={scenario} />);

    fireEvent.click(screen.getByRole("button", { name: "record" }));
    await waitFor(() => expect(start).toHaveBeenCalled());
    act(() => lastOnStop?.());
    fireEvent.click(screen.getByRole("checkbox", { name: "consentLabel" }));
    fireEvent.click(screen.getByRole("button", { name: "submit" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const file = (fetchMock.mock.calls[0]![1] as RequestInit).body as FormData;
    const audio = file.get("audio") as File;
    expect(audio.type).toBe(uploadedType);
    expect(audio.name).toBe(fileName);
  });

  it("shows the permission error when microphone access is denied", async () => {
    getUserMedia.mockReset();
    getUserMedia.mockRejectedValueOnce(
      new DOMException("Permission denied", "NotAllowedError"),
    );

    render(<RoleplayRecorder scenario={scenario} />);

    fireEvent.click(screen.getByRole("button", { name: "record" }));

    expect((await screen.findByRole("alert")).textContent).toContain(
      "micDenied",
    );
  });

  it("shows the device error when no microphone is available", async () => {
    getUserMedia.mockReset();
    getUserMedia.mockRejectedValueOnce(
      new DOMException("No microphone", "NotFoundError"),
    );

    render(<RoleplayRecorder scenario={scenario} />);

    fireEvent.click(screen.getByRole("button", { name: "record" }));

    expect((await screen.findByRole("alert")).textContent).toContain(
      "micError",
    );
  });

  it("revokes the owned blob URL when reset runs", async () => {
    const { unmount } = render(<RoleplayRecorder scenario={scenario} />);

    fireEvent.click(screen.getByRole("button", { name: "record" }));
    await waitFor(() => expect(start).toHaveBeenCalled());
    act(() => lastOnStop?.());
    await screen.findByLabelText("listen");

    fireEvent.click(screen.getByRole("button", { name: "retry" }));

    expect(revokeObjectURL).toHaveBeenCalledWith("blob:roleplay");
    unmount();
    expect(revokeObjectURL).toHaveBeenCalledTimes(1);
  });

  it("revokes the owned blob URL when the recorder unmounts", async () => {
    const { unmount } = render(<RoleplayRecorder scenario={scenario} />);

    fireEvent.click(screen.getByRole("button", { name: "record" }));
    await waitFor(() => expect(start).toHaveBeenCalled());
    act(() => lastOnStop?.());
    await screen.findByLabelText("listen");

    unmount();

    expect(revokeObjectURL).toHaveBeenCalledWith("blob:roleplay");
  });

  it("stops the active recorder and microphone track on unmount", async () => {
    const { unmount } = render(<RoleplayRecorder scenario={scenario} />);

    fireEvent.click(screen.getByRole("button", { name: "record" }));
    await waitFor(() => expect(start).toHaveBeenCalled());

    unmount();
    unmount();

    expect(stop).toHaveBeenCalledTimes(1);
    expect(stopTrack).toHaveBeenCalledTimes(1);
  });

  it("warns when the server reports a failed audio upload", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        attemptId: "attempt-1",
        evaluation: {
          overallScore: 50,
          passed: false,
          criteria: [],
          summary: "Summary",
          strengths: [],
          weaknesses: [],
          suggestedNextAction: "Next",
        },
        audioUploadFailed: true,
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<RoleplayRecorder scenario={scenario} />);

    fireEvent.click(screen.getByRole("button", { name: "record" }));
    await waitFor(() => expect(start).toHaveBeenCalled());
    act(() => lastOnStop?.());
    fireEvent.click(screen.getByRole("checkbox", { name: "consentLabel" }));
    fireEvent.click(screen.getByRole("button", { name: "submit" }));

    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toContain(
      "errors.audioSaveFailed",
    );

    vi.unstubAllGlobals();
  });
});
