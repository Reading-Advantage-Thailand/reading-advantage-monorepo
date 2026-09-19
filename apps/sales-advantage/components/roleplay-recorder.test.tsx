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
  let lastOnStop: (() => void) | null = null;
  const stream = {
    getTracks: vi.fn(() => [{ stop: vi.fn() }]),
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
    lastOnStop = null;
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
});
