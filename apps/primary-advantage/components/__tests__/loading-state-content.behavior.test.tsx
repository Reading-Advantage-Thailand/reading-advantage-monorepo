// @vitest-environment jsdom
/**
 * Behavioral replacements for the loading-state-invariants content cases
 * (FR-3 launch phase, FR-8 role colours, FR-7 locale lookups, FR-11 admin
 * error states, FR-4 stable grid keys).
 *
 * Mapping to the deleted static cases in loading-state-invariants.test.ts:
 * - FR-3 reads no window.location.search during render -> host renders the
 *   loading phase while the search-params reader throws when called.
 * - FR-3 derives the launch phase from a mode prop -> demo/briefing phases
 *   captured from the stubbed game host.
 * - FR-8 builds no Tailwind class by interpolation -> selected badges carry
 *   complete static colour tokens.
 * - FR-8 uses a static colour lookup map -> selecting each role resolves the
 *   map entry for its colour.
 * - FR-7 sentence/vocabulary/deep-reading locale lookups -> each component
 *   renders the locale's own string.
 * - FR-11 error state instead of mock activity -> failed activity fetch
 *   renders the error text with no mock names.
 * - FR-11 error state instead of fallback KPIs -> extended here: failed stats
 *   fetch renders the error text, and a successful fetch renders live counts
 *   with an em dash for growth (no fabricated 12.5). The sibling
 *   loading-state-behavior.test.tsx failure-path test stays authoritative.
 * - FR-4 keys grid cards by stable article id -> reordered grid keeps per-card
 *   state on the same article id.
 */
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import viMessages from "../../messages/vi.json";

const {
  pushMock,
  refreshMock,
  fetchMock,
  searchParamsMock,
} = vi.hoisted(() => ({
  pushMock: vi.fn(),
  refreshMock: vi.fn(),
  fetchMock: vi.fn(),
  searchParamsMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: searchParamsMock,
  useParams: () => ({ locale: "en" }),
  usePathname: () => "/",
  useRouter: () => ({ push: pushMock, back: vi.fn(), refresh: refreshMock }),
  notFound: () => {
    throw new Error("not found");
  },
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
  useRouter: () => ({ push: pushMock, back: vi.fn(), refresh: refreshMock }),
  usePathname: () => "/",
}));

