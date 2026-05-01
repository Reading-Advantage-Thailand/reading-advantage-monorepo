import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { BlogPagination } from "@/components/blog/blog-pagination";

describe("BlogPagination", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders pagination nav", () => {
    render(<BlogPagination currentPage={1} totalPages={3} />);
    expect(
      screen.getByRole("navigation", { name: "Pagination" }),
    ).toBeDefined();
  });

  it("renders previous and next links", () => {
    render(<BlogPagination currentPage={2} totalPages={5} />);
    expect(screen.getByText("components.pagination.previous")).toBeDefined();
    expect(screen.getByText("components.pagination.next")).toBeDefined();
  });

  it("shows ellipsis when pages exceed 5", () => {
    render(<BlogPagination currentPage={5} totalPages={10} />);
    expect(screen.getAllByText("...").length).toBeGreaterThan(0);
  });

  it("does not render when totalPages is 1 or less", () => {
    render(<BlogPagination currentPage={1} totalPages={1} />);
    expect(screen.queryByRole("navigation")).toBeNull();
  });
});
