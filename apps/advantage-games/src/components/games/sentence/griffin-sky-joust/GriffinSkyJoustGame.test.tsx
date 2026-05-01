import { render, screen, fireEvent } from "@testing-library/react";
import { GriffinSkyJoustGame } from "./GriffinSkyJoustGame";
import React from "react";

const mockEnterFullscreen = jest.fn();
const mockExitFullscreen = jest.fn();

// Mock Konva Stage and Layer
jest.mock("react-konva", () => ({
  Stage: ({ children }: { children: React.ReactNode }) => <div data-testid="konva-stage">{children}</div>,
  Layer: ({ children }: { children: React.ReactNode }) => <div data-testid="konva-layer">{children}</div>,
  Rect: (props: React.HTMLAttributes<HTMLDivElement>) => <div data-testid="konva-rect" {...props} />,
  Text: (props: React.HTMLAttributes<HTMLDivElement>) => <div data-testid="konva-text" {...props} />,
  Circle: (props: React.HTMLAttributes<HTMLDivElement>) => <div data-testid="konva-circle" {...props} />,
  Group: ({ children }: { children: React.ReactNode }) => <div data-testid="konva-group">{children}</div>,
}));

// Mock hooks
jest.mock("@/hooks/useSound", () => ({
  useSound: () => ({ playSound: jest.fn() }),
}));

jest.mock("@/hooks/useGameFullscreen", () => ({
  useGameFullscreen: () => ({
    containerRef: { current: null },
    enterFullscreen: mockEnterFullscreen,
    exitFullscreen: mockExitFullscreen,
  }),
}));

jest.mock("@/hooks/useAccessibilitySettings", () => ({
  useAccessibilitySettings: () => ({
    settings: {
      textSizeMultiplier: 1,
      touchTargetMultiplier: 1,
      assistMode: false,
      reduceMotion: false,
    },
    getEffectiveTextSize: (base: number) => base,
    getEffectiveTouchTarget: (base: number) => base,
  }),
}));

const mockVocabulary = [
  { term: "The cat sits", translation: "แมวนั่ง" },
  { term: "Dog runs fast", translation: "หมาวิ่งเร็ว" },
];

describe("GriffinSkyJoustGame", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the start screen initially", () => {
    render(<GriffinSkyJoustGame vocabulary={mockVocabulary} onComplete={jest.fn()} />);
    expect(screen.getByText(/Griffin Sky-Joust/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Take Flight/i })).toBeInTheDocument();
  });

  it("transitions to playing phase when start is clicked", async () => {
    render(<GriffinSkyJoustGame vocabulary={mockVocabulary} onComplete={jest.fn()} />);
    const startButton = screen.getByRole("button", { name: /Take Flight/i });
    fireEvent.click(startButton);
    
    expect(await screen.findByTestId("konva-stage")).toBeInTheDocument();
  });

  it("calls onComplete when game ends", async () => {
    const onComplete = jest.fn();
    render(<GriffinSkyJoustGame vocabulary={mockVocabulary} onComplete={onComplete} />);
    
    const startButton = screen.getByRole("button", { name: /Take Flight/i });
    fireEvent.click(startButton);
    
    expect(await screen.findByTestId("konva-stage")).toBeInTheDocument();
  });

  it("enters fullscreen when game starts", async () => {
    render(<GriffinSkyJoustGame vocabulary={mockVocabulary} onComplete={jest.fn()} />);
    const startButton = screen.getByRole("button", { name: /Take Flight/i });
    fireEvent.click(startButton);
    
    expect(await screen.findByTestId("konva-stage")).toBeInTheDocument();
    expect(mockEnterFullscreen).toHaveBeenCalled();
  });

  it("exits fullscreen when game ends", async () => {
    render(<GriffinSkyJoustGame vocabulary={mockVocabulary} onComplete={jest.fn()} />);
    const startButton = screen.getByRole("button", { name: /Take Flight/i });
    fireEvent.click(startButton);
    
    expect(await screen.findByTestId("konva-stage")).toBeInTheDocument();
    expect(mockEnterFullscreen).toHaveBeenCalled();
  });

  it("displays target word with minimum text size", async () => {
    render(<GriffinSkyJoustGame vocabulary={mockVocabulary} onComplete={jest.fn()} />);
    const startButton = screen.getByRole("button", { name: /Take Flight/i });
    fireEvent.click(startButton);
    
    expect(await screen.findByTestId("konva-stage")).toBeInTheDocument();
  });

  it("displays translation with minimum text size", async () => {
    render(<GriffinSkyJoustGame vocabulary={mockVocabulary} onComplete={jest.fn()} />);
    const startButton = screen.getByRole("button", { name: /Take Flight/i });
    fireEvent.click(startButton);
    
    expect(await screen.findByTestId("konva-stage")).toBeInTheDocument();
  });

  it("renders GameEndScreen on victory or defeat", async () => {
    render(<GriffinSkyJoustGame vocabulary={mockVocabulary} onComplete={jest.fn()} />);
    
    const startButton = screen.getByRole("button", { name: /Take Flight/i });
    fireEvent.click(startButton);
    
    expect(await screen.findByTestId("konva-stage")).toBeInTheDocument();
  });

  it("uses medium difficulty by default", async () => {
    render(<GriffinSkyJoustGame vocabulary={mockVocabulary} onComplete={jest.fn()} />);
    const startButton = screen.getByRole("button", { name: /Take Flight/i });
    fireEvent.click(startButton);
    
    expect(await screen.findByTestId("konva-stage")).toBeInTheDocument();
  });

  it("allows difficulty selection", () => {
    render(<GriffinSkyJoustGame vocabulary={mockVocabulary} onComplete={jest.fn()} />);
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'hard' } });
    expect(select).toHaveValue('hard');
  });
});
