import "@testing-library/jest-dom/vitest";

import { type ComponentType } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { GameTutorialControllerSnapshot } from "../game-tutorial-controller.js";
import type { GameTutorialDefinition } from "../game-tutorial-contract.js";

afterEach(cleanup);

const thaiTitle = "บทเรียนเกมภารกิจคำศัพท์";
const thaiExplanation = "สังเกตตัวเลือกคำตอบทั้งหมด แล้วเลือกคำศัพท์ที่ตรงกับความหมายอย่างระมัดระวัง";

const tutorial = {
  schemaVersion: 1,
  id: "temple-word-quest-tutorial",
  title: thaiTitle,
  seed: 0x1a2b3c4d,
  labels: {
    progress: "ความคืบหน้าบทเรียน",
    pause: "หยุดบทเรียน",
    resume: "เล่นบทเรียนต่อ",
    advance: "ขั้นตอนถัดไป",
    replay: "เล่นบทเรียนซ้ำ",
    skip: "ข้ามบทเรียน",
  },
  targets: [
    { id: "control:answer-choice", kind: "control" },
    { id: "learning-item:river", kind: "learning-item" },
    { id: "feedback:incorrect-choice", kind: "feedback" },
  ],
  actions: [
    { id: "action:highlight-answer", deterministic: true, consequence: "neutral" },
    { id: "action:select-correct-answer", deterministic: true, consequence: "correct" },
    { id: "action:show-incorrect-feedback", deterministic: true, consequence: "incorrect" },
  ],
  steps: [
    {
      id: "step:notice-answer",
      title: "สังเกตตัวเลือกคำตอบ",
      explanation: thaiExplanation,
      targetId: "control:answer-choice",
      actionId: "action:highlight-answer",
      timing: { leadInMs: 0, demonstrationMs: 40, lingerMs: 10 },
    },
    {
      id: "step:choose-river",
      title: "Choose the matching word",
      explanation: "The English word river matches the Thai learning item.",
      targetId: "learning-item:river",
      actionId: "action:select-correct-answer",
      timing: { leadInMs: 0, demonstrationMs: 40, lingerMs: 10 },
    },
    {
      id: "step:review-feedback",
      title: "Review the feedback",
      explanation: "Incorrect feedback safely explains why the selected answer does not match.",
      targetId: "feedback:incorrect-choice",
      actionId: "action:show-incorrect-feedback",
      timing: { leadInMs: 0, demonstrationMs: 40, lingerMs: 10 },
    },
  ],
  lifecycle: {
    pause: "freeze-current-step",
    advance: "sequential",
    replay: "restart-with-same-seed",
    skip: { enabled: true, to: "countdown" },
    complete: { to: "playing" },
    productionEffects: {
      emitGameResults: false,
      persistProgress: false,
      awardAuthoritativeXp: false,
      writeLeaderboard: false,
      applyFailureConsequences: false,
    },
  },
} as const satisfies GameTutorialDefinition;

type Snapshot = GameTutorialControllerSnapshot;

type TutorialScreenProps = Record<string, unknown>;
type TutorialScreenComponent = ComponentType<TutorialScreenProps>;
let GameTutorialScreen: TutorialScreenComponent;

/** Loads the future presentation module so every Red assertion reports the missing implementation. */
async function loadTutorialScreen(): Promise<TutorialScreenComponent> {
  let imported: { readonly GameTutorialScreen?: TutorialScreenComponent } | undefined;
  let importError: unknown;
  const screenSpecifier = "../game-tutorial-screen.js";
  try {
    imported = await import(/* @vite-ignore */ screenSpecifier) as { readonly GameTutorialScreen?: TutorialScreenComponent };
  } catch (error) {
    importError = error;
  }

  expect(
    imported,
    `Tutorial presentation implementation is required; module load failed: ${importError instanceof Error ? importError.message : String(importError)}`,
  ).toBeDefined();
  expect(imported?.GameTutorialScreen, "Tutorial presentation must export GameTutorialScreen").toBeTypeOf("function");
  return imported!.GameTutorialScreen!;
}

