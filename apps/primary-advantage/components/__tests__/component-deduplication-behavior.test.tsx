// @vitest-environment jsdom
/**
 * Behavioral replacements for the component-deduplication source-text cases.
 * Each test renders the merged component (or invokes the shared helper) and
 * asserts the runtime divergence the fork pair used to split on.
 *
 * Mapping to the deleted static cases:
 * - cloze/flashcard/matching prop checks: already pinned by the
 *   merge-characterization suites, deleted without duplication here.
 * - reading enableTranslation, progress source, history variant, school mode,
 *   collection kind, shared helpers, helper wiring, sharedMainNav, DataTable
 *   shell, canonical renames: covered below.
 */
import "@testing-library/jest-dom/vitest";
import {
  act,
  fireEvent,
  renderHook,
  screen,
  waitFor,
} from "@testing-library/react";
import { createRequire } from "node:module";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  pushMock,
  refreshMock,
  authRefreshMock,
  fetchMock,
  toastMock,
  getLessonClozeTestSentencesMock,
  updateUserActivityMock,
  cefrColorSpy,
  formatTimeSpy,
} = vi.hoisted(() => ({
  pushMock: vi.fn(),
  refreshMock: vi.fn(),
  authRefreshMock: vi.fn(),
  fetchMock: vi.fn(),
  toastMock: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
  getLessonClozeTestSentencesMock: vi.fn(),
  updateUserActivityMock: vi.fn(),
  cefrColorSpy: vi.fn(),
  formatTimeSpy: vi.fn(),
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({
    children,
    href,
    ...rest
  }: {
    children: React.ReactNode;
    href: string;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
  useRouter: () => ({
    push: pushMock,
    back: vi.fn(),
    refresh: refreshMock,
    replace: vi.fn(),
  }),
  usePathname: () => "/en",
}));

vi.mock("@reading-advantage/auth-client", () => ({
  useAuth: () => ({ refresh: authRefreshMock }),
  useSession: () => ({
    user: {
      id: "user-1",
      username: "user-1",
      name: "User One",
      role: "STUDENT",
      schoolId: "school-1",
      xp: 0,
      level: 1,
      cefrLevel: "B1",
    },
  }),
}));

vi.mock("sonner", () => ({ toast: toastMock }));

vi.mock("@/lib/cefr", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/cefr")>();
  return {
    ...actual,
    getCefrLevelColor: (...args: Parameters<typeof actual.getCefrLevelColor>) => {
      cefrColorSpy(...args);
      return actual.getCefrLevelColor(...args);
    },
  };
});

vi.mock("@/lib/format-time", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/format-time")>();
  return {
    ...actual,
    formatTime: (...args: Parameters<typeof actual.formatTime>) => {
      formatTimeSpy(...args);
      return actual.formatTime(...args);
    },
  };
});

vi.mock("@/actions/flashcard", () => ({
  getLessonFlashcards: vi.fn(),
  getLessonClozeTestSentences: getLessonClozeTestSentencesMock,
  saveArticleToFlashcard: vi.fn(),
  reviewCard: vi.fn(),
}));

vi.mock("@/actions/user", () => ({
  updateUserActivity: updateUserActivityMock,
}));

import type { Article } from "@/types";
import { shuffle } from "@/lib/shuffle";
import { formatTime, formatTimePadded } from "@/lib/format-time";
import { getCefrLevelColor } from "@/lib/cefr";
import { STAFF_ROLES, isStaffRole } from "@/lib/permissions";
import { useDebounce } from "@/hooks/use-debounce";
import { TaskReading } from "@/components/lesson/task/task-reading";
import LessonProgressBar from "@/components/lesson/lesson-progress-bar";
import { QuizContextProvider } from "@/contexts/question-context";
import { HistoryTable } from "@/components/dashboard/history-table";
import { SchoolForm } from "@/components/school/school-form";
import { TaskCollection } from "@/components/lesson/task/task-collection";
import EnrollmentManagement from "@/components/teacher/enrollment-management";
import { SentenceClozeGame } from "@/components/lesson/games/lesson-sentence-cloze-test";
import { DataTable } from "@/components/ui/data-table";
import { sharedMainNav } from "../../configs/main-nav";
import { adminPageConfig } from "../../configs/admin-page-config";
import { indexPageConfig } from "../../configs/index-page-config";
import { studentPageConfig } from "../../configs/student-page-config";
import { systemPageConfig } from "../../configs/system-page-config";
import { teacherPageConfig } from "../../configs/teacher-page-config";
import {
  renderWithMessages,
  testMessages,
  withMessages,
} from "./helpers/render-with-messages";

