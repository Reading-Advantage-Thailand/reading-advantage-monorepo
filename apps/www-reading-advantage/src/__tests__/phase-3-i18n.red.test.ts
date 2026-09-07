import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import * as ts from "typescript";
import enMessages from "@/locales/en";
import thMessages from "@/locales/th";
import zhMessages from "@/locales/zh";
import { ContactCTA } from "@/components/blog/contact-cta";
import { ProductCTA } from "@/components/blog/product-cta";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

const SOURCE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SCIENCE_PAGE_SOURCE = resolve(
  SOURCE_ROOT,
  "app/[locale]/(marketing)/products/science-advantage/page.tsx",
);
const TS_CONFIG_PATH = resolve(SOURCE_ROOT, "../tsconfig.json");

type SupportedLocale = "en" | "th" | "zh";

const localeState = vi.hoisted(() => ({ current: "en" as SupportedLocale }));

const readSource = (relativePath: string) =>
  readFileSync(resolve(SOURCE_ROOT, relativePath), "utf8");

const LOCALE_MESSAGES = {
  en: enMessages,
  th: thMessages,
  zh: zhMessages,
} as const;

function lookupLocaleMessage(
  locale: SupportedLocale,
  scope: string,
  key: string,
): string {
  let value: unknown = LOCALE_MESSAGES[locale];

  for (const segment of `${scope}.${key}`.split(".")) {
    if (value === null || typeof value !== "object" || !(segment in value)) {
      throw new Error(`Missing locale message: ${locale}.${scope}.${key}`);
    }
    value = (value as Record<string, unknown>)[segment];
  }

  if (typeof value !== "string") {
    throw new Error(`Locale message is not text: ${locale}.${scope}.${key}`);
  }

  return value;
}

function interpolate(
  template: string,
  values?: Record<string, string | number>,
): string {
  return Object.entries(values ?? {}).reduce(
    (result, [name, value]) => result.replaceAll(`{${name}}`, String(value)),
    template,
  );
}

const wiring = vi.hoisted(() => {
  const scopeCalls: string[] = [];
  const keyCalls: string[] = [];
  const runtimeScopes: string[] = [];
  const translator = vi.fn((key: string) => {
    keyCalls.push(key);
    return `__group_b_${key.replaceAll(".", "_")}`;
  });
  const runtimeTranslator = vi.fn((scope: string) => {
    runtimeScopes.push(scope);
    return (key: string, values?: Record<string, string | number>) =>
      interpolate(lookupLocaleMessage(localeState.current, scope, key), values);
  });
  const getScopedI18n = vi.fn(async (scope: string) => {
    scopeCalls.push(scope);
    if (
      scope === "pages.services" ||
      scope === "components.products.b2bSolutions"
    ) {
      return translator;
    }
    return runtimeTranslator(scope);
  });
  const useScopedI18n = vi.fn((scope: string) => runtimeTranslator(scope));

  return {
    getScopedI18n,
    keyCalls,
    runtimeScopes,
    scopeCalls,
    translator,
    useScopedI18n,
  };
});

vi.mock("@/locales/server", () => ({
  getScopedI18n: wiring.getScopedI18n,
}));

vi.mock("@/locales/client", () => ({
  useScopedI18n: wiring.useScopedI18n,
}));

