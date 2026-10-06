// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { areaConfigs } from "@/configs/app-nav";
import { activeKey, areaForRole } from "@/lib/nav-area";
import { STUDENT_HOME } from "@/components/student-login/use-student-home";
import { AppSidebar, BottomNav, MobileMenu } from "../app-nav";
import { renderWithMessages, testMessages } from "@/components/__tests__/helpers/render-with-messages";

const nav = vi.hoisted(() => ({ pathname: "/" }));

vi.mock("@/i18n/navigation", () => ({
  usePathname: () => nav.pathname,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  Link: ({ children, href, ...rest }: { children?: ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const en = testMessages.en;
const th = testMessages.th;
const student = { id: "s-1", role: "STUDENT" };
const teacher = { id: "t-1", role: "TEACHER" };

afterEach(cleanup);

/**
 * Renders the bottom bar for one area at one path.
 * @param area The nav area.
 * @param pathname The current path without the locale.
 * @param locale The message locale.
 * @returns The bottom navigation landmark.
 */
function renderBottomNav(
  area: "student" | "teacher",
  pathname: string,
  locale: "en" | "th" = "en",
): HTMLElement {
  nav.pathname = pathname;
  renderWithMessages(<BottomNav area={area} user={area === "student" ? student : teacher} />, { locale });
  return screen.getByRole("navigation");
}

describe("nav item lists per role", () => {
  it("gives students Home, Read, Games, and Me, with Home at the student home", () => {
    const tabs = areaConfigs.student.tabs ?? [];
    expect(tabs.map((tab) => tab.key)).toEqual(["home", "read", "games", "me"]);
    expect(tabs[0].href).toBe(STUDENT_HOME);
    expect(tabs[0].href).toBe("/student/home");
  });

  it("gives teachers Home, Classes, Assignments, and Reports", () => {
    expect((areaConfigs.teacher.tabs ?? []).map((tab) => tab.key)).toEqual([
      "home",
      "classes",
      "assignments",
      "reports",
    ]);
  });

  it("keeps the current admin and SYSTEM menu items", () => {
    expect(areaConfigs.admin.sidebarNav?.map((item) => item.title)).toEqual([
      "dashboard",
      "teachers",
      "studentsandclasses",
      "importdata",
      "articlecreation",
    ]);
    expect(areaConfigs.system.sidebarNav?.map((item) => item.title)).toEqual([
      "systemdashboard",
      "schools",
      "licenses",
      "testing",
    ]);
  });

  it("keeps every student page reachable from the student menu", () => {
    const hrefs = areaConfigs.student.sidebarNav?.map((item) => item.href);
    for (const page of ["read", "games", "assignments", "sentences", "vocabulary", "reports", "history"]) {
      expect(hrefs).toContain(`/student/${page}`);
    }
  });

  it("maps each role to its area and gives signed-in areas no marketing links", () => {
    expect(["STUDENT", "TEACHER", "ADMIN", "SYSTEM", "INTERN"].map(areaForRole)).toEqual([
      "student",
      "teacher",
      "admin",
      "system",
      null,
    ]);
    for (const config of Object.values(areaConfigs)) expect(config.mainNav ?? []).toEqual([]);
  });
});

describe("activeKey", () => {
  it("picks the longest matching prefix and gives a tie to the later item", () => {
    const items = [
      { key: "home", prefixes: ["/student/read"] },
      { key: "read", prefixes: ["/student/read", "/student/lesson"] },
    ];
    expect(activeKey(items, "/student/read")).toBe("read");
    expect(activeKey(items, "/student/lesson/42")).toBe("read");
    expect(activeKey(items, "/student/readers")).toBeNull();
  });
});

describe("BottomNav", () => {
  it("marks only the active tab with aria-current=page", () => {
    const bar = renderBottomNav("student", "/student/games");
    expect(within(bar).getByRole("link", { name: en.AppShell.tabs.games })).toHaveAttribute("aria-current", "page");
    expect(within(bar).getAllByRole("link").filter((link) => link.hasAttribute("aria-current"))).toHaveLength(1);
  });

  it("keeps the parent tab active on nested teacher pages", () => {
    const bar = renderBottomNav("teacher", "/teacher/student-progress/abc");
    expect(within(bar).getByRole("link", { name: en.AppShell.tabs.reports })).toHaveAttribute("aria-current", "page");
  });

  it("marks Home on the student home and Read on the read list", () => {
    let bar = renderBottomNav("student", STUDENT_HOME);
    expect(within(bar).getByRole("link", { name: en.AppShell.tabs.home })).toHaveAttribute("aria-current", "page");
    cleanup();
    bar = renderBottomNav("student", "/student/read/abc");
    expect(within(bar).getByRole("link", { name: en.AppShell.tabs.read })).toHaveAttribute("aria-current", "page");
    expect(within(bar).getAllByRole("link").filter((link) => link.hasAttribute("aria-current"))).toHaveLength(1);
  });

  it("labels the tabs and the landmark in Thai", () => {
    const bar = renderBottomNav("student", "/student/read", "th");
    expect(bar).toHaveAccessibleName(th.AppShell.mainNavigation);
    for (const key of ["home", "read", "games", "me"] as const) {
      expect(within(bar).getByRole("link", { name: th.AppShell.tabs[key] })).toBeInTheDocument();
    }
  });

  it("is a fixed bar that hides on large screens and clears the safe area", () => {
    const bar = renderBottomNav("student", "/student/read");
    expect(bar).toHaveClass("fixed", "lg:hidden");
    expect(bar.className).toContain("--safe-bottom");
  });

  it("takes its height from the --bottom-nav-h token that the layout and floating buttons use", () => {
    const bar = renderBottomNav("student", "/student/read");
    expect(bar.className).toContain("h-(--bottom-nav-h)");
  });
});

describe("MobileMenu", () => {
  it("closes the sheet on any link tap, also a link to the page that is open", async () => {
    nav.pathname = "/student/history";
    renderWithMessages(<MobileMenu area="student" user={student} />);
    fireEvent.click(screen.getByRole("button", { name: en.AppShell.openMenu }));
    const sheet = await screen.findByRole("dialog");
    fireEvent.click(within(sheet).getByRole("link", { name: en.Sidebar.history }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});

describe("AppSidebar", () => {
  it("marks the active sidebar link with aria-current=page", () => {
    nav.pathname = "/student/history";
    renderWithMessages(<AppSidebar area="student" user={student} />);
    const sidebar = screen.getByRole("navigation", { name: en.AppShell.mainNavigation });
    expect(within(sidebar).getByRole("link", { name: en.Sidebar.history })).toHaveAttribute("aria-current", "page");
    expect(within(sidebar).getByRole("link", { name: en.Sidebar.read })).not.toHaveAttribute("aria-current");
  });

  it("adds the settings links for staff and hides School Profile from teachers", () => {
    nav.pathname = "/settings/user-profile";
    renderWithMessages(<AppSidebar area="teacher" user={teacher} settings />);
    const sidebar = screen.getByRole("navigation", { name: en.AppShell.mainNavigation });
    expect(within(sidebar).getByRole("link", { name: en.Sidebar.userProfile })).toHaveAttribute("aria-current", "page");
    expect(within(sidebar).queryByRole("link", { name: en.Sidebar.schoolProfile })).not.toBeInTheDocument();
  });
});
