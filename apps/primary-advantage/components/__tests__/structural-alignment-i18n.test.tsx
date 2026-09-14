// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { NextIntlClientProvider } from "next-intl";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  logout: vi.fn(),
  login: vi.fn(),
  fetchStudentsByClassCode: vi.fn(),
  currentUser: vi.fn(),
  getCurrentUser: vi.fn(),
  getTranslations: vi.fn(),
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
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  redirect: (args: { href: string; locale: string }) => {
    throw new Error(`redirect:${args.locale}:${args.href}`);
  },
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => ({ get: () => null }),
  useParams: () => ({ locale: "en" }),
  notFound: () => {
    throw new Error("notFound");
  },
}));

vi.mock("next-intl/server", () => ({
  getTranslations: mocks.getTranslations,
}));

vi.mock("@reading-advantage/auth-client", () => ({
  useAuth: () => ({
    user: null,
    refresh: vi.fn(),
    logout: mocks.logout,
    login: mocks.login,
  }),
  useSession: () => ({ user: null }),
}));

vi.mock("@/lib/session", () => ({
  currentUser: mocks.currentUser,
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock("@/actions/classroom", () => ({
  fetchStudentsByClassCode: mocks.fetchStudentsByClassCode,
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
  APKGameHost: ({ onNavigate }: { onNavigate: (d: string) => void }) => (
    <button type="button" onClick={() => onNavigate("catalog")}>
      stub-game-host
    </button>
  ),
  StudentRpgCatalogPanel: () => null,
  StudentChallengeCatalogPanel: () => null,
  TeacherChallengePanel: () => null,
}));

vi.mock("@reading-advantage/game-cartridges", () => ({
  cartridgeLoaders: {
    "wizard-vs-zombie": async () => ({
      manifest: {
        id: "wizard-vs-zombie",
        inputMode: "vocabulary",
        requiredAssetBindings: [],
      },
      standardExperience: {},
    }),
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
  getCartridgeCatalogEntry: () => undefined,
  cartridgeCatalog: [
    { id: "wizard-vs-zombie", title: "Wizard vs Zombie", description: " duel" },
  ],
}));

vi.mock("@/components/teacher/my-classes", () => ({
  default: () => null,
}));

vi.mock("@/components/switchers/theme-switcher-toggle", () => ({
  ThemeToggle: () => null,
}));

vi.mock("@/components/switchers/locale-switcher", () => ({
  LocaleSwitcher: () => null,
}));

import { StudentCartridgeHost } from "../apk/StudentCartridgeHost";
import { UserAccountNav } from "../nav/user-account-nav";
import { StudentSignInForm } from "../auth/student-signin-form";
import { TeacherSignInForm } from "../auth/teacher-signin-form";
import { Footer } from "../index/footer";
import { EditLicenseForm } from "../system/edit-license-form";
import { CreateSchoolForm } from "../system/create-school-form";
import TeacherDashboard from "../../app/[locale]/teacher/dashboard/page";
import LessonPage from "../../app/[locale]/(student)/student/lesson/[id]/page";
import UserProfilePage from "../../app/[locale]/(student)/settings/user-profile/page";
import ReadPage from "../../app/[locale]/(student)/student/read/[articleId]/page";
import PrimaryStudentGamesPage from "../../app/[locale]/(student)/student/games/page";
import MyClassesPage from "../../app/[locale]/teacher/my-classes/page";
import TeacherGameChallengesPage from "../../app/[locale]/teacher/game-challenges/page";
import type { LicenseWithSchool } from "@/types";
import {
  renderWithMessages,
  testMessages,
} from "./helpers/render-with-messages";
import enMessages from "../../messages/en.json";
import thMessages from "../../messages/th.json";

const en = testMessages.en;
const th = testMessages.th;

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

beforeEach(() => {
  vi.clearAllMocks();
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
  window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal(
    "fetch",
    vi.fn().mockRejectedValue(new Error("network disabled")),
  );
  mocks.getTranslations.mockImplementation(
    async (arg: string | { locale?: string; namespace: string }) => {
      const namespace = typeof arg === "string" ? arg : arg.namespace;
      return (key: string) => {
        const tree = namespace
          .split(".")
          .reduce<unknown>(
            (node, part) => (node as Record<string, unknown>)?.[part],
            enMessages as unknown,
          );
        return key
          .split(".")
          .reduce<unknown>(
            (node, part) => (node as Record<string, unknown>)?.[part],
            tree,
          ) as string;
      };
    },
  );
});

describe("FR-5 APK learning-mode labels are translated", () => {
  it("reads both labels from messages", async () => {
    const { unmount } = renderWithMessages(
      <StudentCartridgeHost
        cartridgeId="wizard-vs-zombie"
        title="Wizard vs Zombie"
        description=" duel"
        inputMode="vocabulary"
        locale="th"
      />,
      { locale: "th" },
    );

    expect(
      await screen.findByRole("button", {
        name: th.ApkHost.readMode,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: th.ApkHost.listenMode }),
    ).toBeInTheDocument();
    unmount();

    // Labels follow the message tree, not hardcoded English.
    const patched = {
      ...th,
      ApkHost: {
        ...th.ApkHost,
        readMode: "SENTINEL-READ",
        listenMode: "SENTINEL-LISTEN",
      },
    } as never;
    render(
      <StudentCartridgeHost
        cartridgeId="wizard-vs-zombie"
        title="Wizard vs Zombie"
        description=" duel"
        inputMode="vocabulary"
        locale="th"
      />,
      {
        wrapper: ({ children }: { children: ReactNode }) => (
          <NextIntlPatched tree={patched}>{children}</NextIntlPatched>
        ),
      },
    );
    expect(
      await screen.findByRole("button", { name: "SENTINEL-READ" }),
    ).toBeInTheDocument();
  });

  it("keeps the locale prefix on sign-in links and catalog navigation", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          content: [{ term: "cat", translation: "แมว" }],
        }),
      }),
    );
    renderWithMessages(
      <StudentCartridgeHost
        cartridgeId="test-game"
        title="Test Game"
        description="desc"
        inputMode="vocabulary"
        locale="th"
        challengeId="challenge-1"
      />,
      { locale: "th" },
    );

    const signIn = await screen.findByRole("link", {
      name: th.ApkHost.signInToPlayChallenge,
    });
    expect(signIn.getAttribute("href")).toMatch(/^\/th\/auth\/signin\?/);

    cleanup();
    renderWithMessages(
      <StudentCartridgeHost
        cartridgeId="test-game"
        title="Test Game"
        description="desc"
        inputMode="vocabulary"
        locale="en"
        ownerKey="school-1:user-1"
      />,
    );
    fireEvent.click(await screen.findByRole("button", { name: "stub-game-host" }));
    expect(mocks.push).toHaveBeenCalledWith("/student/games");
  });
});

