// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TeacherClassRow } from "@reading-advantage/domain/primary-home";

import { renderWithMessages, testMessages } from "@/components/__tests__/helpers/render-with-messages";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href, ...rest }: { children?: React.ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { TeacherClassTable } from "../teacher-class-table";

const en = testMessages.en.TeacherHome;

/**
 * Builds one class row.
 * @param over The values to change.
 * @returns The row.
 */
function row(over: Partial<TeacherClassRow> & { id: string; name: string }): TeacherClassRow {
  return { grade: 5, students: 10, active7d: 8, activeRate7d: 80, averageLevel: 4.5, xp7d: 100, xpPrevious7d: 100, trend: "flat", status: "onTrack", ...over };
}

const ROWS: TeacherClassRow[] = [
  row({ id: "c-b", name: "Class 5B", students: 24, active7d: 10, activeRate7d: 42, averageLevel: 6.2, xp7d: 900, xpPrevious7d: 1000, trend: "down", status: "someQuiet" }),
  row({ id: "c-a", name: "Class 5A", students: 12, active7d: 11, activeRate7d: 92, averageLevel: 3.1, xp7d: 1500, xpPrevious7d: 1000, trend: "up", status: "onTrack" }),
  row({ id: "c-c", name: "Grade 6, \"Fox\"", grade: 6, students: 0, active7d: 0, activeRate7d: 0, averageLevel: null, xp7d: 0, xpPrevious7d: 0, trend: "flat", status: "noStudents" }),
];

/**
 * Renders the table and returns the table part (the desktop layout).
 * @param rows The class rows.
 * @returns The table element.
 */
function renderTable(rows: TeacherClassRow[] = ROWS) {
  renderWithMessages(<TeacherClassTable rows={rows} />);
  return screen.queryByRole("table", { hidden: true });
}

/**
 * Reads the class names of the table body in the shown order.
 * @returns The names.
 */
function shownNames(): string[] {
  const table = screen.getByRole("table", { hidden: true });
  return within(table)
    .getAllByRole("rowheader", { hidden: true })
    .map((cell) => cell.querySelector("a")!.textContent!);
}

afterEach(() => cleanup());

describe("TeacherClassTable", () => {
  it.each(["en", "th", "cn", "tw", "vi"] as const)("%s: each aria-label starts with the visible text of its control", (locale) => {
    renderWithMessages(<TeacherClassTable rows={ROWS} />, { locale });
    const controls = [...screen.getAllByRole("button", { hidden: true }), ...screen.getAllByRole("link", { hidden: true })].filter((el) => el.hasAttribute("aria-label"));
    expect(controls.length).toBeGreaterThan(2);
    for (const el of controls) {
      const visible = el.textContent!.trim();
      if (visible) expect(el.getAttribute("aria-label")!.startsWith(visible), `${visible} / ${el.getAttribute("aria-label")}`).toBe(true);
    }
  });

  it("shows the classes sorted by name, ascending, with aria-sort on the name column", () => {
    renderTable();
    expect(shownNames()).toEqual(["Class 5A", "Class 5B", "Grade 6, \"Fox\""]);
    expect(screen.getByRole("columnheader", { name: new RegExp(en.table.columns.name), hidden: true })).toHaveAttribute("aria-sort", "ascending");
    expect(screen.getByRole("columnheader", { name: new RegExp(en.table.columns.students), hidden: true })).toHaveAttribute("aria-sort", "none");
  });

  it("links the class name to the class page and keeps Start class", () => {
    renderTable();
    const table = screen.getByRole("table", { hidden: true });
    expect(within(table).getByRole("link", { name: "Class 5A", hidden: true })).toHaveAttribute("href", "/teacher/class-roster/c-a");
    expect(within(table).getByRole("link", { name: "Start class Class 5A", hidden: true })).toHaveAttribute("href", "/teacher/class-roster/c-a#class-login");
  });

  it("shows the active count with its rounded percent, and a dash for an empty class", () => {
    renderTable();
    const table = screen.getByRole("table", { hidden: true });
    const rows = within(table).getAllByRole("row", { hidden: true });
    expect(rows[1]).toHaveTextContent("11 of 12 (92%)");
    expect(rows[3]).toHaveTextContent("—");
  });

  it("sorts on a column, and a second tap on the same column changes the order", () => {
    renderTable();
    const header = () => screen.getByRole("columnheader", { name: new RegExp(en.table.columns.students), hidden: true });
    fireEvent.click(within(header()).getByRole("button", { hidden: true }));
    expect(shownNames()).toEqual(["Class 5B", "Class 5A", "Grade 6, \"Fox\""]);
    expect(header()).toHaveAttribute("aria-sort", "descending");
    fireEvent.click(within(header()).getByRole("button", { hidden: true }));
    expect(shownNames()).toEqual(["Grade 6, \"Fox\"", "Class 5A", "Class 5B"]);
    expect(header()).toHaveAttribute("aria-sort", "ascending");
  });

  it.each([
    ["active", ["Class 5A", "Class 5B", "Grade 6, \"Fox\""]],
    ["level", ["Class 5B", "Class 5A", "Grade 6, \"Fox\""]],
    ["xp", ["Class 5A", "Class 5B", "Grade 6, \"Fox\""]],
    ["trend", ["Class 5B", "Grade 6, \"Fox\"", "Class 5A"]],
    ["status", ["Class 5B", "Class 5A", "Grade 6, \"Fox\""]],
  ] as const)("sorts by %s with one tap", (key, expected) => {
    renderTable();
    const header = screen.getByRole("columnheader", { name: new RegExp(en.table.columns[key].replace(/[()]/g, "\\$&")), hidden: true });
    fireEvent.click(within(header).getByRole("button", { hidden: true }));
    expect(shownNames()).toEqual(expected);
  });

  it("sorts with the select and the direction button on a phone", () => {
    renderTable();
    fireEvent.change(screen.getByLabelText(en.table.sortBy), { target: { value: "xp" } });
    expect(shownNames()).toEqual(["Class 5A", "Class 5B", "Grade 6, \"Fox\""]);
    fireEvent.click(screen.getByRole("button", { name: new RegExp(en.table.sortDirection) }));
    expect(shownNames()).toEqual(["Grade 6, \"Fox\"", "Class 5B", "Class 5A"]);
  });

  it("filters by a part of the class name, ignoring case", () => {
    renderTable();
    fireEvent.change(screen.getByRole("searchbox", { name: en.table.searchLabel }), { target: { value: "CLASS 5" } });
    expect(shownNames()).toEqual(["Class 5A", "Class 5B"]);
  });

  it("says that no class matches", () => {
    renderTable();
    fireEvent.change(screen.getByRole("searchbox", { name: en.table.searchLabel }), { target: { value: "zebra" } });
    expect(screen.getByRole("status")).toHaveTextContent("No class matches “zebra”.");
    expect(screen.queryByRole("table", { hidden: true })).not.toBeInTheDocument();
  });

  it("renders one card for each class for a phone, with a full-width Start class link", () => {
    renderTable();
    const list = screen.getByRole("list", { hidden: true });
    const cards = within(list).getAllByRole("listitem", { hidden: true });
    expect(cards).toHaveLength(3);
    const link = within(cards[0]).getByRole("link", { name: "Start class Class 5A", hidden: true });
    expect(link).toHaveClass("w-full");
    expect(within(cards[0]).getByRole("link", { name: "Class 5A", hidden: true })).toHaveAttribute("href", "/teacher/class-roster/c-a");
  });

  it("shows the trend and the status as words, not as colour alone", () => {
    renderTable();
    const table = screen.getByRole("table", { hidden: true });
    expect(within(table).getByText(en.table.trend.up)).toBeInTheDocument();
    expect(within(table).getByText(en.table.status.someQuiet)).toBeInTheDocument();
    expect(within(table).getByText(en.table.status.noStudents)).toBeInTheDocument();
    expect(within(table).getByText(en.table.trend.down)).toBeInTheDocument();
  });

  describe("CSV export", () => {
    let blobs: Blob[];
    let clicked: { download: string; href: string }[];
    beforeEach(() => {
      vi.useFakeTimers({ toFake: ["Date"] });
      // 17:30 UTC on 12 October is 00:30 on 13 October in Bangkok.
      vi.setSystemTime(new Date("2026-10-12T17:30:00Z"));
      blobs = [];
      clicked = [];
      URL.createObjectURL = vi.fn((blob: Blob) => {
        blobs.push(blob);
        return "blob:csv";
      });
      URL.revokeObjectURL = vi.fn();
      vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
        clicked.push({ download: this.download, href: this.href });
      });
    });
    afterEach(() => {
      vi.useRealTimers();
      vi.restoreAllMocks();
    });

    /**
     * Reads the text of a blob.
     * @param blob The blob.
     * @returns The text.
     */
    const read = (blob: Blob) =>
      new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.readAsText(blob);
      });

    it("downloads the shown rows in the shown order with the Bangkok date in the file name", async () => {
      renderTable();
      fireEvent.change(screen.getByRole("searchbox", { name: en.table.searchLabel }), { target: { value: "class 5" } });
      const header = screen.getByRole("columnheader", { name: new RegExp(en.table.columns.students), hidden: true });
      fireEvent.click(within(header).getByRole("button", { hidden: true }));
      fireEvent.click(screen.getByRole("button", { name: en.table.csvLabel }));
      expect(clicked).toEqual([{ download: "teacher-classes-2026-10-13.csv", href: "blob:csv" }]);
      const text = await act(async () => read(blobs[0]));
      const lines = text.trim().split(/\r?\n/);
      expect(lines[0]).toBe("class,grade,students,active_7d,active_rate_7d,average_level,xp_7d,xp_previous_7d,trend,status");
      expect(lines.slice(1)).toEqual(["Class 5B,5,24,10,42,6.2,900,1000,down,someQuiet", "Class 5A,5,12,11,92,3.1,1500,1000,up,onTrack"]);
    });

    it("starts the file with the UTF-8 byte order mark so Excel shows Thai and Chinese names", async () => {
      renderTable();
      fireEvent.click(screen.getByRole("button", { name: en.table.csvLabel }));
      const bytes = await act(
        async () =>
          new Promise<Uint8Array>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
            reader.readAsArrayBuffer(blobs[0]);
          }),
      );
      expect(Array.from(bytes.slice(0, 3))).toEqual([0xef, 0xbb, 0xbf]);
    });

    it("revokes the object URL one second after the click, not at once (Safari)", () => {
      vi.useRealTimers();
      vi.useFakeTimers({ toFake: ["Date", "setTimeout"] });
      renderTable();
      fireEvent.click(screen.getByRole("button", { name: en.table.csvLabel }));
      expect(URL.revokeObjectURL).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1000);
      expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:csv");
    });

    it("has no CSV button when the teacher has no class", () => {
      renderWithMessages(<TeacherClassTable rows={[]} />);
      expect(screen.queryByRole("button", { name: en.table.csvLabel })).not.toBeInTheDocument();
    });
  });
});
