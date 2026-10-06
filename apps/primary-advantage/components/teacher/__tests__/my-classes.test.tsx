// @vitest-environment jsdom
/**
 * My Classes and the class roster index (Lane C Phase 3, task 2): real links to each class, named
 * action buttons, a labelled search, and loading, empty, and error-with-retry states.
 */
import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithMessages, testMessages } from "@/components/__tests__/helpers/render-with-messages";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href, ...rest }: { children?: ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import MyClasses from "../my-classes";
import enJson from "../../../messages/en.json";
import thJson from "../../../messages/th.json";
import viJson from "../../../messages/vi.json";
import cnJson from "../../../messages/cn.json";
import twJson from "../../../messages/tw.json";
import ClassroomSelector from "../classroom-selector";

const C1 = "c1c1c1c1-0000-4000-8000-000000000001";
const classes = [
  { id: C1, name: "P3A", classCode: "ABC123", grade: "3", createdAt: "2026-10-04T20:00:00Z", students: [{ id: "x1" }, { id: "x2" }] },
];
const fetchMock = vi.fn();
let failures = 0;
const en = testMessages.en;

/** Lets pending fetch promises and state updates settle. */
async function flush() {
  await act(async () => {
    for (let i = 0; i < 6; i++) await Promise.resolve();
  });
}

beforeEach(() => {
  failures = 0;
  fetchMock.mockReset();
  fetchMock.mockImplementation(async () =>
    failures-- > 0 ? new Response("{}", { status: 500 }) : new Response(JSON.stringify({ classrooms: classes }), { status: 200 }),
  );
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("My Classes", () => {
  it("links each class name to its class page and names the actions menu", async () => {
    renderWithMessages(<MyClasses />);
    await flush();
    const link = screen.getByRole("link", { name: "P3A" });
    expect(link).toHaveAttribute("href", `/teacher/class-roster/${C1}`);
    expect(link).toHaveClass("min-h-11");
    expect(screen.getByRole("button", { name: "Actions for P3A" })).toHaveClass("size-11");
    expect(screen.getByRole("searchbox", { name: en.TeacherClass.searchClasses })).toBeInTheDocument();
    // The class code is shown as it is stored (no CSS capitalize on codes).
    expect(screen.getByText("ABC123")).not.toHaveClass("capitalize");
  });

  it("has no Google Classroom import (FR-12) and keeps the new class button", async () => {
    renderWithMessages(<MyClasses />);
    await flush();
    expect(screen.queryByRole("button", { name: /Google/ })).not.toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/Google/);
    expect(screen.getByRole("button", { name: /New Classroom/ })).toHaveClass("min-h-11");
  });

  it("has no Google Classroom import copy in any locale (FR-12)", () => {
    for (const messages of [enJson, thJson, viJson, cnJson, twJson]) {
      expect(messages.TeacherMyClasses).not.toHaveProperty("import");
    }
  });

  it("shows an error with a retry when the classes cannot load, and loads them on retry", async () => {
    failures = 1;
    renderWithMessages(<MyClasses />);
    await flush();
    expect(screen.getByRole("alert")).toHaveTextContent(en.TeacherClass.loadClassesError);
    fireEvent.click(screen.getByRole("button", { name: en.Error.retry }));
    await flush();
    expect(screen.getByRole("link", { name: "P3A" })).toBeInTheDocument();
  });
});

describe("class roster index", () => {
  it("shows a card per class with a real link, the student count, and Start class", async () => {
    renderWithMessages(<ClassroomSelector />);
    await flush();
    const card = screen.getByRole("listitem");
    expect(within(card).getByRole("link", { name: "P3A" })).toHaveAttribute("href", `/teacher/class-roster/${C1}`);
    expect(within(card).getByText("2 students")).toBeInTheDocument();
    expect(within(card).getByRole("link", { name: "Start class P3A" })).toHaveAttribute("href", `/teacher/class-roster/${C1}#class-login`);
    // The created date is a Bangkok calendar date, not the US format: 5 October in Bangkok.
    expect(within(card).getByText(/Oct 5, 2026/)).toBeInTheDocument();
  });

  it("shows an error with a retry when the classes cannot load", async () => {
    failures = 1;
    renderWithMessages(<ClassroomSelector />);
    await flush();
    expect(screen.getByRole("alert")).toHaveTextContent(en.TeacherClass.loadClassesError);
    fireEvent.click(screen.getByRole("button", { name: en.Error.retry }));
    await flush();
    expect(screen.getByRole("link", { name: "P3A" })).toBeInTheDocument();
  });
});