describe("FR-5 locale-aware sign-in redirects, links, and logout", () => {
  it("logs out through the i18n router", async () => {
    mocks.logout.mockResolvedValue(undefined);
    renderWithMessages(
      <UserAccountNav
        user={{ id: "u1", role: "TEACHER" } as never}
      />,
    );

    fireEvent.pointerDown(document.querySelector('[aria-haspopup="menu"]')!);
    fireEvent.click(document.querySelector('[aria-haspopup="menu"]')!);
    const logoutItem = await screen.findByText(en.MainNav.usernav.logout);
    fireEvent.click(logoutItem);

    await waitFor(() => expect(mocks.logout).toHaveBeenCalled());
    expect(mocks.push).toHaveBeenCalledWith("/");
  });

  it("redirects student sign-in through the i18n router", async () => {
    mocks.fetchStudentsByClassCode.mockResolvedValue({
      success: true,
      students: [
        {
          id: "cs1",
          name: "Somchai",
          student: {
            id: "s1",
            name: "Somchai",
            email: "somchai@example.com",
          },
        },
      ],
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({}),
      }),
    );
    renderWithMessages(<StudentSignInForm />);

    fireEvent.change(
      screen.getByLabelText(en.AuthPage.signin.classroomCode),
      { target: { value: "ABC123" } },
    );
    fireEvent.click(screen.getByRole("button", { name: en.AuthPage.signin.next }));

    await screen.findByText(en.AuthPage.signin.selectYourName);
    fireEvent.click(screen.getByRole("combobox"));
    fireEvent.click(await screen.findByRole("option", { name: "Somchai" }));
    fireEvent.click(screen.getByRole("button", { name: en.AuthPage.signin.login }));

    await waitFor(() =>
      expect(mocks.push).toHaveBeenCalledWith("/student/read"),
    );
  });

  it("routes teacher sign-in through the i18n router", async () => {
    mocks.login.mockResolvedValue(undefined);
    renderWithMessages(<TeacherSignInForm />);

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "teacher@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "secret123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Login" }));

    await waitFor(() =>
      expect(mocks.login).toHaveBeenCalledWith(
        "teacher@example.com",
        "secret123",
      ),
    );
    expect(mocks.push).toHaveBeenCalledWith("/dashboard");
  });

  it("redirects anonymous users with the locale-aware redirect", async () => {
    mocks.currentUser.mockResolvedValue(null);
    mocks.getCurrentUser.mockResolvedValue(null);

    await expect(
      LessonPage({
        params: Promise.resolve({ locale: "th", id: "lesson-1" }),
        searchParams: Promise.resolve({}),
      }),
    ).rejects.toThrow("redirect:th:/auth/signin");

    await expect(
      UserProfilePage({ params: Promise.resolve({ locale: "vi" }) }),
    ).rejects.toThrow("redirect:vi:/auth/signin");

    await expect(
      ReadPage({ params: Promise.resolve({ locale: "cn", articleId: "a1" }) }),
    ).rejects.toThrow("redirect:cn:/auth/signin");
  });

  it("links through the i18n Link", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    const games = await PrimaryStudentGamesPage({
      params: Promise.resolve({ locale: "en" }),
    });
    const { unmount } = render(games);
    expect(
      screen.getByRole("link", { name: /Wizard vs Zombie/ }),
    ).toHaveAttribute("href", "/student/games/apk/wizard-vs-zombie");
    unmount();

    const classes = await MyClassesPage();
    render(classes);
    expect(screen.getByRole("link", { name: "Class challenges" })).toHaveAttribute(
      "href",
      "../game-challenges",
    );
    cleanup();

    mocks.getCurrentUser.mockResolvedValue({
      id: "t1",
      role: "TEACHER",
      schoolId: "school-1",
    });
    const challenges = await TeacherGameChallengesPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(challenges);
    expect(
      screen.getByRole("link", { name: "Back to classes" }),
    ).toHaveAttribute("href", "/teacher/my-classes");
  });
});

