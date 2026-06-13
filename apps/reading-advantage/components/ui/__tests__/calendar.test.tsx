/**
 * Phase 2 Red-phase tests for the reading-advantage <Calendar /> component.
 *
 * These tests pin the date-selection, range-selection, disabled-date, and
 * navigation contracts the calendar must satisfy after Batch C migrates it
 * to the compatible react-day-picker@9 / date-fns@4 stack.
 *
 * Red status at HEAD: the app currently resolves
 *   - react-day-picker@8.10.2 (peer requires date-fns@^2.28.0 || ^3.0.0)
 *   - date-fns@4.1.0 (mismatched peer)
 * The peer mismatch produces install warnings and brittle runtime behavior
 * because react-day-picker@8 was authored against the date-fns@3 API surface;
 * date-fns@4 reorganised top-level exports. These tests exercise live render
 * and interaction with the Calendar component, and are expected to fail or
 * surface inconsistent date math against this peer-broken baseline.
 *
 * Per `measure/tracks/dependency_upgrade_hardening_20260607/test-strategy.md`:
 *   - §3: tests must be red against the v8/date-fns@4 baseline before Batch C.
 *   - §3: Reading-advantage full Jest hangs on this hardware — run focused.
 *   - §7: live-gate owner is Batch C, which migrates Calendar to
 *     react-day-picker@9 contract; this same test file must exit 0 then.
 *
 * Bounded scope:
 *   - Single test file under apps/reading-advantage/components/ui/__tests__/.
 *   - Invoked via `pnpm --filter reading-advantage exec jest components/ui/calendar`
 *     (path filter). NEVER via the full reading-advantage Jest suite.
 */

import * as React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Calendar } from "../calendar";

const FIXED_MONTH = new Date(2026, 5, 1); // June 2026 (month is 0-indexed)

describe("Calendar (single mode) – date selection contract", () => {
  it("fires onSelect with the clicked day's Date when a day cell is activated", async () => {
    const user = userEvent.setup();
    const handleSelect = jest.fn();
    render(
      <Calendar
        mode="single"
        defaultMonth={FIXED_MONTH}
        onSelect={handleSelect}
      />,
    );

    // Pick the 15th of the displayed month. react-day-picker exposes each
    // day as a <button> whose accessible name contains the day-of-month.
    const day15 = screen.getByRole("gridcell", { name: /15/ }).querySelector("button")
      ?? screen.getByRole("button", { name: /15/ });
    expect(day15).toBeTruthy();
    await user.click(day15 as HTMLElement);

    expect(handleSelect).toHaveBeenCalledTimes(1);
    const selected = handleSelect.mock.calls[0][0] as Date;
    expect(selected).toBeInstanceOf(Date);
    expect(selected.getFullYear()).toBe(2026);
    expect(selected.getMonth()).toBe(5);
    expect(selected.getDate()).toBe(15);
  });

  it("marks the currently selected day with aria-selected=true", () => {
    const selected = new Date(2026, 5, 10);
    render(
      <Calendar mode="single" defaultMonth={FIXED_MONTH} selected={selected} />,
    );

    const day10 = screen.getByRole("gridcell", { name: /10/ });
    expect(day10).toHaveAttribute("aria-selected", "true");
  });
});

describe("Calendar – disabled-date contract", () => {
  it("does not fire onSelect when a disabled day is clicked", async () => {
    const user = userEvent.setup();
    const handleSelect = jest.fn();
    const disabledDay = new Date(2026, 5, 20);
    render(
      <Calendar
        mode="single"
        defaultMonth={FIXED_MONTH}
        disabled={disabledDay}
        onSelect={handleSelect}
      />,
    );

    const day20 = screen.getByRole("gridcell", { name: /20/ }).querySelector("button")
      ?? screen.getByRole("button", { name: /20/ });
    await user.click(day20 as HTMLElement);

    expect(handleSelect).not.toHaveBeenCalled();
  });

  it("surfaces disabled state on the day's element via aria-disabled or disabled attribute", () => {
    const disabledDay = new Date(2026, 5, 20);
    render(
      <Calendar
        mode="single"
        defaultMonth={FIXED_MONTH}
        disabled={disabledDay}
      />,
    );

    const day20Cell = screen.getByRole("gridcell", { name: /20/ });
    const day20Button =
      day20Cell.querySelector("button") ??
      screen.getByRole("button", { name: /20/ });

    const ariaDisabled = day20Button?.getAttribute("aria-disabled");
    const disabledAttr = day20Button?.hasAttribute("disabled");
    expect(ariaDisabled === "true" || disabledAttr).toBe(true);
  });
});

