// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { renderWithMessages } from "@/components/__tests__/helpers/render-with-messages";

const mocks = vi.hoisted(() => ({
  user: { id: "u1", role: "TEACHER", name: "Ann", username: "ann1" },
}));

vi.mock("@/lib/session", () => ({ getCurrentUser: async () => mocks.user }));
vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key }));
vi.mock("@/i18n/navigation", () => ({
  redirect: vi.fn(),
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  Link: ({ children, href }: { children?: ReactNode; href: string }) => <a href={href}>{children}</a>,
}));
vi.mock("@/components/change-username-form", () => ({ ChangeUsernameForm: () => <div>username form</div> }));
vi.mock("@/components/rpg/scene", () => ({ Scene: ({ children }: { children?: ReactNode }) => <div>{children}</div> }));
vi.mock("@/components/shared/change-role", () => ({ default: () => null }));

import UserProfileSettingsPage from "../page";

afterEach(cleanup);

describe("user profile page", () => {
  it("does not render the license key form until STU-19 (A2)", async () => {
    const ui = await UserProfileSettingsPage({ params: Promise.resolve({ locale: "en" }) });
    renderWithMessages(ui as React.ReactElement);
    expect(screen.getByText("username form")).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: /licen/i })).toBeNull();
    expect(screen.queryByText(/licen/i)).toBeNull();
    expect(document.querySelector('input[name="license"]')).toBeNull();
  });

  it("links a student to the avatar home, not the picker (PR found no way back to the vault, 2026-10-21)", async () => {
    mocks.user = { ...mocks.user, role: "STUDENT" };
    const ui = await UserProfileSettingsPage({ params: Promise.resolve({ locale: "en" }) });
    renderWithMessages(ui as React.ReactElement);
    expect(screen.getByRole("link", { name: "avatar" })).toHaveAttribute("href", "/student/avatar");
  });
});