describe("FR-5 teacher dashboard placeholder", () => {
  it("redirects to the classroom list", async () => {
    await expect(
      TeacherDashboard({ params: Promise.resolve({ locale: "tw" }) }),
    ).rejects.toThrow("redirect:tw:/teacher/my-classes");
  });
});

describe("FR-5 marketing and auth metadata", () => {
  it("exports metadata from marketing and auth pages", async () => {
    const index = await import("../../app/[locale]/(index)/page");
    const indexMeta = await index.generateMetadata({
      params: Promise.resolve({ locale: "en" }),
    });
    expect(indexMeta.title).toBeTruthy();

    const about = await import("../../app/[locale]/(index)/about/page");
    const aboutMeta = await about.generateMetadata({
      params: Promise.resolve({ locale: "en" }),
    });
    expect(aboutMeta.title).toBeTruthy();

    const signin = await import("../../app/[locale]/auth/signin/page");
    const signinMeta = await signin.generateMetadata({
      params: Promise.resolve({ locale: "en" }),
    });
    expect(signinMeta.title).toBeTruthy();

    const games = await import(
      "../../app/[locale]/(student)/student/games/page"
    );
    const gamesMeta = await games.generateMetadata({
      params: Promise.resolve({ locale: "en" }),
    });
    expect(gamesMeta.title).toBeTruthy();

    const contact = await import("../../app/[locale]/(index)/contact/page");
    expect(contact.metadata.title).toBeTruthy();

    const terms = await import("../../app/[locale]/(index)/terms/page");
    expect(terms.metadata.title).toBeTruthy();

    const privacy = await import(
      "../../app/[locale]/(index)/privacy-policy/page"
    );
    expect(privacy.metadata.title).toBeTruthy();

    const signup = await import("../../app/[locale]/auth/signup/page");
    expect(signup.metadata.title).toBeTruthy();

    const forgot = await import(
      "../../app/[locale]/auth/forgot-password/page"
    );
    expect(forgot.metadata.title).toBeTruthy();
  });
});

describe("FR-5 footer, games, licence, and school strings", () => {
  it("translates the footer through messages", () => {
    renderWithMessages(<Footer />, { locale: "th" });
    expect(screen.getByText(th.Footer.tagline)).toBeInTheDocument();
    expect(screen.getByText(th.Footer.aboutUs)).toBeInTheDocument();
    expect(screen.getByText(th.Footer.privacyPolicy)).toBeInTheDocument();
  });

  it("translates the games catalogue heading", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    mocks.getTranslations.mockImplementation(
      async ({ locale, namespace }: { locale: string; namespace: string }) => {
        const messages = locale === "th" ? thMessages : enMessages;
        const tree = namespace
          .split(".")
          .reduce<unknown>(
            (node, part) => (node as Record<string, unknown>)?.[part],
            messages as unknown,
          );
        return (key: string) =>
          key
            .split(".")
            .reduce<unknown>(
              (node, part) => (node as Record<string, unknown>)?.[part],
              tree,
            ) as string;
      },
    );
    const games = await PrimaryStudentGamesPage({
      params: Promise.resolve({ locale: "th" }),
    });
    render(games);
    expect(
      screen.getByRole("heading", { name: thMessages.StudentGames.title }),
    ).toBeInTheDocument();
  });

  it("translates licence form labels", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ schools: [] }),
      }),
    );
    const license = {
      id: "lic-1",
      name: "Test licence",
      maxUsers: 10,
      startDate: new Date(),
      createdAt: new Date(),
      expiryDate: null,
      status: "active",
      schoolId: null,
      subscription: "BASIC",
    } as unknown as LicenseWithSchool;
    renderWithMessages(<EditLicenseForm license={license} />, {
      locale: "th",
    });

    expect(screen.getByText(th.LicenseForm.name)).toBeInTheDocument();
    expect(screen.getByText(th.LicenseForm.status)).toBeInTheDocument();
  });

  it("translates school form labels", () => {
    renderWithMessages(<CreateSchoolForm />, { locale: "th" });

    expect(screen.getByText(th.SchoolForm.name)).toBeInTheDocument();
  });
});

function NextIntlPatched({
  tree,
  children,
}: {
  tree: Record<string, unknown>;
  children: ReactNode;
}) {
  return (
    <NextIntlClientProvider
      locale="th"
      messages={
        tree as React.ComponentProps<typeof NextIntlClientProvider>["messages"]
      }
    >
      {children}
    </NextIntlClientProvider>
  );
}
