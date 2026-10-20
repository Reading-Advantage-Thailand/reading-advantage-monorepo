// @vitest-environment jsdom
/**
 * School profile admins list (manual test A8): the add and remove buttons follow the server rule
 * (`canManageAdmins`), not the owner alone, so a school ADMIN of a school with no owner account
 * can manage the admins. The Owner badge marks the owner row for every reader.
 */
import "@testing-library/jest-dom/vitest";
import { act, cleanup, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithMessages } from "@/components/__tests__/helpers/render-with-messages";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/hooks/use-current-user", () => ({ useCurrentUser: () => ({ id: "adm2" }) }));
vi.mock("@reading-advantage/auth-client", () => ({ useAuth: () => ({ user: { id: "adm2" }, refresh: vi.fn() }) }));
vi.mock("@/i18n/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }), Link: "a" }));
vi.mock("@/components/school/add-admin-dialog", () => ({ AddAdminDialog: () => <button type="button">Add admin</button> }));

import { SchoolDetail } from "../school-detail";

const admin = (id: string) => ({ id, user: { id, name: `Name ${id}`, email: `${id}@x.test` } });
const school = {
  id: "school-1",
  name: "Demo School",
  ownerId: "o1",
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-02-01"),
  _count: { users: 12, admins: 3 },
  admins: [admin("o1"), admin("adm2"), admin("adm3")],
};

/** Renders the school detail and lets the effects settle. */
async function show(canManageAdmins: boolean) {
  renderWithMessages(<SchoolDetail school={school as never} onEdit={vi.fn()} onDelete={vi.fn()} onRefresh={vi.fn()} canManageAdmins={canManageAdmins} />);
  await act(async () => {
    for (let i = 0; i < 5; i++) await Promise.resolve();
  });
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 200 })));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("SchoolDetail admins list", () => {
  it("gives a school ADMIN who is not the owner the add button and a remove button on each other admin", async () => {
    await show(true);
    expect(screen.getByRole("button", { name: "Add admin" })).toBeInTheDocument();
    // o1 and adm3; never the reader's own row (the server refuses self-removal)
    expect(screen.getAllByRole("button", { name: "Delete" })).toHaveLength(2);
  });

  it("shows no admin buttons when the caller may not manage the school", async () => {
    await show(false);
    expect(screen.queryByRole("button", { name: "Add admin" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Delete" })).toBeNull();
  });

  it("marks the owner row with the Owner badge for a reader who is not the owner", async () => {
    await show(false);
    expect(screen.getAllByText("Owner", { selector: "span, div" })).toHaveLength(1);
  });
});
