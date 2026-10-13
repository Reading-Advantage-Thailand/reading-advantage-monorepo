// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { renderWithMessages } from "@/components/__tests__/helpers/render-with-messages";
import UserRecentActivity from "../user-recent-activity";

const row = (id: string, extra: Record<string, unknown> = {}) => ({
  id, userId: "s1", activityType: "MC_QUESTION", targetId: "a1", details: {}, completed: true, createdAt: new Date("2026-10-09T08:00:00Z"), ...extra,
});

afterEach(cleanup);

describe("UserRecentActivity attempt tag (lesson repeat low)", () => {
  it("tags a row of a closed attempt and a row of a repeated lesson, and leaves a first-time row plain", () => {
    renderWithMessages(<UserRecentActivity data={[row("n", { attemptNumber: 2 }), row("o", { attemptNumber: 1, moved: true }), row("p", { attemptNumber: 1 })]} />, { locale: "en" });
    fireClickShowAll();
    expect(screen.getByText("Attempt 2")).toBeInTheDocument();
    expect(screen.getByText("Attempt 1")).toBeInTheDocument();
    expect(screen.getAllByText(/^Attempt \d$/)).toHaveLength(2);
  });
});

/** Opens the "show all" toggle so every row shows. */
function fireClickShowAll() {
  fireEvent.click(screen.getByRole("button", { name: /show all/i }));
}