/** Real English copy used for user-facing assertions. */
const en = testMessages.en;
const require = createRequire(import.meta.url);

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/**
 * Minimal article accepted by the reading, progress, and collection tasks.
 */
function baseArticle(): Article {
  return {
    id: "article-1",
    title: "A Test Story",
    summary: "A short summary.",
    translatedSummary: null,
    translatedPassage: null,
    imageDescription: "",
    passage: "Alpha beta gamma.",
    createdAt: new Date(0),
    rating: 1,
    type: "story",
    cefrLevel: "A1",
    raLevel: 1,
    genre: "fiction",
    audioUrl: "/audio/article-1.mp3",
    sentences: [
      {
        sentence: "Alpha beta gamma.",
        startTime: 0,
        endTime: 3,
        words: [
          { word: "Alpha", start: 0, end: 1 },
          { word: "beta", start: 1, end: 2 },
          { word: "gamma.", start: 2, end: 3 },
        ],
      },
    ],
  };
}

/**
 * Article carrying both a vocabulary list and a sentence list.
 */
function collectionArticle(): Article {
  return {
    ...baseArticle(),
    sentencsAndWordsForFlashcard: [
      {
        words: [
          {
            vocabulary: "cat",
            definition: { en: "a small animal" },
            timeSeconds: 0,
          },
        ],
        wordsUrl: "words.mp3",
        sentence: [
          {
            sentence: "The cat sleeps.",
            timeSeconds: 0,
            translation: { en: "The cat sleeps." },
          },
        ],
        audioSentencesUrl: "sentences.mp3",
      },
    ],
  } as unknown as Article;
}

describe("merged reading task behind enableTranslation", () => {
  it("hides the translation toggle for first-reading mode", () => {
    renderWithMessages(
      <TaskReading article={baseArticle()} enableTranslation={false} />,
    );
    expect(screen.getByText("First Reading")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Translation/ }),
    ).not.toBeInTheDocument();
  });

  it("shows deep-reading mode and toggles the translation overlay", () => {
    renderWithMessages(
      <TaskReading article={baseArticle()} enableTranslation />,
    );
    expect(screen.getByText("Deep Reading")).toBeInTheDocument();

    const toggle = screen.getByRole("button", { name: /Translation Off/ });
    fireEvent.click(toggle);
    expect(
      screen.getByRole("button", { name: /Translation On/ }),
    ).toBeInTheDocument();
  });
});

describe("merged progress bar behind source", () => {
  const progressResponse = (progress: number) => ({
    ok: true,
    json: async () => ({
      userLessonProgress: { progress, timeSpent: 5 },
    }),
  });

  /**
   * Renders the progress bar inside the real quiz and message providers.
   */
  function renderBar(ui: React.ReactElement) {
    return renderWithMessages(
      withMessages(
        <QuizContextProvider>{ui}</QuizContextProvider>,
        "en",
      ),
    );
  }

  it("loads assignment progress from the assignment endpoint", async () => {
    fetchMock.mockResolvedValue(progressResponse(10));
    renderBar(
      <LessonProgressBar
        source="assignment"
        assignment={{
          id: "assign-1",
          name: "Assign One",
          description: "",
          createdAt: new Date(0),
          updatedAt: new Date(0),
          classroomId: "class-1",
          articleId: "article-1",
          teacherId: "teacher-1",
          teacherName: "Teacher",
          dueDate: new Date(0),
          article: collectionArticle(),
        }}
      />,
    );

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith("/api/assignments/assign-1/progress"),
    );
    expect(
      await screen.findByText(en.Lesson.PreviewVocabulary.title),
    ).toBeInTheDocument();
  });

  it("loads standalone progress from the lesson endpoint", async () => {
    fetchMock.mockResolvedValue(progressResponse(0));
    renderBar(
      <LessonProgressBar source="article" article={baseArticle()} />,
    );

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith("/api/lessons/article-1/progress"),
    );
    expect(await screen.findByText("A Test Story")).toBeInTheDocument();
  });
});

