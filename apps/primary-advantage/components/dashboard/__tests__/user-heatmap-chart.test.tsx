// @vitest-environment jsdom
/**
 * PR's C10 run: the heatmap gave the busiest days the lightest green. More activity now gives a
 * darker green.
 */
import { cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { renderWithMessages } from "../../__tests__/helpers/render-with-messages";
import UserActivityHeatMap from "../user-heatmap-chart";
import type { UserActivityLog } from "@/types";

const heatmapProps = vi.hoisted(() => ({ current: null as null | { variantClassnames: string[]; datesPerVariant: Date[][] } }));
vi.mock("@/components/ui/calendar-heatmap", () => ({
  CalendarHeatmap: (props: { variantClassnames: string[]; datesPerVariant: Date[][] }) => {
    heatmapProps.current = props;
    return null;
  },
}));

afterEach(cleanup);

const rows = (day: string, n: number): UserActivityLog[] =>
  Array.from({ length: n }, (_, i) => ({ id: `${day}-${i}`, userId: "u1", activityType: "MC_QUESTION", details: {}, completed: true, createdAt: new Date(`${day}T04:00:00Z`) }));

describe("activity heatmap colours", () => {
  it("gives a busier day a darker green", () => {
    renderWithMessages(<UserActivityHeatMap data={[...rows("2026-10-01", 25), ...rows("2026-10-02", 12), ...rows("2026-10-03", 2)]} />, { locale: "th" });
    const { variantClassnames, datesPerVariant } = heatmapProps.current!;
    const shadeOf = (day: string) => {
      const variant = datesPerVariant.findIndex((dates) => dates.some((d) => d.toISOString().startsWith(day)));
      return Number(variantClassnames[variant].match(/\bbg-green-(\d+)\b/)![1]);
    };
    expect(shadeOf("2026-10-01")).toBeGreaterThan(shadeOf("2026-10-02"));
    expect(shadeOf("2026-10-02")).toBeGreaterThan(shadeOf("2026-10-03"));
  });
});
