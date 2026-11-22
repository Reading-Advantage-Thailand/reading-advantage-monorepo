import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ContactPage from "@/app/[locale]/(marketing)/contact/page";
import Footer from "@/components/common/footer";
import { ContactForm } from "@/components/contact/contact-form";
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

vi.mock("@/locales/client", () => ({
  useScopedI18n: vi.fn(() => (key: string) => key),
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

/** Collects the rendered anchors that carry an href. */
function renderedAnchors(container: HTMLElement): HTMLAnchorElement[] {
  return Array.from(container.querySelectorAll("a[href]"));
}

/** Finds an anchor by the label it renders to the visitor. */
function anchorWithLabel(
  anchors: HTMLAnchorElement[],
  label: string,
): HTMLAnchorElement | undefined {
  return anchors.find((anchor) => anchor.textContent?.includes(label));
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

  it("points every rendered contact destination at the authority values", async () => {
    serverWiring.messages = enMessages as unknown as Record<string, unknown>;
    const contactPage = render(await ContactPage());
    const anchors = renderedAnchors(contactPage.container);

    const mailto = `mailto:${contactDetails.supportEmail}`;
    expect(
      anchors.some((anchor) => anchor.getAttribute("href") === mailto),
      `a mailto link must point to ${mailto}`,
    ).toBe(true);

    const phoneLink = anchorWithLabel(anchors, contactDetails.phoneNumber);
    expect(phoneLink, "the phone link must render").toBeDefined();
    expect(
      phoneLink?.getAttribute("href"),
      "the phone link must use the authority tel: destination",
    ).toBe(contactDetails.phoneHref);

    const tiktokLink = anchorWithLabel(anchors, contactDetails.tiktokLabel);
    expect(tiktokLink, "the TikTok link must render").toBeDefined();
    expect(
      tiktokLink?.getAttribute("href"),
      "the TikTok link must use the authority destination",
    ).toBe(contactDetails.tiktokUrl);

    expect(
      contactPage.container.querySelector(
        `img[src="${contactDetails.lineQrSrc}"]`,
      ),
      "the LINE QR image must use the authority source",
    ).not.toBeNull();
  });

  it("submits the contact form to the authority email address", () => {
    const locations: string[] = [];
    const originalLocation = window.location;
    const fakeLocation = {
      get href(): string {
        return locations[locations.length - 1] ?? "";
      },
      set href(value: string) {
        locations.push(value);
      },
    };
    Object.defineProperty(window, "location", {
      configurable: true,
      value: fakeLocation,
    });
    try {
      const rendered = render(<ContactForm />);
      const form = rendered.container.querySelector("form");
      expect(form, "the contact form must render").not.toBeNull();
      fireEvent.submit(form as HTMLFormElement);
      expect(locations.length, "submit must navigate once").toBe(1);
      expect(
        locations[0].startsWith(`mailto:${contactDetails.supportEmail}?`),
        "the form must submit to the authority email",
      ).toBe(true);
    } finally {
      Object.defineProperty(window, "location", {
        configurable: true,
        value: originalLocation,
      });
    }
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
