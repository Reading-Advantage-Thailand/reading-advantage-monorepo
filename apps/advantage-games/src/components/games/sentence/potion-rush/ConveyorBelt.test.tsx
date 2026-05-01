import { render, screen } from "@testing-library/react";
import ConveyorBelt from "./ConveyorBelt";
import React from "react";
import { usePotionRushStore } from "@/store/usePotionRushStore";

jest.mock("@/lib/games/basePath", () => ({
  withBasePath: (src: string) => src,
}));

class MockImage {
  _onload: (() => void) | null = null;
  src = "";
  width = 64;
  height = 64;
  set onload(fn: (() => void) | null) {
    this._onload = fn;
    if (fn) setTimeout(() => fn(), 10);
  }
  get onload() {
    return this._onload;
  }
}
Object.defineProperty(global, "Image", {
  value: MockImage,
  writable: true,
});

jest.mock("react-konva", () => ({
  Group: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="konva-group">{children}</div>
  ),
  Rect: (props: React.HTMLAttributes<HTMLDivElement>) => (
    <div data-testid="konva-rect" {...props} />
  ),
  Text: ({
    text,
    ...props
  }: { text?: string } & React.HTMLAttributes<HTMLDivElement>) => (
    <div data-testid="konva-text" {...props}>{text}</div>
  ),
  Circle: (props: React.HTMLAttributes<HTMLDivElement>) => (
    <div data-testid="konva-circle" {...props} />
  ),
  Image: (props: React.HTMLAttributes<HTMLDivElement>) => (
    <div data-testid="konva-image" {...props} />
  ),
}));

jest.mock("@/hooks/useSound", () => ({
  useSound: () => ({ playSound: jest.fn() }),
}));

describe("ConveyorBelt", () => {
  beforeEach(() => {
    usePotionRushStore.getState().reset();
  });

  it("renders conveyor belt", () => {
    usePotionRushStore.setState({
      conveyorItems: [
        { id: "1", word: "hello", x: 100, y: 0, type: "herb" as const, width: 80, isDragging: false },
      ],
      gameState: "PLAYING" as const,
      beltSpeed: 50,
    });

    render(
      <ConveyorBelt
        y={500}
        width={800}
        dragBoundFunc={(pos) => pos}
        layout={{ cauldronY: 300, trashX: 100, trashY: 100 }}
      />,
    );

    expect(screen.getAllByTestId("konva-group").length).toBeGreaterThan(0);
  });
});
