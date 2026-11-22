import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ContactPage from "@/app/[locale]/(marketing)/contact/page";
import Footer from "@/components/common/footer";
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

const localeMessages = [enMessages, thMessages, zhMessages];
const contactHandle = new URL(contactDetails.tiktokUrl).pathname.slice(1);

type AuthorityDuplicate = {
  path: string;
  value: string;
};

function readMessage(messages: object, path: string): unknown {
  return path.split(".").reduce<unknown>((value, segment) => {
    if (!value || typeof value !== "object") {
      return undefined;
    }
    return (value as Record<string, unknown>)[segment];
  }, messages);
}

function findAuthorityDuplicates(
  messages: object,
  authorities: AuthorityDuplicate[],
): AuthorityDuplicate[] {
  return authorities.filter(({ path, value }) => {
    const message = readMessage(messages, path);
    return typeof message === "string" && message.includes(value);
  });
}

afterEach(() => {
  cleanup();
  serverWiring.messages = {};
});

describe("RC-P4-001 contact authority contract", () => {
  it("uses contactDetails for approved values across Phase 4 contact paths", async () => {
    serverWiring.messages = enMessages as unknown as Record<string, unknown>;
    const contactPage = render(await ContactPage());
    const footer = render(await Footer());

    const renderedValues = [
      contactDetails.supportEmail,
      contactDetails.phoneNumber,
      contactDetails.tiktokLabel,
    ];
    const renderedSurfaces = [contactPage.container, footer.container];

    expect(
      renderedSurfaces.every((surface) =>
        renderedValues.every((value) => surface.textContent?.includes(value)),
      ),
    ).toBe(true);
  });

  it("rejects duplicate raw contact values in authority locale fields", () => {
    const authorities: AuthorityDuplicate[] = [
      {
        path: "pages.contact.email.address",
        value: contactDetails.supportEmail,
      },
      {
        path: "pages.contact.phone.number",
        value: contactDetails.phoneNumber,
      },
      {
        path: "pages.contact.social.tiktok",
        value: contactHandle,
      },
    ];
    const duplicates = localeMessages.flatMap((messages) =>
      findAuthorityDuplicates(messages, authorities),
    );

    expect(duplicates).toEqual([]);
  });

  it("detects a duplicate-value counterexample without flagging a translated label", () => {
    const counterexample = {
      pages: {
        contact: {
          email: { address: contactDetails.supportEmail },
          phone: { number: "Call our team" },
          social: { tiktok: "ติดตามเรา" },
        },
      },
    };
    const duplicates = findAuthorityDuplicates(counterexample, [
      {
        path: "pages.contact.email.address",
        value: contactDetails.supportEmail,
      },
      {
        path: "pages.contact.phone.number",
        value: contactDetails.phoneNumber,
      },
      {
        path: "pages.contact.social.tiktok",
        value: contactHandle,
      },
    ]);

    expect(duplicates).toEqual([
      {
        path: "pages.contact.email.address",
        value: contactDetails.supportEmail,
      },
    ]);
  });
});
