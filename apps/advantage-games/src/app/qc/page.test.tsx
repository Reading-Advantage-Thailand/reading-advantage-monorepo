import { render, screen } from "@testing-library/react";
import { webcrypto } from "node:crypto";
import { TextEncoder } from "node:util";

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
    Object.defineProperty(globalThis, "crypto", { configurable: true, value: webcrypto });
    Object.defineProperty(globalThis, "TextEncoder", { configurable: true, value: TextEncoder });
    jest.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(canvasContext as unknown as CanvasRenderingContext2D);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });
  it("renders the generated pinned preview route and every quarantined QC cohort", async () => {
    render(await StandardPackQcPage());

    expect(screen.getByRole("heading", { name: /standard pack preview/i })).toBeInTheDocument();
    expect(screen.getAllByText(/pixel art assets by elvgames/i).length).toBeGreaterThan(0);
    expect(await screen.findByRole("img", { name: "Dragon Flight QC canvas" })).toBeInTheDocument();
    expect(await screen.findByRole("img", { name: "Dragon Rider traversal QC canvas" })).toBeInTheDocument();
    expect(await screen.findByRole("img", { name: "Enchanted Library puzzle QC canvas" })).toBeInTheDocument();
  }, 30_000);
});
