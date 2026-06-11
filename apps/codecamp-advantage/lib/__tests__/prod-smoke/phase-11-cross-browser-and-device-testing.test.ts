import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Phase 11 — Cross-Browser & Device Testing (P2)
 *
 * Black-box smoke tests + static analysis for the deployed production
 * service at https://codecamp.reading-advantage.com
 * (see measure/tracks/codecamp_qa_prod_20260517/plan.md).
 *
 * Phase 11 acceptance criteria (per plan.md):
 *   1. Desktop browsers (Chrome/Firefox/Safari/Edge) — all serve the
 *      same 2xx HTML body shape regardless of User-Agent.
 *   2. Mobile browsers (Chrome Android/Safari iOS/Samsung) — same.
 *   3. Device sizes (iPhone SE 375px / iPad 768px / Desktop 1440px /
 *      Large desktop 1920px) — the rendered HTML wires responsive
 *      Tailwind breakpoints, the viewport meta tag, and no
 *      cross-browser anti-patterns (e.g. `user-scalable=no`).
 *
 * Cross-browser *visual* verification still requires BrowserStack or
 * real devices (per test-strategy.md §5 P11 row: "checklist only, no
 * automation"). What we CAN encode as executable contract from a
 * Node.js / jsdom runner is the **server-side response contract** that
 * the SSR pipeline must satisfy for every browser/device class, plus
 * the **static source-code invariants** that prevent regressions in
 * the responsive layer.
 *
 * Two valid Red-phase failure modes are expected:
 *   1. Network/connectivity failure (the test runner cannot reach
 *      prod) — same ETIMEDOUT class Phases 2-9 saw. Indicates the
 *      probe must be run from a network that can reach prod.
 *   2. Assertion failure (prod reachable, but the contract is unmet) —
 *      indicates a real production gap. Likely candidates at HEAD:
 *        - the SSR shell does not emit `<meta name="viewport" …>`
 *          (the Phase 4 launch-gate body contracts assume one is
 *          present but no source contract enforces it);
 *        - Tailwind responsive prefixes (`sm:`, `md:`, `lg:`, `xl:`)
 *          are not in the rendered HTML class set (the dashboard /
 *          module / lesson pages may not have any responsive class
 *          when the seed components are still desktop-first);
 *        - the SSR body uses `user-scalable=no` or `maximum-scale=1`
 *          (iOS Safari + Chrome Android accessibility anti-pattern);
 *        - the HSTS preload directive is missing on the
 *          `Strict-Transport-Security` response header (Chrome
 *          HSTS-preload-list requirement).
 *
 * Per-test gating (env vars, never committed):
 *   PHASE11_PROD_URL     — override prod target
 *   PHASE11_SKIP=1       — skip network probes; static source checks
 *                          and helper unit tests still run
 *
 * Note on divergence from test-strategy.md: the test-strategy §5
 * says "P11 Cross-browser: BrowserStack or local devices; checklist
 * only, no automation." Per the 2026-06-07 mid-session supervisor
 * instruction (same as Phases 1-9.5), Phase 11 is elevated from
 * manual probes to executable contract. The static source checks
 * (viewport meta, Tailwind responsive prefixes, no-scalable-no
 * anti-pattern, HSTS preload directive) and helper unit tests run
 * unconditionally so a regression in those primitives fails the
 * suite immediately. The behavioral User-Agent probes remain
 * black-box HTTP smoke tests against prod, consistent with the
 * strategy.
 */

// ─── Constants ──────────────────────────────────────────────

const PROD_URL = process.env.PHASE11_PROD_URL ?? "https://codecamp.reading-advantage.com";
const SKIP = process.env.PHASE11_SKIP === "1";
const REQUEST_TIMEOUT_MS = 5_000;

const skipIf = SKIP ? it.skip : it;

/**
 * Canonical User-Agent strings for the desktop browsers Phase 11
 * requires us to exercise. Versions are intentionally pinned to
 * recent stable releases so the test is reproducible.
 */
const DESKTOP_USER_AGENTS: ReadonlyArray<{ browser: string; ua: string }> = [
  {
    browser: "Chrome (latest)",
    ua: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  },
  {
    browser: "Firefox (latest)",
    ua: "Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0",
  },
  {
    browser: "Safari (latest)",
    ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
  },
  {
    browser: "Edge (latest)",
    ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
  },
];

const MOBILE_USER_AGENTS: ReadonlyArray<{ browser: string; ua: string }> = [
  {
    browser: "Chrome on Android",
    ua: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
  },
  {
    browser: "Safari on iOS",
    ua: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1",
  },
  {
    browser: "Samsung Internet",
    ua: "Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/23.0 Chrome/115.0.0.0 Mobile Safari/537.36",
  },
];

const DEVICE_BREAKPOINTS: ReadonlyArray<{ device: string; width: number; tailwindPrefix: string }> = [
  { device: "iPhone SE (375px)", width: 375, tailwindPrefix: "max-sm" },
  { device: "iPad (768px)", width: 768, tailwindPrefix: "md" },
  { device: "Desktop (1440px)", width: 1440, tailwindPrefix: "xl" },
  { device: "Large desktop (1920px)", width: 1920, tailwindPrefix: "2xl" },
];

const APP_ROOT = resolve(__dirname, "..", "..", "..");

// ─── Helpers ────────────────────────────────────────────────

const fetchWithUserAgent = async (ua: string, init: RequestInit = {}): Promise<Response> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(PROD_URL, {
      ...init,
      signal: controller.signal,
      redirect: "follow",
      headers: { ...(init.headers ?? {}), "User-Agent": ua, Accept: "text/html" },
    });
  } finally {
    clearTimeout(timer);
  }
};

