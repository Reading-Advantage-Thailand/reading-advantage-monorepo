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

type ImportMetaWithGlob = ImportMeta & {
  glob: <T>(
    pattern: string,
    options: { eager: true; import: string; query: string },
  ) => Record<string, T>;
};

const contactPageSources = (import.meta as ImportMetaWithGlob).glob<string>(
  "../app/[locale]/(marketing)/contact/page.tsx",
  { eager: true, import: "default", query: "?raw" },
);
const footerSources = (import.meta as ImportMetaWithGlob).glob<string>(
  "../components/common/footer.tsx",
  {
    eager: true,
    import: "default",
    query: "?raw",
  },
);
const contactFormSources = (import.meta as ImportMetaWithGlob).glob<string>(
  "../components/contact/contact-form.tsx",
  { eager: true, import: "default", query: "?raw" },
);

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

function findMissingAuthorityReferences(
  source: string,
  references: string[],
): string[] {
  return references.filter((reference) => !source.includes(reference));
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
    const contactPageSource =
      contactPageSources["../app/[locale]/(marketing)/contact/page.tsx"];
    const footerSource = footerSources["../components/common/footer.tsx"];
    const contactFormSource =
      contactFormSources["../components/contact/contact-form.tsx"];
    const contactPageReferences = [
      "contactDetails.supportEmail",
      "contactDetails.phoneNumber",
      "contactDetails.phoneHref",
      "contactDetails.tiktokLabel",
      "contactDetails.tiktokUrl",
    ];
    const footerReferences = [
      "contactDetails.supportEmail",
      "contactDetails.phoneNumber",
      "contactDetails.tiktokLabel",
    ];

    const missingReferences = [
      ...findMissingAuthorityReferences(
        contactPageSource,
        contactPageReferences,
      ).map((reference) => `contact page: ${reference}`),
      ...findMissingAuthorityReferences(footerSource, footerReferences).map(
        (reference) => `footer: ${reference}`,
      ),
      ...findMissingAuthorityReferences(contactFormSource, [
        "contactDetails.supportEmail",
      ]).map((reference) => `contact form: ${reference}`),
    ];

    const renderedValues = [
      contactDetails.supportEmail,
      contactDetails.phoneNumber,
      contactDetails.tiktokLabel,
    ];
    const renderedSurfaces = [contactPage.container, footer.container];

    expect(missingReferences).toEqual([]);
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