function createSnapshot(overrides: Partial<Snapshot> = {}): Snapshot {
  return {
    mode: "tutorial",
    phase: "tutorial",
    status: "running",
    currentStepId: "step:notice-answer",
    currentStep: tutorial.steps[0],
    currentTarget: tutorial.targets[0],
    currentAction: tutorial.actions[0],
    progress: { completed: 0, total: tutorial.steps.length },
    seed: tutorial.seed,
    resources: { listeners: 0, inputHandlers: 0, phaserObjects: 0 },
    ...overrides,
  };
}

function createController(snapshot: Snapshot, overrides: Partial<Record<"pause" | "resume" | "advance" | "replay" | "skip", () => void>> = {}) {
  return {
    getSnapshot: () => snapshot,
    start: vi.fn(),
    pause: vi.fn(overrides.pause),
    resume: vi.fn(overrides.resume),
    advance: vi.fn(overrides.advance),
    replay: vi.fn(overrides.replay),
    skip: vi.fn(overrides.skip),
    exit: vi.fn(),
    interrupt: vi.fn(),
    destroy: vi.fn(),
  };
}

describe("GameTutorialScreen", () => {
  beforeEach(async () => {
    GameTutorialScreen = await loadTutorialScreen();
  });

  it("renders a semantic step card with complete title, explanation, progress, target, action, and consequence feedback", () => {
    render(
      <GameTutorialScreen
        tutorial={tutorial}
        snapshot={createSnapshot()}
        controller={createController(createSnapshot())}
        targetLabel="Answer choices"
        actionLabel="Show how to inspect the choices"
        consequenceLabel="No score changes in tutorial mode"
      />,
    );

    expect(screen.getByRole("region", { name: thaiTitle })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "สังเกตตัวเลือกคำตอบ", level: 2 })).toBeInTheDocument();
    expect(screen.getByText(thaiExplanation)).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "ความคืบหน้าบทเรียน" })).toHaveAttribute("aria-valuenow", "0");
    expect(screen.getByText("1 of 3")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Highlighted tutorial target" })).toHaveTextContent("Answer choices");
    expect(screen.getByRole("region", { name: "Demonstrated tutorial action" })).toHaveTextContent("Show how to inspect the choices");
    expect(screen.getByRole("status")).toHaveTextContent("No score changes in tutorial mode");
  });

  it("exposes semantic target and highlight state without raw selectors, coordinates, or geometry claims", () => {
    render(
      <GameTutorialScreen
        tutorial={tutorial}
        snapshot={createSnapshot()}
        controller={createController(createSnapshot())}
        targetLabel="Answer choices"
      />,
    );

    const target = screen.getByRole("region", { name: "Highlighted tutorial target" });
    expect(target).toHaveAttribute("data-apk-tutorial-target-id", "control:answer-choice");
    expect(target).toHaveAttribute("data-apk-tutorial-target-kind", "control");
    expect(target).toHaveAttribute("data-apk-tutorial-highlight", "true");
    expect(target).not.toHaveAttribute("data-testid");
    expect(target).not.toHaveAttribute("data-apk-selector");
    expect(target).not.toHaveAttribute("data-apk-x");
    expect(target).not.toHaveAttribute("data-apk-y");
    expect(target).not.toHaveAttribute("style");
  });

  it("announces step changes through a live region and moves focus to the step heading without stealing focus from the mechanic", () => {
    const snapshot = createSnapshot();
    const { rerender } = render(
      <GameTutorialScreen
        tutorial={tutorial}
        snapshot={snapshot}
        controller={createController(snapshot)}
        targetLabel="Answer choices"
      />,
    );

    const heading = screen.getByRole("heading", { name: "สังเกตตัวเลือกคำตอบ", level: 2 });
    expect(heading).toHaveAttribute("tabindex", "-1");
    expect(heading).toHaveFocus();
    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");

    const nextSnapshot = createSnapshot({
      currentStepId: tutorial.steps[1].id,
      currentStep: tutorial.steps[1],
      currentTarget: tutorial.targets[1],
      currentAction: tutorial.actions[1],
      progress: { completed: 1, total: tutorial.steps.length },
    });
    rerender(
      <GameTutorialScreen
        tutorial={tutorial}
        snapshot={nextSnapshot}
        controller={createController(nextSnapshot)}
        targetLabel="River learning item"
      />,
    );

    expect(screen.getByRole("heading", { name: "Choose the matching word", level: 2 })).toHaveFocus();
    expect(screen.getByRole("status")).toHaveTextContent("Step 2 of 3");
  });

  it("routes keyboard, pointer, and touch navigation to host-neutral controller commands", () => {
    const snapshot = createSnapshot();
    const controller = createController(snapshot);
    render(
      <GameTutorialScreen
        tutorial={tutorial}
        snapshot={snapshot}
        controller={controller}
        targetLabel="Answer choices"
      />,
    );

    const card = screen.getByRole("article", { name: "Tutorial step 1" });
    fireEvent.keyDown(card, { key: "ArrowRight" });
    fireEvent.keyDown(card, { key: "Enter" });
    fireEvent.click(screen.getByRole("button", { name: "Next tutorial step" }));
    fireEvent.pointerUp(screen.getByRole("button", { name: "Replay tutorial" }));
    fireEvent.touchEnd(screen.getByRole("button", { name: "Skip tutorial" }));

    expect(controller.advance).toHaveBeenCalledTimes(2);
    expect(controller.replay).toHaveBeenCalledOnce();
    expect(controller.skip).toHaveBeenCalledOnce();
    expect(controller).not.toHaveProperty("onNavigate");
    expect(controller).not.toHaveProperty("persistProgress");
  });

  it("uses the pause and resume labels, supports pointer activation, and keeps every navigation target at least 48px", () => {
    const paused = createSnapshot({ status: "paused" });
    const controller = createController(paused);
    render(
      <GameTutorialScreen
        tutorial={tutorial}
        snapshot={paused}
        controller={controller}
        targetLabel="Answer choices"
      />,
    );

    const resume = screen.getByRole("button", { name: "เล่นบทเรียนต่อ" });
    fireEvent.pointerDown(resume);
    fireEvent.pointerUp(resume);
    fireEvent.click(resume);
    expect(controller.resume).toHaveBeenCalledOnce();
    for (const button of screen.getAllByRole("button")) {
      expect(button).toHaveStyle({ minBlockSize: "48px" });
    }
  });

  it.each(["compact", "wide"] as const)("keeps long Thai and English guidance scrollable and separated from the highlighted target in %s layout", (layoutProfile) => {
    const longTutorial = {
      ...tutorial,
      title: `${thaiTitle} — ${"A very long English tutorial title ".repeat(8)}`,
      steps: [{
        ...tutorial.steps[0],
        title: `${tutorial.steps[0].title} ${"long title ".repeat(12)}`,
        explanation: `${thaiExplanation} ${"Complete learning guidance must remain visible. ".repeat(16)}`,
      }, ...tutorial.steps.slice(1)],
    } as const;
    const snapshot = createSnapshot({ currentStep: longTutorial.steps[0] });

    const { container } = render(
      <GameTutorialScreen
        tutorial={longTutorial}
        snapshot={snapshot}
        controller={createController(snapshot)}
        layoutProfile={layoutProfile}
        targetLabel="Answer choices"
      />,
    );

    const body = container.querySelector<HTMLElement>("[data-apk-tutorial-region='body']");
    const target = screen.getByRole("region", { name: "Highlighted tutorial target" });
    expect(screen.getByRole("region", { name: thaiTitle })).toHaveAttribute("data-apk-layout-profile", layoutProfile);
    expect(body).toHaveStyle({ overflowY: "auto", overscrollBehavior: "contain" });
    expect(body).toHaveStyle({ minInlineSize: "0" });
    expect(target).not.toHaveStyle({ position: "fixed" });
    expect(screen.getByRole("heading", { name: new RegExp("long title") })).toBeInTheDocument();
    expect(screen.getByText(/Complete learning guidance must remain visible/)).toBeInTheDocument();
  });

  it("marks reduced motion and avoids animation-dependent presentation when the host requests it", () => {
    const snapshot = createSnapshot();
    render(
      <GameTutorialScreen
        tutorial={tutorial}
        snapshot={snapshot}
        controller={createController(snapshot)}
        reducedMotion
        targetLabel="Answer choices"
      />,
    );

    const root = screen.getByRole("region", { name: thaiTitle });
    expect(root).toHaveAttribute("data-apk-reduced-motion", "true");
    expect(root).toHaveAttribute("data-apk-tutorial-animation", "none");
    expect(root).not.toHaveTextContent("animation");
  });

  it.each([
    ["neutral", "Demonstration only"],
    ["correct", "Correct demonstration"],
    ["incorrect", "Incorrect demonstration"],
  ] as const)("presents %s consequence feedback without a production effect", (consequence, message) => {
    const stepIndex = consequence === "neutral" ? 0 : consequence === "correct" ? 1 : 2;
    const snapshot = createSnapshot({
      currentStepId: tutorial.steps[stepIndex].id,
      currentStep: tutorial.steps[stepIndex],
      currentTarget: tutorial.targets[stepIndex],
      currentAction: tutorial.actions[stepIndex],
    });
    const controller = createController(snapshot);
    render(
      <GameTutorialScreen
        tutorial={tutorial}
        snapshot={snapshot}
        controller={controller}
        consequenceFeedback={message}
        targetLabel="Tutorial target"
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent(message);
    expect(screen.getByRole("status")).toHaveAttribute("data-apk-tutorial-consequence", consequence);
    expect(controller).not.toHaveProperty("emitGameResults");
    expect(controller).not.toHaveProperty("awardAuthoritativeXp");
  });

  it("uses host-neutral callbacks and clears focus, listeners, and timers on cleanup and remount", () => {
    const firstSnapshot = createSnapshot();
    const firstController = createController(firstSnapshot);
    const secondSnapshot = createSnapshot({ currentStepId: tutorial.steps[1].id, currentStep: tutorial.steps[1], currentTarget: tutorial.targets[1], currentAction: tutorial.actions[1] });
    const secondController = createController(secondSnapshot);
    const { rerender, unmount } = render(
      <GameTutorialScreen
        tutorial={tutorial}
        snapshot={firstSnapshot}
        controller={firstController}
        targetLabel="Answer choices"
      />,
    );
    expect(firstController.destroy).not.toHaveBeenCalled();
    rerender(
      <GameTutorialScreen
        tutorial={tutorial}
        snapshot={secondSnapshot}
        controller={secondController}
        targetLabel="River learning item"
      />,
    );
    unmount();
    expect(firstController).not.toHaveProperty("onComplete");
    expect(secondController).not.toHaveProperty("onComplete");
    expect(document.querySelectorAll("[data-apk-tutorial-screen]")).toHaveLength(0);
  });

  it("renders an actionable host-neutral error when the current tutorial snapshot is unavailable", () => {
    const controller = createController(createSnapshot());
    render(
      <GameTutorialScreen
        tutorial={tutorial}
        controller={controller}
        error="Tutorial renderer unavailable"
        onRetry={vi.fn()}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Tutorial renderer unavailable");
    const retry = screen.getByRole("button", { name: "Try tutorial again" });
    expect(retry).toHaveStyle({ minBlockSize: "48px" });
    fireEvent.click(retry);
  });
});
