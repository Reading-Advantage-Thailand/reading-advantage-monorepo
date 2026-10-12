// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { renderWithMessages, testMessages } from "../../__tests__/helpers/render-with-messages";
import { PreviewNotice } from "../preview-notice";

afterEach(cleanup);

describe("PreviewNotice", () => {
  it("shows a status notice with the title and one line of copy", () => {
    renderWithMessages(<PreviewNotice titleKey="emptyTitle" lineKey="emptyHistory" />);
    const copy = testMessages.en.StudentView;
    const notice = screen.getByRole("status");
    expect(notice).toHaveAttribute("data-preview-notice");
    expect(notice).toHaveTextContent(copy.emptyTitle);
    expect(notice).toHaveTextContent(copy.emptyHistory);
  });
});
