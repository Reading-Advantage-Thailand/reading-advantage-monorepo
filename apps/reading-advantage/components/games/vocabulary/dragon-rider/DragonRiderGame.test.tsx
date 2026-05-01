import { act, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { DragonRiderGame } from "./DragonRiderGame";
import type { VocabularyItem } from "@/store/useGameStore";

jest.mock("@/hooks/useSound", () => ({
  useSound: () => ({ playSound: jest.fn() }),
}));

jest.mock("react-konva", () => {
  const React = jest.requireActual("react");
  const Image = React.forwardRef(
    (props: Record<string, unknown>, ref: React.Ref<HTMLDivElement>) => (
      <div ref={ref} />
    ),
  );
  Image.displayName = "KonvaImageMock";

  return {
    Stage: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    Layer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    Group: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    Image,
    Rect: () => <div />,
    Text: ({ text }: { text: string }) => <span>{text}</span>,
  };
});

jest.mock("konva", () => ({
  Animation: class {
    start() {}
    stop() {}
  },
}));

const createImage = (width: number, height: number) => {
  const image = new Image();
  image.width = width;
  image.height = height;
  return image;
};

const assets = {
  gates: createImage(900, 900),
  boss: createImage(900, 900),
  player: createImage(900, 900),
  playerCamera: createImage(900, 900),
  army: createImage(900, 900),
  parallaxTop: createImage(1024, 1024),
  parallaxMiddle: createImage(1024, 1024),
  parallaxBottom: createImage(1024, 1024),
  loadingBackground: createImage(1024, 1024),
};

const vocabulary: VocabularyItem[] = [
  { term: "Apple", translation: "Manzana" },
  { term: "Banana", translation: "Platano" },
];

const mockRandomSequence = (values: number[]) => {
  let index = 0;
  return jest.spyOn(Math, "random").mockImplementation(() => {
    const value = values[index] ?? 0;
    index += 1;
    return value;
  });
};

beforeEach(() => {
  Object.defineProperty(window, "ResizeObserver", {
    value: class {
      observe() {}
      disconnect() {}
    },
    configurable: true,
  });
});

describe("DragonRiderGame", () => {
  it("renders the running state with prompt and dragon count", () => {
    const randomSpy = mockRandomSequence([0.1, 0.9, 0.2]);
    render(
      <DragonRiderGame
        vocabulary={vocabulary}
        preloadedAssets={assets}
        onComplete={jest.fn()}
      />,
    );

    expect(screen.getByText(/skyward trials/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /start flight/i }));

    expect(screen.getByText("Apple")).toBeInTheDocument();
    expect(screen.getByTestId("dragon-rider")).toHaveAttribute(
      "data-status",
      "running",
    );
    expect(screen.getByTestId("dragon-rider-dragon-count")).toHaveTextContent(
      "1",
    );
    expect(
      screen.getByRole("progressbar", { name: /run timer/i }),
    ).toBeInTheDocument();

    randomSpy.mockRestore();
  });

  it("updates dragon count after selecting a correct gate", () => {
    jest.useFakeTimers();
    const randomSpy = mockRandomSequence([0.1, 0.9, 0.2, 0.4, 0.8, 0.1]);
    render(
      <DragonRiderGame
        vocabulary={vocabulary}
        preloadedAssets={assets}
        onComplete={jest.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /start flight/i }));

    fireEvent.keyDown(window, { key: "ArrowLeft" });

    act(() => {
      jest.advanceTimersByTime(1500);
    });

    expect(screen.getByTestId("dragon-rider-dragon-count")).toHaveTextContent(
      "2",
    );

    randomSpy.mockRestore();
    jest.useRealTimers();
  });

  it("transitions from boss encounter to results screen", () => {
    jest.useFakeTimers();
    const randomSpy = mockRandomSequence([0.1, 0.9, 0.2]);
    render(
      <DragonRiderGame
        vocabulary={vocabulary}
        durationMs={100}
        preloadedAssets={assets}
        onComplete={jest.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /start flight/i }));

    act(() => {
      jest.advanceTimersByTime(120);
    });

    expect(screen.getByTestId("dragon-rider")).toHaveAttribute(
      "data-status",
      "boss",
    );

    act(() => {
      jest.advanceTimersByTime(8000);
    });
    act(() => {
      jest.advanceTimersByTime(8000);
    });
    act(() => {
      jest.advanceTimersByTime(8000);
    });
    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(screen.getByTestId("dragon-rider")).toHaveAttribute(
      "data-status",
      "results",
    );
    expect(screen.getByText(/defeated/i)).toBeInTheDocument();

    randomSpy.mockRestore();
    jest.useRealTimers();
  });
});
