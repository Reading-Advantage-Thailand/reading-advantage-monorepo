// @vitest-environment jsdom
/**
 * Student code sign-in (primary_student_login_20261003, Phase 4 task 1, FR-2, FR-3, FR-7).
 * Code entry, then the name list, then the 3-picture password. When the class turned the
 * picture password off, the name tap signs in directly (code_only).
 */
import "@testing-library/jest-dom/vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const replaceMock = vi.fn();
const refreshMock = vi.fn();

vi.mock("@reading-advantage/auth-client", () => ({ useAuth: () => ({ refresh: refreshMock }) }));
vi.mock("@/i18n/navigation", () => ({ getPathname: ({ href, locale }: { href: string; locale: string }) => `/${locale}${href}`,  useRouter: () => ({ push: vi.fn(), replace: replaceMock }) }));

vi.mock("@/lib/student-login/replace-location", () => ({ replaceLocation: (url: string) => replaceMock(url) }));
import { CodeSignIn } from "../student-login/code-sign-in";
import { renderWithMessages } from "./helpers/render-with-messages";

const fetchMock = vi.fn();
const respond = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  Promise.resolve(new Response(JSON.stringify(body), { status, headers }));
const nameList = (picturePasswordRequired: boolean) => ({
  picturePasswordRequired,
  students: [
    { studentId: "h-ann", displayName: "Ann", avatar: "red-circle" },
    { studentId: "h-bo", displayName: "Bo", avatar: "navy-bird" },
  ],
});
const signedIn = { user: { id: "u1", role: "STUDENT" }, authStrength: "full" };
const bodyOf = (call: unknown[]) => JSON.parse((call[1] as RequestInit).body as string);

