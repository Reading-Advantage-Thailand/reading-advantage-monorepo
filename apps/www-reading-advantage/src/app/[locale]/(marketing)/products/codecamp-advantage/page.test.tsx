import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import CodeCampAdvantage from "@/app/[locale]/(marketing)/products/codecamp-advantage/page";
import * as codecampPageLocales from "@/locales/pages/products/codecamp-advantage";
import * as b2cLocales from "@/locales/components/products/b2c-solutions";
import * as b2bLocales from "@/locales/components/products/b2b-solutions";

afterEach(cleanup);

describe("CodeCampAdvantage", () => {
  it("links the hero directly to the live Codecamp application", async () => {
    const jsx = await CodeCampAdvantage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByTestId("codecamp-live-cta")).toHaveAttribute(
      "href",
      "https://codecamp.reading-advantage.com/en",
    );
  });

  it("renders production proof, curriculum, mastery, tutor, and guarded review sections", async () => {
    const jsx = await CodeCampAdvantage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getAllByTestId("proof-point")).toHaveLength(3);
    expect(screen.getByTestId("codecamp-curriculum")).toBeInTheDocument();
    expect(screen.getByTestId("measure-module")).toBeInTheDocument();
    expect(screen.getByTestId("apk-unit")).toBeInTheDocument();
    expect(screen.getByTestId("mastery-evidence")).toBeInTheDocument();
    expect(screen.getByTestId("targeted-tutor")).toBeInTheDocument();
    expect(screen.getByTestId("advisory-pr-review")).toBeInTheDocument();
  });

  it("keeps the real production denominators and guarded AI semantics in every locale", () => {
    for (const locale of Object.values(codecampPageLocales)) {
      const page = locale as unknown as {
        hero: {
          stats: {
            phases: { value: string };
            modules: { value: string };
            lessons: { value: string };
          };
        };
        curriculum: { phases: { D: { modules: string[] } } };
        evidence: { prReview: { guardrail: string } };
      };
      expect(page.hero.stats.phases.value).toBe("4");
      expect(page.hero.stats.modules.value).toBe("20");
      expect(page.hero.stats.lessons.value).toBe("106");
      expect(page.curriculum.phases.D.modules).toHaveLength(7);
      expect(page.evidence.prReview.guardrail.length).toBeGreaterThan(20);
    }

    const english = JSON.stringify(codecampPageLocales.en);
    expect(english).toMatch(/Measure-Driven AI Development/);
    expect(english).toMatch(/Advantage Play Kit Game Creation/);
    expect(english).toMatch(/advisory/i);
    expect(english).toMatch(/does not approve/i);
  });

  it("removes obsolete pre-launch and multi-stack claims from all Codecamp marketing copy", () => {
    const allCopy = JSON.stringify({
      codecampPageLocales,
      b2cLocales,
      b2bCodecamp: {
        en: b2bLocales.en.products.codecampAdvantage,
        th: b2bLocales.th.products.codecampAdvantage,
        zh: b2bLocales.zh.products.codecampAdvantage,
      },
    });
    expect(allCopy).not.toMatch(/Coming Soon|Coming 2027|18-module|15-week/i);
    expect(allCopy).not.toMatch(
      /เตรียมเปิดตัวปี 2027|15 สัปดาห์|2027 年上线|15 周/,
    );
    expect(allCopy).not.toMatch(/Laravel|Django|Ruby on Rails|FastAPI/);
    expect(allCopy).not.toMatch(/automated pass\/fail|ผ่าน\/ไม่ผ่านพร้อม/);
  });
});
