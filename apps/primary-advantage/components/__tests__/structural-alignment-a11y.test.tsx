// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Rating } from "ts-fsrs";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  getLessonFlashcards: vi.fn(),
  reviewCard: vi.fn(),
  updateUserActivity: vi.fn(),
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({
    children,
    ...props
  }: { children?: React.ReactNode } & Record<string, unknown>) => (
    <a {...props}>{children}</a>
  ),
  usePathname: () => "/",
  useRouter: () => ({
    push: mocks.push,
    replace: vi.fn(),
    back: vi.fn(),
    refresh: mocks.refresh,
    prefetch: vi.fn(),
  }),
}));

vi.mock("@reading-advantage/auth-client", () => ({
  useAuth: () => ({ user: null, refresh: mocks.refresh }),
  useSession: () => ({ user: null }),
}));

vi.mock("@/actions/flashcard", () => ({
  getLessonFlashcards: mocks.getLessonFlashcards,
  getLessonOrderingSentences: vi.fn(),
  reviewCard: mocks.reviewCard,
}));

vi.mock("@/actions/user", () => ({
  updateUserActivity: mocks.updateUserActivity,
}));

vi.mock("@/hooks/use-current-user", () => ({
  useCurrentUser: () => ({ id: "user-1" }),
}));

import AudioButton from "../audio-button";
import { FormError } from "../form-error";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "../ui/form";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { OrderSentenceGame } from "../lesson/games/lesson-sentence-order";
import { OrderWordGame } from "../lesson/games/lesson-sentence-order-word";
import { SentenceClozeGame } from "../lesson/games/lesson-sentence-cloze-test";
import { LessonMatchingGame } from "../lesson/games/lesson-matching-game";
import { MatchingGame } from "../practice/matching-game";
import { FlashcardGameInline } from "../flashcards/flashcard-game";
import ClassroomSelector from "../teacher/classroom-selector";
import ArticleShowcaseCard from "../articles/article-showcase-card";
import { TaskCollection } from "../lesson/task/task-collection";
import TaskVocabularyCollection from "../lesson/task/task-vocabulary-collection";
import { HistoryTable } from "../dashboard/history-table";
import TeacherProgressReports from "../teacher/teacher-progress-reports";
import ChangeRole from "../shared/change-role";
import { FlashcardType } from "@/types/enum";
import {
  renderWithMessages,
  testMessages,
} from "./helpers/render-with-messages";

const en = testMessages.en;

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  vi.clearAllMocks();
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
  mocks.reviewCard.mockResolvedValue({ success: true });
  mocks.updateUserActivity.mockResolvedValue({ success: true });
  mocks.getLessonFlashcards.mockResolvedValue({ success: true, cards: [] });
});

describe("FR-4 AudioButton is a real button", () => {
  it("renders a button with an accessible name and pressed state", () => {
    renderWithMessages(
      <AudioButton audioUrl="clip.mp3" startTimestamp={0} endTimestamp={5} />,
    );

    const button = screen.getByRole("button", {
      name: en.Components.playAudio,
    });
    expect(button).toHaveAttribute("aria-pressed", "false");
    expect(button.querySelector('svg[aria-hidden="true"]')).not.toBeNull();
  });

  it("fires play once when the icon is clicked", async () => {
    const play = vi.fn().mockResolvedValue(undefined);
    window.HTMLMediaElement.prototype.play = play;

    renderWithMessages(
      <AudioButton audioUrl="clip.mp3" startTimestamp={0} endTimestamp={5} />,
    );

    const button = screen.getByRole("button", {
      name: en.Components.playAudio,
    });
    const icon = button.querySelector("svg")!;
    fireEvent.click(icon);

    await waitFor(() => expect(play).toHaveBeenCalledTimes(1));
    expect(
      screen.getByRole("button", { name: en.Components.stopAudio }),
    ).toHaveAttribute("aria-pressed", "true");
  });
});

