// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  currentUser: vi.fn(),
}));

vi.mock("@/lib/session", () => ({
  currentUser: mocks.currentUser,
  getCurrentUser: mocks.currentUser,
}));
vi.mock("next-intl/server", () => ({
  getLocale: () => Promise.resolve("en"),
}));
// redirect throws a capturable error so tests can assert the exact target.
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`redirect:${url}`);
  },
}));
// The full app shell needs providers and nav data; render children only.
vi.mock("@/components/shared/app-layout", () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="app-layout">{children}</div>
  ),
}));

import AdminLayout from "../admin/layout";
import TeacherLayout from "../teacher/layout";
import StudentLayout from "../(student)/student/layout";
import SystemLayout from "../system/layout";
import SettingsLayout from "../(student)/settings/layout";

/** One entry per role-gated layout and its admitted roles. */
const layouts = [
  { name: "admin", Layout: AdminLayout, admitted: ["ADMIN", "SYSTEM"] },
  {
    name: "teacher",
    Layout: TeacherLayout,
    admitted: ["TEACHER", "ADMIN", "SYSTEM"],
  },
  { name: "student", Layout: StudentLayout, admitted: ["STUDENT"] },
  { name: "system", Layout: SystemLayout, admitted: ["SYSTEM"] },
  {
    name: "settings",
    Layout: SettingsLayout,
    admitted: ["STUDENT", "TEACHER", "ADMIN", "SYSTEM"],
  },
] as const;

const denied = ["STUDENT", "TEACHER", "ADMIN", "SYSTEM"] as const;

afterEach(cleanup);

describe("role-gated layouts", () => {
  beforeEach(() => vi.clearAllMocks());

  it("redirects an anonymous visitor to the sign-in page", async () => {
    mocks.currentUser.mockResolvedValue(null);

    for (const { Layout } of layouts) {
      await expect(Layout({ children: <p>content</p> })).rejects.toThrow(
        "redirect:/en/auth/signin",
      );
    }
  });

  it.each(layouts.map((l) => [l.name, l] as const))(
    "renders the %s layout for an admitted role",
    async (_name, { Layout, admitted }) => {
      mocks.currentUser.mockResolvedValue({ id: "u-1", role: admitted[0] });

      const ui = await Layout({ children: <p>content</p> });
      render(ui);

      expect(screen.getByTestId("app-layout")).toBeInTheDocument();
      expect(screen.getByText("content")).toBeInTheDocument();
    },
  );

  it.each(layouts.map((l) => [l.name, l] as const))(
    "redirects a non-admitted role from the %s layout to unauthorized",
    async (_name, { Layout, admitted }) => {
      const blocked: readonly string[] = denied.filter(
        (role) => !(admitted as readonly string[]).includes(role),
      );
      // The settings layout admits every canonical role; nothing to deny.
      if (blocked.length === 0) return;
      mocks.currentUser.mockResolvedValue({ id: "u-1", role: blocked[0] });

      await expect(Layout({ children: <p>content</p> })).rejects.toThrow(
        "redirect:/en/unauthorized",
      );
    },
  );

  it("keeps the student layout restricted to the student role", async () => {
    mocks.currentUser.mockResolvedValue({ id: "t-1", role: "TEACHER" });

    await expect(StudentLayout({ children: <p>content</p> })).rejects.toThrow(
      "redirect:/en/unauthorized",
    );
  });
});
