import type { ComponentProps } from "react";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { en, th, zh } from "@/locales/pages/services";
import Services from "@/app/[locale]/(marketing)/services/page";

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

const toneCases = [
  { serviceIndex: 0, className: "bg-amber-100 text-amber-700" },
  { serviceIndex: 1, className: "bg-slate-200 text-slate-700" },
  { serviceIndex: 2, className: "bg-green-100 text-green-700" },
  { serviceIndex: 3, className: "bg-green-100 text-green-700" },
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
        expect(badge).toHaveClass(...toneCase.className.split(" "));
      }
    });
  }
});
