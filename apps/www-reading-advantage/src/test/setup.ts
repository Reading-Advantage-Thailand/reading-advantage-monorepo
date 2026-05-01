import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  })),
  usePathname: vi.fn(() => "/"),
}));

vi.mock("@/locales/client", () => ({
  useScopedI18n: vi.fn((scope: string) => (key: string) => {
    if (key.endsWith(".image")) {
      return "/images/placeholder.png";
    }
    return `${scope}.${key}`;
  }),
  useCurrentLocale: vi.fn(() => "en"),
  useChangeLocale: vi.fn(() => vi.fn()),
}));

vi.mock("@/locales/server", () => ({
  getI18n: vi.fn(() => Promise.resolve((key: string) => key)),
  getScopedI18n: vi.fn((scope: string) =>
    Promise.resolve((key: string) => {
      if (key.endsWith(".image")) {
        return "/images/placeholder.png";
      }
      return `${scope}.${key}`;
    }),
  ),
  getStaticParams: vi.fn(() => []),
}));