describe("FR-4 form errors expose role=alert", () => {
  it("marks FormError as an alert", () => {
    const { rerender } = render(<FormError message="Invalid email" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Invalid email");

    rerender(<FormError message={undefined} />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("marks FormMessage as an alert on invalid fields", async () => {
    const schema = z.object({
      email: z.string().min(1, "Email is required"),
    });

    function Harness() {
      const form = useForm<z.infer<typeof schema>>({
        resolver: zodResolver(schema),
        defaultValues: { email: "" },
      });
      return (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(() => {})}>
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input {...field} aria-label="email" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit">Submit</Button>
          </form>
        </Form>
      );
    }

    render(<Harness />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Submit" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Email is required",
    );
  });
});

const orderSentences = [
  {
    id: "g1",
    articleId: "a1",
    articleTitle: "River",
    flashcardSentence: "First second third",
    correctOrder: ["First", "second", "third"],
    sentences: [
      { id: "s1", text: "First" },
      { id: "s2", text: "second" },
      { id: "s3", text: "third" },
    ],
    difficulty: "easy" as const,
    startIndex: 0,
    flashcardIndex: 0,
  },
];

describe("FR-4 sentence-order keyboard path", () => {
  it("reorders sentences with arrow keys", async () => {
    renderWithMessages(
      <OrderSentenceGame source="deck" deckId="d1" sentences={orderSentences} />,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: en.SentencesPage.sentenceOrder.startGame,
      }),
    );

    const items = await screen.findAllByRole("button", {
      name: /reorder/i,
    });
    expect(items).toHaveLength(3);
    const before = items.map((item) => item.getAttribute("aria-label"));

    items[0].focus();
    fireEvent.keyDown(document.activeElement!, { key: "ArrowDown" });

    const after = screen
      .getAllByRole("button", { name: /reorder/i })
      .map((item) => item.getAttribute("aria-label"));
    expect(after).not.toEqual(before);
    const sentenceOf = (label: string | null) => label?.split(".")[0];
    expect(sentenceOf(after[1])).toBe(sentenceOf(before[0]));
  });
});

describe("FR-4 game results expose aria-live", () => {
  it("announces the sentence-order result", async () => {
    renderWithMessages(
      <OrderSentenceGame source="deck" deckId="d1" sentences={orderSentences} />,
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: en.SentencesPage.sentenceOrder.startGame,
      }),
    );
    await screen.findAllByRole("button", { name: /reorder/i });

    fireEvent.click(
      screen.getByRole("button", {
        name: en.SentencesPage.sentenceOrder.checkAnswer,
      }),
    );

    const live = await screen.findByRole("region", { hidden: true }).catch(
      () => screen.findByText(/perfect|not quite/i),
    );
    expect(live ?? screen.getByText(/perfect|not quite/i)).toBeInTheDocument();
    const region = document.querySelector('[aria-live="polite"]');
    expect(region).not.toBeNull();
    expect(region!.textContent).toMatch(/perfect|not quite/i);
  });

  it("announces the order-word result", async () => {
    renderWithMessages(
      <OrderWordGame
        source="deck"
        deckId="d1"
        sentences={[
          {
            id: "w1",
            articleId: "a1",
            articleTitle: "River",
            sentence: "Cats run fast",
            correctOrder: ["Cats", "run", "fast"],
            words: [
              { id: "w1", text: "Cats" },
              { id: "w2", text: "run" },
              { id: "w3", text: "fast" },
            ],
            difficulty: "easy",
          },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /start/i }));
    const bankHint = await screen.findByText(
      (_content, element) =>
        element?.tagName === "P" &&
        element?.textContent?.includes("Click words to add") === true,
    );
    const bankSection = bankHint.closest("div.space-y-3") as HTMLElement;
    for (let i = 0; i < 3; i++) {
      const chip = within(bankSection).getAllByRole("button")[0];
      fireEvent.click(chip);
    }
    fireEvent.click(screen.getByRole("button", { name: /check/i }));

    const region = document.querySelector('[aria-live="polite"]');
    await waitFor(() => expect(region).not.toBeNull());
    expect(region!.textContent).toMatch(/correct|try again/i);
  });

  it("announces the cloze result", async () => {
    renderWithMessages(
      <SentenceClozeGame
        source="deck"
        deckId="d1"
        sentences={[
          {
            id: "c1",
            sentence: "Cats run fast",
            blanks: [
              {
                id: "b1",
                position: 5,
                correctAnswer: "run",
                options: ["run", "walk"],
              },
            ],
          } as never,
        ]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /start/i }));
    fireEvent.click(await screen.findByRole("combobox"));
    fireEvent.click(await screen.findByRole("option", { name: "run" }));

    const heading = await screen.findByRole("heading", {
      name: /all blanks filled correctly/i,
    });
    expect(heading.closest('[aria-live="polite"]')).not.toBeNull();
  });

  it("announces the lesson matching result", async () => {
    mocks.getLessonFlashcards.mockResolvedValue({
      success: true,
      cards: [{ id: "c1", word: "cat", definition: { en: "a small animal" } }],
    });
    renderWithMessages(
      <LessonMatchingGame
        articleId="a1"
        cardKind={FlashcardType.VOCABULARY}
      />,
    );

    fireEvent.click(
      await screen.findByRole("button", {
        name: en.Lesson.VocabularyMatching.start.startButton,
      }),
    );
    fireEvent.click(await screen.findByText("cat"));
    fireEvent.click(await screen.findByText("a small animal"));

    const region = await screen.findByText(
      en.Lesson.VocabularyMatching.results.perfect,
    );
    expect(region.closest('[aria-live="polite"]')).not.toBeNull();
    expect(mocks.updateUserActivity).toHaveBeenCalled();
  });

  it("announces the practice matching result", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          matchingGames: [
            {
              id: "g1",
              language: "th",
              pairs: [
                {
                  id: "p1",
                  left: { id: "l1", content: "cat", type: "word" },
                  right: { id: "r1", content: "แมว", type: "translation" },
                },
              ],
            },
          ],
        }),
      }),
    );
    try {
      renderWithMessages(<MatchingGame deckId="d1" />);

      fireEvent.click(
        await screen.findByRole("button", { name: /start/i }),
      );
      fireEvent.click(
        await screen.findByRole("button", { name: /cat word/i }),
      );
      fireEvent.click(
        await screen.findByRole("button", { name: /แมว translation/i }),
      );

      const region = await screen.findByText(
        en.SentencesPage.matchingGame.results.perfect,
      );
      expect(region.closest('[aria-live="polite"]')).not.toBeNull();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("announces the flashcard session result", async () => {
    renderWithMessages(
      <FlashcardGameInline
        deck={{ id: "d1", name: "Animals", type: "VOCABULARY" }}
        cards={[
          { id: "c1", word: "cat", definition: { en: "a small animal" } },
        ]}
        onComplete={vi.fn()}
        onBack={vi.fn()}
      />,
    );

    fireEvent.click(
      await screen.findByRole("button", {
        name: en.SentencesPage.sentencesCard.flipCard,
      }),
    );
    fireEvent.click(
      await screen.findByRole("button", {
        name: en.SentencesPage.sentencesCard.good,
      }),
    );

    const heading = await screen.findByRole("heading", {
      name: new RegExp(
        en.SentencesPage.sentencesCard.studySessionComplete.replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&",
        ),
      ),
    });
    expect(heading.closest('[aria-live="polite"]')).not.toBeNull();
    expect(mocks.reviewCard).toHaveBeenCalledWith("c1", Rating.Good);
  });
});

