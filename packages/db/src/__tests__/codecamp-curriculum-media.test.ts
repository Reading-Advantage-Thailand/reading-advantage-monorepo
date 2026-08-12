import { describe, expect, it } from "vitest";
import {
  getPhaseACurriculumData,
  getPhaseBCurriculumData,
  getPhaseCCurriculumData,
  getPhaseDCurriculumData,
  type CurriculumModule,
} from "../seed/codecamp-curriculum-data.js";

type CurriculumSection = {
  moduleSlug: string;
  lessonTitle: string;
  heading?: string;
  youtubeId?: string;
  youtubeSource?: string;
};

function getAllModules(): CurriculumModule[] {
  return [
    ...getPhaseACurriculumData().modules,
    ...getPhaseBCurriculumData().modules,
    ...getPhaseCCurriculumData().modules,
    ...getPhaseDCurriculumData().modules,
  ];
}

function getMediaSections(modules: CurriculumModule[]): CurriculumSection[] {
  return modules.flatMap((module) =>
    module.lessons.flatMap((lesson) => {
      const sections = lesson.contentJson.sections;
      return Array.isArray(sections)
        ? (sections as Array<Omit<CurriculumSection, "moduleSlug" | "lessonTitle">>)
            .filter((section) => section.youtubeId)
            .map((section) => ({
              ...section,
              moduleSlug: module.slug,
              lessonTitle: lesson.title,
            }))
        : [];
    }),
  );
}

describe("codecamp curated curriculum videos", () => {
  const sections = getMediaSections(getAllModules());
  const youtubeIds = sections.flatMap(({ youtubeId }) =>
    youtubeId ? [youtubeId] : [],
  );

  it("keeps every embedded video ID in YouTube's 11-character format", () => {
    expect(youtubeIds.length).toBe(10);
    expect(youtubeIds.every((youtubeId) => /^[A-Za-z0-9_-]{11}$/.test(youtubeId))).toBe(
      true,
    );
    expect(new Set(youtubeIds).size).toBe(youtubeIds.length);
  });

  it("requires provenance for every embedded video", () => {
    expect(sections.every((section) => section.youtubeSource)).toBe(true);
    expect(new Set(sections.map((section) => section.youtubeSource))).toEqual(
      new Set([
        "Legacy curated source (not independently verified)",
        "Dave Gray",
        "Fireship",
        "Jack Herrington",
        "Web Dev Simplified",
      ]),
    );
  });

  it("pins the independently curated concept-to-video mappings", () => {
    const sectionByKey = new Map(
      sections.map((section) => [
        `${section.moduleSlug}:${section.lessonTitle}:${section.heading}`,
        section,
      ]),
    );

    const expectedMappings = [
      {
        key: "javascript:Functions and Scope:Scope and Closures",
        youtubeId: "3a0I8ICR1Vg",
        youtubeSource: "Web Dev Simplified",
      },
      {
        key: "nextjs-basics:Dynamic Routes and Navigation:Dynamic Route Segments",
        youtubeId: "Sklc_fQBmcs",
        youtubeSource: "Fireship",
      },
      {
        key: "nextjs-basics:Data Fetching in Server Components:Server-Side Data Fetching",
        youtubeId: "843nec-IvW0",
        youtubeSource: "Dave Gray",
      },
      {
        key: "nextjs-basics:Server Components vs Client Components:Client Components",
        youtubeId: "3Q2q2gs0nAI",
        youtubeSource: "Jack Herrington",
      },
      {
        key: "cloud-docker:Docker Basics:Docker Concepts",
        youtubeId: "Gjnup-PuquQ",
        youtubeSource: "Fireship",
      },
    ];

    expectedMappings.forEach(({ key, youtubeId, youtubeSource }) => {
      expect(sectionByKey.get(key)).toMatchObject({ youtubeId, youtubeSource });
    });
  });
});
