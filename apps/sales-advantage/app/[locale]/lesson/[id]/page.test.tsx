import { act, fireEvent, render, screen } from "@testing-library/react";
import { Suspense } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LessonPage from "./page";

const lessonState = vi.hoisted(() => ({
  data: undefined as unknown,
  isLoading: false,
  error: null as unknown,
  invalidate: vi.fn(),
  mutate: vi.fn(),
  onSuccess: null as (() => void) | null,
  onError: null as (() => void) | null,
  isPending: false,
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({
      sales: {
        lesson: { invalidate: lessonState.invalidate },
        dashboard: { invalidate: lessonState.invalidate },
      },
    }),
    sales: {
      lesson: {
        useQuery: () => ({
          data: lessonState.data,
          isLoading: lessonState.isLoading,
          error: lessonState.error,
        }),
      },
      markTheoryLessonComplete: {
        useMutation: (options: {
          onSuccess: typeof lessonState.onSuccess;
          onError: typeof lessonState.onError;
        }) => {
          lessonState.onSuccess = options.onSuccess;
          lessonState.onError = options.onError;
          return { mutate: lessonState.mutate, isPending: lessonState.isPending };
        },
      },
    },
  },
}));

vi.mock("@/components/lesson-content", () => ({
  LessonContent: ({ content }: { content: string }) => <div>{content}</div>,
}));

vi.mock("@/components/chat-tutor", () => ({
  ChatTutor: () => <div />,
}));

describe("LessonPage markComplete mutation", () => {
  beforeEach(() => {
    lessonState.data = {
      id: "lesson-1",
      title: "Opening questions",
      type: "theory",
      content: "Theory body",
      moduleSlug: "prospecting",
      moduleId: "module-1",
      completed: false,
    };
    lessonState.isLoading = false;
    lessonState.error = null;
    lessonState.onSuccess = null;
    lessonState.onError = null;
    lessonState.isPending = false;
  });

  it("renders an alert when marking the lesson complete fails", async () => {
    await act(async () => {
      render(
        <Suspense fallback={null}>
          <LessonPage params={Promise.resolve({ id: "lesson-1" })} />
        </Suspense>,
      );
    });

    const button = (await screen.findByRole("button", {
      name: "markComplete",
    })) as HTMLButtonElement;
    expect(screen.queryByRole("alert")).toBeNull();

    fireEvent.click(button);
    expect(lessonState.mutate).toHaveBeenCalledWith({ lessonId: "lesson-1" });

    act(() => {
      lessonState.onError?.();
    });

    expect(screen.getByRole("alert").textContent).toContain("completeFailed");
    expect(button.disabled).toBe(false);
  });

  it("disables the completion button while the mutation is pending", async () => {
    lessonState.isPending = true;

    await act(async () => {
      render(
        <Suspense fallback={null}>
          <LessonPage params={Promise.resolve({ id: "lesson-1" })} />
        </Suspense>,
      );
    });

    const button = (await screen.findByRole("button", {
      name: "markComplete",
    })) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });
});