vi.mock("@reading-advantage/auth-client", () => ({
  useAuth: () => ({ user: null, refresh: vi.fn() }),
  useSession: () => ({ user: null }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock("@reading-advantage/advantage-play-kit", () => ({
  createBrowserAudioClipPorts: () => ({}),
  createAnswerChoiceAudioController: () => ({}),
}));

vi.mock("@reading-advantage/advantage-play-kit/presentation", () => ({
  RpgRewardDisclosure: () => null,
  RpgUnlockNotice: () => null,
  resolveRpgRewardAssetUrls: () => ({}),
}));

const launchPhaseProbe = vi.hoisted(() => ({ phase: "" as string }));

vi.mock("@reading-advantage/advantage-play-kit/react", () => ({
  useStudentChallengeRun: () => ({
    launch: null,
    failureMessage: null,
    retry: vi.fn(),
  }),
  useStudentRpg: () => ({
    state: null,
    pendingCosmeticId: null,
    failureMessage: null,
    newlyUnlockedCosmetics: [],
    retry: vi.fn(),
    equip: vi.fn(),
    beginSession: vi.fn(),
    refreshAfterSavedCompletion: vi.fn(),
  }),
  APKGameHost: ({ launchPhase }: { launchPhase: string }) => {
    launchPhaseProbe.phase = launchPhase;
    return null;
  },
}));

vi.mock("@reading-advantage/game-cartridges", () => ({
  cartridgeLoaders: {
    "test-game": async () => ({
      manifest: {
        id: "test-game",
        inputMode: "vocabulary",
        requiredAssetBindings: [],
      },
      standardExperience: {},
    }),
  },
  CARTRIDGE_CHALLENGE_CAPABILITIES: {},
  createCatalogStandardEdition: () => ({}),
}));

vi.mock("../articles/article-showcase-card", async () => {
  const React = await import("react");
  return {
    __esModule: true,
    default: function ShowcaseCardProbe({
      article,
    }: {
      article: { id: string; title: string };
    }) {
      const [taps, setTaps] = React.useState(0);
      return (
        <div data-testid={`article-card-${article.id}`}>
          <span>{article.title}</span>
          <button type="button" onClick={() => setTaps((count) => count + 1)}>
            tap-{article.id}-{taps}
          </button>
        </div>
      );
    },
  };
});

import { StudentCartridgeHost } from "../apk/StudentCartridgeHost";
import ChangeRole from "../shared/change-role";
import Sentence from "../articles/sentence";
import TaskVocabularyCollection from "../lesson/task/task-vocabulary-collection";
import { TaskReading } from "../lesson/task/task-reading";
import { AdminStatsCards } from "../admin/admin-stats-cards";
import { AdminRecentActivity } from "../admin/admin-recent-activity";
import ArticleSelect from "../articles/article-select";
import type { Article } from "@/types";
import { Role } from "@/types/enum";
import { renderWithMessages, testMessages, withMessages } from "./helpers/render-with-messages";

/** Real English copy used for user-facing assertions. */
const en = testMessages.en;

beforeEach(() => {
  vi.clearAllMocks();
  launchPhaseProbe.phase = "";
  searchParamsMock.mockImplementation(() => ({ get: () => null }));
  fetchMock.mockRejectedValue(new Error("network disabled"));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

/**
 * Props shared by the cartridge host renders below.
 */
function hostProps(mode?: "demo" | "briefing") {
  return {
    cartridgeId: "test-game",
    title: "Test Game",
    description: "desc",
    inputMode: "vocabulary" as const,
    locale: "en",
    ...(mode ? { mode } : {}),
  };
}

describe("FR-3 student cartridge launch phase", () => {
  it("renders the loading phase without reading window.location.search", async () => {
    searchParamsMock.mockImplementation(() => {
      throw new Error("search params must not be read during render");
    });
    renderWithMessages(<StudentCartridgeHost {...hostProps()} />);
    expect(screen.getByText("Loading student content...")).toBeInTheDocument();
    expect(
      await screen.findByRole("button", { name: "Retry" }),
    ).toBeInTheDocument();
    expect(searchParamsMock).not.toHaveBeenCalled();
  });

  it("derives demo and briefing phases from the mode prop", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [{ term: "cat", translation: "แมว" }],
      }),
    });
    const { unmount } = renderWithMessages(
      <StudentCartridgeHost {...hostProps("demo")} />,
    );
    await waitFor(() => expect(launchPhaseProbe.phase).toBe("demo"));
    unmount();
    cleanup();

    launchPhaseProbe.phase = "";
    renderWithMessages(<StudentCartridgeHost {...hostProps()} />);
    await waitFor(() => expect(launchPhaseProbe.phase).toBe("briefing"));
  });
});

describe("FR-8 change-role static colour classes", () => {
  it("resolves the selected badge to a complete static colour token", () => {
    renderWithMessages(
      <ChangeRole userId="user-1" userRole={Role.student} />,
    );
    const teacher = screen.getByRole("button", { name: "Teacher" });
    fireEvent.click(teacher);
    expect(teacher.className).toContain("dark:bg-blue-900");
    expect(teacher.className).not.toContain("${");
  });

  it("resolves every role badge from the static colour map", () => {
    renderWithMessages(
      <ChangeRole userId="user-1" userRole={Role.student} />,
    );
    const student = screen.getByRole("button", { name: "Student" });
    const teacher = screen.getByRole("button", { name: "Teacher" });
    // The current role starts selected with the map's selected blue entry.
    expect(student.className).toContain("dark:bg-blue-900");
    fireEvent.click(teacher);
    // Selection moves the selected entry to the teacher badge.
    expect(teacher.className).toContain("dark:bg-blue-900");
    expect(teacher.className).toContain("hover:dark:bg-blue-800");
    expect(student.className).toContain("hover:dark:bg-blue-900");
    expect(student.className).not.toContain("hover:dark:bg-blue-800");
  });
});

describe("FR-7 locale-aware content lookups", () => {
  it("shows the Thai sentence translation for the th locale", async () => {
    renderWithMessages(
      <Sentence
        sentences={[
          {
            sentence: "Hello world",
            translation: { th: "สวัสดีชาวโลก", cn: "你好", tw: "你好", vi: "xin chào" },
            timeSeconds: 0,
            startTime: 0,
            endTime: 10,
            audioUrl: "/audio/sentences.mp3",
          },
        ]}
        audioUrl="/audio/sentences.mp3"
      />,
      { locale: "th" },
    );
    fireEvent.click(screen.getByRole("button", { name: /ประโยค/ }));
    expect(await screen.findByText("สวัสดีชาวโลก")).toBeInTheDocument();
  });

  it("shows the Vietnamese definition for the vi locale", async () => {
    const article = {
      sentencsAndWordsForFlashcard: [
        {
          words: [
            {
              vocabulary: "cat",
              definition: { en: "a small animal", vi: "con mèo" },
              timeSeconds: 0,
            },
          ],
        },
      ],
    } as unknown as Article;
    render(
      <NextIntlClientProvider
        locale="vi"
        messages={viMessages as unknown as Record<string, unknown> as never}
      >
        <TaskVocabularyCollection article={article} />
      </NextIntlClientProvider>,
    );
    expect(await screen.findByText("con mèo")).toBeInTheDocument();
  });

  it("shows the locale's own deep-reading translation", async () => {
    const article = {
      id: "article-1",
      title: "A Test Story",
      passage: "Alpha beta.",
      translatedPassage: { en: ["EN translation."], th: ["คำแปลภาษาไทย."] },
      sentences: [
        {
          sentence: "Alpha beta.",
          startTime: 0,
          endTime: 3,
          words: [
            { word: "Alpha", start: 0, end: 1 },
            { word: "beta.", start: 1, end: 2 },
          ],
        },
      ],
    } as unknown as Article;

    const { unmount } = renderWithMessages(
      <TaskReading article={article} enableTranslation />,
      { locale: "th" },
    );
    fireEvent.click(screen.getByRole("button", { name: /ปิดการแปล/ }));
    fireEvent.click(screen.getByText("Alpha"));
    expect(await screen.findByText("คำแปลภาษาไทย.")).toBeInTheDocument();
    unmount();
    cleanup();

    renderWithMessages(<TaskReading article={article} enableTranslation />);
    fireEvent.click(screen.getByRole("button", { name: /Translation Off/ }));
    fireEvent.click(screen.getByText("Alpha"));
    expect(await screen.findByText("EN translation.")).toBeInTheDocument();
  });
});

describe("FR-11 admin error states instead of fabricated fallbacks", () => {
  it("renders an error without mock activity names when the fetch fails", async () => {
    fetchMock.mockRejectedValue(new Error("activity down"));
    renderWithMessages(<AdminRecentActivity />);
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(
      await screen.findByText(en.AdminDashboard.recentActivity.loadError),
    ).toBeInTheDocument();
    expect(screen.queryByText("Sarah Johnson")).not.toBeInTheDocument();
  });

  it("renders live stats counts with an em dash for growth", async () => {
    fetchMock.mockImplementation((url: string) => {
      if (String(url).includes("/api/teachers"))
        return Promise.resolve({
          ok: true,
          json: async () => ({ pagination: { total: 7 } }),
        });
      if (String(url).includes("/api/students"))
        return Promise.resolve({
          ok: true,
          json: async () => ({ pagination: { total: 42 } }),
        });
      return Promise.resolve({
        ok: true,
        json: async () => ({ totalArticles: 13 }),
      });
    });
    renderWithMessages(<AdminStatsCards />);
    expect(await screen.findByText("7")).toBeInTheDocument();
    expect(await screen.findByText("42")).toBeInTheDocument();
    expect(await screen.findByText("13")).toBeInTheDocument();
    expect(await screen.findByText("—")).toBeInTheDocument();
    expect(screen.queryByText("12.5%")).not.toBeInTheDocument();
  });
});

describe("FR-4 article-select stable grid keys", () => {
  it("keeps per-card state on the same article id after a reorder", async () => {
    const articles = [
      { id: "a0", title: "Title 0", type: null, genre: null },
      { id: "a1", title: "Title 1", type: null, genre: null },
      { id: "a2", title: "Title 2", type: null, genre: null },
    ];
    const { rerender } = renderWithMessages(
      <ArticleSelect initialArticles={articles} total={3} />,
    );
    fireEvent.click(await screen.findByText("tap-a0-0"));
    expect(await screen.findByText("tap-a0-1")).toBeInTheDocument();

    rerender(
      withMessages(
        <ArticleSelect
          initialArticles={[articles[2], articles[0], articles[1]]}
          total={3}
        />,
      ),
    );
    // The tap count follows article a0 to its new position.
    const cards = screen.getAllByText(/Title \d/);
    expect(cards.map((card) => card.textContent)).toEqual([
      "Title 2",
      "Title 0",
      "Title 1",
    ]);
    expect(await screen.findByText("tap-a0-1")).toBeInTheDocument();
    expect(screen.getByText("tap-a2-0")).toBeInTheDocument();
  });
});
