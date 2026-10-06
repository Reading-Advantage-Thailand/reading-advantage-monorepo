/**
 * Phase 2 review (item 2b): next-intl had no time zone, so the server (UTC on Cloud Run) wrote
 * a Thai due date of 7 October 00:00 as "6 Oct" and the browser wrote "7 Oct": wrong text and a
 * hydration mismatch. The request config and the client provider both set Asia/Bangkok.
 */
import { isValidElement, type ReactElement, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { NextIntlClientProvider } from "next-intl";

vi.mock("next-intl/server", () => ({ getRequestConfig: (create: unknown) => create }));
vi.mock("next/font/local", () => ({ default: () => ({ variable: "--font-test", className: "font-test" }) }));
vi.mock("next/font/google", () => {
  const font = () => ({ variable: "--font-test", className: "font-test" });
  return { Cabin_Sketch: font, Inter: font, Noto_Sans_Thai: font, Quicksand: font };
});
vi.mock("@/components/providers/session-provider", () => ({ default: () => null }));
vi.mock("@/components/providers/theme-provider", () => ({ ThemeProvider: () => null }));
vi.mock("@/components/providers/query-provider", () => ({ default: () => null }));
vi.mock("@/components/ui/sonner", () => ({ Toaster: () => null }));
vi.mock("nuqs/adapters/next/app", () => ({ NuqsAdapter: () => null }));
vi.mock("@/hooks/use-layout", () => ({ LayoutProvider: () => null }));

import requestConfig from "@/i18n/request";
import RootLayout from "../layout";

type RequestConfigFn = (params: { requestLocale: Promise<string | undefined> }) => Promise<{ locale: string; timeZone?: string }>;

/**
 * Finds the first element of a type in an element tree that is not rendered.
 * @param node The tree.
 * @param type The component to find.
 * @returns The element, or undefined.
 */
function findElement(node: ReactNode, type: unknown): ReactElement<Record<string, unknown>> | undefined {
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findElement(child, type);
      if (found) return found;
    }
    return undefined;
  }
  if (!isValidElement<{ children?: ReactNode }>(node)) return undefined;
  if (node.type === type) return node as ReactElement<Record<string, unknown>>;
  return findElement(node.props.children, type);
}

describe("next-intl time zone", () => {
  it("sets Asia/Bangkok in the request config for every locale", async () => {
    for (const locale of ["th", "en"]) {
      const config = await (requestConfig as unknown as RequestConfigFn)({ requestLocale: Promise.resolve(locale) });
      expect(config).toMatchObject({ locale, timeZone: "Asia/Bangkok" });
    }
  });

  it("gives the client provider the same time zone", async () => {
    const tree = await RootLayout({ children: null, params: Promise.resolve({ locale: "th" }) });
    expect(findElement(tree, NextIntlClientProvider)?.props.timeZone).toBe("Asia/Bangkok");
  });
});
