// @vitest-environment jsdom
/**
 * Staff sign-in form (primary_cutover_blockers_20261003, AC-3).
 * The shared auth package accepts only a username and a password. The form
 * must not ask for an email, offer Google sign-in, or link to self sign-up.
 */
import "@testing-library/jest-dom/vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const loginMock = vi.fn();
const pushMock = vi.fn();
const replaceMock = vi.fn();
let searchParams = new URLSearchParams();

vi.mock("@reading-advantage/auth-client", () => ({
  useAuth: () => ({ login: loginMock }),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => searchParams,
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
  useRouter: () => ({ push: pushMock, replace: replaceMock }),
}));

import { TeacherSignInForm } from "../auth/teacher-signin-form";
import { renderWithMessages } from "./helpers/render-with-messages";

describe("staff sign-in form", () => {
  beforeEach(() => {
    loginMock.mockReset().mockResolvedValue(undefined);
    pushMock.mockReset();
    replaceMock.mockReset();
    searchParams = new URLSearchParams();
  });

  /** Signs in through the form and waits for the login call. */
  async function submit() {
    fireEvent.change(screen.getByLabelText("Username"), { target: { value: "qa-system" } });
    fireEvent.change(screen.getByLabelText(/^Password/), { target: { value: "long-enough-1" } });
    fireEvent.click(screen.getByRole("button", { name: "Login" }));
    await waitFor(() => expect(loginMock).toHaveBeenCalled());
  }

  it("asks for a username, not an email", () => {
    renderWithMessages(<TeacherSignInForm />);
    const username = screen.getByLabelText("Username");
    expect(username).toHaveAttribute("type", "text");
    expect(username).toHaveAttribute("autocomplete", "username");
    expect(screen.queryByText("Email")).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText("name@example.com")).not.toBeInTheDocument();
  });

  it("offers no Google sign-in and no self sign-up", () => {
    renderWithMessages(<TeacherSignInForm />);
    expect(screen.queryByRole("button", { name: /google/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /sign up/i })).not.toBeInTheDocument();
  });

  it("signs in with the username and password", async () => {
    renderWithMessages(<TeacherSignInForm />);
    fireEvent.change(screen.getByLabelText("Username"), { target: { value: "qa-system" } });
    fireEvent.change(screen.getByLabelText(/^Password/), { target: { value: "long-enough-1" } });
    fireEvent.click(screen.getByRole("button", { name: "Login" }));
    await waitFor(() => expect(loginMock).toHaveBeenCalledWith("qa-system", "long-enough-1"));
    // The proxy sends a signed-in user from the sign-in page to the role's home page.
    expect(replaceMock).toHaveBeenCalledWith("/auth/signin");
  });

  it("returns to a local callback without its locale prefix", async () => {
    searchParams = new URLSearchParams({ callbackUrl: "/en/system/schools" });
    renderWithMessages(<TeacherSignInForm />);
    await submit();
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/system/schools"));
  });

  it("ignores callbacks that leave the site", async () => {
    for (const callbackUrl of ["https://evil.example", "//evil.example", "/\\evil.example", "/en\\..\\evil"]) {
      loginMock.mockClear();
      pushMock.mockClear();
      replaceMock.mockClear();
      searchParams = new URLSearchParams({ callbackUrl });
      const { unmount } = renderWithMessages(<TeacherSignInForm />);
      await submit();
      await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/auth/signin"));
      expect(pushMock).not.toHaveBeenCalled();
      unmount();
    }
  });
});
