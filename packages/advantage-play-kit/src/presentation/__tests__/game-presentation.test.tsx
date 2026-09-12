import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  EducationalPrompt,
  GameErrorState,
  GameFeedback,
  GameHud,
  GameLoadingState,
  GameNavigationControls,
  GameProgress,
  GameBriefingScreen,
  GameResultPanel,
  InstructionsPanel,
  PresentationShell,
} from "../game-presentation.js";

const replayBriefing = {
  title: "Wizard Word Quest",
  subtitle: "Read Thai and identify English",
  objective: "Read the Thai target and select its English answer.",
  instructions: [{ title: "Choose", description: "Select the matching English answer." }],
  learningPreview: { heading: "Words to learn" },
  controls: [{ mode: "keyboard", label: "Arrow keys", action: "Move between choices" }],
  tip: "Read the complete Thai target.",
  labels: { startAction: "Start replay" },
  startPhase: "playing",
} as const;

function ReplayToBriefingHarness() {
  const [showResult, setShowResult] = useState(true);
  if (!showResult) {
    return (
      <GameBriefingScreen
        briefing={replayBriefing}
        learningItems={[{ term: "river", translation: "แม่น้ำ" }]}
        onStart={() => undefined}
      />
    );
  }
  return (
    <GameResultPanel
      outcome="victory"
      score={100}
      accuracy={1}
      correctAnswers={1}
      totalAttempts={1}
      xp={5}
      requiredCredit=""
      onReplay={() => setShowResult(false)}
      onExit={() => undefined}
    />
  );
}

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
    const result = screen.getByRole("region", { name: "Game result" });
    const replayButton = screen.getByRole("button", { name: "Play again" });
    const exitButton = screen.getByRole("button", { name: "Exit" });
    expect(result).toHaveTextContent("Pixel art assets by ElvGames");
    expect(result.style.borderImageSource).toContain("apk-ui-panel-square.png");
    expect(result.style.borderImageSlice).toBe("16");
    expect(replayButton.style.borderImageSource).toContain("apk-ui-button-primary.png");
    expect(replayButton.style.borderImageSlice).toBe("4 6 fill");
    expect(exitButton.style.borderImageSource).toContain("apk-ui-button-secondary.png");
    expect(exitButton.style.borderImageSlice).toBe("4 6");
    expect(replayButton).toHaveStyle({ minBlockSize: "48px" });
    expect(exitButton).toHaveStyle({ minBlockSize: "48px" });
    fireEvent.click(replayButton);
    fireEvent.click(exitButton);
    expect(replay).toHaveBeenCalledOnce();
    expect(exit).toHaveBeenCalledOnce();
  });

  it("moves focus to the result heading when completion mounts", () => {
    const focus = vi.spyOn(HTMLElement.prototype, "focus");
    render(
      <GameResultPanel
        outcome="victory"
        score={100}
        accuracy={1}
        correctAnswers={1}
        totalAttempts={1}
        xp={5}
        requiredCredit=""
        onReplay={() => undefined}
        onExit={() => undefined}
      />,
    );

    expect(screen.getByRole("heading", { name: "Victory" })).toHaveFocus();
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
  });

  it("keeps user focus stable while the save state changes", () => {
    const props = {
      outcome: "victory" as const,
      score: 100,
      accuracy: 1,
      correctAnswers: 1,
      totalAttempts: 1,
      xp: 5,
      requiredCredit: "",
      onReplay: () => undefined,
      onExit: () => undefined,
    };
    const { rerender } = render(
      <GameResultPanel {...props} persistence={{ status: "pending" }} />,
    );
    const exit = screen.getByRole("button", { name: "Exit" });
    exit.focus();

    rerender(
      <GameResultPanel
        {...props}
        persistence={{ status: "failed", message: "Save timed out." }}
        onRetrySave={() => undefined}
      />,
    );

    expect(exit).toHaveFocus();
    expect(screen.getByRole("alert")).toHaveTextContent("Save timed out.");
  });

  it("restores focus to the briefing Start action after replay", () => {
    render(<ReplayToBriefingHarness />);

    const replay = screen.getByRole("button", { name: "Play again" });
    replay.focus();
    fireEvent.click(replay);

    expect(screen.getByRole("button", { name: "Start replay" })).toHaveFocus();
  });

  it("exposes Exit as a focusable native keyboard action", () => {
    const exit = vi.fn();
    render(
      <GameResultPanel
        outcome="complete"
        score={10}
        accuracy={1}
        correctAnswers={1}
        totalAttempts={1}
        xp={5}
        requiredCredit=""
        onReplay={() => undefined}
        onExit={exit}
      />,
    );

    const exitButton = screen.getByRole("button", { name: "Exit" });
    exitButton.focus();
    expect(exitButton).toHaveFocus();
    expect(exitButton).toHaveAttribute("type", "button");
    exitButton.click();
    expect(exit).toHaveBeenCalledOnce();
  });

  it("omits debrief attribution when no credited art loaded", () => {
    render(
      <GameResultPanel
        outcome="complete"
        score={10}
        accuracy={1}
        correctAnswers={1}
        totalAttempts={1}
        xp={5}
        requiredCredit=""
        onReplay={() => undefined}
        onExit={() => undefined}
      />,
    );

    expect(screen.getByRole("region", { name: "Game result" })).toBeInTheDocument();
    expect(screen.queryByText("Pixel art assets by ElvGames")).not.toBeInTheDocument();
    expect(document.querySelector("[data-apk-attribution]")).toBeNull();
  });

  it("separates pending, confirmed, and failed persistence from display XP", () => {
    const retry = vi.fn();
    const replay = vi.fn();
    const { rerender } = render(
      <GameResultPanel
        outcome="victory"
        score={100}
        accuracy={1}
        correctAnswers={2}
        totalAttempts={2}
        xp={999}
        requiredCredit=""
        persistence={{ status: "pending" }}
        onRetrySave={retry}
        onReplay={replay}
        onExit={() => undefined}
      />,
    );

    expect(screen.getByText("Saving progress…")).toBeInTheDocument();
    expect(screen.queryByText("999")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Play again" })).toBeEnabled();

    rerender(
      <GameResultPanel
        outcome="victory"
        score={100}
        accuracy={1}
        correctAnswers={2}
        totalAttempts={2}
        xp={999}
        requiredCredit=""
        persistence={{ status: "confirmed", xpEarned: 25, duplicate: false }}
        onRetrySave={retry}
        onReplay={replay}
        onExit={() => undefined}
      />,
    );
    expect(screen.getByText("Confirmed XP")).toBeInTheDocument();
    expect(screen.getByText("25")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Play again" })).toBeEnabled();

    rerender(
      <GameResultPanel
        outcome="victory"
        score={100}
        accuracy={1}
        correctAnswers={2}
        totalAttempts={2}
        xp={999}
        requiredCredit=""
        persistence={{ status: "confirmed", xpEarned: 0, duplicate: true }}
        onRetrySave={retry}
        onReplay={replay}
        onExit={() => undefined}
      />,
    );
    expect(screen.getByText("Progress already saved")).toBeInTheDocument();
    expect(screen.queryByText("Confirmed XP")).not.toBeInTheDocument();
    expect(screen.queryByText("0")).not.toBeInTheDocument();

    rerender(
      <GameResultPanel
        outcome="victory"
        score={100}
        accuracy={1}
        correctAnswers={2}
        totalAttempts={2}
        xp={999}
        requiredCredit=""
        persistence={{ status: "failed", message: "Save timed out." }}
        onRetrySave={retry}
        onReplay={replay}
        onExit={() => undefined}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Retry save" }));
    fireEvent.click(screen.getByRole("button", { name: "Play again without saving" }));
    expect(retry).toHaveBeenCalledOnce();
    expect(replay).toHaveBeenCalledOnce();
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
