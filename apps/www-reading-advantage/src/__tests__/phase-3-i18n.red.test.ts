import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const SOURCE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const readSource = (relativePath: string) =>
  readFileSync(resolve(SOURCE_ROOT, relativePath), "utf8");

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
});
