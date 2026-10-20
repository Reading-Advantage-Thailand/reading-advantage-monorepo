// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { renderWithMessages, testMessages } from "@/components/__tests__/helpers/render-with-messages";

vi.mock("@/actions/class-books", () => ({ assignClassBookAction: vi.fn() }));
vi.mock("@/i18n/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

import { AssignBookForm } from "../assign-book-form";

afterEach(cleanup);

describe("AssignBookForm with an empty catalogue (S3)", () => {
  it("shows both sentences and no form", () => {
    renderWithMessages(<AssignBookForm classroomId="c1" catalogue={[]} />);
    const en = testMessages.en.TeacherUi.classBook;
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText(en.emptyCatalogueTitle)).toBeInTheDocument();
    expect(screen.getByText(en.emptyCatalogueBody)).toBeInTheDocument();
    expect(screen.queryByRole("form")).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("shows the Thai sentences", () => {
    renderWithMessages(<AssignBookForm classroomId="c1" catalogue={[]} />, { locale: "th" });
    expect(screen.getByText(testMessages.th.TeacherUi.classBook.emptyCatalogueBody)).toBeInTheDocument();
  });
});
