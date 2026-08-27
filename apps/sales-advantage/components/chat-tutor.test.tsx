import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import thMessages from "../messages/th.json";
import { ChatTutor } from "./chat-tutor";

const thaiChatCopy = thMessages.chat;

vi.mock("next-intl", () => ({
  useTranslations: () => (key: keyof typeof thaiChatCopy) => thaiChatCopy[key],
}));

describe("ChatTutor accessibility", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: vi.fn(),
    });
  });

  it("exposes the Thai send label to assistive technology", () => {
    render(<ChatTutor />);

    expect(
      screen.getByRole("button", { name: thaiChatCopy.send }),
    ).toBeTruthy();
  });
});
