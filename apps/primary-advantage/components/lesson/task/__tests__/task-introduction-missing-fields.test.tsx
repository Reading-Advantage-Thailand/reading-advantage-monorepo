// @vitest-environment jsdom
/**
 * Behavioral test: lesson/article views render when nullable article columns
 * (passage, sentences) are null.
 */
import "@testing-library/jest-dom/vitest";
import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/actions/article", () => ({ fetchArticleActivity: vi.fn(async () => undefined) }));
vi.mock("@/actions/flashcard", () => ({ saveFlashcard: vi.fn() }));
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

import TaskIntroduction from "../task-introduction";
import { TaskReading } from "../task-reading";
import ArticleContent from "@/components/articles/article-content";
import { renderWithMessages } from "../../../__tests__/helpers/render-with-messages";

vi.stubGlobal(
  "IntersectionObserver",
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

const base = {
  id: "a-1",
  title: "Missing Fields Story",
  summary: "",
  translatedSummary: null,
  translatedPassage: null,
  imageDescription: "",
  createdAt: new Date(0),
  rating: 1,
  type: "story",
  cefrLevel: "A1",
  raLevel: 1,
  genre: "fiction",
  audioUrl: "",
  sentences: null,
  passage: null,
};

describe("article views with null passage", () => {
  it("TaskIntroduction renders", () => {
    renderWithMessages(
      <TaskIntroduction article={base as never} onCompleteChange={() => {}} />,
    );
    expect(screen.getAllByText("Missing Fields Story").length).toBeGreaterThan(0);
  });
  it("TaskIntroduction shows the read time with its unit and no empty colons (captures 2026-10-20)", () => {
    renderWithMessages(
      <TaskIntroduction article={{ ...base, passage: Array.from({ length: 170 }, () => "word").join(" ") } as never} onCompleteChange={() => {}} />,
      { locale: "th" },
    );
    expect(screen.getByText("เวลาอ่านโดยประมาณ: 9 นาที")).toBeInTheDocument();
    expect(screen.getByText("ทำความเข้าใจแนวคิดหลัก")).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/\s:\s*$|:\s*(?=เรียนรู้|พัฒนา)/m);
  });
  it("TaskReading renders", () => {
    renderWithMessages(
      <TaskReading article={base as never} enableTranslation={false} />,
    );
    expect(document.querySelector("audio")).toBeInTheDocument();
  });
  it("ArticleContent renders", () => {
    renderWithMessages(<ArticleContent article={base as never} />);
    expect(document.querySelector("audio")).toBeInTheDocument();
  });
});
