// @vitest-environment jsdom
/**
 * Student username and password sign-in (primary_student_login_20261003, Phase 4 task 2, FR-6).
 * The form uses the shared login route and its lockout rules, with clear error text in English
 * and Thai. The student sign-in page reaches it by a link from the class code sign-in.
 */
import "@testing-library/jest-dom/vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const replaceMock = vi.fn();
const refreshMock = vi.fn();

vi.mock("@reading-advantage/auth-client", () => ({ useAuth: () => ({ refresh: refreshMock }) }));
vi.mock("@/i18n/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: replaceMock }) }));

import { PasswordSignIn } from "../student-login/password-sign-in";
import { StudentSignIn } from "../student-login/student-sign-in";
import { renderWithMessages } from "./helpers/render-with-messages";

const fetchMock = vi.fn();
const respond = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  Promise.resolve(new Response(JSON.stringify(body), { status, headers }));

beforeEach(() => {
  fetchMock.mockReset();
  replaceMock.mockReset();
  refreshMock.mockReset().mockResolvedValue(undefined);
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

/** Fills the form in English and submits it. */
function submit(username = " p3a12 ", password = "abcd2345") {
  fireEvent.change(screen.getByLabelText("Username"), { target: { value: username } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: password } });
  fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
}

describe("PasswordSignIn", () => {
  it("asks for a username and a password and needs both", () => {
    renderWithMessages(<PasswordSignIn />);
    expect(screen.getByLabelText("Username")).toHaveAttribute("autocomplete", "username");
    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "password");
    expect(screen.getByRole("button", { name: "Sign in" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Username"), { target: { value: "p3a12" } });
    expect(screen.getByRole("button", { name: "Sign in" })).toBeDisabled();
  });

  it("signs in through the shared login and opens the student home", async () => {
    fetchMock.mockReturnValue(respond(200, { success: true, user: { id: "u1", role: "STUDENT" } }));
    renderWithMessages(<PasswordSignIn />);
    submit();
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/student/read"));
    expect(fetchMock).toHaveBeenCalledWith("/api/auth/login", expect.objectContaining({ method: "POST" }));
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body)).toEqual({ username: "p3a12", password: "abcd2345" });
    expect(refreshMock).toHaveBeenCalled();
  });

  it("sends a staff user to the sign-in page, where the proxy picks the home page", async () => {
    fetchMock.mockReturnValue(respond(200, { success: true, user: { id: "t1", role: "TEACHER" } }));
    renderWithMessages(<PasswordSignIn />);
    submit("teacher@school.test", "long-enough-1");
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/auth/signin"));
  });

  it("announces a wrong username or password", async () => {
    fetchMock.mockReturnValue(respond(401, { message: "Invalid username or password" }));
    renderWithMessages(<PasswordSignIn />);
    submit();
    expect(await screen.findByRole("alert")).toHaveTextContent("Wrong username or password. Try again.");
    expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("announces the lockout of the shared login with the minutes to wait", async () => {
    fetchMock.mockReturnValue(respond(429, { message: "Too many attempts." }, { "Retry-After": "90" }));
    renderWithMessages(<PasswordSignIn />);
    submit();
    expect(await screen.findByRole("alert")).toHaveTextContent("Too many tries. Wait 2 minutes and try again.");
  });

  it("announces a server or network failure", async () => {
    fetchMock.mockReturnValueOnce(respond(503, { message: "Service temporarily unavailable" }));
    renderWithMessages(<PasswordSignIn />);
    submit();
    expect(await screen.findByRole("alert")).toHaveTextContent("Something went wrong. Try again.");
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Something went wrong. Try again.");
  });

  it("shows Thai labels and error text", async () => {
    fetchMock.mockReturnValue(respond(401, { message: "Invalid username or password" }));
    renderWithMessages(<PasswordSignIn />, { locale: "th" });
    fireEvent.change(screen.getByLabelText("ชื่อผู้ใช้"), { target: { value: "p3a12" } });
    fireEvent.change(screen.getByLabelText("รหัสผ่าน"), { target: { value: "abcd2345" } });
    fireEvent.click(screen.getByRole("button", { name: "เข้าสู่ระบบ" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
  });
});

describe("StudentSignIn", () => {
  it("starts with the class code and links to the username and password form and back", () => {
    renderWithMessages(<StudentSignIn />);
    expect(screen.getByLabelText("Class code")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Sign in with username and password" }));
    expect(screen.getByLabelText("Username")).toBeInTheDocument();
    expect(screen.queryByLabelText("Class code")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Sign in with the class code" }));
    expect(screen.getByLabelText("Class code")).toBeInTheDocument();
  });
});
