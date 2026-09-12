/**
 * Behavioral tests for broken_ux_fixes_20260911 Phase 2.
 */

import * as React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const push = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh: jest.fn(), replace: jest.fn() }),
}));

jest.mock("@/locales/client", () => ({
  useScopedI18n: () => (key: string) => key,
  useCurrentLocale: () => "en",
}));

jest.mock("@/lib/telemetry/dashboard-telemetry", () => ({
  useDashboardTelemetry: () => ({ trackEvent: jest.fn() }),
}));

jest.mock("@/components/dashboard/student-xp-velocity", () => ({
  XPVelocityWidget: () => null,
}));
jest.mock("@/components/dashboard/student-eta-card", () => ({
  ETACard: () => null,
}));
jest.mock("@/components/dashboard/student-srs-health", () => ({
  SRSHealthCard: () => null,
}));
jest.mock("@/components/dashboard/student-ai-coach", () => ({
  AICoachCard: () => null,
}));
jest.mock("@/components/dashboard/user-level-indicator", () => () => null);
jest.mock("@/components/dashboard/compact-activity-heatmap", () => ({
  CompactActivityHeatmap: () => null,
}));
jest.mock("@/components/dashboard/activity-timeline", () => () => null);
jest.mock("@/components/dashboard/active-goals-widget", () => ({
  ActiveGoalsWidget: () => null,
}));
jest.mock("@/components/dashboard/student-genre-engagement", () => ({
  GenreEngagementWidget: ({
    onGenreClick,
  }: {
    onGenreClick: (genre: string) => void;
  }) => (
    <button type="button" onClick={() => onGenreClick("fiction")}>
      genre-fiction
    </button>
  ),
}));

jest.mock("@/store/question-store", () => ({
  useQuestionStore: () => ({
    mcQuestion: { results: [] },
    saQuestion: { result: null },
    laqQuestion: { result: null },
  }),
}));

jest.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({ toast: jest.fn() }),
  toast: jest.fn(),
}));

import StudentDashboardContent from "@/components/dashboard/student-dashboard-content";
import ChatBotFloatingChatButton from "@/components/chatbot-floating-button";
import { FlashcardGameInline } from "@/components/flashcards/flashcard-game";

const metrics = {
  velocity: {},
  eta: {},
  genre: {},
  srs: {},
  heatmap: [],
  timeline: [],
} as never;

describe("FR-1 genre navigation", () => {
  it("pushes /student/read with the chosen genre", () => {
    render(
      <StudentDashboardContent
        userId="user-1"
        user={{
          id: "user-1",
          name: "Ada",
          email: "ada@example.com",
          level: 3,
          cefr_level: "A2",
          xp: 100,
        }}
        metrics={metrics}
        goals={[]}
      />,
    );

    fireEvent.click(screen.getByText("genre-fiction"));
    expect(push).toHaveBeenCalledWith("/student/read?genre=fiction");
  });
});

describe("FR-7 flashcard speech", () => {
  const cancel = jest.fn();
  const speak = jest.fn();

  beforeEach(() => {
    cancel.mockClear();
    speak.mockClear();
    Object.defineProperty(window, "speechSynthesis", {
      configurable: true,
      value: { cancel, speak },
    });
    (globalThis as unknown as { SpeechSynthesisUtterance: unknown }).SpeechSynthesisUtterance =
      function SpeechSynthesisUtterance(this: { lang: string; text: string }, text: string) {
        this.text = text;
        this.lang = "";
      };
  });

  it("cancels speech before speak and on unmount", () => {
    const { unmount } = render(
      <FlashcardGameInline
        cards={[
          {
            id: "card-1",
            word: { vocabulary: "apple" },
            difficulty: 0,
            due: new Date().toISOString(),
            elapsedDays: 0,
            lapses: 0,
            reps: 0,
            scheduledDays: 0,
            stability: 0,
            state: 0,
            userId: "user-1",
            articleId: "article-1",
            saveToFlashcard: true,
            createdAt: "",
            updatedAt: "",
          },
        ]}
        deckId="deck-1"
        deckName="Deck"
        deckType="VOCABULARY"
        onComplete={jest.fn()}
        onExit={jest.fn()}
      />,
    );

    const volumeButtons = screen.getAllByRole("button").filter((button) =>
      button.querySelector("svg"),
    );
    const target = volumeButtons.find((button) =>
      button.className.includes("text-muted-foreground"),
    ) ?? volumeButtons[0];
    expect(target).toBeDefined();
    fireEvent.click(target!);
    expect(cancel).toHaveBeenCalled();
    expect(speak).toHaveBeenCalled();

    unmount();
    expect(cancel.mock.calls.length).toBeGreaterThanOrEqual(2);
  });
});

describe("FR-9 chatbot history", () => {
  it("keeps messages when the chat is closed and opened", async () => {
    Element.prototype.scrollIntoView = jest.fn();
    (globalThis.fetch as jest.Mock) = jest.fn(async () => ({
      ok: true,
      json: async () => ({ text: "hello from bot" }),
    }));

    render(
      <ChatBotFloatingChatButton
        article={{ id: "article-1", title: "Title", passage: "Hi." } as never}
      />,
    );

    fireEvent.click(screen.getByRole("button"));
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "hello" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send/i }));

    await waitFor(() => {
      expect(screen.getByText("hello from bot")).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByRole("button").find((button) =>
      button.querySelector("svg.lucide-x") || button.getAttribute("class")?.includes("rounded-full"),
    )!);

    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText("hello from bot")).toBeInTheDocument();
    expect(screen.getByText("hello")).toBeInTheDocument();
  });
});
