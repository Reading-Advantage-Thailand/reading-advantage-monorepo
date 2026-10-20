// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const push = vi.hoisted(() => vi.fn());
vi.mock("@/i18n/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/components/admin/school-select", () => ({
  SchoolSelect: ({ value, onChange }: { value: string; onChange: (id: string) => void }) => (
    <button type="button" data-value={value} onClick={() => onChange("school-9")}>
      School
    </button>
  ),
}));

import { SchoolPicker } from "../school-picker";
import { dashboardHref } from "../href";

afterEach(cleanup);

describe("SchoolPicker", () => {
  it("sets the school in the URL and keeps the range and the view", () => {
    render(<SchoolPicker value="" range={7} by="grade" />);
    screen.getByRole("button", { name: "School" }).click();
    expect(push).toHaveBeenCalledWith("/admin/dashboard?range=7&by=grade&school=school-9");
  });
});

describe("dashboardHref", () => {
  it("leaves the defaults out of the URL", () => {
    expect(dashboardHref({ range: 30, by: "cefr" })).toBe("/admin/dashboard");
    expect(dashboardHref({ range: 90, by: "cefr", school: null })).toBe("/admin/dashboard?range=90");
  });
});
