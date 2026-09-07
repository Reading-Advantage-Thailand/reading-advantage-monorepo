// @vitest-environment node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const appRoot = resolve(import.meta.dirname, "..");
const cohortPage = readFileSync(
  resolve(appRoot, "app/[locale]/admin/page.tsx"),
  "utf8",
);
const createPage = readFileSync(
  resolve(appRoot, "app/[locale]/admin/create-rep/page.tsx"),
  "utf8",
);

describe("Sales administrator UI contracts", () => {
  it("renders typed accessible cohort reporting without unsafe casts", () => {
    expect(cohortPage).toContain("cohortOverview.useQuery()");
    expect(cohortPage).toContain('scope="col"');
    expect(cohortPage).toContain('scope="row"');
    expect(cohortPage).toContain("roleplayAttemptCount");
    expect(cohortPage).toContain("modulesCompleted");
    expect(cohortPage).not.toContain("as unknown as");
  });

  it("hands identity provisioning to Accounts without a local credential form", () => {
    expect(createPage).toContain("https://accounts.reading-advantage.com");
    expect(createPage).toContain('searchParams.set("application", "sales")');
    expect(createPage).toContain('searchParams.set("role", "SALES_REP")');
    expect(createPage).not.toContain("useMutation");
    expect(createPage).not.toContain('type="password"');
  });

  it("routes cohort and provisioning copy through the active locale", () => {
    for (const source of [cohortPage, createPage]) {
      expect(source).toContain('useTranslations("admin")');
      expect(source).not.toContain("toLocaleDateString");
    }
    expect(cohortPage).toContain("new Intl.DateTimeFormat(locale)");
    expect(createPage).not.toContain('placeholder="Display name"');
  });
});
