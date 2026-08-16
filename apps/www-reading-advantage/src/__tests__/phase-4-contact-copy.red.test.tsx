import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ContactPage from "@/app/[locale]/(marketing)/contact/page";
import { contactDetails } from "@/config/contact";
import enMessages from "@/locales/en";
import thMessages from "@/locales/th";
import zhMessages from "@/locales/zh";

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
  {
    locale: "en",
    messages: enMessages,
    platformPhrase: "Follow us on TikTok",
    expected: "Follow us on TikTok @reading.advantage",
  },
  {
    locale: "th",
    messages: thMessages,
    platformPhrase: "ติดตามเราบน TikTok",
    expected: "ติดตามเราบน TikTok @reading.advantage",
  },
  {
    locale: "zh",
    messages: zhMessages,
    platformPhrase: "在 TikTok 关注我们",
    expected: "在 TikTok 关注我们 @reading.advantage",
  },
] as const;

afterEach(() => {
  cleanup();
  serverWiring.messages = {};
});

describe("RA-P4-CONTACT-001 localized TikTok copy", () => {
  it("keeps the raw handle in contact config and the platform phrase in locale data", () => {
    expect(contactDetails.tiktokLabel).toBe("@reading.advantage");
    for (const { messages, platformPhrase } of localizedTikTokCopy) {
      expect(messages.pages.contact.social.tiktok).toBe(platformPhrase);
    }
  });

  it.each(localizedTikTokCopy)(
    "$locale renders one natural localized TikTok phrase",
    async ({ messages, expected }) => {
      serverWiring.messages = messages as unknown as Record<string, unknown>;
      const rendered = render(await ContactPage());
      const socialLink = rendered.getByRole("link", { name: /TikTok/ });
      const renderedCopy = socialLink.textContent?.replace(/\s+/g, " ").trim();

      expect(renderedCopy?.match(/TikTok/g) ?? []).toHaveLength(1);
      expect(renderedCopy?.match(/@reading\.advantage/g) ?? []).toHaveLength(1);
      expect(renderedCopy).toBe(expected);
    },
  );
});
