// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { createTranslator } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithMessages, testMessages, type TestLocale } from "@/components/__tests__/helpers/render-with-messages";

const mocks = vi.hoisted(() => ({
  locale: "en" as "en" | "th",
  user: null as Record<string, unknown> | null,
  getAvatarProfile: vi.fn(),
  getAvatarState: vi.fn(),
  listAvatarShop: vi.fn(),
  getBattleState: vi.fn(),
  getVoiceEntitlement: vi.fn(),
  fetchUserActivity: vi.fn(),
  getAllSentenceCards: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("@/lib/session", () => ({
  currentUser: async () => mocks.user,
  getCurrentUser: async () => mocks.user,
  getCurrentSession: async () => (mocks.user ? { user: mocks.user, authStrength: "full" } : null),
}));
vi.mock("@reading-advantage/db", () => ({ db: {} }));
vi.mock("@reading-advantage/domain/primary-avatar", () => ({
  getAvatarProfile: mocks.getAvatarProfile,
  getAvatarState: mocks.getAvatarState,
  listAvatarShop: mocks.listAvatarShop,
  toLaunchAvatar: () => null,
}));
vi.mock("@reading-advantage/domain/primary-quest", () => ({ getBattleState: mocks.getBattleState, questTemplate: () => undefined }));
vi.mock("@reading-advantage/domain/primary-voice", () => ({ getVoiceEntitlement: mocks.getVoiceEntitlement, voiceConfigFromEnv: () => ({ monthBudgetSeconds: 480 }) }));
vi.mock("@/server/controllers/userController", () => ({ fetchUserActivity: mocks.fetchUserActivity }));
vi.mock("@/actions/flashcard", () => ({ getAllSentenceCards: mocks.getAllSentenceCards }));
vi.mock("next-intl/server", async () => {
  const { testMessages: messages } = await import("@/components/__tests__/helpers/render-with-messages");
  return {
    getLocale: async () => mocks.locale,
    getTranslations: async (namespace?: string) =>
      createTranslator({ locale: mocks.locale, messages: messages[mocks.locale as TestLocale], namespace: namespace as never }),
  };
});
vi.mock("@/i18n/navigation", () => ({
  redirect: mocks.redirect,
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  Link: ({ children, href, ...rest }: { children?: ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("@/components/avatar/avatar-picker", () => ({
  AvatarPicker: ({ initial }: { initial: unknown }) => <div data-testid="picker" data-initial={JSON.stringify(initial)} />,
}));
vi.mock("@/components/avatar/avatar-home", () => ({ AvatarHome: () => <div data-testid="avatar-home" /> }));
vi.mock("@/components/avatar/avatar-shop", () => ({
  AvatarShop: (props: { items: unknown[]; gp: number; profile: { classId: string }; loadout: object }) => (
    <div data-testid="shop" data-items={props.items.length} data-gp={props.gp} data-class={props.profile.classId} data-loadout={JSON.stringify(props.loadout)} />
  ),
}));
vi.mock("@/components/student/history-list", () => ({ HistoryList: () => <div data-testid="history-list" /> }));
vi.mock("@/components/dashboard/report-panels", () => ({ ReportPanels: () => <div data-testid="report-panels" /> }));
vi.mock("@/components/flashcards/flashcard-dashboard", () => ({ default: () => <div data-testid="flashcard-dashboard" /> }));
vi.mock("@/components/practice/order-sentences-page", () => ({ default: () => null }));
vi.mock("@/components/practice/cloze-test-page", () => ({ default: () => null }));
vi.mock("@/components/practice/order-words-page", () => ({ default: () => null }));
vi.mock("@/components/practice/matching-page", () => ({ default: () => null }));
vi.mock("@/components/manage-tab", () => ({ default: () => null }));
vi.mock("@/components/reedy/reedy-session", () => ({ ReedySession: () => <div data-testid="session" /> }));
vi.mock("@/components/quest/battle-client", () => ({ BattleClient: () => <div data-testid="battle" /> }));

import AvatarPage from "../avatar/page";
import AvatarShopPage from "../avatar/shop/page";
import HistoryPage from "../history/page";
import ReportsPage from "../reports/page";
import SentencesPage from "../sentences/page";
import VocabularyPage from "../vocabulary/page";
import QuestBattlePage from "../quest/battle/page";
import ReedyPage from "../reedy/page";

const en = testMessages.en;
const staff = (role: string, schoolId: string | null = "school-1") => ({ id: "t1", username: "kru", name: "Kru", role, schoolId, xp: 900, level: 7, cefrLevel: "B1" });
const render = (ui: unknown) => renderWithMessages(ui as React.ReactElement, { locale: "en" });
const noStaffRows = () => {
  expect(mocks.getAvatarProfile).not.toHaveBeenCalled();
  expect(mocks.getAvatarState).not.toHaveBeenCalled();
  expect(mocks.getBattleState).not.toHaveBeenCalled();
  expect(mocks.getVoiceEntitlement).not.toHaveBeenCalled();
  expect(mocks.fetchUserActivity).not.toHaveBeenCalled();
  expect(mocks.getAllSentenceCards).not.toHaveBeenCalled();
  expect(mocks.redirect).not.toHaveBeenCalled();
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.locale = "en";
  mocks.listAvatarShop.mockResolvedValue([{ id: "hat" }, { id: "boots" }]);
});
afterEach(cleanup);

describe.each(["TEACHER", "ADMIN", "SYSTEM"])("student pages in Preview mode for %s", (role) => {
  beforeEach(() => {
    mocks.user = staff(role, role === "SYSTEM" ? null : "school-1");
  });

  it("avatar: the picker opens with no saved hero, and no avatar row is read", async () => {
    render(await AvatarPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByTestId("picker")).toHaveAttribute("data-initial", "null");
    expect(screen.queryByTestId("avatar-home")).not.toBeInTheDocument();
    noStaffRows();
  });

  it("shop: the pieces show for the default hero with zero coins", async () => {
    render(await AvatarShopPage());
    const shop = screen.getByTestId("shop");
    expect(shop).toHaveAttribute("data-items", "2");
    expect(shop).toHaveAttribute("data-gp", "0");
    expect(shop).toHaveAttribute("data-class", "knight");
    expect(shop).toHaveAttribute("data-loadout", "{}");
    noStaffRows();
  });

  it("history: the empty notice shows and the list of the staff member does not", async () => {
    render(await HistoryPage());
    expect(screen.getByText(en.StudentView.emptyHistory)).toBeInTheDocument();
    expect(screen.queryByTestId("history-list")).not.toBeInTheDocument();
    noStaffRows();
  });

  it("reports: the empty notice shows and the activity is not read", async () => {
    render(await ReportsPage());
    expect(screen.getByText(en.StudentView.emptyReports)).toBeInTheDocument();
    expect(screen.queryByTestId("report-panels")).not.toBeInTheDocument();
    noStaffRows();
  });

  it("sentences: the empty notice shows and no card is read", async () => {
    render(await SentencesPage());
    expect(screen.getByText(en.StudentView.emptySentences)).toBeInTheDocument();
    expect(screen.queryByTestId("flashcard-dashboard")).not.toBeInTheDocument();
    noStaffRows();
  });

  it("vocabulary: the empty notice shows and no deck is shown", async () => {
    render(await VocabularyPage());
    expect(screen.getByText(en.StudentView.emptyVocabulary)).toBeInTheDocument();
    expect(screen.queryByTestId("flashcard-dashboard")).not.toBeInTheDocument();
    noStaffRows();
  });

  it("Class Quest battle: the not-in-a-class state shows and no battle starts", async () => {
    render(await QuestBattlePage());
    expect(screen.getByText(en.StudentView.questNoClass)).toBeInTheDocument();
    expect(screen.queryByTestId("battle")).not.toBeInTheDocument();
    noStaffRows();
  });

  it("Reedy: only students talk to Reedy and no session starts", async () => {
    render(await ReedyPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByText(en.StudentView.reedyStudentsOnly)).toBeInTheDocument();
    expect(screen.queryByTestId("session")).not.toBeInTheDocument();
    noStaffRows();
  });
});

describe("student pages for a student", () => {
  it("keeps the vocabulary deck and the history list", async () => {
    mocks.user = { id: "s1", username: "ann", name: "Ann", role: "STUDENT", schoolId: "school-1" };
    render(await VocabularyPage());
    expect(screen.getByTestId("flashcard-dashboard")).toBeInTheDocument();
    cleanup();
    render(await HistoryPage());
    expect(screen.getAllByTestId("history-list")).toHaveLength(2);
    expect(screen.queryByText(en.StudentView.emptyHistory)).not.toBeInTheDocument();
  });
});
