import { render, screen } from "@testing-library/react";

import StandardPackQcPage from "./page";

describe("StandardPackQcPage", () => {
  it("renders the generated pinned preview route", () => {
    render(<StandardPackQcPage />);

    expect(screen.getByRole("heading", { name: /standard pack preview/i })).toBeInTheDocument();
    expect(screen.getByText(/pixel art assets by elvgames/i)).toBeInTheDocument();
  });
});
