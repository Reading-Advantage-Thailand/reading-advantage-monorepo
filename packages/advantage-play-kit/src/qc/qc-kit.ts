import { z } from "zod";

/** Runtime-validated Advantage Games QC control state. */
export const qcControlsSchema = z.object({
  fixture: z.enum(["english-short", "english-long", "thai-short", "thai-long", "duplicates"]).default("english-short"),
  difficulty: z.enum(["gentle", "standard", "challenge"]).default("standard"),
  profile: z.enum(["auto", "compact", "wide"]).default("auto"),
  inputMode: z.enum(["touch", "pointer-keyboard", "hybrid"]).default("pointer-keyboard"),
  textScale: z.number().finite().min(1).max(2).default(1),
  touchScale: z.number().finite().min(1).max(2).default(1),
  safeRegions: z.boolean().default(false),
}).strict();

/** Validated QC control state. */
export type QcControls = z.infer<typeof qcControlsSchema>;

/**
 * Parses untrusted authoring/QC controls and fails closed for unsupported values.
 * @param candidate Partial or complete external control values.
 * @returns Validated controls with deterministic defaults.
 * @throws When a value is unknown, out of range, or an undeclared field is present.
 */
export function parseQcControls(candidate: unknown): QcControls {
  const result = qcControlsSchema.safeParse(candidate);
  if (!result.success) {
    throw new Error(`QC controls are invalid: ${result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ")}`);
  }
  return Object.freeze(result.data);
}

/** Performance budgets enforced by the deterministic QC monitor. */
export interface PerformanceBudgets {
  /** Maximum frame time in milliseconds. */
  readonly frameTimeMs: number;
  /** Maximum live object count. */
  readonly objects: number;
  /** Maximum selected physical asset count. */
  readonly assets: number;
  /** Maximum observed memory bytes. */
  readonly memoryBytes: number;
  /** Maximum cartridge bundle bytes. */
  readonly bundleBytes: number;
}

/** One performance sample. */
export type PerformanceSample = PerformanceBudgets;

/** Performance metric identifier. */
export type PerformanceMetric = keyof PerformanceBudgets;

/** One deterministic budget violation. */
export interface PerformanceViolation {
  /** Metric exceeding its budget. */
  readonly metric: PerformanceMetric;
  /** Maximum observed value. */
  readonly observed: number;
  /** Configured budget ceiling. */
  readonly budget: number;
}

/** Deterministic performance report. */
export interface PerformanceReport {
  /** Whether every maximum remained within budget. */
  readonly passed: boolean;
  /** Maximum values observed across samples. */
  readonly maxima: PerformanceSample;
  /** Ordered budget violations. */
  readonly violations: readonly PerformanceViolation[];
}

/** Controllably sampled performance monitor. */
export interface PerformanceMonitor {
  /**
   * Records one complete instrumentation sample.
   * @param sample Frame, object, asset, memory, and bundle measurements.
   */
  record(sample: PerformanceSample): void;
  /** Returns a deterministic maximum-and-budget report. */
  report(): PerformanceReport;
  /** Clears all samples. */
  reset(): void;
}

const PERFORMANCE_METRICS: readonly PerformanceMetric[] = [
  "frameTimeMs",
  "objects",
  "assets",
  "memoryBytes",
  "bundleBytes",
];

function validatePerformanceValues(values: PerformanceBudgets, label: string): void {
  if (!PERFORMANCE_METRICS.every((metric) => Number.isFinite(values[metric]) && values[metric] >= 0)) {
    throw new Error(`${label} requires finite non-negative values for every metric`);
  }
}

/**
 * Creates a deterministic performance monitor for frame, object, asset, memory, and bundle budgets.
 * @param budgets Maximum accepted values.
 * @returns A monitor whose report uses maxima across controllably recorded samples.
 */
