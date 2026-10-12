// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href, ...rest }: { children?: ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { PrintLessonFrame } from "../print-lesson-frame";

const labels = { frameTitle: "Print preview", printNow: "Print", loading: "Loading the pictures...", bubbleWait: "Hold on...", bubbleReady: "Ready!", hint: "Choose A4 paper.", back: "Back to the lesson" };
const html = "<!DOCTYPE html><html><body><p>Lesson</p></body></html>";

afterEach(cleanup);

describe("PrintLessonFrame", () => {
  it("puts the document in a sandboxed srcDoc frame with scripts and no same-origin", () => {
    render(<PrintLessonFrame html={html} labels={labels} backHref="/back" />);
    const frame = screen.getByTitle("Print preview");
    expect(frame).toHaveAttribute("srcdoc", html);
    const sandbox = frame.getAttribute("sandbox") ?? "";
    expect(sandbox.split(" ").sort()).toEqual(["allow-modals", "allow-scripts"]);
    expect(frame).not.toHaveAttribute("src");
  });

  it("keeps Print disabled until the frame loads, then enables it", () => {
    render(<PrintLessonFrame html={html} labels={labels} backHref="/back" />);
    const loading = screen.getByRole("button", { name: labels.loading });
    expect(loading).toBeDisabled();
    expect(screen.getByText(labels.bubbleWait)).toBeInTheDocument();
    fireEvent.load(screen.getByTitle("Print preview"));
    expect(screen.getByRole("button", { name: labels.printNow })).toBeEnabled();
    expect(screen.getByText(labels.bubbleReady)).toBeInTheDocument();
  });

  it("posts the workbook:print message to the frame on click", () => {
    render(<PrintLessonFrame html={html} labels={labels} backHref="/back" />);
    const frame = screen.getByTitle("Print preview") as HTMLIFrameElement;
    const post = vi.fn();
    Object.defineProperty(frame, "contentWindow", { value: { postMessage: post } });
    fireEvent.load(frame);
    act(() => screen.getByRole("button", { name: labels.printNow }).click());
    expect(post).toHaveBeenCalledWith("workbook:print", "*");
  });

  it("shows the hint and the back link", () => {
    render(<PrintLessonFrame html={html} labels={labels} backHref="/back" />);
    expect(screen.getByText(labels.hint)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: labels.back })).toHaveAttribute("href", "/back");
  });
});
