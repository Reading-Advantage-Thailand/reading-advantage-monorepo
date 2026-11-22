import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ContactPage from "@/app/[locale]/(marketing)/contact/page";
import enMessages from "@/locales/en";
import thMessages from "@/locales/th";
import zhMessages from "@/locales/zh";
import { expectKeysInEveryLocale } from "@/__tests__/fixtures/locale-key-check";

const serverWiring = vi.hoisted(() => ({
  messages: {} as Record<string, unknown>,
}));

vi.mock("@/locales/server", () => ({
  getScopedI18n: vi.fn(async (scope: string) => (key: string) => {
    const message = `${scope}.${key}`
      .split(".")
      .reduce<unknown>((value, segment) => {
        if (!value || typeof value !== "object") {
          return undefined;
        }
        return (value as Record<string, unknown>)[segment];
      }, serverWiring.messages);

    return typeof message === "string" ? message : `${scope}.${key}`;
  }),
}));

vi.mock("next/image", () => ({
  default: (props: React.ComponentProps<"img">) => <img {...props} />,
}));

const localizedTikTokCopy = [
  { locale: "en", messages: enMessages },
  { locale: "th", messages: thMessages },
  { locale: "zh", messages: zhMessages },
] as const;

afterEach(() => {
  cleanup();
  serverWiring.messages = {};
});

describe("RA-P4-CONTACT-001 localized TikTok copy", () => {
  it("keeps the TikTok platform phrase key in every shipped locale", () => {
    expectKeysInEveryLocale(["pages.contact.social.tiktok"]);
  });

  it.each(localizedTikTokCopy)(
    "$locale renders one natural localized TikTok phrase",
    async ({ messages }) => {
      serverWiring.messages = messages as unknown as Record<string, unknown>;
      const rendered = render(await ContactPage());
      const socialLink = rendered.getByRole("link", { name: /TikTok/ });
      const renderedCopy = socialLink.textContent?.replace(/\s+/g, " ").trim();

      expect(renderedCopy?.match(/TikTok/g) ?? []).toHaveLength(1);
      expect(renderedCopy?.match(/@reading\.advantage/g) ?? []).toHaveLength(1);
    },
  );
});
