// @vitest-environment jsdom
/**
 * QR card sign-in page (primary_student_login_20261003, Phase 4 task 1, FR-5).
 * The printed card opens `/auth/card#<token>`. The page removes the token from the address bar
 * and the history before any other work, then posts it to the QR route.
 */
import "@testing-library/jest-dom/vitest";
import { screen, waitFor } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const replaceMock = vi.fn();
const refreshMock = vi.fn();

vi.mock("@reading-advantage/auth-client", () => ({ useAuth: () => ({ refresh: refreshMock }) }));
vi.mock("@/i18n/navigation", () => ({ getPathname: ({ href, locale }: { href: string; locale: string }) => `/${locale}${href}`, 
  Link: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
  useRouter: () => ({ push: vi.fn(), replace: replaceMock }),
}));

vi.mock("@/lib/student-login/replace-location", () => ({ replaceLocation: (url: string) => replaceMock(url) }));
import { CardSignIn } from "../student-login/card-sign-in";
import { renderWithMessages } from "./helpers/render-with-messages";

const TOKEN = "A".repeat(40) + "b-_";
const fetchMock = vi.fn();
const respond = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  Promise.resolve(new Response(JSON.stringify(body), { status, headers }));
let hashAtFetch: string | null = null;

beforeEach(() => {
  window.history.replaceState(null, "", `/en/auth/card#${TOKEN}`);
  fetchMock.mockReset();
  replaceMock.mockReset();
  refreshMock.mockReset().mockResolvedValue(undefined);
  hashAtFetch = null;
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** Makes the QR route answer with a status and records the address bar hash at call time. */
function answer(status: number, body: unknown, headers: Record<string, string> = {}) {
  fetchMock.mockImplementation(() => {
    hashAtFetch = window.location.hash;
    return respond(status, body, headers);
  });
}

describe("CardSignIn", () => {
  it("removes the token from the address bar before it posts the token, then opens the student home", async () => {
    answer(200, { user: { id: "u1", role: "STUDENT" }, authStrength: "full" });
    const replaceState = vi.spyOn(window.history, "replaceState");
    renderWithMessages(<CardSignIn />);
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/en/student/read"));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]![0]).toBe("/api/auth/student/qr");
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body)).toEqual({ token: TOKEN });
    expect(hashAtFetch).toBe("");
    expect(replaceState.mock.invocationCallOrder[0]).toBeLessThan(fetchMock.mock.invocationCallOrder[0]!);
    expect(window.location.pathname).toBe("/en/auth/card");
  });

  it("posts the token once under StrictMode", async () => {
    answer(200, { user: { id: "u1", role: "STUDENT" }, authStrength: "full" });
    renderWithMessages(
      <StrictMode>
        <CardSignIn />
      </StrictMode>,
    );
    await waitFor(() => expect(replaceMock).toHaveBeenCalled());
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("explains a card without a token and links to the code sign-in", async () => {
    window.history.replaceState(null, "", "/en/auth/card");
    renderWithMessages(<CardSignIn />);
    expect(await screen.findByRole("alert")).toHaveTextContent("We cannot read this card. Scan it again or ask your teacher.");
    expect(screen.getByRole("link", { name: "Sign in with the class code" })).toHaveAttribute("href", "/auth/signin");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([400, 401])("explains a card that does not work (%i)", async (status) => {
    answer(status, { code: "invalid_credentials" });
    renderWithMessages(<CardSignIn />);
    expect(await screen.findByRole("alert")).toHaveTextContent("This card does not work. Ask your teacher for a new card.");
    expect(screen.getByRole("link", { name: "Sign in with the class code" })).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("explains a rate limit with the minutes to wait", async () => {
    answer(429, { code: "rate_limited" }, { "Retry-After": "600" });
    renderWithMessages(<CardSignIn />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Too many tries. Wait 10 minutes and try again.");
  });

  it("explains a network failure", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    renderWithMessages(<CardSignIn />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Something went wrong. Try again.");
  });

  it("shows Thai copy", async () => {
    answer(401, { code: "invalid_credentials" });
    renderWithMessages(<CardSignIn />, { locale: "th" });
    expect(await screen.findByRole("alert")).toHaveTextContent("บัตรนี้ใช้ไม่ได้");
    expect(screen.getByRole("link", { name: "เข้าสู่ระบบด้วยรหัสห้องเรียน" })).toBeInTheDocument();
  });
});
