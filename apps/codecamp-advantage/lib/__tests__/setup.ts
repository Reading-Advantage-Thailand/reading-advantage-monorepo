import { expect, vi } from "vitest";
import * as matchers from "@testing-library/jest-dom/matchers";

expect.extend(matchers);

vi.mock("next-intl", () => ({
  useTranslations: () => {
    return (key: string, params?: Record<string, unknown>) => {
      if (params) {
        return key;
      }
      return key;
    };
  },
  useLocale: () => "en",
  hasLocale: (locales: string[], locale: string) => locales.includes(locale),
}));

vi.mock("next-intl/server", () => ({
  getLocale: vi.fn().mockResolvedValue("en"),
  getMessages: vi.fn().mockResolvedValue({}),
  getTranslations: vi.fn().mockResolvedValue((key: string) => key),
}));
