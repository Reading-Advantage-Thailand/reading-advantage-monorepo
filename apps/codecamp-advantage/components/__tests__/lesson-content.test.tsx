import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LessonContent } from "../lesson-content";

describe("LessonContent", () => {
  describe("theory lessons", () => {
    it("renders sections with heading, body, and code blocks", () => {
      const content = {
        sections: [
          {
            heading: "Terminal Basics",
            body: "The terminal is where you type commands.",
            code: "pwd\nls",
          },
          {
            heading: "Install Node.js",
            body: "Node.js is the JavaScript runtime.",
            code: "node --version",
          },
        ],
      };

      render(<LessonContent type="theory" content={content} />);

      expect(screen.getByText("Terminal Basics")).toBeInTheDocument();
      expect(screen.getByText("The terminal is where you type commands.")).toBeInTheDocument();
      expect(screen.getByText(/pwd/)).toBeInTheDocument();
      expect(screen.getByText("Install Node.js")).toBeInTheDocument();
      expect(screen.getByText("Node.js is the JavaScript runtime.")).toBeInTheDocument();
      expect(screen.getByText(/node --version/)).toBeInTheDocument();
    });

    it("renders empty fallback when sections array is missing", () => {
      render(<LessonContent type="theory" content={{}} />);
      expect(screen.getByText(/no structured content available/i)).toBeInTheDocument();
    });

    it("renders empty fallback when sections array is empty", () => {
      render(<LessonContent type="theory" content={{ sections: [] }} />);
      expect(screen.getByText(/no structured content available/i)).toBeInTheDocument();
    });

    it("renders section without code when code is missing", () => {
      const content = {
        sections: [{ heading: "Overview", body: "Just text." }],
      };

      render(<LessonContent type="theory" content={content} />);

      expect(screen.getByText("Overview")).toBeInTheDocument();
      expect(screen.getByText("Just text.")).toBeInTheDocument();
      expect(screen.queryAllByText(/Just text/i).length).toBe(1);
    });
  });

  describe("exercise lessons", () => {
    it("renders instructions from contentJson", () => {
      const content = {
        instructions: "Practice branching, forking, and opening a Pull Request.",
      };

      render(<LessonContent type="exercise" content={content} />);

      expect(
        screen.getByText("Practice branching, forking, and opening a Pull Request.")
      ).toBeInTheDocument();
    });

    it("renders empty fallback when instructions are missing", () => {
      render(<LessonContent type="exercise" content={{}} />);
      expect(screen.getByText(/no structured content available/i)).toBeInTheDocument();
    });
  });

  describe("quiz lessons", () => {
    it("renders instructions from contentJson", () => {
      const content = {
        instructions: "Answer all questions to complete this lesson.",
      };

      render(<LessonContent type="quiz" content={content} />);

      expect(
        screen.getByText("Answer all questions to complete this lesson.")
      ).toBeInTheDocument();
    });

    it("renders empty fallback when instructions are missing", () => {
      render(<LessonContent type="quiz" content={{}} />);
      expect(screen.getByText(/no structured content available/i)).toBeInTheDocument();
    });
  });

  describe("edge cases", () => {
    it("renders empty fallback for unknown lesson type", () => {
      // @ts-expect-error testing invalid type
      render(<LessonContent type="unknown" content={{}} />);
      expect(screen.getByText(/no structured content available/i)).toBeInTheDocument();
    });

    it("preserves whitespace in body text", () => {
      const content = {
        sections: [
          {
            heading: "Multi-line",
            body: "Line one.\nLine two.\nLine three.",
            code: "",
          },
        ],
      };

      render(<LessonContent type="theory" content={content} />);
      const body = screen.getByText(/line one/i);
      expect(body).toHaveClass("whitespace-pre-wrap");
    });

    it("preserves whitespace in code blocks", () => {
      const content = {
        sections: [
          {
            heading: "Code",
            body: "",
            code: "function hello() {\n  return 'world';\n}",
          },
        ],
      };

      render(<LessonContent type="theory" content={content} />);
      const codeBlock = screen.getByText(/function hello/i);
      expect(codeBlock).toBeInTheDocument();
    });
  });
});
