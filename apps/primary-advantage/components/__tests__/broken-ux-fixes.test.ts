import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

/**
 * Reads a repo file relative to the primary-advantage app root.
 * @param relPath The path relative to the app root.
 * @returns The file contents as text.
 */
function readAppFile(relPath: string): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return readFileSync(path.join(here, "..", "..", relPath), "utf8");
}

describe("primary broken UX fixes", () => {
  it("FR-1: cn/tw nest VocabularyMatching and Introduction inside Lesson", () => {
    for (const locale of ["cn", "tw"]) {
      const messages = JSON.parse(readAppFile(`messages/${locale}.json`));
      expect(messages.Lesson.VocabularyMatching).toBeDefined();
      expect(messages.Lesson.Introduction).toBeDefined();
      expect(messages.VocabularyMatching).toBeUndefined();
      expect(messages.Introduction).toBeUndefined();
    }
  });

  it("FR-1: Lesson.VocabularyMatching resolves keys in cn/tw", () => {
    for (const locale of ["cn", "tw"]) {
      const messages = JSON.parse(readAppFile(`messages/${locale}.json`));
      expect(messages.Lesson.VocabularyMatching.start.title).toBeDefined();
      expect(messages.Lesson.Introduction.phase1Title).toBeDefined();
    }
  });

  it("FR-2: /admin landing page renders content instead of an empty div", () => {
    const source = readAppFile("app/[locale]/admin/page.tsx");
    expect(source).not.toMatch(/return\s*\(\s*<div><\/div>\s*\)/);
  });

  it("FR-3: app-layout has no flexl-1 typo", () => {
    const source = readAppFile("components/shared/app-layout.tsx");
    expect(source).not.toContain("flexl-1");
    expect(source).toContain("flex-1");
  });

  it("FR-4: no live links to missing admin routes or /pricing", () => {
    const quickActions = readAppFile(
      "components/admin/admin-quick-actions.tsx",
    );
    const header = readAppFile("components/admin/admin-dashboard-header.tsx");
    const footer = readAppFile("components/index/footer.tsx");
    expect(quickActions).not.toContain("/admin/dashboard/reports");
    expect(header).not.toContain("/admin/dashboard/reports");
    expect(header).not.toContain("/admin/settings");
    expect(footer).not.toContain('"/pricing"');
  });

  it("FR-5: footer content is corrected", () => {
    const source = readAppFile("components/index/footer.tsx");
    expect(source).not.toContain("Provinding");
    expect(source).toContain("Providing");
    expect(source).not.toContain("2024");
    expect(source).not.toContain('href=""');
    expect(source).not.toContain("info@primaryadvantage.com");
    expect(source).toContain("admin@reading-advantage.com");
    expect(source).not.toContain("+1 (123) 456-7890");
  });

  it("FR-6: student-assignment-table restores the commented t() calls", () => {
    const source = readAppFile("components/student-assignment-table.tsx");
    for (const key of [
      't("overdue")',
      't("dueToday")',
      't("daysLeft"',
      't("notFinished")',
      't("inProgress")',
      't("done")',
    ]) {
      expect(source).toContain(key);
    }
    expect(source).not.toMatch(/\/\/\s*text:\s*`\$\{t\(/);
    expect(source).not.toMatch(/\/\/\s*stext:/);
    expect(source).not.toMatch(/\/\/\s*return\s*`\$\{t\(/);
  });

  it("FR-7: signup legal links point at real routes and use isPending", () => {
    const source = readAppFile("components/auth/user-signup-form.tsx");
    expect(source).toContain('"/terms"');
    expect(source).toContain('"/privacy-policy"');
    expect(source).not.toMatch(/<a href="#"/);
    expect(source).not.toContain("isPanding");
    expect(source).toContain("isPending");
  });

  it("FR-7: internal Get Started link has no target=_blank", () => {
    const source = readAppFile("app/[locale]/(index)/page.tsx");
    expect(source).not.toMatch(/href="\/auth\/signin"\s*\n?\s*target="_blank"/);
  });

  it("FR-8: no captoliza in live components", () => {
    for (const file of [
      "components/teacher/my-students.tsx",
      "components/teacher/my-classes.tsx",
      "components/dashboard/history-table.tsx",
    ]) {
      expect(readAppFile(file)).not.toContain("captoliza");
    }
  });

  it("FR-9: no act import and no console module imports", () => {
    const table = readAppFile("components/student-assignment-table.tsx");
    expect(table).not.toMatch(/import\s+React,\s*\{\s*act\b/);
    expect(table).not.toContain('"console"');
    expect(
      readAppFile("server/utils/generators/audio-generator.ts"),
    ).not.toContain('"console"');
    expect(readAppFile("server/controllers/userController.ts")).not.toContain(
      '"console"',
    );
  });
});
