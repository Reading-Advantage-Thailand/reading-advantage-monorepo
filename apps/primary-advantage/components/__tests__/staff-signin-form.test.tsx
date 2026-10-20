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
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
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
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
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

  it("returns to the QR book lesson path after sign-in", async () => {
    searchParams = new URLSearchParams({ callbackUrl: "/th/b/o3-2/5/writing" });
    renderWithMessages(<TeacherSignInForm />);
    await submit();
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/b/o3-2/5/writing"));
  });

  it("ignores callbacks that leave the site", async () => {
    for (const callbackUrl of ["https://evil.example", "//evil.example", "/\\evil.example", "/en\\..\\evil", "/th//evil.com", "/th/%2F%2Fevil.com"]) {
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

  describe("temporary password (FR-5)", () => {
    const fetchMock = vi.fn();

    beforeEach(() => {
      fetchMock.mockReset().mockResolvedValue(new Response(JSON.stringify({ success: true }), { status: 200 }));
      vi.stubGlobal("fetch", fetchMock);
      loginMock.mockRejectedValueOnce(
        Object.assign(new Error("Set a new password to continue"), { status: 403, code: "PASSWORD_CHANGE_REQUIRED" }),
      );
    });

    /** Types the new password twice and saves it. */
    function setNewPassword(first: string, second = first) {
      fireEvent.change(screen.getByLabelText("New password"), { target: { value: first } });
      fireEvent.change(screen.getByLabelText("Type the new password again"), { target: { value: second } });
      fireEvent.click(screen.getByRole("button", { name: "Save and sign in" }));
    }

    it("asks for a new password, stores it, and signs in with it", async () => {
      renderWithMessages(<TeacherSignInForm />);
      await submit();
      await screen.findByRole("heading", { name: "Set a new password" });
      setNewPassword("my-own-pass-9");
      await waitFor(() => expect(loginMock).toHaveBeenLastCalledWith("qa-system", "my-own-pass-9"));
      expect(fetchMock).toHaveBeenCalledWith("/api/auth/temporary-password", expect.objectContaining({ method: "POST" }));
      expect(JSON.parse(fetchMock.mock.calls[0]![1].body as string)).toEqual({
        username: "qa-system",
        password: "long-enough-1",
        newPassword: "my-own-pass-9",
      });
      await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/auth/signin"));
    });

    it("returns to the QR book lesson path after the forced password change", async () => {
      searchParams = new URLSearchParams({ callbackUrl: "/th/b/o3-2/5" });
      renderWithMessages(<TeacherSignInForm />);
      await submit();
      await screen.findByRole("heading", { name: "Set a new password" });
      setNewPassword("my-own-pass-9");
      await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/b/o3-2/5"));
    });

    it("does not send two passwords that are not the same", async () => {
      renderWithMessages(<TeacherSignInForm />);
      await submit();
      await screen.findByRole("heading", { name: "Set a new password" });
      setNewPassword("my-own-pass-9", "my-own-pass-8");
      expect(await screen.findByText("The two passwords are not the same.")).toBeInTheDocument();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("shows the translated text, not the English server text, when the change fails", async () => {
      fetchMock.mockResolvedValue(new Response(JSON.stringify({ message: "Invalid username or password" }), { status: 401 }));
      renderWithMessages(<TeacherSignInForm />);
      await submit();
      await screen.findByRole("heading", { name: "Set a new password" });
      setNewPassword("my-own-pass-9");
      expect(await screen.findByText("The password was not changed.")).toBeInTheDocument();
      expect(screen.queryByText("Invalid username or password")).not.toBeInTheDocument();
      expect(loginMock).toHaveBeenCalledTimes(1);
    });

    it("shows the new-password step in Thai on /th", async () => {
      renderWithMessages(<TeacherSignInForm />, { locale: "th" });
      fireEvent.change(screen.getByLabelText("ชื่อผู้ใช้"), { target: { value: "qa-system" } });
      fireEvent.change(screen.getByLabelText(/^รหัสผ่าน/), { target: { value: "long-enough-1" } });
      fireEvent.click(screen.getByRole("button", { name: "เข้าสู่ระบบ" }));
      expect(await screen.findByRole("heading", { name: "ตั้งรหัสผ่านใหม่" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "บันทึกและเข้าสู่ระบบ" })).toBeInTheDocument();
    });
  });

  it("shows the sign-in form in Thai on /th (defect 2, 2026-10-20)", () => {
    renderWithMessages(<TeacherSignInForm />, { locale: "th" });
    expect(screen.getByRole("heading", { name: "ยินดีต้อนรับสู่ Primary Advantage" })).toBeInTheDocument();
    expect(screen.getByLabelText("ชื่อผู้ใช้")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "ลืมรหัสผ่าน?" })).toHaveAttribute("href", "/auth/forgot-password");
    expect(screen.getByRole("button", { name: "เข้าสู่ระบบ" })).toBeInTheDocument();
  });

  it("shows a translated text for a wrong username or password, not the server text", async () => {
    loginMock.mockRejectedValueOnce(Object.assign(new Error("Invalid username or password"), { status: 401 }));
    renderWithMessages(<TeacherSignInForm />, { locale: "th" });
    fireEvent.change(screen.getByLabelText("ชื่อผู้ใช้"), { target: { value: "qa-system" } });
    fireEvent.change(screen.getByLabelText(/^รหัสผ่าน/), { target: { value: "wrong-pass-1" } });
    fireEvent.click(screen.getByRole("button", { name: "เข้าสู่ระบบ" }));
    expect(await screen.findByText("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง")).toBeInTheDocument();
  });
});