describe("merged history table behind variant", () => {
  const row = {
    id: "a1",
    title: "River Story",
    scores: "90",
    updated_at: new Date(0).toISOString(),
    rated: 1,
    status: "READ",
  };

  it("searches article records with pagination in history mode", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [row],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
      }),
    });
    renderWithMessages(<HistoryTable variant="history" />);

    expect(await screen.findByText("River Story")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("article-records"),
    );
    expect(
      screen.getByPlaceholderText(en.Student.history.searchPlaceholder),
    ).toBeInTheDocument();
  });

  it("lists the reminder queue without search in reminder mode", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
    });
    renderWithMessages(<HistoryTable variant="reminder" />);

    expect(
      await screen.findByText(en.Student.history.noArticlesToRead),
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("reminder-reread"),
    );
    expect(
      screen.queryByPlaceholderText(en.Student.history.searchPlaceholder),
    ).not.toBeInTheDocument();
  });
});

describe("merged school form behind mode", () => {
  it("creates a school with POST in create mode", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ name: "New School" }),
    });
    const onSuccess = vi.fn();
    renderWithMessages(<SchoolForm mode="create" onSuccess={onSuccess} />);

    expect(
      screen.getByText(en.Settings.schoolProfile.createSchool),
    ).toBeInTheDocument();
    fireEvent.change(
      screen.getByPlaceholderText(
        en.Settings.schoolProfile.schoolNamePlaceholder,
      ),
      { target: { value: "New School" } },
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: en.Settings.schoolProfile.createSchoolButton,
      }),
    );

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/users/me/school",
        expect.objectContaining({ method: "POST" }),
      ),
    );
    expect(onSuccess).toHaveBeenCalled();
  });

  it("updates a school with PATCH and prefilled values in edit mode", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ name: "Old School" }),
    });
    const onSuccess = vi.fn();
    renderWithMessages(
      <SchoolForm
        mode="edit"
        school={{
          id: "school-1",
          name: "Old School",
          contactName: "Ann",
          contactEmail: "ann@example.com",
        }}
        onSuccess={onSuccess}
      />,
    );

    expect(
      screen.getByText(en.Settings.schoolProfile.editSchool),
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue("Old School")).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", {
        name: en.Settings.schoolProfile.updateSchoolButton,
      }),
    );

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/users/me/school",
        expect.objectContaining({ method: "PATCH" }),
      ),
    );
    expect(onSuccess).toHaveBeenCalled();
  });
});

describe("merged collection task behind kind", () => {
  it("collects vocabulary words in vocabulary mode", async () => {
    renderWithMessages(
      <TaskCollection article={collectionArticle()} kind="vocabulary" />,
    );
    expect(
      await screen.findByText(en.Lesson.PreviewVocabulary.title),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "cat" })).toBeInTheDocument();
  });

  it("collects sentences in sentence mode", async () => {
    renderWithMessages(
      <TaskCollection article={collectionArticle()} kind="sentence" />,
    );
    expect(
      await screen.findByText(en.Lesson.SentenceCollection.title),
    ).toBeInTheDocument();
    expect(screen.getAllByText("The cat sleeps.")).not.toHaveLength(0);
  });
});

