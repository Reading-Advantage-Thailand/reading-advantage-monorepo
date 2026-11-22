import { createElement } from "react";
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import enMessages from "@/locales/en";
import thMessages from "@/locales/th";
import zhMessages from "@/locales/zh";
import { ContactCTA } from "@/components/blog/contact-cta";
import { ProductCTA } from "@/components/blog/product-cta";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

type SupportedLocale = "en" | "th" | "zh";

const LOCALE_MESSAGES = {
  en: enMessages,
  th: thMessages,
  zh: zhMessages,
} as const;

const localeState = vi.hoisted(() => ({ current: "en" as SupportedLocale }));

const wiring = vi.hoisted(() => {
  const runtimeTranslator = vi.fn((scope: string) => {
    return (key: string, values?: Record<string, string | number>) =>
      scopedValue(scope, key, values);
  });

  const useScopedI18n = vi.fn((scope: string) => runtimeTranslator(scope));

  return { useScopedI18n };
});

vi.mock("@/locales/client", () => ({
  useScopedI18n: wiring.useScopedI18n,
}));

/** Resolves a scoped key from the active locale dictionary and interpolates values. */
function scopedValue(
  scope: string,
  key: string,
  values?: Record<string, string | number>,
): string {
  let value: unknown = LOCALE_MESSAGES[localeState.current] as Record<string, unknown>;
  for (const segment of `${scope}.${key}`.split(".")) {
    if (value === null || typeof value !== "object" || !(segment in value)) {
      return `${scope}.${key}`;
    }
    value = (value as Record<string, unknown>)[segment];
  }
  if (typeof value !== "string") return `${scope}.${key}`;
  return Object.entries(values ?? {}).reduce(
    (text, [name, replacement]) => text.replaceAll(`{${name}}`, String(replacement)),
    value,
  );
}

vi.mock("@/locales/server", () => ({
  getScopedI18n: vi.fn(
    async (scope: string) =>
      (key: string, values?: Record<string, string | number>) =>
        scopedValue(scope, key, values),
  ),
}));

/** Collects every string value under a data object. */
function stringLeaves(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(stringLeaves);
  if (value !== null && typeof value !== "object") return [];
  return Object.values(value as Record<string, unknown>).flatMap(stringLeaves);
}

const CTA_SCOPES = [
  "components.blog.contactCta.title",
  "components.blog.contactCta.description",
  "components.blog.contactCta.action",
  "components.blog.productCta.title",
  "components.blog.productCta.description",
  "components.blog.productCta.action",
  "components.ui.sheet.close",
] as const;

describe("Wave 5 T8 and T15 i18n contracts", () => {
  it("keeps reviewed Thai service translations free from known typo forms", () => {
    const values = [
      ...stringLeaves((thMessages.pages as Record<string, unknown>).services),
      ...stringLeaves((thMessages.pages as Record<string, unknown>).managedService),
    ];
    const knownTypos =
      /ยืดหยบ่ท์|แผนกวาน|วัสดุปครบถ้วน|แดชบอร์ดีตาลละเอียด|อย่างสม่ำเสมออย่างสม่ำเสมอ|ผู้ปกคุม/;
    const offenders = values.filter((value) => knownTypos.test(value));
    expect(offenders, `Thai typo forms in service copy:\n${offenders.join("\n")}`).toEqual([]);
  });

  it("renders localized CTA interpolation and Sheet screen-reader text", async () => {
    const renderedMessages = new Set<string>();

    for (const [locale, messages] of Object.entries(LOCALE_MESSAGES) as Array<
      [SupportedLocale, (typeof LOCALE_MESSAGES)[SupportedLocale]]
    >) {
      localeState.current = locale;

      const renderedContact = render(await ContactCTA({ locale }));
      const renderedProduct = render(
        await ProductCTA({
          locale,
          product: "/products/science-advantage",
        }),
      );

      const contact = messages.components.blog.contactCta;
      const product = messages.components.blog.productCta;
      const sheet = messages.components.ui.sheet;
      const productDescription = product.description.replaceAll(
        "{product}",
        "Science Advantage",
      );
      const productAction = product.action.replaceAll(
        "{product}",
        "Science Advantage",
      );

      expect(renderedContact.container).toHaveTextContent(contact.title);
      expect(renderedContact.container).toHaveTextContent(contact.description);
      expect(renderedContact.container).toHaveTextContent(contact.action);
      expect(renderedProduct.container).toHaveTextContent(product.title);
      expect(renderedProduct.container).toHaveTextContent(productDescription);
      expect(renderedProduct.container).toHaveTextContent(productAction);
      expect(renderedProduct.container).not.toHaveTextContent("{product}");
      renderedMessages.add(`${contact.title}|${productAction}|${sheet.close}`);

      renderedContact.unmount();
      renderedProduct.unmount();

      const renderedSheet = render(
        createElement(
          Sheet,
          { defaultOpen: true },
          createElement(
            SheetContent,
            null,
            createElement(SheetTitle, null, "Menu"),
          ),
        ),
      );
      const screenReaderClose = document.body.querySelector(".sr-only");
      expect(screenReaderClose).not.toBeNull();
      expect(screenReaderClose).toHaveTextContent(sheet.close);
      renderedSheet.unmount();
    }

    expect(renderedMessages.size).toBe(3);
    for (const scope of CTA_SCOPES) {
      const [namespace, ...keyParts] = scope.split(".");
      const key = keyParts.pop();
      const nestedScope = [namespace, ...keyParts].join(".");
      expect(key).toBeTruthy();
      expect(nestedScope).toBeTruthy();
      for (const locale of ["en", "th", "zh"] as const) {
        let value: unknown = LOCALE_MESSAGES[locale] as Record<string, unknown>;
        for (const segment of `${nestedScope}.${key}`.split(".")) {
          value =
            value !== null && typeof value === "object" && segment in value
              ? (value as Record<string, unknown>)[segment]
              : undefined;
        }
        expect(typeof value === "string" && value.length > 0).toBe(true);
      }
    }
  });
});
