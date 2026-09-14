// @vitest-environment jsdom
/**
 * Wave 1 fix coverage: admin stats cards must read the real pagination and
 * total fields returned by the count endpoints instead of showing zeros or
 * fabricated numbers.
 */
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { AdminStatsCards } from "../admin-stats-cards";

const appRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

/**
 * Reads and parses a locale message file.
 * @param locale Locale file basename without extension.
 * @returns Parsed message dictionary.
 */
function messages(locale: string): Record<string, unknown> {
  return JSON.parse(
    readFileSync(join(appRoot, "messages", `${locale}.json`), "utf8"),
  ) as Record<string, unknown>;
}

/**
 * Builds a successful fetch Response stub for the count endpoints.
 * @param payload The JSON body the endpoint returns.
 * @returns A stub with ok and json support.
 */
function jsonResponse(payload: unknown) {
  return { ok: true, status: 200, json: async () => payload };
}

const mockFetch = vi.hoisted(() => vi.fn());

describe("AdminStatsCards count fields", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", mockFetch);
    mockFetch.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.startsWith("/api/teachers")) {
        return jsonResponse({
          teachers: [],
          statistics: {},
          pagination: { total: 12 },
        });
      }
      if (url.startsWith("/api/students")) {
        return jsonResponse({ students: [], pagination: { total: 34 } });
      }
      if (url.startsWith("/api/articles")) {
        return jsonResponse({ articles: [], totalArticles: 56 });
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("displays pagination.total and totalArticles from the endpoints", async () => {
    render(
      <NextIntlClientProvider locale="en" messages={messages("en")}>
        <AdminStatsCards />
      </NextIntlClientProvider>,
    );

    const teachersCard = (await screen.findByText("12")).closest(
      '[data-slot="card"]',
    );
    expect(teachersCard).toHaveTextContent("Teachers");
    expect(teachersCard).toHaveTextContent("12");

    const studentsCard = (await screen.findByText("34")).closest(
      '[data-slot="card"]',
    );
    expect(studentsCard).toHaveTextContent("Students");
    expect(studentsCard).toHaveTextContent("34");

    const articlesCard = (await screen.findByText("56")).closest(
      '[data-slot="card"]',
    );
    expect(articlesCard).toHaveTextContent("Articles");
    expect(articlesCard).toHaveTextContent("56");

    // No card falls back to zero and nothing is fabricated.
    expect(screen.queryByText("0")).not.toBeInTheDocument();
    expect(screen.queryByText("100")).not.toBeInTheDocument();
    expect(screen.queryByText("5")).not.toBeInTheDocument();

    // Growth has no live source and renders the explicit unavailable state.
    expect(screen.getByText("—")).toBeInTheDocument();

    expect(mockFetch).toHaveBeenCalledWith("/api/teachers?count=true");
    expect(mockFetch).toHaveBeenCalledWith("/api/students?count=true");
    expect(mockFetch).toHaveBeenCalledWith("/api/articles?count=true");
  });
});
