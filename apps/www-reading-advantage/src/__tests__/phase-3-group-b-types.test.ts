import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import enMessages from "@/locales/en";
import thMessages from "@/locales/th";
import zhMessages from "@/locales/zh";
import { routing } from "@/i18n/routing";
import { getScopedI18n } from "@/locales/server";
import Services from "@/app/[locale]/(marketing)/services/page";
import B2BSolutions from "@/components/products/b2b-solutions";
import type { AppConfig } from "next-intl";
import { isValidElement } from "react";
import { describe, expect, it, vi } from "vitest";
import * as ts from "typescript";

const wiring = vi.hoisted(() => {
  const scopeCalls: string[] = [];
  const keyCalls: string[] = [];
  const translator = vi.fn((key: string) => {
    keyCalls.push(key);
    return `__group_b_${key.replaceAll(".", "_")}`;
  });
  const getScopedI18n = vi.fn(async (scope: string) => {
    scopeCalls.push(scope);
    return translator;
  });

  return { getScopedI18n, keyCalls, scopeCalls, translator };
});

vi.mock("@/locales/server", () => ({
  getScopedI18n: wiring.getScopedI18n,
}));

const PRODUCT_KEYS = [
  "primaryAdvantage",
  "readingAdvantage",
  "stemAdvantage",
  "scienceAdvantage",
  "mathAdvantage",
  "zhongwenAdvantage",
  "storytimeAdvantage",
  "codecampAdvantage",
] as const;

const SERVICE_RENDER_ORDER = [0, 1, 2, 3] as const;
const B2B_RENDER_ORDER = [
  "readingAdvantage",
  "primaryAdvantage",
  "scienceAdvantage",
  "mathAdvantage",
  "zhongwenAdvantage",
  "storytimeAdvantage",
  "stemAdvantage",
  "codecampAdvantage",
] as const;
const SERVICE_FEATURE_INDEXES = [0, 1, 2, 3, 4, 5] as const;
const SHORT_SERVICE_FEATURE_INDEXES = [0, 1, 2, 3] as const;
const PRODUCT_FEATURE_INDEXES = [0, 1, 2, 3] as const;

const EXPECTED_SERVICE_KEYS = [
  ...SERVICE_RENDER_ORDER.flatMap((serviceIndex) => [
    `services.${serviceIndex}.name`,
    `services.${serviceIndex}.status`,
    `services.${serviceIndex}.statusBadge`,
    `services.${serviceIndex}.description`,
    ...(serviceIndex === 3
      ? SHORT_SERVICE_FEATURE_INDEXES
      : SERVICE_FEATURE_INDEXES
    ).map(
      (featureIndex) => `services.${serviceIndex}.features.${featureIndex}`,
    ),
    `services.${serviceIndex}.cta`,
    `services.${serviceIndex}.href`,
    `services.${serviceIndex}.image`,
  ]),
  "hero.title",
  "hero.subtitle",
  "hero.description",
  "cta.button",
  "hero.heading",
  "hero.subheading",
  "cta.title",
  "cta.description",
  "cta.button",
];

const EXPECTED_B2B_KEYS = [
  ...B2B_RENDER_ORDER.flatMap((productKey) => [
    `products.${productKey}.title`,
    ...PRODUCT_FEATURE_INDEXES.map(
      (featureIndex) => `products.${productKey}.features.${featureIndex}`,
    ),
    `products.${productKey}.gradeRange`,
    `products.${productKey}.badge`,
  ]),
  "title",
  "description",
  ...B2B_RENDER_ORDER.flatMap((productKey) => [
    "cta.learnMore",
    ...(productKey === "readingAdvantage"
      ? ["seeSuccessStories", "description"]
      : []),
  ]),
];

const GROUP_B_SOURCE_ROOT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
);
const GROUP_B_SOURCE_FILES = [
  "app/[locale]/(marketing)/services/page.tsx",
  "components/products/b2b-solutions.tsx",
] as const;

type AssertionIssue = {
  kind: string;
  text: string;
};