function scienceTranslatorKeys(): string[] {
  const sourceFile = ts.createSourceFile(
    SCIENCE_PAGE_SOURCE,
    readFileSync(SCIENCE_PAGE_SOURCE, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const keys: string[] = [];

  function visit(node: ts.Node): void {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === "t" &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      keys.push(node.arguments[0].text);
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return keys;
}

function sciencePageDiagnostics(): string[] {
  const config = ts.readConfigFile(TS_CONFIG_PATH, ts.sys.readFile);
  if (config.error) {
    throw new Error(
      ts.flattenDiagnosticMessageText(config.error.messageText, "\n"),
    );
  }

  const parsed = ts.parseJsonConfigFileContent(
    config.config,
    ts.sys,
    dirname(TS_CONFIG_PATH),
  );
  if (parsed.errors.length > 0) {
    throw new Error(
      parsed.errors
        .map((error) =>
          ts.flattenDiagnosticMessageText(error.messageText, "\n"),
        )
        .join("\n"),
    );
  }

  const program = ts.createProgram(parsed.fileNames, parsed.options);
  return ts
    .getPreEmitDiagnostics(program)
    .filter(
      (diagnostic) =>
        diagnostic.file !== undefined &&
        resolve(diagnostic.file.fileName) === SCIENCE_PAGE_SOURCE,
    )
    .map((diagnostic) => {
      const message = ts.flattenDiagnosticMessageText(
        diagnostic.messageText,
        "\n",
      );
      const position = diagnostic.file?.getLineAndCharacterOfPosition(
        diagnostic.start ?? 0,
      );
      return `${diagnostic.file?.fileName}:${(position?.line ?? 0) + 1}:${(position?.character ?? 0) + 1}: ${message}`;
    });
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

const SCIENCE_REQUIRED_CALLERS = [
  "hero.comingSoon",
  "hero.title",
  "hero.subtitle",
  "hero.description",
  "hero.cta",
  "heroAlt",
  "logoAlt",
  "adaptiveEngine.eyebrow",
  "adaptiveEngine.heading",
  "adaptiveEngine.description",
  "adaptiveEngine.alt",
  "coreValue.heading",
  "coreValue.features.0.title",
  "coreValue.features.0.description",
  "keyFeatures.features.0.points.0",
  "keyFeatures.features.2.points.3",
  "targetAudience.heading",
  "targetAudience.audiences.0.title",
  "targetAudience.audiences.2.points.3",
  "waitlist.heading",
  "waitlist.form.placeholder",
  "waitlist.form.button",
] as const;

describe("Wave 5 T8 and T15 i18n contracts", () => {
  it("routes reviewed CTA and accessibility copy through locale messages", () => {
    const reviewedSources = [
      readSource("components/blog/contact-cta.tsx"),
      readSource("components/blog/product-cta.tsx"),
      readSource("components/ui/sheet.tsx"),
    ].join("\n");

    expect(reviewedSources).not.toMatch(
      /Want to talk to our team\?|Want to learn more\?|Contact Us|<span className="sr-only">Close<\/span>/,
    );
    expect(reviewedSources).not.toMatch(/locale\s*===\s*["']th["']/);
  });

  it("removes bypass casts from named locale accessors", () => {
    const reviewedSources = [
      readSource("app/[locale]/(marketing)/services/page.tsx"),
      readSource("components/products/b2b-solutions.tsx"),
    ].join("\n");

    expect(reviewedSources).not.toContain("as never");
    expect(reviewedSources).not.toContain("as any");
    expect(reviewedSources).not.toMatch(
      /\bas\s+(?:any|never|string|unknown|Record)\b/,
    );
    expect(reviewedSources).not.toMatch(/\[[^\]\n]+:\s*string\]/);
  });

  it("keeps reviewed Thai service translations free from known typo forms", () => {
    const reviewedSources = [
      readSource("locales/pages/services.ts"),
      readSource("locales/pages/managed-service.ts"),
    ].join("\n");

    expect(reviewedSources).not.toMatch(
      /ยืดหยบ่ท์|แผนกวาน|วัสดุปครบถ้วน|แดชบอร์ดีตาลละเอียด|อย่างสม่ำเสมออย่างสม่ำเสมอ|ผู้ปกคุม/,
    );
  });

  it("keeps existing Science translator callers type-valid", () => {
    const callers = scienceTranslatorKeys();

    expect(callers.length).toBeGreaterThan(20);
    expect(callers).toEqual(
      expect.arrayContaining([...SCIENCE_REQUIRED_CALLERS]),
    );

    const diagnostics = sciencePageDiagnostics();
    expect(
      diagnostics.every((diagnostic) =>
        diagnostic.includes(
          "is not assignable to parameter of type 'NamespacedMessageKeys<ExactMessages, \"pages.products.scienceAdvantage\">'",
        ),
      ),
    ).toBe(true);
    expect(diagnostics).toEqual([]);
  }, 120_000);

  it("renders localized CTA interpolation and Sheet screen-reader text", async () => {
    const localeEntries = Object.entries(LOCALE_MESSAGES) as Array<
      [SupportedLocale, (typeof LOCALE_MESSAGES)[SupportedLocale]]
    >;
    const renderedMessages = new Set<string>();

    for (const [locale, messages] of localeEntries) {
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

    expect(renderedMessages).toHaveLength(3);
    expect(
      new Set(
        localeEntries.map(
          ([, messages]) => messages.components.blog.contactCta.title,
        ),
      ),
    ).toHaveLength(3);
    expect(
      new Set(
        localeEntries.map(
          ([, messages]) => messages.components.blog.productCta.description,
        ),
      ),
    ).toHaveLength(3);
    expect(
      new Set(
        localeEntries.map(([, messages]) => messages.components.ui.sheet.close),
      ),
    ).toHaveLength(3);

    for (const scope of CTA_SCOPES) {
      const [namespace, ...keyParts] = scope.split(".");
      const key = keyParts.pop();
      const nestedScope = [namespace, ...keyParts].join(".");
      expect(key).toBeTruthy();
      expect(nestedScope).toBeTruthy();
      for (const locale of ["en", "th", "zh"] as const) {
        expect(
          lookupLocaleMessage(locale, nestedScope, key as string),
        ).toBeTruthy();
      }
    }
  });
});