beforeEach(() => {
  fetchMock.mockReset();
  replaceMock.mockReset();
  refreshMock.mockReset().mockResolvedValue(undefined);
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

/** Types a code and submits it. */
function enterCode(value: string) {
  fireEvent.change(screen.getByLabelText("Class code"), { target: { value } });
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
}

/** Enters a valid code and waits for the name list. */
async function openNameList(picturePasswordRequired = true) {
  fetchMock.mockReturnValueOnce(respond(200, nameList(picturePasswordRequired)));
  renderWithMessages(<CodeSignIn />);
  enterCode(" ab cd ef ");
  await screen.findByRole("heading", { name: "Who are you?" });
}

describe("CodeSignIn", () => {
  it("sends the code in capitals and shows the names in the server order without other data", async () => {
    await openNameList();
    expect(fetchMock).toHaveBeenCalledWith("/api/auth/student/code", expect.objectContaining({ method: "POST" }));
    expect(bodyOf(fetchMock.mock.calls[0]!)).toEqual({ code: "ABCDEF" });
    const names = within(screen.getByRole("list")).getAllByRole("button");
    expect(names).toHaveLength(2);
    expect(names[0]).toHaveAccessibleName("Ann");
    expect(names[1]).toHaveAccessibleName("Bo");
  });

  it("checks the code length before it calls the server", () => {
    renderWithMessages(<CodeSignIn />);
    enterCode("ABC");
    expect(screen.getByRole("alert")).toHaveTextContent("The code has 6 letters and numbers.");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("announces a code that does not work", async () => {
    fetchMock.mockReturnValueOnce(respond(401, { message: "Invalid code.", code: "invalid_code" }));
    renderWithMessages(<CodeSignIn />);
    enterCode("ABCDEF");
    expect(await screen.findByRole("alert")).toHaveTextContent("This code does not work. Check the code or ask your teacher.");
  });

  it("announces a rate limit with the minutes to wait", async () => {
    fetchMock.mockReturnValueOnce(respond(429, { code: "rate_limited" }, { "Retry-After": "120" }));
    renderWithMessages(<CodeSignIn />);
    enterCode("ABCDEF");
    expect(await screen.findByRole("alert")).toHaveTextContent("Too many tries. Wait 2 minutes and try again.");
  });

  it("goes back from the name list to code entry", async () => {
    await openNameList();
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByLabelText("Class code")).toBeInTheDocument();
  });

  it("signs in with the 3 pictures in tap order and opens the student home", async () => {
    await openNameList();
    fireEvent.click(screen.getByRole("button", { name: "Ann" }));
    expect(await screen.findByRole("heading", { name: "Hi, Ann!" })).toBeInTheDocument();
    fetchMock.mockReturnValueOnce(respond(200, signedIn));
    fireEvent.click(screen.getByRole("button", { name: "yellow star" }));
    fireEvent.click(screen.getByRole("button", { name: "red circle" }));
    fireEvent.click(screen.getByRole("button", { name: "teal flower" }));
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/en/student/home"));
    const call = fetchMock.mock.calls[1]!;
    expect(call[0]).toBe("/api/auth/student/picture");
    expect(bodyOf(call)).toEqual({ code: "ABCDEF", studentId: "h-ann", pictures: [3, 0, 11] });
  });

  it("clears the taps and announces wrong pictures", async () => {
    await openNameList();
    fireEvent.click(screen.getByRole("button", { name: "Ann" }));
    await screen.findByRole("heading", { name: "Hi, Ann!" });
    fetchMock.mockReturnValueOnce(respond(401, { message: "Wrong pictures.", code: "invalid_credentials" }));
    for (const name of ["red circle", "blue square", "green triangle"]) fireEvent.click(screen.getByRole("button", { name }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Those pictures are not right. Try again.");
    expect(screen.getByText("0 of 3 pictures")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "red circle" })).toBeEnabled();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("shows the lockout with the time left and blocks the pictures", async () => {
    await openNameList();
    fireEvent.click(screen.getByRole("button", { name: "Ann" }));
    await screen.findByRole("heading", { name: "Hi, Ann!" });
    fetchMock.mockReturnValueOnce(respond(423, { code: "locked" }, { "Retry-After": "300" }));
    for (const name of ["red circle", "blue square", "green triangle"]) fireEvent.click(screen.getByRole("button", { name }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Too many wrong tries. Wait 5 minutes or ask your teacher.");
    expect(screen.getByRole("button", { name: "red circle" })).toBeDisabled();
  });

  it("goes back to code entry when the class code ends during the pictures", async () => {
    await openNameList();
    fireEvent.click(screen.getByRole("button", { name: "Ann" }));
    await screen.findByRole("heading", { name: "Hi, Ann!" });
    fetchMock.mockReturnValueOnce(respond(401, { code: "invalid_code" }));
    for (const name of ["red circle", "blue square", "green triangle"]) fireEvent.click(screen.getByRole("button", { name }));
    expect(await screen.findByRole("alert")).toHaveTextContent("This code does not work.");
    expect(screen.getByLabelText("Class code")).toBeInTheDocument();
  });

  it("signs in with the name only when the class turned the picture password off", async () => {
    await openNameList(false);
    fetchMock.mockReturnValueOnce(respond(200, { ...signedIn, authStrength: "code_only" }));
    fireEvent.click(screen.getByRole("button", { name: "Bo" }));
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/en/student/home"));
    const call = fetchMock.mock.calls[1]!;
    expect(call[0]).toBe("/api/auth/student/code-only");
    expect(bodyOf(call)).toEqual({ code: "ABCDEF", studentId: "h-bo" });
    expect(screen.queryByRole("button", { name: "red circle" })).not.toBeInTheDocument();
  });

  it("does not talk about pictures when a name-only sign-in fails", async () => {
    await openNameList(false);
    fetchMock.mockReturnValueOnce(respond(401, { code: "invalid_credentials" }));
    fireEvent.click(screen.getByRole("button", { name: "Bo" }));
    expect(await screen.findByRole("alert")).not.toHaveTextContent("pictures");
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("asks for the pictures when the class turned the picture password on after the list loaded", async () => {
    await openNameList(false);
    fetchMock.mockReturnValueOnce(respond(403, { code: "forbidden" }));
    fireEvent.click(screen.getByRole("button", { name: "Bo" }));
    expect(await screen.findByRole("heading", { name: "Hi, Bo!" })).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("shows Thai copy", () => {
    renderWithMessages(<CodeSignIn />, { locale: "th" });
    expect(screen.getByLabelText("รหัสห้องเรียน")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "ต่อไป" })).toBeInTheDocument();
  });
});
