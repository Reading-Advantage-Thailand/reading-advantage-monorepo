import { describe, expect, it, vi } from "vitest";

import { ACCEPTED_STANDARD_ASSET_RELEASE } from "../../assets/accepted-standard-pack-release.js";

import {
  createAssetContractV2QcDiagnostic,
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

  it("separates semantic identity from physical descriptor and animation behavior for v2 QC", () => {
    const diagnostic = createAssetContractV2QcDiagnostic(
      { role: "player", state: "walk" },
      {
        contractVersion: 2,
        descriptorId: "player-walk-6",
        catalogEntryKey: "top-down/32x32/characters/hero-walk",
        release: {
          version: ACCEPTED_STANDARD_ASSET_RELEASE.version,
          catalogDigest: ACCEPTED_STANDARD_ASSET_RELEASE.catalogDigest,
          sourceReceiptDigest: ACCEPTED_STANDARD_ASSET_RELEASE.sourceReceiptDigest,
        },
        mediaKind: "animation",
        geometry: { width: 192, height: 32, frameWidth: 32, frameHeight: 32, columns: 6, rows: 1 },
        clips: [{
          id: "walk",
          frames: Array.from({ length: 6 }, (_, column) => ({ column, row: 0 })),
          timing: { fps: 12, loop: true },
        }],
        directions: [{ direction: "down", clipId: "walk" }],
        anchor: { x: 0.5, y: 1 },
        renderScale: 2,
        collisionEnvelope: { x: 0.2, y: 0.4, width: 0.6, height: 0.6 },
        readabilityEnvelope: { minimumRenderPixels: 24, minimumContrastRatio: 3 },
      },
    );

    expect(diagnostic.semantic).toEqual({ role: "player", state: "walk", identity: "player:walk" });
    expect(diagnostic.physicalDescriptor).toMatchObject({ descriptorId: "player-walk-6", mediaKind: "animation" });
    expect(diagnostic.animation).toEqual({
      clips: [{ clipId: "walk", frameCount: 6, fps: 12, loop: true }],
      directions: [{ direction: "down", clipId: "walk" }],
    });
    expect(Object.isFrozen(diagnostic)).toBe(true);
    expect(Object.isFrozen(diagnostic.physicalDescriptor)).toBe(true);
    expect(JSON.stringify(diagnostic)).not.toContain("hero-walk.png");
    expect(() => createAssetContractV2QcDiagnostic({ role: "player", state: "walk" }, { descriptorId: "unsafe" })).toThrow(/descriptor/i);
    expect(() => createAssetContractV2QcDiagnostic(
      { role: "player", state: "walk" },
      { ...diagnostic.physicalDescriptor, path: "/private/hero-walk.png" },
    )).toThrow(/descriptor/i);
  });
});
