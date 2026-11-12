// @vitest-environment jsdom
/**
 * Start/End class control (primary_student_login_20261003, Phase 3 task 1, FR-1).
 * The control starts and ends the class login session through the Phase 2 routes and shows
 * the code once, big enough to project.
 */
import "@testing-library/jest-dom/vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ClassSessionControl, type ClassSessionControlProps } from "../teacher/class-login/class-session-control";
import { ClassLoginApiError, errorKey } from "../teacher/class-login/api";
import { allMessages, renderWithMessages, withMessages } from "./helpers/render-with-messages";
import enMessages from "../../messages/en.json";
import thMessages from "../../messages/th.json";

const CLASS_ID = "11111111-1111-4111-8111-111111111111";
const SESSION_ID = "33333333-3333-4333-8333-333333333333";
const EXPIRES = "2026-10-05T07:45:00.000Z";
const fetchMock = vi.fn();
const json = (status: number, body: unknown) => Promise.resolve(new Response(JSON.stringify(body), { status }));

/** The six new message keys of plan task 1.9 (strategy sections 6.8 and 7.2). */
const LIFETIME_MESSAGE_KEYS = [
  "ClassLogin.session.lifetimeLabel",
  "ClassLogin.session.lifetime.6h",
  "ClassLogin.session.lifetime.until_17",
  "ClassLogin.session.lifetime.7d",
  "ClassLogin.session.lifetimeHelp7d",
  "ClassLogin.errors.lifetimeInvalid",
] as const;

/** Reads a message path and returns undefined for a missing key (strategy section 6.1). */
function messageAt(tree: unknown, path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>((node, part) => (node && typeof node === "object" ? (node as Record<string, unknown>)[part] : undefined), tree);
}

/** Reads a message path as text, so a missing key fails with its path and not a TypeError. */
function messageText(tree: unknown, path: string): string {
  const value = messageAt(tree, path);
  expect(typeof value, `message key ${path}`).toBe("string");
  return value as string;
}

/** Fixes the clock that the option list and the expiry text read. */
function clock(iso: string) {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(iso));
}