describe("shared helpers", () => {
  it("shuffles without losing items or mutating the input", () => {
    const input = [1, 2, 3, 4, 5];
    const output = shuffle(input);
    expect(output).not.toBe(input);
    expect([...output].sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it("formats timer seconds as m:ss", () => {
    expect(formatTime(0)).toBe("0:00");
    expect(formatTime(65)).toBe("1:05");
    expect(formatTimePadded(65)).toBe("01:05");
  });

  it("resolves CEFR badge colours per level", () => {
    expect(getCefrLevelColor("B1")).toBe("bg-yellow-100 text-yellow-800");
    expect(getCefrLevelColor("C2")).toBe("bg-purple-100 text-purple-800");
    expect(getCefrLevelColor(null)).toBe("bg-gray-100 text-gray-800");
    expect(getCefrLevelColor("unknown")).toBe("bg-gray-100 text-gray-800");
  });

  it("checks staff roles against the shared role list", () => {
    expect(STAFF_ROLES).toContain("TEACHER");
    expect(isStaffRole("TEACHER")).toBe(true);
    expect(isStaffRole("STUDENT")).toBe(false);
    expect(isStaffRole(null)).toBe(false);
  });

  it("debounces rapid values to the trailing edge", () => {
    vi.useFakeTimers();
    try {
      const { result, rerender } = renderHook(
        ({ value }: { value: string }) => useDebounce(value, 300),
        { initialProps: { value: "" } },
      );
      rerender({ value: "a" });
      rerender({ value: "ab" });
      expect(result.current).toBe("");
      act(() => {
        vi.advanceTimersByTime(500);
      });
      expect(result.current).toBe("ab");
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("shared helper wiring in consumers", () => {
  it("colours the enrollment badge through the shared CEFR helper", async () => {
    renderWithMessages(
      <EnrollmentManagement
        classroomId="class-1"
        classroomName="Class One"
        enrolledStudents={[
          {
            id: "s1",
            name: "Ann",
            email: "ann@example.com",
            cefrLevel: "B1",
            level: 2,
            xp: 10,
            enrolled: true,
          },
        ]}
      />,
    );

    const badge = await screen.findByText("B1");
    expect(cefrColorSpy).toHaveBeenCalledWith("B1");
    expect(badge.className).toContain("bg-yellow-100");
  });

  it("formats the cloze timer through the shared formatTime helper", async () => {
    getLessonClozeTestSentencesMock.mockResolvedValue({
      clozeTests: [
        {
          id: "cloze-1",
          articleId: "article-1",
          articleTitle: "Lesson Cloze Article",
          sentence: "The dog is very fast.",
          blanks: [],
          difficulty: "medium",
        },
      ],
      totalTests: 1,
    });
    renderWithMessages(
      <SentenceClozeGame source="lesson" articleId="article-1" />,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Start Game" }));

    expect(await screen.findAllByText("0:00")).not.toHaveLength(0);
    expect(formatTimeSpy).toHaveBeenCalled();
  });
});

describe("shared main nav in page configs", () => {
  it("spreads every shared entry into each page config", () => {
    const configs = [
      adminPageConfig,
      indexPageConfig,
      studentPageConfig,
      systemPageConfig,
      teacherPageConfig,
    ];
    expect(configs).toHaveLength(5);
    for (const config of configs) {
      const hrefs = config.mainNav.map((item) => item.href);
      for (const entry of sharedMainNav) {
        expect(hrefs).toContain(entry.href);
      }
    }
  });
});

describe("shared DataTable shell", () => {
  it("paginates rows and exposes page controls to the footer", async () => {
    const rows = Array.from({ length: 12 }, (_, index) => ({
      name: `Row ${index + 1}`,
    }));
    renderWithMessages(
      <DataTable
        columns={[
          {
            accessorKey: "name",
            header: "Name",
            cell: ({ row }) => row.getValue("name") as string,
          },
        ]}
        data={rows}
        footer={(api) => (
          <div>
            <span>
              Page {api.pageIndex + 1} of {api.pageCount}
            </span>
            <button type="button" onClick={() => api.nextPage()}>
              Next
            </button>
          </div>
        )}
      />,
    );

    expect(screen.getByText("Row 1")).toBeInTheDocument();
    expect(screen.getByText("Row 10")).toBeInTheDocument();
    expect(screen.queryByText("Row 11")).not.toBeInTheDocument();
    expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    expect(await screen.findByText("Row 11")).toBeInTheDocument();
    expect(screen.getByText("Page 2 of 2")).toBeInTheDocument();
  });
});

describe("canonical rename paths", () => {
  it("resolves the canonical modules and not the typo paths", () => {
    expect(() =>
      require.resolve("../practice/cloze-test-page.tsx"),
    ).not.toThrow();
    expect(() =>
      require.resolve("../../server/utils/generators/article-generator.ts"),
    ).not.toThrow();
    expect(() => require.resolve("../../actions/signinAction.ts")).not.toThrow();
    expect(() => require.resolve("../pratice")).toThrow();
    expect(() => require.resolve("../../server/utils/genaretors")).toThrow();
    expect(() => require.resolve("../../actions/singinAction.ts")).toThrow();
  });
});
