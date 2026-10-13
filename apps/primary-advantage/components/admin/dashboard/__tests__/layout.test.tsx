// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { renderWithMessages } from "@/components/__tests__/helpers/render-with-messages";
import AdminDashboardLoading from "@/app/[locale]/admin/dashboard/loading";
import { TeachersTable } from "../teachers-table";

afterEach(() => cleanup());

describe("admin dashboard layout", () => {
  it("shows the loading state inside the observatory scene", () => {
    const { container } = render(<AdminDashboardLoading />);
    expect(container.querySelector('[data-place="observatory"]')).not.toBeNull();
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
  });

  it("lets a long teacher name wrap so that the table keeps the width of the phone", () => {
    const long = "Kruuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuu Somchaisrisuwannaphum";
    renderWithMessages(<TeachersTable teachers={[{ teacherId: "t1", name: long, classes: 2, students: 40, active: 30, engagementPercent: 75 }]} />);
    const cell = screen.getByRole("rowheader", { name: new RegExp(long) });
    expect(cell).not.toHaveClass("whitespace-nowrap");
    expect(cell).toHaveClass("break-words");
  });
});
