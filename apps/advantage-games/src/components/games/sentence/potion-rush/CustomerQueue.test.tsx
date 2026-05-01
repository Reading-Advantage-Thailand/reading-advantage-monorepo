import { render, screen } from "@testing-library/react";
import CustomerQueue from "./CustomerQueue";
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
  Line: (props: React.HTMLAttributes<HTMLDivElement>) => (
    <div data-testid="konva-line" {...props} />
  ),
  Image: (props: React.HTMLAttributes<HTMLDivElement>) => (
    <div data-testid="konva-image" {...props} />
  ),
}));

describe("CustomerQueue", () => {
  beforeEach(() => {
    usePotionRushStore.getState().reset();
  });

  it("renders customer queue with customers", () => {
    usePotionRushStore.setState({
      customers: [
        {
          id: "1",
          type: "orc" as const,
          request: { term: "hello world", translation: "สวัสดี", id: "1" },
          patience: 50,
          maxPatience: 60,
          state: "WAITING" as const,
        },
        null,
        null,
      ],
    });

    render(<CustomerQueue y={100} width={800} />);

    expect(screen.getAllByTestId("konva-group").length).toBeGreaterThan(0);
  });

  it("renders empty queue when no customers", () => {
    usePotionRushStore.setState({
      customers: [null, null, null],
    });

    render(<CustomerQueue y={100} width={800} />);

    expect(screen.getByTestId("konva-group")).toBeInTheDocument();
  });
});