export function createPerformanceMonitor(budgets: PerformanceBudgets): PerformanceMonitor {
  validatePerformanceValues(budgets, "Performance budgets");
  let samples: PerformanceSample[] = [];
  return Object.freeze({
    record(sample: PerformanceSample): void {
      validatePerformanceValues(sample, "Performance sample");
      samples.push(Object.freeze({ ...sample }));
    },
    report(): PerformanceReport {
      const maxima = Object.fromEntries(PERFORMANCE_METRICS.map((metric) => [
        metric,
        samples.reduce((maximum, sample) => Math.max(maximum, sample[metric]), 0),
      ])) as unknown as PerformanceSample;
      const violations = PERFORMANCE_METRICS.flatMap((metric) => maxima[metric] > budgets[metric]
        ? [{ metric, observed: maxima[metric], budget: budgets[metric] }]
        : []);
      return Object.freeze({ passed: violations.length === 0, maxima: Object.freeze(maxima), violations: Object.freeze(violations) });
    },
    reset(): void {
      samples = [];
    },
  });
}

/** Provider-neutral locator boundary needed by browser QC helpers. */
export interface BrowserQcLocator {
  /** Activates the located semantic element. */
  click(): void | Promise<void>;
  /** Reads complete accessible text from the located element. */
  textContent(): string | null | Promise<string | null>;
}

/** Provider-neutral page boundary needed by browser QC helpers. */
export interface BrowserQcPageAdapter {
  /** Updates the real browser viewport. */
  setViewportSize(viewport: { width: number; height: number }): void | Promise<void>;
  /** Real keyboard adapter. */
  readonly keyboard: { press(key: string): void | Promise<void> };
  /** Real pointer adapter. */
  readonly mouse: { click(x: number, y: number): void | Promise<void> };
  /** Locates an element through the browser provider. */
  locator(selector: string): BrowserQcLocator;
}

/** Provider-neutral real-browser QC driver. */
export interface BrowserQcDriver {
  /** Resizes the real browser viewport. */
  resize(viewport: { width: number; height: number }): Promise<void>;
  /** Sends a real keyboard press. */
  press(key: string): Promise<void>;
  /** Sends a real pointer activation. */
  tap(point: { x: number; y: number }): Promise<void>;
  /** Activates a semantic control by selector. */
  click(selector: string): Promise<void>;
  /** Reads complete browser-rendered text by selector. */
  readText(selector: string): Promise<string>;
  /** Reads required attribution from the conventional credits surface. */
  inspectAttribution(): Promise<string>;
}

/**
 * Creates provider-neutral browser helpers over an injected Playwright-like page adapter.
 * @param page Browser page adapter supplied by tests or a host.
 * @returns Helpers for real input, resize, controls, status, completion, and attribution inspection.
 */
export function createBrowserQcDriver(page: BrowserQcPageAdapter): BrowserQcDriver {
  return Object.freeze({
    async resize(viewport: { width: number; height: number }): Promise<void> {
      if (!Number.isInteger(viewport.width) || !Number.isInteger(viewport.height) || viewport.width <= 0 || viewport.height <= 0) {
        throw new Error("Browser QC viewport must use positive integer dimensions");
      }
      await page.setViewportSize(viewport);
    },
    async press(key: string): Promise<void> {
      if (!key.trim()) throw new Error("Browser QC keyboard key must not be blank");
      await page.keyboard.press(key);
    },
    async tap(point: { x: number; y: number }): Promise<void> {
      if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) throw new Error("Browser QC pointer point must be finite");
      await page.mouse.click(point.x, point.y);
    },
    async click(selector: string): Promise<void> {
      if (!selector.trim()) throw new Error("Browser QC selector must not be blank");
      await page.locator(selector).click();
    },
    async readText(selector: string): Promise<string> {
      if (!selector.trim()) throw new Error("Browser QC selector must not be blank");
      return (await page.locator(selector).textContent()) ?? "";
    },
    async inspectAttribution(): Promise<string> {
      return (await page.locator("[data-apk-attribution]").textContent()) ?? "";
    },
  });
}
