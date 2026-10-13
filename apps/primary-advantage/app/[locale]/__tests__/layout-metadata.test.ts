import { beforeAll, describe, expect, it, vi } from "vitest";

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
vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key }));

import type { Metadata } from "next";
import { generateMetadata, viewport } from "../layout";

describe("root layout PWA metadata", () => {
  let metadata: Metadata;
  beforeAll(async () => {
    metadata = await generateMetadata({ params: Promise.resolve({ locale: "en" }) });
  });

  it("keeps the translated tagline (public pages PP-9)", () => {
    expect(metadata.description).toBe("tagline");
  });

  it("links the web app manifest", () => {
    expect(metadata.manifest).toBe("/manifest.webmanifest");
  });

  it("opens the iOS home screen app in standalone mode", () => {
    expect(metadata.appleWebApp).toMatchObject({
      capable: true,
      title: "Primary Advantage",
    });
  });

  it("serves the 180 px Forge icon to iOS", () => {
    const icons = metadata.icons as { apple?: string | string[] };
    const apple = [icons?.apple ?? []].flat();
    expect(apple).toContain("/icons/primary-advantage-180.png");
  });

  it("paints the browser chrome in the day and night skin colours", () => {
    expect(viewport.themeColor).toEqual([
      { media: "(prefers-color-scheme: light)", color: "#5c391a" },
      { media: "(prefers-color-scheme: dark)", color: "#0f1420" },
    ]);
  });
});
