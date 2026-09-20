import { render, screen } from "@testing-library/react";
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
          }) => {
            mockState.onSuccess = options.onSuccess;
            return { mutate: mockState.mutate, isPending: false };
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
