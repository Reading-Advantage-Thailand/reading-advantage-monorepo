// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PlatformSchoolRow } from "@reading-advantage/domain/primary-dashboards";

import { renderWithMessages, testMessages } from "@/components/__tests__/helpers/render-with-messages";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href, ...rest }: { children?: React.ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { SchoolsTable } from "../schools-table";

const en = testMessages.en.SystemDashboard;

/**
 * Builds one school row.
 * @param over The values to change.
 * @returns The row.
 */
function row(over: Partial<PlatformSchoolRow> & { id: string; name: string }): PlatformSchoolRow {
  return {
    students: 10,
    activeStudents: 5,
    activePercent: 50,
    articlesOpened: 20,
    seatsUsed: 10,
    seats: 20,
    lastActivityAt: "2026-10-10T05:00:00.000Z",
    lastActivityDay: "2026-10-10",
    status: "active",
    ...over,
  };
}

/** The rows in the order of the domain: quiet, active, no students; each group by name. */
const ROWS: PlatformSchoolRow[] = [
  row({ id: "s-quiet", name: "Hilltop School", students: 84, activeStudents: 0, activePercent: 0, articlesOpened: 0, seatsUsed: 84, seats: 100, lastActivityAt: "2026-09-18T05:00:00.000Z", lastActivityDay: "2026-09-18", status: "quiet" }),
  row({ id: "s-a", name: "Bluebell School", students: 240, activeStudents: 109, activePercent: 45, articlesOpened: 312, seatsUsed: 240, seats: 250, lastActivityAt: "2026-10-12T05:00:00.000Z", lastActivityDay: "2026-10-12" }),
  row({ id: "s-b", name: "Cedar Court", students: 72, activeStudents: 31, activePercent: 43, articlesOpened: 66, seatsUsed: 72, seats: null, lastActivityAt: "2026-10-10T05:00:00.000Z", lastActivityDay: "2026-10-10" }),
  row({ id: "s-none", name: "Orchard Pilot", students: 0, activeStudents: 0, activePercent: null, articlesOpened: 0, seatsUsed: 0, seats: 30, lastActivityAt: null, lastActivityDay: null, status: "no_students" }),
];

/** Renders the table. */
function renderTable(rows: PlatformSchoolRow[] = ROWS) {
  renderWithMessages(<SchoolsTable rows={rows} />);
}

/** Reads the school names of the table body in the shown order. */
function shownNames(): string[] {
  const table = screen.getByRole("table", { hidden: true });
  return within(table)
    .getAllByRole("rowheader", { hidden: true })
    .map((cell) => cell.querySelector("a")!.textContent!);
}

/** Finds the column header by its label. */
const header = (label: string) => screen.getByRole("columnheader", { name: new RegExp(label), hidden: true });

afterEach(() => cleanup());

describe("SchoolsTable", () => {
  it("keeps the order of the domain by default: quiet, active, no students", () => {
    renderTable();
    expect(shownNames()).toEqual(["Hilltop School", "Bluebell School", "Cedar Court", "Orchard Pilot"]);
    for (const label of Object.values(en.table.columns)) expect(header(label)).toHaveAttribute("aria-sort", "none");
  });

  it("links each school to the admin dashboard of the school", () => {
    renderTable();
    const table = screen.getByRole("table", { hidden: true });
    expect(within(table).getByRole("link", { name: "Bluebell School", hidden: true })).toHaveAttribute("href", "/admin/dashboard?school=s-a");
    const open = within(table).getByRole("link", { name: "Open the dashboard of Bluebell School", hidden: true });
    expect(open).toHaveAttribute("href", "/admin/dashboard?school=s-a");
    expect(open).toHaveTextContent(en.table.open);
  });

  it("shows n of m with the percent, a dash for no students, No license, and None", () => {
    renderTable();
    const rows = within(screen.getByRole("table", { hidden: true })).getAllByRole("row", { hidden: true });
    expect(rows[2]).toHaveTextContent("109 of 240 (45%)");
    expect(rows[2]).toHaveTextContent("240 of 250");
    expect(rows[3]).toHaveTextContent(en.table.noLicense);
    expect(rows[4]).toHaveTextContent("—");
    expect(rows[4]).toHaveTextContent(en.table.none);
  });

  it("shows the last activity as a Bangkok day", () => {
    renderTable();
    const rows = within(screen.getByRole("table", { hidden: true })).getAllByRole("row", { hidden: true });
    expect(rows[1]).toHaveTextContent("Sep 18");
    expect(rows[2]).toHaveTextContent("Oct 12");
  });

  it("writes the last activity day with the Chinese format for cn", () => {
    renderWithMessages(<SchoolsTable rows={ROWS} />, { locale: "cn" });
    const rows = within(screen.getByRole("table", { hidden: true })).getAllByRole("row", { hidden: true });
    expect(rows[1]).toHaveTextContent("9月18日");
  });

  it("shows the status as a word with a mark", () => {
    renderTable();
    const table = screen.getByRole("table", { hidden: true });
    expect(within(table).getByText(en.status.quiet)).toBeInTheDocument();
    expect(within(table).getAllByText(en.status.active)[0]).toBeInTheDocument();
    expect(within(table).getByText(en.status.noStudents)).toBeInTheDocument();
  });

  it("sorts the name column ascending, and a second tap changes the order", () => {
    renderTable();
    fireEvent.click(within(header(en.table.columns.name)).getByRole("button", { hidden: true }));
    expect(shownNames()).toEqual(["Bluebell School", "Cedar Court", "Hilltop School", "Orchard Pilot"]);
    expect(header(en.table.columns.name)).toHaveAttribute("aria-sort", "ascending");
    fireEvent.click(within(header(en.table.columns.name)).getByRole("button", { hidden: true }));
    expect(shownNames()).toEqual(["Orchard Pilot", "Hilltop School", "Cedar Court", "Bluebell School"]);
    expect(header(en.table.columns.name)).toHaveAttribute("aria-sort", "descending");
  });

  it.each([
    ["active", ["Bluebell School", "Cedar Court", "Hilltop School", "Orchard Pilot"]],
    ["articles", ["Bluebell School", "Cedar Court", "Hilltop School", "Orchard Pilot"]],
    ["seats", ["Bluebell School", "Hilltop School", "Orchard Pilot", "Cedar Court"]],
    ["last", ["Bluebell School", "Cedar Court", "Hilltop School", "Orchard Pilot"]],
    ["status", ["Hilltop School", "Bluebell School", "Cedar Court", "Orchard Pilot"]],
  ] as const)("sorts by %s with one tap", (key, expected) => {
    renderTable();
    fireEvent.click(within(header(en.table.columns[key])).getByRole("button", { hidden: true }));
    expect(shownNames()).toEqual(expected);
  });

  it("sorts names with localeCompare", () => {
    renderTable([row({ id: "1", name: "école B" }), row({ id: "2", name: "Zebra" }), row({ id: "3", name: "Apple" })]);
    fireEvent.click(within(header(en.table.columns.name)).getByRole("button", { hidden: true }));
    expect(shownNames()).toEqual(["Apple", "école B", "Zebra"]);
  });

  it("filters by a part of the school name, ignoring case", () => {
    renderTable();
    fireEvent.change(screen.getByRole("searchbox", { name: en.table.searchLabel }), { target: { value: "SCHOOL" } });
    expect(shownNames()).toEqual(["Hilltop School", "Bluebell School"]);
  });

  it("says that no school matches", () => {
    renderTable();
    fireEvent.change(screen.getByRole("searchbox", { name: en.table.searchLabel }), { target: { value: "zebra" } });
    expect(screen.getByRole("status")).toHaveTextContent("No school matches “zebra”.");
    expect(screen.queryByRole("table", { hidden: true })).not.toBeInTheDocument();
  });

  it("sorts with the select and the direction button on a phone, and the controls are 48 px", () => {
    renderTable();
    const select = screen.getByLabelText(en.table.sortBy);
    expect(select).toHaveClass("min-h-12");
    fireEvent.change(select, { target: { value: "articles" } });
    expect(shownNames()).toEqual(["Bluebell School", "Cedar Court", "Hilltop School", "Orchard Pilot"]);
    const direction = screen.getByRole("button", { name: en.table.sortDirection });
    expect(direction).toHaveClass("min-h-12");
    fireEvent.click(direction);
    expect(shownNames()).toEqual(["Hilltop School", "Orchard Pilot", "Cedar Court", "Bluebell School"]);
    fireEvent.change(select, { target: { value: "" } });
    expect(shownNames()).toEqual(["Hilltop School", "Bluebell School", "Cedar Court", "Orchard Pilot"]);
  });

  it("renders one card for each school for a phone, with a full-width Open dashboard link", () => {
    renderTable();
    const cards = within(screen.getByRole("list", { hidden: true })).getAllByRole("listitem", { hidden: true });
    expect(cards).toHaveLength(4);
    const link = within(cards[1]).getByRole("link", { name: "Open the dashboard of Bluebell School", hidden: true });
    expect(link).toHaveClass("w-full");
    expect(link).toHaveTextContent(en.table.openCard);
    expect(link).toHaveAttribute("href", "/admin/dashboard?school=s-a");
    expect(within(cards[1]).getByText("109 of 240 (45%)")).toBeInTheDocument();
  });

  it("shows an empty state with a link to Schools when there is no school", () => {
    renderTable([]);
    expect(screen.getByText(en.table.empty)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: en.table.goToSchools })).toHaveAttribute("href", "/system/schools");
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
  });

  it("explains the week, quiet, and seats in a note", () => {
    renderTable();
    expect(screen.getByText(en.table.footnote)).toBeInTheDocument();
  });
});
