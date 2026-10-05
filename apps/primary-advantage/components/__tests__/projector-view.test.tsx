// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { TeacherLesson } from "@reading-advantage/domain/primary-books";
import { ProjectorView } from "@/components/teacher/projector-view";
import { renderWithMessages, testMessages } from "./helpers/render-with-messages";

const en = testMessages.en.TeacherUi.classBook.lesson;
const lesson: TeacherLesson = {
  classBook: { id: "cb", classroomId: "c1", bookId: "b1", bookKey: "o3-2", bookName: "Origins 3.2", lessonCount: 14, mode: "teacher_led", startDate: null, currentLesson: 1, taughtCount: 0 },
  lesson: { number: 1, title: "Hello", key: "o3-2/1", articleId: "a1", approved: true },
  article: { title: "Hello", paragraphs: ["Para one.", "Para two.", "Para three."] },
  glossary: [{ word: "hi", pos: "exclamation", definition: "A greeting.", thai: "สวัสดี" }],
  bank: { mcq: [{ id: "m1", question: "How old is May?", options: ["five", "seven"], answer: "seven" }], saq: [{ id: "s1", question: "Name?", answer: "Tom." }], laq: [] },
  activities: null,
  summary: null,
  thaiSummary: null,
  stepsDone: [],
};

afterEach(cleanup);

describe("ProjectorView (FR-11)", () => {
  it("focuses one paragraph at a time and steps through them", () => {
    renderWithMessages(<ProjectorView lesson={lesson} showThai={false} />);
    const paragraphs = screen.getAllByRole("button", { pressed: false }).filter((button) => button.textContent?.startsWith("Para"));
    expect(paragraphs).toHaveLength(3);
    fireEvent.click(paragraphs[1]);
    expect(paragraphs[1]).toHaveAttribute("aria-pressed", "true");
    expect(paragraphs[0].className).toContain("opacity-30");
    expect(screen.getByRole("status")).toHaveTextContent("Paragraph 2 of 3");
    fireEvent.click(screen.getByRole("button", { name: en.next }));
    expect(screen.getByRole("status")).toHaveTextContent("Paragraph 3 of 3");
    fireEvent.click(screen.getByRole("button", { name: en.showAll }));
    expect(screen.getByRole("status")).toHaveTextContent(en.projectorHint);
    expect(paragraphs[0].className).not.toContain("opacity-30");
  });

  it("reveals an answer on request and shows Thai glosses only for the Thai locale", () => {
    renderWithMessages(<ProjectorView lesson={lesson} showThai={false} />);
    expect(screen.queryByText("สวัสดี")).not.toBeInTheDocument();
    const reveal = screen.getAllByRole("button", { name: en.showAnswer });
    expect(reveal).toHaveLength(2);
    expect(screen.queryByText("Tom.")).not.toBeInTheDocument();
    fireEvent.click(reveal[0]);
    expect(screen.getByText("seven").className).toContain("bg-green-100");
    fireEvent.click(reveal[1]);
    expect(screen.getByText("Tom.")).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: en.hideAnswer })[1]);
    expect(screen.queryByText("Tom.")).not.toBeInTheDocument();
    cleanup();
    renderWithMessages(<ProjectorView lesson={lesson} showThai />);
    expect(screen.getByText("สวัสดี")).toBeInTheDocument();
  });

  it("says when the lesson has no article", () => {
    renderWithMessages(<ProjectorView lesson={{ ...lesson, article: null }} showThai={false} />);
    expect(screen.getByText(en.noArticle)).toBeInTheDocument();
  });
});
