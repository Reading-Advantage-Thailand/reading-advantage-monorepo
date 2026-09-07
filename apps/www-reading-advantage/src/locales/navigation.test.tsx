import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const localeState = vi.hoisted(() => ({ current: "en" }));

vi.unmock("./navigation");
vi.mock("next-intl", () => ({
  useLocale: () => localeState.current,
}));
vi.mock("next-intl/navigation", () => ({
  createNavigation: () => ({
    Link: vi.fn(),
    redirect: vi.fn(),
    usePathname: () => "/contact",
    useRouter: () => ({ replace: vi.fn() }),
    getPathname: vi.fn(),
  }),
}));

import { useCurrentLocale } from "./navigation";

describe("localized navigation", () => {
  beforeEach(() => {
    localeState.current = "en";
  });

  it.each(["en", "th", "zh"])("returns the active %s locale", (locale) => {
    localeState.current = locale;
    const { result } = renderHook(() => useCurrentLocale());
    expect(result.current).toBe(locale);
  });

  it("uses the configured default for an unsupported locale", () => {
    localeState.current = "fr";
    const { result } = renderHook(() => useCurrentLocale());
    expect(result.current).toBe("en");
  });
});
