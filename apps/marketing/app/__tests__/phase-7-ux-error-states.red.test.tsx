// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import CampaignsPage from "@/campaigns/page";
import CampaignDetailPage from "@/campaigns/[id]/page";
import VideoProductionPage from "@/campaigns/[id]/video/page";
import SettingsPage from "@/settings/page";

vi.mock("@reading-advantage/auth-client", () => ({
  useAuth: () => ({
    user: { role: "ADMIN" },
    isAuthenticated: true,
    isForbidden: false,
    isLoading: false,
  }),
}));

const __dirname = dirname(fileURLToPath(import.meta.url));
const APP_ROOT = resolve(__dirname, "..");
const campaignId = "11111111-1111-4111-8111-111111111111";

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: campaignId }),
  useRouter: () => ({ replace: vi.fn() }),
}));

/**
 * Recursively lists production TypeScript source files while excluding tests.
 * @param directory The directory whose application source should be scanned.
 * @returns The absolute paths of production TypeScript files.
 */
function collectProductionSources(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === "__tests__" || entry.name === "node_modules") return [];

    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) return collectProductionSources(path);
    if (!/\.(?:ts|tsx)$/.test(entry.name)) return [];
    if (/(?:\.test|\.spec)\.(?:ts|tsx)$/.test(entry.name)) return [];
    return [path];
  });
}

/**
 * Reads a Marketing application source file by its path relative to app/.
 * @param relativePath The source path below the Marketing app directory.
 * @returns The source file contents.
 */
function readAppSource(relativePath: string): string {
  return readFileSync(resolve(APP_ROOT, relativePath), "utf8");
}

/**
 * Removes comments before checking source for executable browser calls.
 * @param source The source text to normalize.
 * @returns Source text with line and block comments removed.
 */
function withoutComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|\s)\/\/.*$/gm, "$1");
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("Phase 7.3: UX error-state artifact guards", () => {
  it("has no executable alert calls in Marketing production source", () => {
    const calls = collectProductionSources(APP_ROOT).flatMap((path) => {
      const source = withoutComments(readFileSync(path, "utf8"));
      return source.split("\n").flatMap((line, index) =>
        /\b(?:window\.)?alert\s*\(/.test(line)
          ? [`${path}:${index + 1}: ${line.trim()}`]
          : [],
      );
    });

    expect(calls).toEqual([]);
  });

  it("does not use substring matching for test-connection error styling", () => {
    const settingsSource = readAppSource("settings/page.tsx");

    expect(settingsSource).not.toMatch(
      /testResult\.(?:startsWith|includes)\(\s*["']Error["']\s*\)/,
    );
  });

  it("uses a typed test-connection status for the result role and color", () => {
    const settingsSource = readAppSource("settings/page.tsx");

    const hasTypedStatus =
      /(?:status|kind)\s*:\s*["']success["']\s*\|\s*["']error["']/.test(
        settingsSource,
      ) ||
      /type\s+\w*(?:Status|Result)\w*\s*=\s*["']success["']\s*\|\s*["']error["']/.test(
        settingsSource,
      );
    expect(hasTypedStatus).toBe(true);

    const resultBlock = settingsSource.slice(settingsSource.indexOf("{testResult && ("));
    expect((resultBlock.match(/testResult\.(?:status|kind)/g) ?? []).length).toBeGreaterThanOrEqual(2);
  });

  it.each([
    ["settings", "settings/page.tsx"],
    ["campaign list", "campaigns/page.tsx"],
    ["campaign detail", "campaigns/[id]/page.tsx"],
    ["video production", "campaigns/[id]/video/page.tsx"],
  ])("keeps the %s fetch contract inline and response-aware", (_name, relativePath) => {
    const source = readAppSource(relativePath);

    const fetchCount = (source.match(/\bfetch\s*\(/g) ?? []).length;
    const nonOkBranchCount = (source.match(/!res\.ok/g) ?? []).length;
    expect(fetchCount).toBeGreaterThan(0);
    expect(nonOkBranchCount).toBe(fetchCount);
    expect(source).toMatch(/role\s*=\s*["']alert["']/);
  });
});

describe("Phase 7.3: UX error-state live behavior", () => {
  it("renders an inline settings error for a non-OK response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: "unavailable" }), { status: 503 }),
      ),
    );

    render(<SettingsPage />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /failed to load Marketing settings/i,
    );
  });

  it("renders inline errors for each client page when its request is non-OK", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: "unavailable" }), { status: 503 }),
      ),
    );

    const cases = [
      <CampaignsPage key="campaigns" />,
      <CampaignDetailPage key="campaign-detail" />,
      <VideoProductionPage key="video" />,
    ];

    for (const page of cases) {
      cleanup();
      render(page);
      expect(await screen.findByRole("alert")).toBeInTheDocument();
    }
  });
});