/** Renders the control with the shared props and one message locale. */
function renderControl(props: Partial<ClassSessionControlProps> = {}, locale: "en" | "th" = "en") {
  const onChange = props.onChange ?? vi.fn().mockResolvedValue(undefined);
  return renderWithMessages(
    <ClassSessionControl classroomId={CLASS_ID} openSession={null} fetchedAt={1} onChange={onChange} {...props} />,
    { locale },
  );
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("ClassSessionControl", () => {
  it("starts the class and shows the code and its end time", async () => {
    fetchMock.mockReturnValue(json(200, { sessionId: SESSION_ID, code: "ABCDEF", expiresAt: EXPIRES }));
    const onChange = vi.fn().mockResolvedValue(undefined);
    const { rerender } = renderWithMessages(<ClassSessionControl classroomId={CLASS_ID} openSession={null} fetchedAt={1} onChange={onChange} />);
    expect(screen.getByText("Start the class to show a sign-in code for your students.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Start class" }));
    await waitFor(() => expect(onChange).toHaveBeenCalled());
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/student/class-session/start",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ classroomId: CLASS_ID, lifetime: "6h" }) }),
    );
    // The roster refresh after the start reports the new open session.
    rerender(withMessages(<ClassSessionControl classroomId={CLASS_ID} openSession={{ id: SESSION_ID, expiresAt: EXPIRES }} fetchedAt={Date.now() + 1000} onChange={onChange} />));
    expect(screen.getByText("ABCDEF")).toBeInTheDocument();
    expect(screen.getByRole("status", { name: "Class code A B C D E F" })).toBeInTheDocument();
    expect(screen.getByText(/^Open until /)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "End class" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "New code" })).toBeInTheDocument();
  });

  it("keeps the new code when the roster read after the start fails", async () => {
    fetchMock.mockReturnValue(json(200, { sessionId: SESSION_ID, code: "ABCDEF", expiresAt: EXPIRES }));
    // The panel refresh catches its own error: the roster and its read time stay the same.
    const onChange = vi.fn().mockResolvedValue(undefined);
    renderWithMessages(<ClassSessionControl classroomId={CLASS_ID} openSession={null} fetchedAt={1} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Start class" }));
    await waitFor(() => expect(onChange).toHaveBeenCalled());
    expect(await screen.findByText("ABCDEF")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "End class" })).toBeInTheDocument();
  });

  it("keeps the new code after New code when the next roster read fails", async () => {
    const OTHER_ID = "44444444-4444-4444-8444-444444444444";
    fetchMock.mockReturnValue(json(200, { sessionId: SESSION_ID, code: "GHJKMN", expiresAt: EXPIRES }));
    const onChange = vi.fn().mockResolvedValue(undefined);
    renderWithMessages(<ClassSessionControl classroomId={CLASS_ID} openSession={{ id: OTHER_ID, expiresAt: EXPIRES }} fetchedAt={1} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "New code" }));
    await waitFor(() => expect(onChange).toHaveBeenCalled());
    expect(await screen.findByText("GHJKMN")).toBeInTheDocument();
  });

  it.each([
    ["no session", null],
    ["another session", { id: "44444444-4444-4444-8444-444444444444", expiresAt: EXPIRES }],
  ])("hides the code when a later roster read reports %s", async (_label, openSession) => {
    fetchMock.mockReturnValue(json(200, { sessionId: SESSION_ID, code: "ABCDEF", expiresAt: EXPIRES }));
    const onChange = vi.fn().mockResolvedValue(undefined);
    const { rerender } = renderWithMessages(<ClassSessionControl classroomId={CLASS_ID} openSession={null} fetchedAt={1} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Start class" }));
    await waitFor(() => expect(onChange).toHaveBeenCalled());
    expect(await screen.findByText("ABCDEF")).toBeInTheDocument();
    rerender(withMessages(<ClassSessionControl classroomId={CLASS_ID} openSession={openSession} fetchedAt={Date.now() + 1000} onChange={onChange} />));
    await waitFor(() => expect(screen.queryByText("ABCDEF")).not.toBeInTheDocument());
  });

  it("explains an open session whose code is no longer known and offers a new code", () => {
    renderWithMessages(<ClassSessionControl classroomId={CLASS_ID} openSession={{ id: SESSION_ID, expiresAt: EXPIRES }} fetchedAt={1} onChange={vi.fn()} />);
    expect(screen.getByText(/The code shows only once/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "New code" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Start class" })).not.toBeInTheDocument();
  });

  it("ends the class", async () => {
    fetchMock.mockReturnValue(json(200, { closed: 1 }));
    const onChange = vi.fn().mockResolvedValue(undefined);
    renderWithMessages(<ClassSessionControl classroomId={CLASS_ID} openSession={{ id: SESSION_ID, expiresAt: EXPIRES }} fetchedAt={1} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "End class" }));
    await waitFor(() => expect(onChange).toHaveBeenCalled());
    expect(fetchMock).toHaveBeenCalledWith("/api/auth/student/class-session/end", expect.objectContaining({ method: "POST" }));
  });

  it("announces an error from the server", async () => {
    fetchMock.mockReturnValue(json(403, { message: "Not allowed.", code: "forbidden" }));
    const onChange = vi.fn();
    renderWithMessages(<ClassSessionControl classroomId={CLASS_ID} openSession={null} fetchedAt={1} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Start class" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("You cannot manage this class.");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("shows Thai copy", () => {
    renderWithMessages(<ClassSessionControl classroomId={CLASS_ID} openSession={null} fetchedAt={1} onChange={vi.fn()} />, { locale: "th" });
    expect(screen.getByRole("button", { name: "เริ่มชั้นเรียน" })).toBeInTheDocument();
  });
});

