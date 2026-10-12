// @vitest-environment jsdom
/**
 * School profile license part (S4): the panel and the warnings, the seat holder pages, and the rule
 * that a view-only panel has no button that changes a license. Without a view, no panel and no key.
 */
import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithMessages } from "@/components/__tests__/helpers/render-with-messages";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/hooks/use-current-user", () => ({ useCurrentUser: () => ({ id: "admin-1" }) }));
vi.mock("@reading-advantage/auth-client", () => ({ useAuth: () => ({ user: { id: "admin-1" }, refresh: vi.fn() }) }));
vi.mock("@/i18n/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }), Link: "a" }));
vi.mock("@/components/school/add-admin-dialog", () => ({ AddAdminDialog: () => null }));

import { SchoolDetail } from "../school-detail";

const base = {
  id: "school-1",
  name: "Demo School",
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-02-01"),
  _count: { users: 12, admins: 1 },
};
const view = (over: Record<string, unknown> = {}) => ({
  licenses: [
    { id: "l1", name: "Year 2026", state: "active", startDate: "2026-01-01", endDate: "2027-01-01", seats: 30 },
    { id: "l2", name: "Year 2025", state: "ended", startDate: "2025-01-01", endDate: "2025-12-31", seats: 20 },
  ],
  seats: 30,
  seatsUsed: 3,
  seatsFree: 27,
  seatsOver: 0,
  hasActiveLicense: true,
  ...over,
});
const holder = (n: number) => ({ id: `s${n}`, name: `Student ${n}`, username: `user${n}`, classes: n === 1 ? ["P4-1", "Club"] : [], joinedAt: "2026-10-12T05:00:00.000Z" });
const fetchMock = vi.fn();

/** Lets pending fetch promises and state updates settle. */
async function flush() {
  await act(async () => {
    for (let i = 0; i < 10; i++) await Promise.resolve();
  });
}
const show = async (props: Record<string, unknown>) => {
  renderWithMessages(<SchoolDetail school={base as never} onEdit={vi.fn()} onDelete={vi.fn()} onRefresh={vi.fn()} {...props} />);
  await flush();
};

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (url: string) => {
    const page = Number(new URL(url, "http://x").searchParams.get("page") ?? "1");
    const holders = page === 1 ? [holder(1), holder(2)] : [holder(51)];
    return new Response(JSON.stringify({ page, pageSize: 50, total: 60, holders }), { status: 200 });
  });
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("SchoolDetail license part", () => {
  it("shows the seats, each license, and no warning for an active license within the limit", async () => {
    await show({ licenseView: view() });
    const panel = screen.getByRole("region", { name: "Seats" });
    expect(within(panel).getByText("Seats used").nextSibling).toHaveTextContent("3");
    expect(within(panel).getByText("Seats free").nextSibling).toHaveTextContent("27");
    expect(within(panel).getByText("Seats in total").nextSibling).toHaveTextContent("30");
    const list = screen.getByRole("region", { name: "Licenses" });
    expect(within(list).getByText("Year 2026")).toBeInTheDocument();
    expect(within(list).getByText("Active")).toBeInTheDocument();
    expect(within(list).getByText("Ended")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("warns with the count over the limit", async () => {
    await show({ licenseView: view({ seats: 2, seatsUsed: 4, seatsFree: 0, seatsOver: 2 }) });
    expect(screen.getByRole("alert")).toHaveTextContent("2 students over the limit");
  });

  it("shows 'No active license' and no over-limit warning when only an ended license exists", async () => {
    await show({ licenseView: view({ seats: 0, seatsFree: 0, seatsOver: 0, hasActiveLicense: false }) });
    expect(screen.getByRole("alert")).toHaveTextContent("No active license");
    expect(screen.queryByText(/over the limit/)).not.toBeInTheDocument();
  });

  it("shows an empty list text for a school without a license", async () => {
    await show({ licenseView: view({ licenses: [], seats: 0, seatsFree: 0, hasActiveLicense: false }) });
    expect(screen.getByText("This school has no license.")).toBeInTheDocument();
  });

  it("has no license panel, no seat holder request, and no license key without a view", async () => {
    await show({ licenseView: null });
    expect(screen.queryByRole("region", { name: "Seats" })).not.toBeInTheDocument();
    expect(screen.queryByText("Seat holders")).not.toBeInTheDocument();
    expect(screen.queryByText("License Key")).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("has no button that changes a license", async () => {
    await show({ licenseView: view() });
    const part = document.getElementById("license") as HTMLElement;
    const names = within(part).getAllByRole("button").map((b) => b.textContent);
    expect(names).toEqual(["Previous", "Next"]);
    expect(within(part).queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("loads the seat holders and pages to page 2", async () => {
    await show({ licenseView: view({ seatsUsed: 60, seats: 100, seatsFree: 40 }) });
    expect(fetchMock.mock.calls[0]![0]).toBe("/api/users/me/school/seat-holders?page=1");
    const table = screen.getByRole("table");
    expect(within(table).getByText("Student 1")).toBeInTheDocument();
    expect(within(table).getAllByText("P4-1, Club").length).toBeGreaterThan(0);
    expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await flush();
    expect(fetchMock.mock.calls[1]![0]).toBe("/api/users/me/school/seat-holders?page=2");
    expect(within(screen.getByRole("table")).getByText("Student 51")).toBeInTheDocument();
    expect(screen.getByText("Page 2 of 2")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
  });

  it("shows a load error when the seat holders fail", async () => {
    fetchMock.mockImplementation(async () => new Response("{}", { status: 403 }));
    await show({ licenseView: view() });
    expect(screen.getByText("The seat holders did not load.")).toBeInTheDocument();
  });
});
