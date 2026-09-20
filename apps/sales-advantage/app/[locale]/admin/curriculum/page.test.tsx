import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import CurriculumPage from "./page";

const mockState = vi.hoisted(() => ({
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
  Link: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({
      sales: { admin: { curriculum: { invalidate: mockState.invalidate } } },
    }),
    sales: {
      admin: {
        curriculum: {
          useQuery: () => ({
            data: mockState.data,
            isLoading: mockState.isLoading,
            error: mockState.error,
          }),
        },
        approveContent: {
          useMutation: (options: {
            onSuccess: typeof mockState.onSuccess;
            onError: typeof mockState.onError;
          }) => {
            mockState.onSuccess = options.onSuccess;
            mockState.onError = options.onError;
            return { mutate: mockState.mutate, isPending: mockState.isPending };
          },
        },
      },
    },
  },
}));

describe("CurriculumPage loading states", () => {
  beforeEach(() => {
    mockState.data = undefined;
    mockState.isLoading = false;
    mockState.error = null;
    mockState.onSuccess = null;
    mockState.onError = null;
    mockState.isPending = false;
  });

  it("renders an alert instead of content when the curriculum query fails", () => {
    mockState.error = { data: { code: "INTERNAL_SERVER_ERROR" } };

    render(<CurriculumPage />);

    expect(screen.getByRole("alert").textContent).toContain(
      "reportingUnavailable",
    );
    expect(screen.queryByText("rubrics")).toBeNull();
  });

  it("renders skeleton placeholders while the curriculum loads", () => {
    mockState.isLoading = true;
    const { container } = render(<CurriculumPage />);

    expect(screen.queryByRole("alert")).toBeNull();
    expect(
      container.querySelectorAll(".animate-pulse").length,
    ).toBeGreaterThan(0);
    expect(screen.queryByText("rubrics")).toBeNull();
  });

  it("renders the curriculum content once the query resolves", () => {
    mockState.data = {
      modules: [
        {
          id: "module-1",
          title: "Prospecting",
          phase: "phase-1",
          lessons: [
            {
              id: "lesson-1",
              title: "Cold calls",
              type: "theory",
              reviewStatus: "draft",
            },
          ],
        },
      ],
      rubrics: [],
    };

    render(<CurriculumPage />);

    expect(screen.getByText("Prospecting")).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByText("rubrics")).toBeTruthy();
  });
});

describe("CurriculumPage approve mutation", () => {
  const approvedCurriculum = {
    modules: [
      {
        id: "module-1",
        title: "Prospecting",
        phase: "phase-1",
        lessons: [
          {
            id: "lesson-1",
            title: "Cold calls",
            type: "theory",
            reviewStatus: "draft",
          },
        ],
      },
    ],
    rubrics: [{ id: "rubric-1", name: "Rubric", reviewStatus: "reviewed" }],
  };

  beforeEach(() => {
    mockState.data = approvedCurriculum;
    mockState.isLoading = false;
    mockState.error = null;
    mockState.onSuccess = null;
    mockState.onError = null;
    mockState.isPending = false;
  });

  it("renders an alert when an approval fails", () => {
    render(<CurriculumPage />);
    expect(screen.queryByRole("alert")).toBeNull();

    act(() => {
      mockState.onError?.();
    });

    expect(screen.getByRole("alert").textContent).toContain("approveFailed");
  });

  it("disables the approve buttons while an approval is pending", () => {
    mockState.isPending = true;

    render(<CurriculumPage />);

    const approveButtons = screen.getAllByRole("button", { name: "approve" });
    expect(approveButtons.length).toBe(2);
    for (const button of approveButtons) {
      expect((button as HTMLButtonElement).disabled).toBe(true);
    }
  });

  it("clears the failure alert on a successful approval", () => {
    render(<CurriculumPage />);
    act(() => {
      mockState.onError?.();
    });
    expect(screen.getByRole("alert")).toBeTruthy();

    act(() => {
      mockState.onSuccess?.();
    });

    expect(screen.queryByRole("alert")).toBeNull();
    expect(mockState.invalidate).toHaveBeenCalled();
  });
});
