// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

import { HistoryList } from "../history-list";
import { renderWithMessages, testMessages } from "../../__tests__/helpers/render-with-messages";

const fetchMock = vi.fn();

vi.mock("@reading-advantage/auth-client", () => ({
  useSession: () => ({ user: { id: "student-1", role: "STUDENT", schoolId: "school-1" } }),
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href, ...rest }: { children: ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

/**
 * One article record as the API returns it.
 * @param id The article id.
 * @param title The article title.
 * @param status The record status.
 * @param scores The score text ("N/A" when there is no quiz).
 * @returns The record.
 */
function record(id: string, title: string, status = "READ", scores = "N/A") {
  return { id, title, scores, updated_at: "2026-10-04T09:00:00.000Z", rated: 0, status };
}

/**
 * A successful JSON response.
 * @param body The response body.
 * @returns The fetch response stub.
 */
function ok(body: unknown) {
  return { ok: true, json: async () => body };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("HistoryList records", () => {
  it("marks the loading grid as a status region (gate sweep axe fix)", () => {
    fetchMock.mockReturnValue(new Promise(() => undefined));
    renderWithMessages(<HistoryList variant="history" />, { locale: "en" });
    const region = screen.getByRole("status", { name: testMessages.en.StudentHistory.loading });
    expect(region).toHaveAttribute("aria-busy", "true");
  });

  it.each(["en", "th"] as const)("lists the article records as story links with child-friendly status (%s)", async (locale) => {
    const t = testMessages[locale].StudentHistory;
    fetchMock.mockResolvedValue(
      ok({
        data: [record("a1", "The Moon", "UNRATED"), record("a2", "Frogs", "COMPLETED_MCQ", "80%")],
        pagination: { page: 1, limit: 10, total: 2, totalPages: 1 },
      }),
    );
    renderWithMessages(<HistoryList variant="history" />, { locale });

    const moon = await screen.findByRole("link", { name: /The Moon/ });
    expect(moon).toHaveAttribute("href", "/student/read/a1");
    const [first, second] = screen.getAllByRole("listitem");
    expect(within(first).getByText(t.status.UNRATED)).toBeInTheDocument();
    expect(within(second).getByText(t.status.COMPLETED_MCQ)).toBeInTheDocument();
    expect(within(second).getByText(t.score.replace("{score}", "80%"))).toBeInTheDocument();
    expect(within(first).queryByText(/N\/A/)).not.toBeInTheDocument();
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/api/users/student-1/article-records?page=1&limit=10");
    expect(screen.getByRole("searchbox", { name: t.search })).toBeInTheDocument();
  });

  it("shows page controls only for more than one page, and loads the next page", async () => {
    const t = testMessages.en.StudentHistory;
    fetchMock
      .mockResolvedValueOnce(ok({ data: [record("a1", "First story")], pagination: { page: 1, limit: 10, total: 11, totalPages: 2 } }))
      .mockResolvedValueOnce(ok({ data: [record("a11", "Last story")], pagination: { page: 2, limit: 10, total: 11, totalPages: 2 } }));
    renderWithMessages(<HistoryList variant="history" />);

    const pages = await screen.findByRole("navigation", { name: t.pages });
    expect(within(pages).getByText("Page 1 of 2")).toBeInTheDocument();
    fireEvent.click(within(pages).getByRole("button", { name: t.next }));
    expect(await screen.findByText("Last story")).toBeInTheDocument();
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain("page=2");
  });
});

describe("HistoryList states", () => {
  it("shows the reminder empty state, with no search box", async () => {
    const t = testMessages.en.StudentHistory;
    fetchMock.mockResolvedValue(ok({ success: true, data: [] }));
    renderWithMessages(<HistoryList variant="reminder" />);

    expect(await screen.findByText(t.noReadAgain)).toBeInTheDocument();
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/api/users/student-1/reminder-reread");
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
  });

  it("links a reminder card to the story with a read-again label", async () => {
    const t = testMessages.en.StudentHistory;
    fetchMock.mockResolvedValue(ok({ success: true, data: [record("a3", "Sea Turtles", "UNRATED")] }));
    renderWithMessages(<HistoryList variant="reminder" />);

    const link = await screen.findByRole("link", { name: /Sea Turtles/ });
    expect(link).toHaveAttribute("href", "/student/read/a3");
    expect(link).toHaveTextContent(t.readAgainAction);
  });

  it("shows the no-records empty state with a way to the stories", async () => {
    const t = testMessages.en.StudentHistory;
    fetchMock.mockResolvedValue(ok({ data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } }));
    renderWithMessages(<HistoryList variant="history" />);

    expect(await screen.findByText(t.noRecords)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: t.findStory })).toHaveAttribute("href", "/student/read");
  });

  it("offers 'Show all' when a search finds nothing, and it clears the search", async () => {
    const t = testMessages.en.StudentHistory;
    fetchMock.mockResolvedValue(ok({ data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } }));
    renderWithMessages(<HistoryList variant="history" />);
    await screen.findByText(t.noRecords);

    fireEvent.change(screen.getByRole("searchbox", { name: t.search }), { target: { value: "dragon" } });
    expect(await screen.findByText(t.noMatch)).toBeInTheDocument();
    expect(String(fetchMock.mock.calls.at(-1)?.[0])).toContain("search=dragon");

    fireEvent.click(screen.getByRole("button", { name: t.showAll }));
    expect(await screen.findByText(t.noRecords)).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: t.search })).toHaveValue("");
    expect(String(fetchMock.mock.calls.at(-1)?.[0])).not.toContain("search=");
  });

  it("shows an error with a retry when loading fails, and the retry loads the list", async () => {
    const t = testMessages.en.StudentHistory;
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) });
    renderWithMessages(<HistoryList variant="history" />);

    expect(await screen.findByRole("alert")).toHaveTextContent(t.loadError);
    fetchMock.mockResolvedValueOnce(ok({ data: [record("a1", "The Moon")], pagination: { page: 1, limit: 10, total: 1, totalPages: 1 } }));
    fireEvent.click(screen.getByRole("button", { name: testMessages.en.Error.retry }));
    expect(await screen.findByRole("link", { name: /The Moon/ })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
