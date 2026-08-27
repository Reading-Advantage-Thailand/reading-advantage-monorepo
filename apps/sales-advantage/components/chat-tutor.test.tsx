import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import thaiMessages from "../messages/th.json";
import { ChatTutor } from "./chat-tutor";

const thaiChatCopy = thaiMessages.chat;

vi.mock("next-intl", () => ({
  useTranslations: () => (key: keyof typeof thaiChatCopy) => thaiChatCopy[key],
}));

describe("ChatTutor", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: vi.fn(),
    });
  });

  it("renders localized Thai empty-state copy", () => {
    render(<ChatTutor />);

    expect(screen.getByText(thaiChatCopy.emptyState)).toBeTruthy();
    expect(
      screen.queryByText("Ask anything about sales technique."),
    ).toBeNull();
  });

  it("renders localized Thai copy when chat fetch fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    render(<ChatTutor />);

    fireEvent.change(screen.getByPlaceholderText(thaiChatCopy.placeholder), {
      target: { value: "ช่วยอธิบายการขาย" },
    });
    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(screen.getByText(thaiChatCopy.unavailableError)).toBeTruthy();
    });
    expect(
      screen.queryByText("[Error: chat unavailable]"),
    ).toBeNull();
  });
});
