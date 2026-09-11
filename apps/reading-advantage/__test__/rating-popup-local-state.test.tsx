/**
 * FR-8 behavioral test: the merged rating popup updates its average rating
 * locally after a successful submit and never refetches the article.
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import RatingPopup from "@/components/rating-popup";

const submitRatingMock = jest.fn();

jest.mock("@/actions/rating", () => ({
  submitRating: (...args: unknown[]) => submitRatingMock(...args),
}));

jest.mock("@/locales/client", () => ({
  useScopedI18n: () => (key: string) => key,
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
}));

jest.mock("@mui/material", () => ({
  Rating: ({ value, onChange, readOnly }: {
    value: number | null;
    onChange?: (_event: unknown, value: number) => void;
    readOnly?: boolean;
  }) => (
    <button
      data-testid={readOnly ? "average-rating" : "rating-input"}
      data-value={value}
      onClick={() => onChange?.(null, 4)}
    />
  ),
  Stack: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock("@/components/ui/use-toast", () => ({
  toast: jest.fn(),
}));

const ARTICLE = {
  title: "Article One",
  ra_level: "1",
  cefr_level: "A1",
} as never;

describe("RatingPopup article target", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (globalThis.fetch as jest.Mock) = jest.fn();
    submitRatingMock.mockResolvedValue({ success: true, xpEarned: 10, averageRating: 4.5 });
  });

  it("updates the average locally without refetching the article", async () => {
    const user = userEvent.setup();
    render(
      <RatingPopup
        userId="user-1"
        averageRating={3.5}
        initialRating={0}
        target={{ articleId: "article-1", article: ARTICLE }}
      />
    );

    expect(screen.getByTestId("average-rating")).toHaveAttribute("data-value", "3.5");

    await user.click(screen.getByText("Rate this article"));
    await user.click(screen.getByTestId("rating-input"));
    await user.click(screen.getByRole("button", { name: "submitButton" }));

    await waitFor(() =>
      expect(submitRatingMock).toHaveBeenCalledWith("user-1", "article-1", 4, ARTICLE)
    );

    await waitFor(() =>
      expect(screen.getByTestId("average-rating")).toHaveAttribute("data-value", "4.5")
    );

    const articleRefetches = (globalThis.fetch as jest.Mock).mock.calls.filter(
      ([url]: [string]) => typeof url === "string" && url.includes("/api/v1/articles/")
    );
    expect(articleRefetches).toEqual([]);
  });
});
