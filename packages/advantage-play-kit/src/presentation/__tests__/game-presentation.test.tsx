import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  EducationalPrompt,
  GameErrorState,
  GameFeedback,
  GameHud,
  GameLoadingState,
  GameNavigationControls,
  GameProgress,
  GameResultPanel,
  InstructionsPanel,
  PresentationShell,
} from "../game-presentation.js";

afterEach(cleanup);

describe("accessible game presentation", () => {
  it("uses semantic regions, complete prompt text, progress semantics, and live feedback", () => {
    render(
      <PresentationShell accessibleName="Vocabulary quest">
        <EducationalPrompt prompt="เลือกคำตอบที่ถูกต้องสำหรับการผจญภัย" />
        <GameProgress current={2} total={5} />
        <GameFeedback kind="correct">Correct answer</GameFeedback>
      </PresentationShell>,
    );

    expect(screen.getByRole("region", { name: "Vocabulary quest" })).toBeInTheDocument();
    expect(screen.getByText("เลือกคำตอบที่ถูกต้องสำหรับการผจญภัย")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "2");
    expect(screen.getByRole("status")).toHaveTextContent("Correct answer");
  });

  it("provides keyboard-native pause, mute, restart, exit, and actionable error controls", () => {
    const actions = { pause: vi.fn(), mute: vi.fn(), restart: vi.fn(), exit: vi.fn(), retry: vi.fn() };
    render(
      <>
        <GameNavigationControls
          paused={false}
          muted={false}
          onPauseChange={actions.pause}
          onMutedChange={actions.mute}
          onRestart={actions.restart}
          onExit={actions.exit}
        />
        <GameErrorState message="Asset binding is invalid" onRetry={actions.retry} />
      </>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Pause game" }));
    fireEvent.click(screen.getByRole("button", { name: "Mute game" }));
    fireEvent.click(screen.getByRole("button", { name: "Restart game" }));
    fireEvent.click(screen.getByRole("button", { name: "Exit game" }));
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(Object.values(actions).every((action) => action.mock.calls.length === 1)).toBe(true);
  });

  it("uses dialog and result semantics with attribution and replay/exit actions", () => {
    const replay = vi.fn();
    const exit = vi.fn();
    render(
      <>
        <InstructionsPanel heading="How to play" open onStart={() => undefined}>Match each word.</InstructionsPanel>
        <GameResultPanel
          outcome="complete"
          score={250}
          accuracy={0.8}
          correctAnswers={4}
          totalAttempts={5}
          xp={30}
          requiredCredit="Pixel art assets by ElvGames"
          onReplay={replay}
          onExit={exit}
        />
      </>,
    );

    expect(screen.getByRole("dialog", { name: "How to play" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Game result" })).toHaveTextContent("Pixel art assets by ElvGames");
    fireEvent.click(screen.getByRole("button", { name: "Play again" }));
    fireEvent.click(screen.getByRole("button", { name: "Exit" }));
    expect(replay).toHaveBeenCalledOnce();
    expect(exit).toHaveBeenCalledOnce();
  });

  it("covers loading, optional errors, HUD semantics, incorrect alerts, and closed instructions", () => {
    const { rerender } = render(
      <>
        <GameLoadingState />
        <GameErrorState message="Unsupported viewport" />
        <GameHud primary={{ Score: 20 }} secondary={{ Combo: 2 }} />
        <GameFeedback kind="incorrect">Incorrect answer</GameFeedback>
        <InstructionsPanel heading="Hidden" open={false} onStart={() => undefined}>Hidden instructions</InstructionsPanel>
      </>,
    );

    expect(screen.getByRole("status")).toHaveTextContent("Loading game");
    expect(screen.getAllByRole("alert").map((node) => node.textContent)).toEqual(expect.arrayContaining([
      expect.stringContaining("Unsupported viewport"),
      expect.stringContaining("Incorrect answer"),
    ]));
    expect(screen.getByText("Score")).toBeInTheDocument();
    expect(screen.queryByText("Hidden instructions")).not.toBeInTheDocument();

    rerender(<GameFeedback kind="neutral">Ready</GameFeedback>);
    expect(screen.getByRole("status")).toHaveTextContent("Ready");
  });

  it("fails closed for invalid progress and result presentation values", () => {
    expect(() => render(<GameProgress current={3} total={2} />)).toThrow(/progress/i);
    expect(() => render(
      <GameResultPanel
        outcome="defeat"
        score={0}
        accuracy={2}
        correctAnswers={0}
        totalAttempts={0}
        xp={0}
        requiredCredit="Pixel art assets by ElvGames"
        onReplay={() => undefined}
        onExit={() => undefined}
      />,
    )).toThrow(/invalid result/i);
  });
});
