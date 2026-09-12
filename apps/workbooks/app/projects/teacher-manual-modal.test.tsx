// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TeacherManualModal } from "./teacher-manual-modal";

vi.mock("../teacher-manual-actions", () => ({
  compileTeacherManualAction: vi.fn(),
}));

import { compileTeacherManualAction } from "../teacher-manual-actions";

describe("TeacherManualModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(compileTeacherManualAction).mockResolvedValue({
      ok: true,
      html: "<p>compiled manual</p>",
      lessonCount: 1,
      lang: "en",
    });
  });

  it("posts the workbook:print message to the iframe instead of calling print directly", async () => {
    render(
      <TeacherManualModal draftIds={["draft-1"]} onClose={() => {}} />,
    );
    await waitFor(() => {
      expect(screen.getByTitle("Teacher Manual")).toBeTruthy();
    });

    const iframe = screen.getByTitle("Teacher Manual") as HTMLIFrameElement;
    const contentWindow = iframe.contentWindow as Window & {
      print: ReturnType<typeof vi.fn>;
    };
    const postMessageSpy = vi.spyOn(contentWindow, "postMessage");
    const printSpy = vi.spyOn(contentWindow, "print");

    fireEvent.click(screen.getByRole("button", { name: "Print" }));

    expect(postMessageSpy).toHaveBeenCalledWith("workbook:print", "*");
    expect(printSpy).not.toHaveBeenCalled();
  });

  it("does not throw when the iframe has not loaded a content window", async () => {
    render(
      <TeacherManualModal draftIds={["draft-1"]} onClose={() => {}} />,
    );
    await waitFor(() => {
      expect(screen.getByTitle("Teacher Manual")).toBeTruthy();
    });

    const iframe = screen.getByTitle("Teacher Manual") as HTMLIFrameElement;
    vi.spyOn(iframe, "contentWindow", "get").mockReturnValue(null);

    expect(() =>
      fireEvent.click(screen.getByRole("button", { name: "Print" })),
    ).not.toThrow();
  });
});
