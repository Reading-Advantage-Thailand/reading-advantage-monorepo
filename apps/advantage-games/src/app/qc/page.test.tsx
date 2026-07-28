import { render, screen } from "@testing-library/react";

import StandardPackQcPage from "./page";

const canvasContext = {
  clearRect: jest.fn(),
  fillRect: jest.fn(),
  fillText: jest.fn(),
  strokeRect: jest.fn(),
  beginPath: jest.fn(),
  arc: jest.fn(),
  fill: jest.fn(),
};

describe("StandardPackQcPage", () => {
  beforeEach(() => {
    jest.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(canvasContext as unknown as CanvasRenderingContext2D);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });
  it("renders the generated pinned preview route", async () => {
    render(<StandardPackQcPage />);

    expect(screen.getByRole("heading", { name: /standard pack preview/i })).toBeInTheDocument();
    expect(screen.getAllByText(/pixel art assets by elvgames/i).length).toBeGreaterThan(0);
    expect(await screen.findByRole("img", { name: "Dragon Flight QC canvas" })).toBeInTheDocument();
  });
});
