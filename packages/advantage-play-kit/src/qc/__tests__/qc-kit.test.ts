import { describe, expect, it, vi } from "vitest";

import {
  createBrowserQcDriver,
  createPerformanceMonitor,
  parseQcControls,
} from "../qc-kit.js";

describe("QC kit", () => {
  it("validates supported fixture, difficulty, profile, input, and accessibility controls", () => {
    expect(parseQcControls({
      fixture: "thai-long",
      difficulty: "standard",
      profile: "wide",
      inputMode: "touch",
      textScale: 1.25,
      touchScale: 1.25,
      safeRegions: true,
    })).toMatchObject({ profile: "wide", inputMode: "touch" });
    expect(() => parseQcControls({ profile: "television" })).toThrow(/QC controls/i);
  });

  it("reports frame, object, asset, memory, and bundle budget violations deterministically", () => {
    const monitor = createPerformanceMonitor({ frameTimeMs: 17, objects: 10, assets: 5, memoryBytes: 100, bundleBytes: 200 });
    monitor.record({ frameTimeMs: 20, objects: 9, assets: 6, memoryBytes: 90, bundleBytes: 250 });
    const report = monitor.report();
    expect(report.passed).toBe(false);
    expect(report.violations.map((violation) => violation.metric)).toEqual(["frameTimeMs", "assets", "bundleBytes"]);
    monitor.reset();
    expect(monitor.report().passed).toBe(true);
    expect(() => monitor.record({ frameTimeMs: -1, objects: 0, assets: 0, memoryBytes: 0, bundleBytes: 0 })).toThrow(/non-negative/i);
  });

  it("drives real-browser adapters without importing a browser provider", async () => {
    const page = {
      setViewportSize: vi.fn(),
      keyboard: { press: vi.fn() },
      mouse: { click: vi.fn() },
      locator: vi.fn(() => ({ click: vi.fn(), textContent: vi.fn(async () => "Game complete") })),
    };
    const driver = createBrowserQcDriver(page);
    await driver.resize({ width: 390, height: 844 });
    await driver.press("ArrowRight");
    await driver.tap({ x: 120, y: 200 });
    await expect(driver.readText("[role=status]")).resolves.toBe("Game complete");
    await driver.click("button[data-restart]");
    await expect(driver.inspectAttribution()).resolves.toBe("Game complete");
    expect(page.setViewportSize).toHaveBeenCalledWith({ width: 390, height: 844 });
  });

  it("fails closed for invalid browser helper values", async () => {
    const page = {
      setViewportSize: vi.fn(),
      keyboard: { press: vi.fn() },
      mouse: { click: vi.fn() },
      locator: vi.fn(() => ({ click: vi.fn(), textContent: vi.fn(async () => null) })),
    };
    const driver = createBrowserQcDriver(page);
    await expect(driver.resize({ width: 0, height: 844 })).rejects.toThrow(/positive integer/i);
    await expect(driver.press(" ")).rejects.toThrow(/blank/i);
    await expect(driver.tap({ x: Number.NaN, y: 1 })).rejects.toThrow(/finite/i);
    await expect(driver.click(" ")).rejects.toThrow(/blank/i);
    await expect(driver.readText(" ")).rejects.toThrow(/blank/i);
  });
});