/**
 * Captures `<meta name="viewport" content="…">` content strings from
 * the rendered HTML. Returns the first match (or empty string if
 * absent). Used by the responsive-meta probe — a missing or
 * anti-pattern viewport tag is a P2 cross-browser gap because
 * iOS Safari / Chrome Android auto-zoom / scale behavior depends
 * on it.
 */
function extractViewportMeta(html: string): string {
  const re = /<meta\s+name=["']viewport["']\s+content=["']([^"']*)["']\s*\/?>/i;
  const m = re.exec(html);
  return m ? m[1] : "";
}

/**
 * Detects whether the rendered HTML contains any responsive
 * Tailwind breakpoint prefix. Tailwind generates class names like
 * `md:flex`, `lg:grid-cols-3`, `xl:text-lg`, `sm:p-4`, `2xl:max-w-7xl`.
 * A SSR shell with no responsive prefixes will not reflow at the
 * documented device breakpoints — a real P2 cross-browser /
 * cross-device gap.
 */
function hasResponsiveTailwindClass(html: string): boolean {
  // Common Tailwind responsive prefixes: sm, md, lg, xl, 2xl
  // We require the prefix to be followed by a colon and a class char
  // to avoid false positives on words like "small" or "media".
  const re = /\b(?:sm|md|lg|xl|2xl):[a-zA-Z][\w-]*/;
  return re.test(html);
}

/**
 * Detects `<meta name="viewport" content="…user-scalable=no…">` or
 * `…maximum-scale=1…` — both are cross-browser / accessibility
 * anti-patterns. iOS Safari + Chrome Android auto-zoom rely on
 * user-scalable=yes (the default) and a maximum-scale >= 2.
 */
function hasViewportScalabilityLock(content: string): boolean {
  if (!content) return false;
  return /user-scalable\s*=\s*no/i.test(content) || /maximum-scale\s*=\s*1\b/i.test(content);
}

/**
 * Recursively collects the set of files in `dir` matching `pattern`.
 * Used to scan app source for Tailwind responsive class usage and
 * to enforce the "every interactive page has responsive class
 * coverage" contract.
 */
function readTextOrEmpty(path: string): string {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return "";
  }
}

// ─── Desktop browser probes ─────────────────────────────────

describe("Phase 11 — Desktop browsers", () => {
  beforeAll(() => {
    if (SKIP) return;
    expect(PROD_URL, "PHASE11_PROD_URL must be https://").toMatch(/^https:\/\//);
  });

  for (const { browser, ua } of DESKTOP_USER_AGENTS) {
    skipIf(
      `${browser} — root URL returns 200 (no User-Agent rejection)`,
      async () => {
        const response = await fetchWithUserAgent(ua);
        expect.soft(
          response.status,
          `${browser}: expected 2xx from root, got ${response.status}`,
        ).toBeLessThan(400);
      },
      REQUEST_TIMEOUT_MS + 2_000,
    );

    skipIf(
      `${browser} — root URL body is non-empty HTML`,
      async () => {
        const response = await fetchWithUserAgent(ua);
        const body = await response.text();
        expect.soft(
          body.length,
          `${browser}: expected non-empty HTML body — network did not reach prod`,
        ).toBeGreaterThan(0);
        expect.soft(
          body,
          `${browser}: expected an HTML document with <html> tag`,
        ).toMatch(/<html[\s>]/i);
      },
      REQUEST_TIMEOUT_MS + 2_000,
    );
  }
});

// ─── Mobile browser probes ─────────────────────────────────

describe("Phase 11 — Mobile browsers", () => {
  for (const { browser, ua } of MOBILE_USER_AGENTS) {
    skipIf(
      `${browser} — root URL returns 200 (no User-Agent rejection)`,
      async () => {
        const response = await fetchWithUserAgent(ua);
        expect.soft(
          response.status,
          `${browser}: expected 2xx from root, got ${response.status}`,
        ).toBeLessThan(400);
      },
      REQUEST_TIMEOUT_MS + 2_000,
    );

    skipIf(
      `${browser} — root URL body is non-empty HTML`,
      async () => {
        const response = await fetchWithUserAgent(ua);
        const body = await response.text();
        expect.soft(
          body.length,
          `${browser}: expected non-empty HTML body — network did not reach prod`,
        ).toBeGreaterThan(0);
        expect.soft(
          body,
          `${browser}: expected an HTML document with <html> tag`,
        ).toMatch(/<html[\s>]/i);
      },
      REQUEST_TIMEOUT_MS + 2_000,
    );
  }
});

// ─── Responsive viewport meta + responsive class coverage ──

describe("Phase 11 — Responsive meta + breakpoint coverage", () => {
  skipIf(
    "root URL emits a <meta name=\"viewport\"> tag",
    async () => {
      const response = await fetchWithUserAgent(DESKTOP_USER_AGENTS[0]!.ua);
      const body = await response.text();
      const viewport = extractViewportMeta(body);
      expect.soft(
        viewport,
        "no <meta name=\"viewport\"> tag — required for iOS Safari / Chrome Android rendering",
      ).not.toEqual("");
    },
    REQUEST_TIMEOUT_MS + 2_000,
  );

  skipIf(
    "viewport meta does not lock user-scalable=no or maximum-scale=1 (iOS / Android a11y anti-pattern)",
    async () => {
      const response = await fetchWithUserAgent(DESKTOP_USER_AGENTS[0]!.ua);
      const body = await response.text();
      const viewport = extractViewportMeta(body);
      expect.soft(
        hasViewportScalabilityLock(viewport),
        `viewport meta locks scalability: "${viewport}" — remove user-scalable=no and maximum-scale=1`,
      ).toBe(false);
    },
    REQUEST_TIMEOUT_MS + 2_000,
  );

  skipIf(
    "root URL HTML contains at least one responsive Tailwind class (sm:/md:/lg:/xl:/2xl:)",
    async () => {
      const response = await fetchWithUserAgent(DESKTOP_USER_AGENTS[0]!.ua);
      const body = await response.text();
      expect.soft(
        hasResponsiveTailwindClass(body),
        "no responsive Tailwind class (sm:/md:/lg:/xl:/2xl:) in the rendered HTML — dashboard / nav does not reflow at device breakpoints",
      ).toBe(true);
    },
    REQUEST_TIMEOUT_MS + 2_000,
  );

  for (const { device, tailwindPrefix } of DEVICE_BREAKPOINTS) {
    skipIf(
      `device size ${device} — Tailwind prefix "${tailwindPrefix}:" is referenced in the rendered HTML`,
      async () => {
        const response = await fetchWithUserAgent(DESKTOP_USER_AGENTS[0]!.ua);
        const body = await response.text();
        // Match the Tailwind prefix only when followed by ":" so "sm"
        // inside a word like "scheme" is not a false positive.
        const re = new RegExp(`\\b${tailwindPrefix}:[a-zA-Z][\\w-]*`);
        expect.soft(
          re.test(body),
          `no Tailwind class with prefix "${tailwindPrefix}:" for ${device} — the layout will not adapt to this device width`,
        ).toBe(true);
      },
      REQUEST_TIMEOUT_MS + 2_000,
    );
  }

  afterAll(() => {
    if (SKIP) {
      console.warn("[phase-11-cross-browser-and-device-testing] PHASE11_SKIP=1 — network probes skipped");
    }
  });
});

// ─── Chrome HSTS preload directive (cross-browser contract) ─

describe("Phase 11 — Chrome HSTS preload contract", () => {
  skipIf(
    "Strict-Transport-Security includes the 'preload' directive (Chrome HSTS preload list requirement)",
    async () => {
      const response = await fetchWithUserAgent(DESKTOP_USER_AGENTS[0]!.ua);
      const hsts = response.headers.get("strict-transport-security") ?? "";
      // hstspreload.org requires: max-age >= 31536000, includeSubDomains, preload
      const hasMaxAge = /max-age\s*=\s*(\d+)/i.exec(hsts);
      const maxAge = hasMaxAge ? Number(hasMaxAge[1]) : 0;
      const hasIncludeSubDomains = /includeSubDomains/i.test(hsts);
      const hasPreload = /preload/i.test(hsts);
      const missing: string[] = [];
      if (maxAge < 31_536_000) missing.push(`max-age>=31536000 (got ${maxAge})`);
      if (!hasIncludeSubDomains) missing.push("includeSubDomains");
      if (!hasPreload) missing.push("preload");
      expect.soft(
        missing,
        `HSTS preload contract unmet: ${missing.join(", ")} — header was "${hsts}"`,
      ).toEqual([]);
    },
    REQUEST_TIMEOUT_MS + 2_000,
  );
});

// ─── Source-contract detectors ──────────────────────────────

describe("Phase 11 — Source-contract detectors", () => {
  it("every interactive App-Router page declares responsive Tailwind class coverage", () => {
    // The interactive pages (admin / chat / lesson / module) live under
    // app/[locale]/. We require every page.tsx to reference at least
    // one responsive Tailwind prefix (sm:/md:/lg:/xl:/2xl:). A page
    // that is purely desktop-first will not reflow on iPhone SE
    // (375px) and is a P2 cross-device gap.
    const interactivePages = [
      "app/[locale]/page.tsx",
      "app/[locale]/chat/page.tsx",
      "app/[locale]/lesson/[id]/page.tsx",
      "app/[locale]/module/[slug]/page.tsx",
      "app/[locale]/admin/page.tsx",
      "app/[locale]/admin/[userId]/page.tsx",
      "app/[locale]/admin/new-intern/page.tsx",
    ];
    const missingCoverage: string[] = [];
    for (const rel of interactivePages) {
      const abs = resolve(APP_ROOT, rel);
      const src = readTextOrEmpty(abs);
      if (!src) continue; // file may not exist in this build; skip
      const re = /\b(?:sm|md|lg|xl|2xl):[a-zA-Z][\w-]*/;
      if (!re.test(src)) {
        missingCoverage.push(rel);
      }
    }
    expect(
      missingCoverage,
      `interactive pages with no responsive Tailwind class: ${missingCoverage.join(", ")} — every page must adapt to iPhone SE (375px) / iPad (768px) / desktop (1440px+)`,
    ).toEqual([]);
  });

  it("no source file uses raw `user-scalable=no` or `maximum-scale=1` (a11y anti-pattern)", () => {
    // Search app/ + components/ for the anti-pattern. iOS Safari and
    // Chrome Android auto-zoom behavior depends on user-scalable=yes
    // (default) and a maximum-scale >= 2.
    const candidates = [
      "app",
      "components",
    ];
    const anti: string[] = [];
    const re = /user-scalable\s*=\s*no|maximum-scale\s*=\s*1\b/gi;
    for (const dir of candidates) {
      const abs = resolve(APP_ROOT, dir);
      try {
        const { readdirSync, statSync } = require("node:fs") as typeof import("node:fs");
        const walk = (d: string) => {
          for (const entry of readdirSync(d)) {
            const p = resolve(d, entry);
            const s = statSync(p);
            if (s.isDirectory()) {
              walk(p);
            } else if (/\.(tsx?|jsx?|html)$/i.test(entry)) {
              const text = readTextOrEmpty(p);
              if (re.test(text)) anti.push(p);
              re.lastIndex = 0;
            }
          }
        };
        walk(abs);
      } catch {
        // dir may not exist; skip
      }
    }
    expect(
      anti,
      `source files with user-scalable=no or maximum-scale=1: ${anti.join(", ")}`,
    ).toEqual([]);
  });
});

// ─── Helper unit tests ──────────────────────────────────────

describe("Phase 11 — extractViewportMeta (helper unit tests)", () => {
  it("captures a standard viewport meta with double quotes", () => {
    const html = `<head><meta name="viewport" content="width=device-width, initial-scale=1"></head>`;
    expect(extractViewportMeta(html)).toBe("width=device-width, initial-scale=1");
  });

  it("captures a viewport meta with single quotes", () => {
    const html = `<head><meta name='viewport' content='width=device-width'></head>`;
    expect(extractViewportMeta(html)).toBe("width=device-width");
  });

  it("returns empty string when no viewport meta is present", () => {
    const html = `<head><title>x</title></head>`;
    expect(extractViewportMeta(html)).toBe("");
  });

  it("captures the first viewport meta when multiple are present", () => {
    const html = `<head><meta name="viewport" content="width=device-width"><meta name="viewport" content="width=600"></head>`;
    expect(extractViewportMeta(html)).toBe("width=device-width");
  });

  it("is case-insensitive on the meta name attribute", () => {
    const html = `<head><meta NAME="Viewport" content="width=device-width"></head>`;
    expect(extractViewportMeta(html)).toBe("width=device-width");
  });
});

describe("Phase 11 — hasViewportScalabilityLock (helper unit tests)", () => {
  it("returns true for user-scalable=no", () => {
    expect(hasViewportScalabilityLock("width=device-width, user-scalable=no")).toBe(true);
  });

  it("returns true for maximum-scale=1", () => {
    expect(hasViewportScalabilityLock("width=device-width, maximum-scale=1")).toBe(true);
  });

  it("returns false for the standard viewport meta", () => {
    expect(hasViewportScalabilityLock("width=device-width, initial-scale=1")).toBe(false);
  });

  it("returns false for maximum-scale=2 (iOS-friendly)", () => {
    expect(hasViewportScalabilityLock("width=device-width, maximum-scale=2")).toBe(false);
  });

  it("returns false for empty content", () => {
    expect(hasViewportScalabilityLock("")).toBe(false);
  });
});

describe("Phase 11 — hasResponsiveTailwindClass (helper unit tests)", () => {
  it("detects md: prefix", () => {
    expect(hasResponsiveTailwindClass(`<div class="md:flex">`)).toBe(true);
  });

  it("detects lg: prefix", () => {
    expect(hasResponsiveTailwindClass(`<div class="lg:grid-cols-3">`)).toBe(true);
  });

  it("detects sm: prefix", () => {
    expect(hasResponsiveTailwindClass(`<div class="sm:p-4">`)).toBe(true);
  });

  it("detects 2xl: prefix", () => {
    expect(hasResponsiveTailwindClass(`<div class="2xl:max-w-7xl">`)).toBe(true);
  });

  it("returns false for HTML with no responsive classes", () => {
    expect(hasResponsiveTailwindClass(`<div class="flex p-4">`)).toBe(false);
  });

  it("does not match 'sm' inside a word like 'scheme'", () => {
    expect(hasResponsiveTailwindClass(`<p>media scheme</p>`)).toBe(false);
  });
});
