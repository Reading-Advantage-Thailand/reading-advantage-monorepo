// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithMessages, testMessages } from "@/components/__tests__/helpers/render-with-messages";

const mocks = vi.hoisted(() => ({ user: { id: "t-1", role: "TEACHER", schoolId: "school-1", name: "Teacher One" } }));

vi.mock("@/lib/session", () => ({
  getCurrentUser: async () => mocks.user,
  currentUser: async () => mocks.user,
}));
vi.mock("next-intl/server", () => ({ getLocale: async () => "en" }));
vi.mock("@/server/controllers/schoolController", () => ({ getSchoolLeaderboardController: vi.fn() }));
vi.mock("@reading-advantage/auth-client", () => ({ useAuth: () => ({ logout: vi.fn() }) }));
vi.mock("@/i18n/navigation", () => ({
  redirect: vi.fn(),
  usePathname: () => "/teacher/my-classes",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  Link: ({ children, href, ...rest }: { children?: ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import AppLayout from "../app-layout";

/** Focusable elements in document order (what Tab reaches first). */
const FOCUSABLE = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Renders the signed-in shell around one page.
 * @param locale The message locale.
 */
async function renderShell(locale: "en" | "th" = "en") {
  const ui = await AppLayout({ area: "teacher", children: <h1>Class list</h1> });
  renderWithMessages(ui as React.ReactElement, { locale });
}

beforeEach(() => {
  window.matchMedia ??= ((query: string) => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {} })) as never;
});
afterEach(cleanup);

describe("signed-in page shell (FR-7)", () => {
  it("makes the skip link the first focusable element and points it at main", async () => {
    await renderShell();
    const first = document.querySelector<HTMLElement>(FOCUSABLE);
    expect(first).toHaveTextContent(testMessages.en.AppShell.skipToContent);
    expect(first).toHaveAttribute("href", "#main-content");
    const main = screen.getByRole("main");
    expect(main).toHaveAttribute("id", "main-content");
    expect(main).toHaveAttribute("tabindex", "-1");
    expect(main).toContainElement(screen.getByRole("heading", { name: "Class list" }));
  });

  it("has one banner, one main, and labeled navigation landmarks", async () => {
    await renderShell();
    expect(screen.getAllByRole("banner")).toHaveLength(1);
    expect(screen.getAllByRole("main")).toHaveLength(1);
    const navs = screen.getAllByRole("navigation");
    expect(navs.length).toBeGreaterThan(0);
    for (const nav of navs) expect(nav).toHaveAccessibleName(testMessages.en.AppShell.mainNavigation);
  });

  it("does not clip wide content in main", async () => {
    await renderShell();
    expect(screen.getByRole("main")).not.toHaveClass("overflow-hidden");
  });

  it("names the header controls in Thai", async () => {
    await renderShell("th");
    const th = testMessages.th;
    expect(screen.getByRole("link", { name: th.AppShell.skipToContent })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: th.AppShell.accountMenu })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: th.AppShell.toggleTheme })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: th.LocaleSwitcher.label })).toBeInTheDocument();
  });

  it("shows the sidebar column only from 1024 px and the bottom bar only below it", async () => {
    await renderShell();
    const [sidebar, bottomBar] = screen.getAllByRole("navigation", { name: testMessages.en.AppShell.mainNavigation });
    expect(sidebar.closest(".lg\\:block")).toHaveClass("hidden");
    expect(bottomBar).toHaveClass("lg:hidden");
  });
});
