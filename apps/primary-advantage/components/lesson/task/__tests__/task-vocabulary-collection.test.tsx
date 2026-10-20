// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { renderWithMessages, testMessages } from "@/components/__tests__/helpers/render-with-messages";
import TaskVocabularyCollection from "../task-vocabulary-collection";
import type { Article } from "@/types";

afterEach(cleanup);

describe("TaskVocabularyCollection", () => {
  it("names step 4 as the step rail does, not with the title of step 2", () => {
    renderWithMessages(<TaskVocabularyCollection article={{ id: "a1" } as unknown as Article} />, { locale: "en" });
    const copy = testMessages.en.Lesson;
    expect(screen.getByRole("heading", { name: copy.tasks.vocabularyCollection })).toBeInTheDocument();
    expect(screen.queryByText(copy.PreviewVocabulary.title)).not.toBeInTheDocument();
  });
});
