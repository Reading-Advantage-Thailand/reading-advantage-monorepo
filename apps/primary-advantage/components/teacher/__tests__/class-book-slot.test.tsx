// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { TeacherBookSlot } from "@reading-advantage/domain/primary-books";

import { renderWithMessages, testMessages } from "@/components/__tests__/helpers/render-with-messages";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href, ...rest }: { children?: ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { ClassBookSlot } from "../class-book-slot";

afterEach(cleanup);

const book = (over: Partial<TeacherBookSlot> = {}): TeacherBookSlot => ({
  classroomId: "c1",
  classroomName: "P3A",
  classBookId: "cb1",
  bookName: "Origins 3.2",
  currentLesson: 3,
  lessonCount: 14,
  lessonTitle: "A Day at the Sea Park",
  nextStep: 5,
  nextStepPeriod: 2,
  ...over,
});
const noBook: TeacherBookSlot = { classroomId: "c2", classroomName: "P4B", classBookId: null, bookName: null, currentLesson: null, lessonCount: null, lessonTitle: null, nextStep: null, nextStepPeriod: null };
const en = testMessages.en.TeacherUi.classBook;

describe("ClassBookSlot", () => {
  it("shows one row link for each class book with the lesson, the title, and the next step", () => {
    renderWithMessages(<ClassBookSlot slots={[book(), book({ classBookId: "cb2", bookName: "Quest 4", currentLesson: 1, lessonTitle: null })]} />);
    const region = screen.getByRole("region", { name: en.slotTitle });
    expect(region).toHaveAttribute("data-class-book-slot", "all");
    const rows = within(region).getAllByRole("link");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveAttribute("href", "/teacher/class-roster/c1/books/cb1/lessons/3");
    expect(rows[0]).toHaveTextContent("P3A");
    expect(rows[0]).toHaveTextContent("Origins 3.2 · Lesson 3 of 14");
    expect(rows[0]).toHaveTextContent("A Day at the Sea Park");
    expect(rows[0]).toHaveTextContent("Period 2");
    expect(rows[1]).toHaveAttribute("href", "/teacher/class-roster/c1/books/cb2/lessons/1");
  });

  it("shows the Assign a book row for a class with no book", () => {
    renderWithMessages(<ClassBookSlot slots={[book(), noBook]} />);
    const row = screen.getByRole("link", { name: new RegExp(en.assignRow) });
    expect(row).toHaveAttribute("href", "/teacher/class-roster/c2#class-book");
    expect(row).toHaveTextContent("P4B");
  });

  it("says when all 13 steps are done", () => {
    renderWithMessages(<ClassBookSlot slots={[book({ nextStep: null, nextStepPeriod: null })]} />);
    expect(screen.getByRole("link")).toHaveTextContent(en.allStepsDone);
  });

  it("shows the empty slot with a link to the classes", () => {
    renderWithMessages(<ClassBookSlot slots={[noBook]} />);
    expect(screen.getByText(en.slotEmpty)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: en.goToClasses })).toHaveAttribute("href", "/teacher/my-classes");
  });

  it("shows the empty text and the classes link when no class has a book", () => {
    renderWithMessages(<ClassBookSlot slots={[noBook, { ...noBook, classroomId: "c3", classroomName: "P5C" }]} />);
    expect(screen.getByText(en.slotEmpty)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: en.goToClasses })).toHaveAttribute("href", "/teacher/my-classes");
    expect(screen.queryByText(en.assignRow)).not.toBeInTheDocument();
  });

  it("says that a teacher with no class has no class", () => {
    renderWithMessages(<ClassBookSlot slots={[]} />);
    expect(screen.getByText(en.slotNoClass)).toBeInTheDocument();
    expect(screen.queryByText(en.slotEmpty)).not.toBeInTheDocument();
  });

  it("shows the load error as an alert", () => {
    renderWithMessages(<ClassBookSlot failed />);
    expect(screen.getByRole("alert")).toHaveTextContent(en.slotError);
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("keeps the placeholder when it gets no slots (class page without a session user)", () => {
    renderWithMessages(<ClassBookSlot classroomId="c1" />);
    expect(screen.getByRole("region", { name: en.title })).toHaveAttribute("data-class-book-slot", "c1");
    expect(screen.getByText(en.hint)).toBeInTheDocument();
  });

  it("shows the Thai labels", () => {
    renderWithMessages(<ClassBookSlot slots={[book(), noBook]} />, { locale: "th" });
    expect(screen.getByText(testMessages.th.TeacherUi.classBook.assignRow)).toBeInTheDocument();
  });
});