describe("FR-4 clickable elements are keyboard-reachable", () => {
  it("opens classroom cards by keyboard", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          classrooms: [
            {
              id: "c1",
              name: "Class One",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              students: [],
            },
          ],
        }),
      }),
    );
    try {
      renderWithMessages(<ClassroomSelector />);
      const card = await screen.findByRole("link", { name: "Class One" });
      expect(card).toHaveAttribute("tabindex", "0");

      card.focus();
      fireEvent.keyDown(document.activeElement!, { key: "Enter" });

      expect(mocks.push).toHaveBeenCalledWith("/teacher/class-roster/c1");
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("opens article showcase cards by keyboard", () => {
    renderWithMessages(
      <ArticleShowcaseCard
        article={{
          id: "article-1",
          title: "River Crossing",
          summary: "A story about a river.",
        }}
      />,
    );

    const card = screen.getByRole("link", { name: "River Crossing" });
    expect(card).toHaveAttribute("tabindex", "0");
    card.focus();
    fireEvent.keyDown(document.activeElement!, { key: "Enter" });

    expect(mocks.push).toHaveBeenCalledWith("/student/read/article-1");
  });

  it("selects collection words by keyboard", async () => {
    const article = {
      sentencsAndWordsForFlashcard: [
        {
          words: [
            {
              vocabulary: "cat",
              definition: { en: "a small animal", th: "แมว" },
              timeSeconds: 0,
            },
            {
              vocabulary: "run",
              definition: { en: "move fast", th: "วิ่ง" },
              timeSeconds: 5,
            },
          ],
          wordsUrl: "words.mp3",
          sentence: [],
          audioSentencesUrl: "sentences.mp3",
        },
      ],
    } as never;

    renderWithMessages(<TaskCollection article={article} kind="vocabulary" />);
    const chip = await screen.findByRole("button", { name: "cat" });
    fireEvent.keyDown(chip, { key: "Enter" });
    expect(chip.className).toMatch(/border-blue-400/);

    cleanup();
    renderWithMessages(<TaskVocabularyCollection article={article} />);
    const vocabChip = await screen.findByRole("button", { name: "cat" });
    fireEvent.keyDown(vocabChip, { key: "Enter" });
    expect(vocabChip.className).toMatch(/border-blue-400/);
  });

  it("flips the flashcard face by keyboard", async () => {
    renderWithMessages(
      <FlashcardGameInline
        deck={{ id: "d1", name: "Animals", type: "VOCABULARY" }}
        cards={[
          { id: "c1", word: "cat", definition: { en: "a small animal" } },
        ]}
        onComplete={vi.fn()}
        onBack={vi.fn()}
      />,
    );

    const face = await screen.findByRole("button", {
      name: en.SentencesPage.sentencesCard.flipCard,
    });
    expect(face).toHaveAttribute("tabindex", "0");
    fireEvent.keyDown(face, { key: "Enter" });

    expect(
      await screen.findByRole("button", {
        name: en.SentencesPage.sentencesCard.good,
      }),
    ).toBeInTheDocument();
  });

  it("opens history rows by keyboard", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [
            {
              id: "a1",
              title: "River Story",
              scores: "90",
              updated_at: new Date().toISOString(),
              rated: 1,
              status: "READ",
            },
          ],
          pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
        }),
      }),
    );
    try {
      renderWithMessages(<HistoryTable variant="history" />);
      const cell = await screen.findByText("River Story");
      const row = cell.closest("tr")!;
      expect(row).toHaveAttribute("tabindex", "0");

      fireEvent.keyDown(row, { key: "Enter" });
      expect(mocks.push).toHaveBeenCalledWith("/student/read/a1");
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("selects report students and role cards by keyboard", async () => {
    renderWithMessages(
      <TeacherProgressReports
        classrooms={[]}
        students={[
          {
            id: "s1",
            display_name: "Somchai",
            email: "somchai@example.com",
            cefrLevel: "A1",
            xp: 10,
          },
        ]}
        currentUser={{ id: "t1" } as never}
      />,
    );
    const studentRow = await screen.findByRole("button", {
      name: "Somchai",
    });
    fireEvent.keyDown(studentRow, { key: "Enter" });
    expect(
      await screen.findByRole("heading", { name: "Somchai" }),
    ).toBeInTheDocument();

    cleanup();
    renderWithMessages(
      <ChangeRole userId="u1" userRole={"STUDENT" as never} />,
    );
    const teacherCard = await screen.findByRole("button", {
      name: "Teacher",
    });
    fireEvent.keyDown(teacherCard, { key: "Enter" });
    expect(
      screen.getByRole("button", { name: /update role to teacher/i }),
    ).toBeEnabled();
  });
});
