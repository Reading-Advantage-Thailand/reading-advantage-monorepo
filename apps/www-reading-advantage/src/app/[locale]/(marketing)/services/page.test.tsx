import type { ComponentProps } from "react";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { en, th, zh } from "@/locales/pages/services";
import Services from "@/app/[locale]/(marketing)/services/page";
import { computedForElement } from "@/__tests__/fixtures/real-css";

const localeState = vi.hoisted(() => ({ current: "en" as Locale }));

vi.mock("@/locales/server", () => ({
  getScopedI18n: vi.fn(async () => (key: string) => {
    let value: unknown = localeMessages[localeState.current];
    for (const segment of key.split(".")) {
      if (typeof value !== "object" || value === null) {
        throw new Error(`Missing service message: ${key}`);
      }
      value = (value as Record<string, unknown>)[segment];
    }
    if (typeof value !== "string") {
      throw new Error(`Expected service message string: ${key}`);
    }
    return value;
  }),
}));

vi.mock("next/image", () => ({
  default: (props: ComponentProps<"img">) => <img {...props} />,
}));

const localeMessages = { en, th, zh };
type Locale = keyof typeof localeMessages;

/** The computed tone colors of each service badge, read from the shipped CSS. */
const toneCases = [
  {
    serviceIndex: 0,
    background: "oklch(0.962 0.059 95.617)",
    color: "rgb(146, 64, 14)",
  },
  {
    serviceIndex: 1,
    background: "rgb(218, 212, 200)",
    color: "rgb(51, 65, 85)",
  },
  {
    serviceIndex: 2,
    background: "oklch(0.95 0.052 163.051)",
    color: "rgb(6, 95, 70)",
  },
  {
    serviceIndex: 3,
    background: "oklch(0.95 0.052 163.051)",
    color: "rgb(6, 95, 70)",
  },
] as const;

afterEach(() => {
  cleanup();
  localeState.current = "en";
  vi.clearAllMocks();
});

describe("Services localized status tones", () => {
  for (const locale of Object.keys(localeMessages) as Locale[]) {
    it(`keeps localized badge tones for ${locale}`, async () => {
      localeState.current = locale;
      render(await Services());

      for (const toneCase of toneCases) {
        const service = localeMessages[locale].services[toneCase.serviceIndex];
        const heading = screen.getByRole("heading", {
          level: 3,
          name: service.name,
        });
        const card = heading.closest("div.group");

        expect(card).not.toBeNull();
        const badge = within(card as HTMLElement).getByText(
          service.statusBadge,
        );
        expect(badge).toHaveTextContent(service.statusBadge);
        const tone = computedForElement(badge, [
          "background-color",
          "color",
        ]);
        expect(tone["background-color"], `${locale} badge background`).toBe(
          toneCase.background,
        );
        expect(tone.color, `${locale} badge text`).toBe(toneCase.color);
      }
    });
  }
});
