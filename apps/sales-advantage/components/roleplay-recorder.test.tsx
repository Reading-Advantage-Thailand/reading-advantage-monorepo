import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
  const stream = {
    getTracks: vi.fn(() => [{ stop: vi.fn() }]),
  } as unknown as MediaStream;

  beforeEach(() => {
    vi.restoreAllMocks();
    recorderConstructor.mockReset();
    start.mockReset();
    stop.mockReset();
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia: vi.fn().mockResolvedValue(stream) },
    });
    vi.stubGlobal(
      "MediaRecorder",
      class MockMediaRecorder {
        static isTypeSupported = vi.fn(() => true);
        ondataavailable: ((event: BlobEvent) => void) | null = null;
        onstop: (() => void) | null = null;

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
});
