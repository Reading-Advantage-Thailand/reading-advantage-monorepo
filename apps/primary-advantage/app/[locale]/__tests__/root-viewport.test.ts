import { describe, expect, it, vi } from "vitest";

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

import { viewport } from "../layout";

describe("root layout viewport", () => {
  it("covers the whole screen so the safe-area insets have values on notched phones", () => {
    expect(viewport.viewportFit).toBe("cover");
  });
});
