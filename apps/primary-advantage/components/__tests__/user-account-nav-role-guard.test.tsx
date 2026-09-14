// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { AuthUser } from "@reading-advantage/auth-client";
import { UserAccountNav } from "../nav/user-account-nav";
import {
  renderWithMessages,
  testMessages,
} from "./helpers/render-with-messages";

/** Real English copy used for user-facing assertions. */
const en = testMessages.en;
const userNavCopy = en.MainNav.usernav;

const { mockLogout } = vi.hoisted(() => ({
  mockLogout: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    back: vi.fn(),
    refresh: vi.fn(),
    replace: vi.fn(),
  }),
  usePathname: () => "/",
  Link: ({ children, href, ...rest }: React.ComponentProps<"a">) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("@reading-advantage/auth-client", () => ({
  useAuth: () => ({ logout: mockLogout }),
  useSession: () => ({ user: null }),
}));

/**
 * Creates a session user fixture for the requested role.
 * @param role Session role to project into the account menu.
 * @returns An AuthUser-shaped session user.
 */
function createSessionUser(role: AuthUser["role"]): AuthUser {
  return {
    id: "user-1",
    username: "user-1",
    name: `Person ${role}`,
    role,
    schoolId: "school-1",
    xp: 0,
    level: 1,
    cefrLevel: "B1",
  };
}

/**
 * Renders the account nav and opens its dropdown menu.
 * @param role Session role for the rendered user.
 * @returns The user passed to the component.
 */
function renderOpenAccountMenu(role: AuthUser["role"]): AuthUser {
  const user = createSessionUser(role);
  renderWithMessages(<UserAccountNav user={user} />);
  fireEvent.pointerDown(screen.getByText(`Person ${role}`), { button: 0, ctrlKey: false });
  return user;
}

afterEach(cleanup);

describe("UserAccountNav student dashboard role guard", () => {
  it("hides the student dashboard for a TEACHER while keeping the teacher dashboard", () => {
    renderOpenAccountMenu("TEACHER");

    expect(
      screen.queryByRole("menuitem", { name: userNavCopy.studentDashboard }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: userNavCopy.teacherDashboard }),
    ).toHaveAttribute("href", "/teacher/my-classes");
    expect(
      screen.queryByRole("menuitem", { name: userNavCopy.adminDashboard }),
    ).not.toBeInTheDocument();
  });

  it("hides the student dashboard for an ADMIN while keeping the admin dashboard", () => {
    renderOpenAccountMenu("ADMIN");

    expect(
      screen.queryByRole("menuitem", { name: userNavCopy.studentDashboard }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: userNavCopy.adminDashboard }),
    ).toHaveAttribute("href", "/admin");
  });

  it("shows the student dashboard link for a STUDENT", () => {
    renderOpenAccountMenu("STUDENT");

    expect(
      screen.getByRole("menuitem", { name: userNavCopy.studentDashboard }),
    ).toHaveAttribute("href", "/student/read");
    expect(
      screen.queryByRole("menuitem", { name: userNavCopy.adminDashboard }),
    ).not.toBeInTheDocument();
  });
});