function findUnsafeAssertions(
  source: string,
  fileName: string,
): AssertionIssue[] {
  const sourceFile = ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.Latest,
    true,
    fileName.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const issues: AssertionIssue[] = [];

  function visit(node: ts.Node): void {
    if (ts.isAsExpression(node)) {
      if (node.type.getText(sourceFile) !== "const") {
        issues.push({ kind: "as", text: node.getText(sourceFile) });
      }
    } else if (ts.isTypeAssertionExpression(node)) {
      issues.push({ kind: "angle", text: node.getText(sourceFile) });
    } else if (ts.isNonNullExpression(node)) {
      issues.push({ kind: "non-null", text: node.getText(sourceFile) });
    } else if (ts.isSatisfiesExpression(node)) {
      issues.push({ kind: "satisfies", text: node.getText(sourceFile) });
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return issues;
}

type CanonicalMessages = AppConfig["Messages"];
type CanonicalServiceIndexes =
  keyof CanonicalMessages["pages"]["services"]["services"];
type ExpectedServiceIndexes = "0" | "1" | "2" | "3";
type CanonicalProductKeys =
  keyof CanonicalMessages["components"]["products"]["b2bSolutions"]["products"];
type ExpectedProductKeys = (typeof PRODUCT_KEYS)[number];
type ServiceIndexesAreExact = [ExpectedServiceIndexes] extends [
  CanonicalServiceIndexes,
]
  ? [CanonicalServiceIndexes] extends [ExpectedServiceIndexes]
    ? true
    : false
  : false;
const serviceIndexesAreExact: ServiceIndexesAreExact = true;
type ProductKeysAreExact = [ExpectedProductKeys] extends [CanonicalProductKeys]
  ? [CanonicalProductKeys] extends [ExpectedProductKeys]
    ? true
    : false
  : false;
const productKeysAreExact: ProductKeysAreExact = true;

type TreeEvidence = {
  text: string[];
  hrefs: string[];
  imageSources: string[];
  imageAlts: string[];
};

type ValueContext = "other" | "text" | "href" | "src" | "alt";

const visiblePropertyNames = new Set([
  "description",
  "label",
  "message",
  "text",
  "title",
]);

function contextForProperty(property: string): ValueContext {
  if (property === "href") return "href";
  if (property === "src") return "src";
  if (property === "alt") return "alt";
  if (property === "children" || visiblePropertyNames.has(property)) {
    return "text";
  }
  return "other";
}

function collectReactEvidence(
  value: unknown,
  evidence: TreeEvidence,
  seen: Set<object> = new Set(),
  context: ValueContext = "other",
): void {
  if (typeof value === "string") {
    if (context === "text") evidence.text.push(value);
    if (context === "href") evidence.hrefs.push(value);
    if (context === "src") evidence.imageSources.push(value);
    if (context === "alt") evidence.imageAlts.push(value);
    return;
  }

  if (value === null || typeof value !== "object") return;
  if (seen.has(value)) return;
  seen.add(value);

  if (Array.isArray(value)) {
    for (const item of value) {
      collectReactEvidence(
        item,
        evidence,
        seen,
        context === "other" ? "text" : context,
      );
    }
    return;
  }

  if (isValidElement<Record<string, unknown>>(value)) {
    for (const [property, propValue] of Object.entries(value.props)) {
      collectReactEvidence(
        propValue,
        evidence,
        seen,
        contextForProperty(property),
      );
    }
    return;
  }

  for (const [property, propertyValue] of Object.entries(value)) {
    collectReactEvidence(
      propertyValue,
      evidence,
      seen,
      contextForProperty(property),
    );
  }
}

function emptyTreeEvidence(): TreeEvidence {
  return { text: [], hrefs: [], imageSources: [], imageAlts: [] };
}

function sentinelFor(key: string): string {
  return `__group_b_${key.replaceAll(".", "_")}`;
}

async function typeCheckedTranslatorContracts(): Promise<void> {
  const services = await getScopedI18n("pages.services");
  const products = await getScopedI18n("components.products.b2bSolutions");

  services("services.0.features.5");
  products("products.codecampAdvantage.features.3");

  // @ts-expect-error Group B counterexample: arbitrary namespaces must fail.
  getScopedI18n("pages.untrusted");
  // @ts-expect-error Group B counterexample: service index 4 must fail.
  services("services.4.name");
  // @ts-expect-error Group B counterexample: service field must fail.
  services("services.0.heading");
  // @ts-expect-error Group B counterexample: service feature index 6 must fail.
  services("services.0.features.6");
  // @ts-expect-error Group B counterexample: arbitrary product key must fail.
  products("products.unknown.title");
  // @ts-expect-error Group B counterexample: product field must fail.
  products("products.mathAdvantage.subtitle");
  // @ts-expect-error Group B counterexample: product feature index 4 must fail.
  products("products.mathAdvantage.features.4");
}

void [
  serviceIndexesAreExact,
  productKeysAreExact,
  typeCheckedTranslatorContracts,
];

const localeMessages = [enMessages, thMessages, zhMessages] as const;

describe("Phase 3 Group B locale contracts", () => {
  it("keeps service and product keys complete in every locale", () => {
    for (const messages of localeMessages) {
      expect(messages.pages.services.services).toHaveLength(4);
      expect(
        messages.pages.services.services.map(
          (service) => service.features.length,
        ),
      ).toEqual([6, 6, 6, 4]);

      for (const service of messages.pages.services.services) {
        expect(service.name).toBeTruthy();
        expect(service.status).toBeTruthy();
        expect(service.statusBadge).toBeTruthy();
        expect(service.description).toBeTruthy();
        expect(service.cta).toBeTruthy();
        expect(service.href).toBeTruthy();
        expect(service.image).toBeTruthy();
        expect(service.features.every(Boolean)).toBe(true);
      }

      expect(
        Object.keys(messages.components.products.b2bSolutions.products).sort(),
      ).toEqual([...PRODUCT_KEYS].sort());
      for (const productKey of PRODUCT_KEYS) {
        const product =
          messages.components.products.b2bSolutions.products[productKey];
        expect(product.title).toBeTruthy();
        expect(product.badge).toBeTruthy();
        expect(product.gradeRange).toBeTruthy();
        expect(Object.keys(product.features)).toEqual(["0", "1", "2", "3"]);
        expect(Object.values(product.features).every(Boolean)).toBe(true);
      }
    }
  });

  it("keeps English fallback and Chinese routing configured", () => {
    expect(routing.defaultLocale).toBe("en");
    expect(routing.locales).toEqual(["en", "th", "zh"]);
    expect(routing.locales).toContain("zh");
    expect(enMessages.pages.services).toBeDefined();
  });

  it("rejects assertion and alias bypass fixtures with the AST guard", () => {
    const fixtures = [
      {
        name: "alias-hidden service key",
        source: `const key = "services.4.name" as ServicesKey; t(key);`,
        kinds: ["as"],
      },
      {
        name: "direct product key assertion",
        source: `t("products.unknown.title" as ProductKey);`,
        kinds: ["as"],
      },
      {
        name: "chained service assertions",
        source: `t(("services.4.name" as ServicesKey) as OtherKey);`,
        kinds: ["as", "as"],
      },
      {
        name: "angle-bracket product assertion",
        source: `t(<ProductKey>"products.unknown.title");`,
        kinds: ["angle"],
      },
      {
        name: "non-null alias assertion",
        source: `t(key!);`,
        kinds: ["non-null"],
      },
      {
        name: "satisfies key assertion",
        source: `const key = "products.unknown.title" satisfies ProductKey; t(key);`,
        kinds: ["satisfies"],
      },
    ] as const;

    for (const fixture of fixtures) {
      expect(
        findUnsafeAssertions(fixture.source, `${fixture.name}.ts`).map(
          (issue) => issue.kind,
        ),
      ).toEqual(fixture.kinds);
    }
  });

  it("keeps both production components free of unsafe assertions", () => {
    for (const relativePath of GROUP_B_SOURCE_FILES) {
      const source = readFileSync(
        resolve(GROUP_B_SOURCE_ROOT, relativePath),
        "utf8",
      );
      expect(findUnsafeAssertions(source, relativePath)).toEqual([]);
    }
  });

  it("executes translator wiring in both reviewed components", async () => {
    wiring.getScopedI18n.mockClear();
    wiring.keyCalls.length = 0;
    wiring.scopeCalls.length = 0;

    const servicesTree = await Services();
    const servicesEvidence = emptyTreeEvidence();
    collectReactEvidence(servicesTree, servicesEvidence);
    expect(wiring.getScopedI18n).toHaveBeenCalledWith("pages.services");
    expect(wiring.keyCalls).toEqual(EXPECTED_SERVICE_KEYS);
    expect(servicesEvidence.text).toContain(sentinelFor("hero.title"));
    expect(servicesEvidence.text).toContain(sentinelFor("services.0.name"));
    expect(servicesEvidence.hrefs).toContain(sentinelFor("services.0.href"));
    expect(servicesEvidence.imageSources).toContain(
      sentinelFor("services.0.image"),
    );
    expect(servicesEvidence.imageAlts).toContain(
      sentinelFor("services.0.name"),
    );

    wiring.getScopedI18n.mockClear();
    wiring.keyCalls.length = 0;
    wiring.scopeCalls.length = 0;

    const productsTree = await B2BSolutions();
    const productsEvidence = emptyTreeEvidence();
    collectReactEvidence(productsTree, productsEvidence);
    expect(wiring.getScopedI18n).toHaveBeenCalledWith(
      "components.products.b2bSolutions",
    );
    expect(wiring.keyCalls).toEqual(EXPECTED_B2B_KEYS);
    expect(productsEvidence.text).toContain(sentinelFor("title"));
    expect(productsEvidence.text).toContain(
      sentinelFor("products.readingAdvantage.title"),
    );
    expect(productsEvidence.hrefs).toContain("/products/reading-advantage");
    expect(productsEvidence.imageSources).toContain("/reading-advantage.jpg");
    expect(productsEvidence.imageAlts).toContain(
      sentinelFor("products.readingAdvantage.title"),
    );
  });
});
