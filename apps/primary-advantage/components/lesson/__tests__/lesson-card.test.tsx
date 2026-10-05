// @vitest-environment jsdom
/** Lesson header (audit S3): the article title as the heading; a missing lesson is an empty state. */
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { createTranslator } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { testMessages } from "@/components/__tests__/helpers/render-with-messages";

const mocks = vi.hoisted(() => ({ getAssignmentById: vi.fn(), getArticleForLesson: vi.fn() }));

vi.mock("@/server/models/assignmentModel", () => ({ default: mocks.getAssignmentById }));
vi.mock("@/server/models/lessonModel", () => ({ getArticleForLesson: mocks.getArticleForLesson }));
vi.mock("../lesson-progress-bar", () => ({ default: (props: { maxUnlockedStep?: number | null }) => <div data-testid="lesson-flow" data-max-step={String(props.maxUnlockedStep)} /> }));
vi.mock("next-intl/server", async () => {
  const { testMessages: messages } = await import("@/components/__tests__/helpers/render-with-messages");
  return {
    getTranslations: async (namespace?: string) =>
      createTranslator({ locale: "en", messages: messages.en, namespace: namespace as never }),
  };
});
vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href, ...rest }: { children?: ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import LessonCard from "../lesson-card";

const en = testMessages.en;

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

describe("LessonCard", () => {
  it("uses the article title as the page heading and shows the lesson flow", async () => {
    mocks.getArticleForLesson.mockResolvedValue({ id: "a1", title: "The Moon" });
    render((await LessonCard({ source: "article", articleId: "a1" })) as React.ReactElement);
    expect(screen.getByRole("heading", { level: 1, name: "The Moon" })).toBeInTheDocument();
    expect(screen.getByTestId("lesson-flow")).toBeInTheDocument();
  });

  it("passes the workbook-first lock to the lesson flow", async () => {
    mocks.getArticleForLesson.mockResolvedValue({ id: "a1", title: "The Moon" });
    render((await LessonCard({ source: "article", articleId: "a1", maxUnlockedStep: 4 })) as React.ReactElement);
    expect(screen.getByTestId("lesson-flow")).toHaveAttribute("data-max-step", "4");
  });

  it("shows a not-found state with a way back when the lesson has no article", async () => {
    mocks.getAssignmentById.mockResolvedValue(null);
    render((await LessonCard({ source: "assignment", id: "x" })) as React.ReactElement);
    expect(screen.getByRole("heading", { level: 1, name: en.Lesson.notFound })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: en.ReadList.backToStories })).toHaveAttribute("href", "/student/read");
    expect(screen.queryByTestId("lesson-flow")).not.toBeInTheDocument();
  });
});
