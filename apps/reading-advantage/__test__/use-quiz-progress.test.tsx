/**
 * FR-2 characterization tests for the `useQuizProgress` hook.
 *
 * The hook owns every quiz sessionStorage read and write. Cards pass a
 * storage key; the hook namespaces `quiz_progress_<key>` and
 * `quiz_started_<key>` underneath it.
 */

import { renderHook, act } from "@testing-library/react";
import { useQuizProgress } from "@/lib/use-quiz-progress";

describe("useQuizProgress", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("reads the started flag written under the given key", () => {
    sessionStorage.setItem("quiz_started_article-1", "true");

    const { result } = renderHook(() => useQuizProgress("article-1"));

    expect(result.current.hasStarted).toBe(true);
  });

  it("starts with hasStarted false when nothing is stored", () => {
    const { result } = renderHook(() => useQuizProgress("article-1"));

    expect(result.current.hasStarted).toBe(false);
  });

  it("scopes reads and writes to the given key", () => {
    const article = renderHook(() => useQuizProgress("article-1"));
    const story = renderHook(() => useQuizProgress("story-1_2"));

    act(() => article.result.current.markStarted());
    act(() => story.result.current.markStarted());

    expect(sessionStorage.getItem("quiz_started_article-1")).toBe("true");
    expect(sessionStorage.getItem("quiz_started_story-1_2")).toBe("true");
    expect(article.result.current.hasStarted).toBe(true);
    expect(story.result.current.hasStarted).toBe(true);
  });

  it("persists progress JSON under quiz_progress_<key>", () => {
    const { result } = renderHook(() => useQuizProgress("story-1_2"));

    act(() => result.current.saveProgress([0, 1, 2, 2, 2]));

    expect(sessionStorage.getItem("quiz_progress_story-1_2")).toBe(
      JSON.stringify([0, 1, 2, 2, 2]),
    );
  });

  it("returns saved progress for the given key", () => {
    sessionStorage.setItem("quiz_progress_article-1", JSON.stringify([0, 0, 2, 2, 2]));

    const { result } = renderHook(() => useQuizProgress("article-1"));

    expect(result.current.loadProgress()).toEqual([0, 0, 2, 2, 2]);
  });

  it("returns null when no progress is saved", () => {
    const { result } = renderHook(() => useQuizProgress("article-1"));

    expect(result.current.loadProgress()).toBeNull();
  });

  it("clears both keys and resets hasStarted", () => {
    sessionStorage.setItem("quiz_started_article-1", "true");
    sessionStorage.setItem("quiz_progress_article-1", JSON.stringify([0, 0, 2, 2, 2]));

    const { result } = renderHook(() => useQuizProgress("article-1"));

    act(() => result.current.markStarted());
    act(() => result.current.clear());

    expect(sessionStorage.getItem("quiz_started_article-1")).toBeNull();
    expect(sessionStorage.getItem("quiz_progress_article-1")).toBeNull();
    expect(result.current.hasStarted).toBe(false);
  });
});
