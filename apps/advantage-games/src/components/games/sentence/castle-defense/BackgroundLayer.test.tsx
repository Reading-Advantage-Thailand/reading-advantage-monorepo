import { render, screen } from "@testing-library/react";
import { BackgroundLayer } from "./BackgroundLayer";
import React from "react";

// Mock Image to load synchronously
class MockImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  src = "";
  width = 64;
  height = 64;
  constructor() {
    Promise.resolve().then(() => {
      if (this.onload) this.onload();
    });
  }
}
Object.defineProperty(global, "Image", {
  value: MockImage,
  writable: true,
});

jest.mock("react-konva", () => ({
  Group: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="konva-group">{children}</div>
  ),
  Image: (props: React.HTMLAttributes<HTMLDivElement>) => (
    <div data-testid="konva-image" {...props} />
  ),
}));

const mockGrassMap = [
  [0, 1, 2, 3],
  [1, 2, 3, 0],
];

const mockPath = [
  { x: 75, y: 75 },
  { x: 75, y: 525 },
];

describe("BackgroundLayer", () => {
  it("renders without crashing", () => {
    render(
      <BackgroundLayer grassMap={mockGrassMap} path={mockPath} />,
    );
    expect(screen.getByTestId("konva-group")).toBeInTheDocument();
  });

  it("renders grass tiles after images load", async () => {
    render(
      <BackgroundLayer grassMap={mockGrassMap} path={mockPath} />,
    );
    // After images load, there should be konva-image elements
    const images = await screen.findAllByTestId("konva-image");
    expect(images.length).toBeGreaterThan(0);
  });

  it("handles empty grass map", () => {
    render(
      <BackgroundLayer grassMap={[]} path={mockPath} />,
    );
    expect(screen.getByTestId("konva-group")).toBeInTheDocument();
  });

  it("handles path with no road tiles", () => {
    render(
      <BackgroundLayer grassMap={mockGrassMap} path={[]} />,
    );
    expect(screen.getByTestId("konva-group")).toBeInTheDocument();
  });
});
