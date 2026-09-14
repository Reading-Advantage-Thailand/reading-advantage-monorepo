// @vitest-environment node
/**
 * Behavioral replacements for the broken-ux-fixes static cases that target
 * server components (FR-2 admin landing, FR-3 app layout, FR-7 Get Started
 * link). Each test invokes the live component function and asserts on its
 * output tree instead of grepping source text.
 */
import React, { isValidElement } from "react";
import { describe, expect, it, vi } from "vitest";

const redirectMock = vi.fn();
const getCurrentUserMock = vi.fn();
const getLocaleMock = vi.fn();
const getTranslationsMock = vi.fn();

vi.mock("@/i18n/navigation", () => ({
  Link: ({ children }: { children: React.ReactNode }) => children,
  redirect: (...args: unknown[]) => redirectMock(...args),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/en",
}));

vi.mock("next-intl/server", () => ({
  getLocale: (...args: unknown[]) => getLocaleMock(...args),
  getTranslations: (...args: unknown[]) => getTranslationsMock(...args),
}));

vi.mock("@/lib/session", () => ({
  getCurrentUser: (...args: unknown[]) => getCurrentUserMock(...args),
  currentUser: (...args: unknown[]) => getCurrentUserMock(...args),
}));

vi.mock("@/server/controllers/schoolController", () => ({
  getSchoolLeaderboardController: vi.fn(),
}));

vi.mock("@/components/admin/admin-stats-cards", () => ({
  AdminStatsCards: () => null,
}));
vi.mock("@/components/admin/admin-recent-activity", () => ({
  AdminRecentActivity: () => null,
}));
vi.mock("@/components/admin/admin-quick-actions", () => ({
  AdminQuickActions: () => null,
}));
vi.mock("@/components/admin/admin-overview-charts", () => ({
  AdminOverviewCharts: () => null,
}));
vi.mock("@/components/admin/admin-dashboard-header", () => ({
  AdminDashboardHeader: () => null,
}));

import AdminPage from "../../app/[locale]/admin/page";
import AppLayout from "../shared/app-layout";
import Home from "../../app/[locale]/(index)/page";

/**
 * Collects every React element in a tree that satisfies a predicate.
 * @param node The tree node to inspect.
 * @param predicate The match test for elements.
 * @param out The accumulator for matches.
 * @returns The accumulated matches.
 */
function findAll(
  node: unknown,
  predicate: (element: React.ReactElement) => boolean,
  out: React.ReactElement[] = [],
): React.ReactElement[] {
  if (Array.isArray(node)) {
    for (const child of node) findAll(child, predicate, out);
    return out;
  }
  if (isValidElement(node)) {
    const element = node as React.ReactElement;
    if (predicate(element)) out.push(element);
    const children = (element.props as { children?: unknown }).children;
    findAll(children, predicate, out);
  }
  return out;
}

describe("FR-2 admin landing page", () => {
  it("redirects to the admin dashboard instead of rendering an empty div", async () => {
    redirectMock.mockReturnValue("redirected");
    const result = await AdminPage({
      params: Promise.resolve({ locale: "en" }),
    });
    expect(redirectMock).toHaveBeenCalledWith({
      href: "/admin/dashboard",
      locale: "en",
    });
    expect(redirectMock).toHaveBeenCalledTimes(1);
    expect(result).toBe("redirected");
  });
});

describe("FR-3 app layout main pane", () => {
  it("renders children inside a flex-1 main pane with no flexl-1 typo", async () => {
    getCurrentUserMock.mockResolvedValue({
      id: "teacher-1",
      role: "TEACHER",
      schoolId: "school-1",
    });
    getLocaleMock.mockResolvedValue("en");
    const tree = await AppLayout({
      mainNavConfig: [],
      children: <span data-testid="layout-child">pane content</span>,
    });
    const mains = findAll(tree, (element) => element.type === "main");
    expect(mains).toHaveLength(1);
    const className = String(
      (mains[0].props as { className?: unknown }).className ?? "",
    );
    expect(className).toContain("flex-1");
    expect(className).not.toContain("flexl-1");
    const kids = findAll(
      (mains[0].props as { children?: unknown }).children,
      (element) => element.type === "span",
    );
    expect(kids).toHaveLength(1);
  });
});

describe("FR-7 Get Started link", () => {
  it("keeps every internal signin link free of target=_blank", async () => {
    getTranslationsMock.mockImplementation(async () => (key: string) => key);
    const tree = await Home();
    const signinLinks = findAll(
      tree,
      (element) =>
        (element.props as { href?: unknown }).href === "/auth/signin",
    );
    expect(signinLinks.length).toBeGreaterThan(0);
    for (const link of signinLinks) {
      expect(
        (link.props as { target?: unknown }).target ?? null,
      ).toBeNull();
    }
  });
});