describe("Calendar (range mode) – range-selection contract", () => {
  it("fires onSelect with a DateRange after two day clicks", async () => {
    const user = userEvent.setup();
    const handleSelect = jest.fn();
    render(
      <Calendar
        mode="range"
        defaultMonth={FIXED_MONTH}
        onSelect={handleSelect}
      />,
    );

    const start =
      screen.getByRole("gridcell", { name: /5/ }).querySelector("button") ??
      screen.getByRole("button", { name: /^5$/ });
    const end =
      screen.getByRole("gridcell", { name: /10/ }).querySelector("button") ??
      screen.getByRole("button", { name: /^10$/ });

    await user.click(start as HTMLElement);
    await user.click(end as HTMLElement);

    expect(handleSelect).toHaveBeenCalled();
    const lastCall = handleSelect.mock.calls.at(-1)?.[0] as {
      from?: Date;
      to?: Date;
    };
    expect(lastCall).toBeTruthy();
    expect(lastCall.from).toBeInstanceOf(Date);
    expect(lastCall.to).toBeInstanceOf(Date);
    expect(lastCall.from!.getDate()).toBe(5);
    expect(lastCall.to!.getDate()).toBe(10);
  });
});

describe("Calendar – navigation contract", () => {
  it("renders accessible previous/next navigation buttons", () => {
    render(<Calendar mode="single" defaultMonth={FIXED_MONTH} />);

    // The accessibility contract: next/previous month navigation must be
    // reachable via accessible name. v8 uses `Go to previous month` /
    // `Go to next month`; v9 uses the same accessible name pattern.
    expect(
      screen.getByRole("button", { name: /previous|prev/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /next/i }),
    ).toBeInTheDocument();
  });

  it("advances to the next month when the next-month button is pressed", async () => {
    const user = userEvent.setup();
    render(<Calendar mode="single" defaultMonth={FIXED_MONTH} />);

    const nextBtn = screen.getByRole("button", { name: /next/i });
    await user.click(nextBtn);

    // After clicking next, the caption must reflect July 2026.
    // Both v8 (`caption_label`) and v9 (`month_caption`) expose the caption
    // text in the DOM; we assert on visible text rather than internal class
    // names so the test survives the v8→v9 migration.
    const captionText = document.body.textContent ?? "";
    expect(captionText).toMatch(/July\s+2026/);
  });

  it("rewinds to the previous month when the previous-month button is pressed", async () => {
    const user = userEvent.setup();
    render(<Calendar mode="single" defaultMonth={FIXED_MONTH} />);

    const prevBtn = screen.getByRole("button", { name: /previous|prev/i });
    await user.click(prevBtn);

    const captionText = document.body.textContent ?? "";
    expect(captionText).toMatch(/May\s+2026/);
  });
});

describe("Calendar – peer dependency contract", () => {
  it("imports react-day-picker without throwing under the date-fns peer in use", () => {
    // This is a defensive guard: the v8/date-fns@4 peer mismatch can surface
    // as a date-fns subpath export failure at import time. If the calendar
    // module load itself throws, this test catches it explicitly rather than
    // leaving the other tests to fail with a confusing render error.
    expect(() => {
      // The static import at the top of this file already loaded the module,
      // so reaching this assertion means import succeeded. Re-require under
      // jest's module registry to assert nothing throws on a fresh load.
      jest.isolateModules(() => {
        require("../calendar");
      });
    }).not.toThrow();
  });
});
