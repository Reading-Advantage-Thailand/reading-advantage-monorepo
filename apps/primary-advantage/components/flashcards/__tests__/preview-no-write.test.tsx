// @vitest-environment jsdom
/** Staff preview render test: the inline flashcard game rates its last card in Preview mode without saving any rating. */
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithMessages } from "@/components/__tests__/helpers/render-with-messages";
import { StudentViewProvider } from "@/components/student/student-view-provider";

const { reviewCardMock, authRefreshMock, toastMock } = vi.hoisted(() => ({
  reviewCardMock: vi.fn(),
  authRefreshMock: vi.fn(),
  toastMock: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock("@/actions/flashcard", () => ({ reviewCard: reviewCardMock }));
vi.mock("@reading-advantage/auth-client", () => ({
  useAuth: () => ({ user: { id: "user-1" }, refresh: authRefreshMock }),
}));
vi.mock("sonner", () => ({ toast: toastMock }));

import { FlashcardGameInline } from "../flashcard-game";

const deck = { id: "deck-1", name: "Deck", type: "SENTENCE" as const };
const cards = [
  {
    id: "card-1",
    sentence: "The dog runs fast.",
    translation: { th: "The dog moves quickly." },
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  reviewCardMock.mockResolvedValue({ success: true });
  authRefreshMock.mockResolvedValue(undefined);
});

afterEach(() => {
  cleanup();
});

describe("inline flashcard game in staff preview", () => {
  it("rates the last card without saving any rating", async () => {
    renderWithMessages(
      <StudentViewProvider mode="preview">
        <FlashcardGameInline
          deck={deck}
          cards={cards}
          onComplete={() => {}}
          onBack={() => {}}
        />
      </StudentViewProvider>,
      { locale: "en" },
    );

    fireEvent.click(screen.getByRole("button", { name: "Show Answer" }));
    fireEvent.click(screen.getByRole("button", { name: "Good" }));

    await screen.findByText(/Study Session Complete!/);
    await waitFor(() =>
      expect(toastMock.info).toHaveBeenCalledWith("Preview: not saved"),
    );
    expect(reviewCardMock).not.toHaveBeenCalled();
    expect(authRefreshMock).not.toHaveBeenCalled();
  });
});
