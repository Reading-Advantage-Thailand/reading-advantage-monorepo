// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BucketImage } from "../bucket-image";

const URL = "https://storage.googleapis.com/bucket/article/1.png";

describe("BucketImage", () => {
  it("loads the picture through the resizer, and the original file after a resizer error (run 2 C1)", () => {
    render(<BucketImage src={URL} alt="Article Image" width={640} height={640} />);
    const img = screen.getByRole("img", { name: "Article Image" });
    expect(img.getAttribute("src")).toContain("/_next/image?");
    fireEvent.error(img);
    expect(screen.getByRole("img", { name: "Article Image" })).toHaveAttribute("src", URL);
  });
});