describe("ClassSessionControl lifetime choice", () => {
  it("shows the three lifetime choices in English", () => {
    clock("2026-11-11T05:00:00Z");
    renderControl();
    expect(screen.getByRole("radiogroup", { name: "How long should sign-in stay open?" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "6 hours" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Until 17:00 today" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "7 days" })).toBeInTheDocument();
  });

  it("shows the three lifetime choices in Thai from the message tree", () => {
    clock("2026-11-11T05:00:00Z");
    const label = messageText(thMessages, "ClassLogin.session.lifetimeLabel");
    const choices = ["6h", "until_17", "7d"].map((key) => messageText(thMessages, `ClassLogin.session.lifetime.${key}`));
    expect(choices).toHaveLength(3);
    renderControl({}, "th");
    expect(screen.getByRole("radiogroup", { name: label })).toBeInTheDocument();
    for (const choice of choices) expect(screen.getByRole("radio", { name: choice })).toBeInTheDocument();
  });

  it("selects 6 hours by default", () => {
    clock("2026-11-11T05:00:00Z");
    renderControl();
    expect(screen.getByRole("radio", { name: "6 hours" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Until 17:00 today" })).not.toBeChecked();
    expect(screen.getByRole("radio", { name: "7 days" })).not.toBeChecked();
  });

  it("posts the chosen 7 days and exactly the two body keys", async () => {
    clock("2026-11-11T05:00:00Z");
    fetchMock.mockReturnValue(json(200, { sessionId: SESSION_ID, code: "ABCDEF", expiresAt: EXPIRES }));
    const onChange = vi.fn().mockResolvedValue(undefined);
    renderControl({ onChange });
    fireEvent.click(screen.getByRole("radio", { name: "7 days" }));
    fireEvent.click(screen.getByRole("button", { name: "Start class" }));
    await waitFor(() => expect(onChange).toHaveBeenCalled());
    const body = JSON.parse(fetchMock.mock.calls[0]![1].body as string) as Record<string, unknown>;
    expect(body).toEqual({ classroomId: CLASS_ID, lifetime: "7d" });
    expect(Object.keys(body).sort()).toEqual(["classroomId", "lifetime"]);
  });

  it("uses the selected lifetime for a new code", async () => {
    clock("2026-11-11T05:00:00Z");
    fetchMock.mockReturnValue(json(200, { sessionId: SESSION_ID, code: "GHJKMN", expiresAt: EXPIRES }));
    const onChange = vi.fn().mockResolvedValue(undefined);
    renderControl({ openSession: { id: "44444444-4444-4444-8444-444444444444", expiresAt: EXPIRES }, onChange });
    fireEvent.click(screen.getByRole("radio", { name: "7 days" }));
    fireEvent.click(screen.getByRole("button", { name: "New code" }));
    await waitFor(() => expect(onChange).toHaveBeenCalled());
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body as string)).toEqual({ classroomId: CLASS_ID, lifetime: "7d" });
  });

  it("keeps the choice group beside the Start and New code buttons", async () => {
    clock("2026-11-11T05:00:00Z");
    fetchMock.mockReturnValue(json(200, { sessionId: SESSION_ID, code: "ABCDEF", expiresAt: EXPIRES }));
    const onChange = vi.fn().mockResolvedValue(undefined);
    const { rerender } = renderControl({ onChange });
    expect(screen.getByRole("button", { name: "Start class" })).toBeInTheDocument();
    expect(screen.getByRole("radiogroup", { name: "How long should sign-in stay open?" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Start class" }));
    await waitFor(() => expect(onChange).toHaveBeenCalled());
    expect(await screen.findByRole("button", { name: "New code" })).toBeInTheDocument();
    expect(screen.getByRole("radiogroup", { name: "How long should sign-in stay open?" })).toBeInTheDocument();
    rerender(
      withMessages(
        <ClassSessionControl classroomId={CLASS_ID} openSession={{ id: SESSION_ID, expiresAt: EXPIRES }} fetchedAt={Date.now() + 1000} onChange={onChange} />,
      ),
    );
    expect(screen.getByRole("button", { name: "New code" })).toBeInTheDocument();
    expect(screen.getByRole("radiogroup", { name: "How long should sign-in stay open?" })).toBeInTheDocument();
  });

  it("shows Until 17:00 today just before 17:00 Bangkok", () => {
    clock("2026-11-11T09:59:59Z");
    renderControl();
    expect(screen.getByRole("radio", { name: "Until 17:00 today" })).toBeInTheDocument();
  });

  it.each(["2026-11-11T10:00:00Z", "2026-11-11T16:59:00Z"])("hides Until 17:00 today at %s", (iso) => {
    clock(iso);
    renderControl();
    expect(screen.queryByRole("radio", { name: "Until 17:00 today" })).not.toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "6 hours" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "7 days" })).toBeInTheDocument();
  });

  it("shows Until 17:00 today when the Bangkok date is the next day", () => {
    clock("2026-11-11T17:30:00Z");
    renderControl();
    expect(screen.getByRole("radio", { name: "Until 17:00 today" })).toBeInTheDocument();
  });

  async function startAndRead(expiresAt: string, locale: "en" | "th" = "en") {
    fetchMock.mockReturnValue(json(200, { sessionId: SESSION_ID, code: "ABCDEF", expiresAt }));
    const onChange = vi.fn().mockResolvedValue(undefined);
    renderControl({ onChange }, locale);
    fireEvent.click(screen.getByRole("button", { name: locale === "th" ? "เริ่มชั้นเรียน" : "Start class" }));
    await waitFor(() => expect(onChange).toHaveBeenCalled());
    return screen.findByText(locale === "th" ? /^ใช้ได้ถึง / : /^Open until /);
  }

  it("shows the server expiry as a time on the same Bangkok day in English", async () => {
    clock("2026-11-11T05:00:00Z");
    expect(await startAndRead("2026-11-11T10:00:00.000Z")).toHaveTextContent(/^Open until 5:00\sPM$/);
  });

  it("shows the server expiry as a time on the same Bangkok day in Thai", async () => {
    clock("2026-11-11T05:00:00Z");
    expect(await startAndRead("2026-11-11T10:00:00.000Z", "th")).toHaveTextContent(/^ใช้ได้ถึง 17:00$/);
  });

  it("shows the date for a 7 day expiry in English", async () => {
    clock("2026-11-11T05:00:00Z");
    const text = (await startAndRead("2026-11-18T05:00:00.000Z")).textContent ?? "";
    expect(text).toMatch(/Nov 18,\s*12:00\s*PM/);
    expect(text).not.toMatch(/2026|2569/);
  });

  it("shows the date for a 7 day expiry in Thai", async () => {
    clock("2026-11-11T05:00:00Z");
    const text = (await startAndRead("2026-11-18T05:00:00.000Z", "th")).textContent ?? "";
    expect(text).toMatch(/18 พ\.ย\. 12:00/);
    expect(text).not.toMatch(/2026|2569/);
  });

  it("shows the date when the expiry falls on the next Bangkok day", async () => {
    clock("2026-11-11T16:00:00Z"); // 23:00 Bangkok
    const text = (await startAndRead("2026-11-11T19:00:00.000Z")).textContent ?? ""; // 02:00 on 12 Nov
    expect(text).toMatch(/Nov\s+12/);
    expect(text).toMatch(/2:00\s*AM/);
  });

  it("shows only the time when the expiry is on the same Bangkok day near midnight", async () => {
    clock("2026-11-11T17:30:00Z"); // 00:30 on 12 Nov
    const text = (await startAndRead("2026-11-12T10:00:00.000Z")).textContent ?? ""; // 17:00 on 12 Nov
    expect(text).toMatch(/^Open until 5:00\sPM$/);
  });

  it("shows the lifetime error and keeps the choices when the server refuses the start", async () => {
    clock("2026-11-11T09:00:00Z"); // 16:00 Bangkok: the panel shows until_17, the server may refuse
    fetchMock.mockReturnValue(json(400, { message: "Choose another time.", code: "invalid_input" }));
    const onChange = vi.fn();
    renderControl({ onChange });
    fireEvent.click(screen.getByRole("button", { name: "Start class" }));
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("This choice is not available now. Choose another time.");
    expect(alert).not.toHaveTextContent("Something went wrong. Try again.");
    expect(screen.getByRole("radio", { name: "Until 17:00 today" })).toBeInTheDocument();
    expect(screen.getByRole("radiogroup", { name: "How long should sign-in stay open?" })).toBeInTheDocument();
    expect(screen.queryByRole("status", { name: /Class code/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start class" })).toBeEnabled();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("shows the generic error for a contract 400 with no code", async () => {
    clock("2026-11-11T05:00:00Z");
    fetchMock.mockReturnValue(json(400, { message: "Invalid input" }));
    renderControl();
    fireEvent.click(screen.getByRole("button", { name: "Start class" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Something went wrong. Try again.");
  });

  it("maps the invalid_input code to the lifetime error key", () => {
    expect(errorKey(new ClassLoginApiError(400, "invalid_input"))).toBe("lifetimeInvalid");
    expect(errorKey(new ClassLoginApiError(400))).toBe("generic");
  });

  it("shows the 7 day help text only when 7 days is selected", () => {
    clock("2026-11-11T05:00:00Z");
    const help = messageText(enMessages, "ClassLogin.session.lifetimeHelp7d");
    expect(help).toBe("Students can use their cards at home until this time. End the class to stop sign-in earlier.");
    renderControl();
    expect(screen.queryByText(help)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: "7 days" }));
    expect(screen.getByText(help)).toBeInTheDocument();
  });

  it("gives each lifetime option a visible label and a 44 px target class", () => {
    clock("2026-11-11T05:00:00Z");
    renderControl();
    const choices = ["6 hours", "Until 17:00 today", "7 days"];
    expect(choices).toHaveLength(3);
    for (const name of choices) {
      const radio = screen.getByRole("radio", { name }) as HTMLInputElement;
      const label = radio.labels?.[0] ?? radio.closest("label");
      expect(label, `${name} label`).not.toBeNull();
      expect(label!.textContent).toContain(name);
      let node: HTMLElement | null = label;
      let hasHeightClass = false;
      for (let i = 0; i < 4 && node; i++) {
        if (/(min-h-1[12]|h-1[12])/.test(node.className)) {
          hasHeightClass = true;
          break;
        }
        node = node.parentElement;
      }
      expect(hasHeightClass, `${name} height class`).toBe(true);
    }
  });

  it("holds the six new keys in en and th with different text", () => {
    expect(LIFETIME_MESSAGE_KEYS).toHaveLength(6);
    let checked = 0;
    for (const key of LIFETIME_MESSAGE_KEYS) {
      const en = messageText(enMessages, key);
      const th = messageText(thMessages, key);
      expect(en.length, `${key} en`).toBeGreaterThan(0);
      expect(th.length, `${key} th`).toBeGreaterThan(0);
      expect(th, `${key} th is not a copy of en`).not.toBe(en);
      checked += 2;
    }
    expect(checked).toBe(12);
  });

  it("holds every new key in all five locales (orchestrator decision F5)", () => {
    const locales = ["en", "th", "cn", "tw", "vi"] as const;
    expect(locales).toHaveLength(5);
    expect(LIFETIME_MESSAGE_KEYS).toHaveLength(6);
    let checked = 0;
    for (const locale of locales) {
      for (const key of LIFETIME_MESSAGE_KEYS) {
        const value = messageAt(allMessages[locale], key);
        expect(typeof value, `${locale} ${key}`).toBe("string");
        expect((value as string).length, `${locale} ${key}`).toBeGreaterThan(0);
        checked += 1;
      }
    }
    expect(checked).toBe(30);
  });

  // Remediation round 1 (reviews F121, F125, F141, F144).
  it("posts until_17 before 17:00 Bangkok", async () => {
    clock("2026-11-11T09:00:00Z"); // 16:00 Bangkok
    fetchMock.mockReturnValue(json(200, { sessionId: SESSION_ID, code: "ABCDEF", expiresAt: EXPIRES }));
    const onChange = vi.fn().mockResolvedValue(undefined);
    renderControl({ onChange });
    fireEvent.click(screen.getByRole("radio", { name: "Until 17:00 today" }));
    fireEvent.click(screen.getByRole("button", { name: "Start class" }));
    await waitFor(() => expect(onChange).toHaveBeenCalled());
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body as string)).toEqual({ classroomId: CLASS_ID, lifetime: "until_17" });
  });

  it("falls back to 6 hours when the clock passes 17:00 with until_17 selected", async () => {
    clock("2026-11-11T09:59:59Z"); // 16:59:59 Bangkok
    fetchMock.mockReturnValue(json(200, { sessionId: SESSION_ID, code: "ABCDEF", expiresAt: EXPIRES }));
    const onChange = vi.fn().mockResolvedValue(undefined);
    const { rerender } = renderControl({ onChange });
    fireEvent.click(screen.getByRole("radio", { name: "Until 17:00 today" }));
    expect(screen.getByRole("radio", { name: "Until 17:00 today" })).toBeChecked();
    vi.setSystemTime(new Date("2026-11-11T10:00:00Z")); // 17:00 Bangkok
    rerender(
      withMessages(
        <ClassSessionControl classroomId={CLASS_ID} openSession={null} fetchedAt={1} onChange={onChange} />,
      ),
    );
    expect(screen.getByRole("radio", { name: "6 hours" })).toBeChecked();
    expect(screen.queryByRole("radio", { name: "Until 17:00 today" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Start class" }));
    await waitFor(() => expect(onChange).toHaveBeenCalled());
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body as string)).toEqual({ classroomId: CLASS_ID, lifetime: "6h" });
  });

  it("clears the lifetime error when the teacher picks another option", async () => {
    clock("2026-11-11T09:00:00Z"); // 16:00 Bangkok
    fetchMock.mockReturnValue(json(400, { message: "Choose another time.", code: "invalid_input" }));
    renderControl();
    fireEvent.click(screen.getByRole("button", { name: "Start class" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("This choice is not available now. Choose another time.");
    fireEvent.click(screen.getByRole("radio", { name: "7 days" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("names the group with a visible label and describes the 7 day help", () => {
    clock("2026-11-11T05:00:00Z");
    const label = messageText(enMessages, "ClassLogin.session.lifetimeLabel");
    renderControl();
    expect(screen.getByText(label)).toBeInTheDocument();
    const group = screen.getByRole("radiogroup", { name: label });
    expect(group.getAttribute("aria-labelledby")).toBe("class-session-lifetime-label");
    expect(group.getAttribute("aria-describedby")).toBeNull();
    fireEvent.click(screen.getByRole("radio", { name: "7 days" }));
    const describedBy = group.getAttribute("aria-describedby");
    expect(describedBy).toBe("class-session-lifetime-help");
    expect(document.getElementById(describedBy!)).toHaveTextContent(
      messageText(enMessages, "ClassLogin.session.lifetimeHelp7d"),
    );
  });
});
