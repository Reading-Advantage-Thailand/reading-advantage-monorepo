import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { GameBriefingScreen } from "../game-presentation.js";

const briefing = {
  title: "Temple Word Quest",
  subtitle: "A vocabulary adventure",
  objective: "Match each Thai word with its English translation.",
  instructions: [
    { title: "Choose a path", description: "Select the answer that matches the learning word." },
    { title: "Keep trying", description: "Review the learning preview before you begin." },
  ],
  learningPreview: { heading: "Words to learn" },
  controls: [
    { mode: "keyboard", label: "Arrow keys", action: "Move between choices" },
    { mode: "pointer", label: "Pointer", action: "Select a choice" },
    { mode: "touch", label: "Tap", action: "Choose an answer" },
  ],
  tip: "Read every word before starting.",
  labels: {
    objectiveHeading: "Your mission",
    instructionsHeading: "How to play",
    learningPreviewHeading: "Preview vocabulary",
    controlsHeading: "Choose your controls",
    startAction: "Begin quest",
  },
  startPhase: "tutorial",
} as const;

afterEach(cleanup);

describe("GameBriefingScreen", () => {
  it("exposes a named briefing dialog, complete Thai and English learning content, labelled sections, and an accessible Start action", () => {
    const onStart = vi.fn();
    render(
      <GameBriefingScreen
        briefing={briefing}
        learningItems={[
          { term: "แม่น้ำ", translation: "river" },
          { term: "ภูเขา", translation: "mountain" },
        ]}
        onStart={onStart}
      />,
    );

    const dialog = screen.getByRole("dialog", { name: "Temple Word Quest" });
    expect(dialog).not.toHaveAttribute("aria-modal", "true");
    expect(screen.getByRole("heading", { name: "Temple Word Quest", level: 1 })).toBeInTheDocument();
    expect(screen.getByText("A vocabulary adventure")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Your mission" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "How to play" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Preview vocabulary" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Choose your controls" })).toBeInTheDocument();
    expect(screen.getByText("แม่น้ำ")).toBeInTheDocument();
    expect(screen.getByText("river")).toBeInTheDocument();
    expect(screen.getByText("ภูเขา")).toBeInTheDocument();
    expect(screen.getByText("mountain")).toBeInTheDocument();
    expect(screen.getByText("Arrow keys")).toBeInTheDocument();
    expect(screen.getByText("Move between choices")).toBeInTheDocument();
    expect(screen.getByText("Read every word before starting.")).toBeInTheDocument();

    const start = screen.getByRole("button", { name: "Begin quest" });
    expect(start).toHaveAttribute("type", "button");
    expect(start).toHaveFocus();
    fireEvent.click(start);
    fireEvent.click(start);
    expect(onStart).toHaveBeenCalledOnce();
  });

  it("renders complete sentence content and only controls applicable to touch input", () => {
    const completeThaiSentence = "เมื่อฝนหยุดตก นักเรียนเดินกลับห้องสมุดเพื่ออ่านเรื่องราวให้จบ";
    render(
      <GameBriefingScreen
        briefing={{
          ...briefing,
          learningPreview: { heading: "Sentences to review" },
          labels: { ...briefing.labels, learningPreviewHeading: "Preview sentences" },
        }}
        learningItems={[{
          term: completeThaiSentence,
          translation: "When the rain stopped, the student returned to the library to finish the story.",
        }]}
        inputMode="touch"
        onStart={vi.fn()}
      />,
    );

    expect(screen.getByText(completeThaiSentence)).toBeInTheDocument();
    expect(screen.getByText("When the rain stopped, the student returned to the library to finish the story.")).toBeInTheDocument();
    expect(screen.getByText("Tap")).toBeInTheDocument();
    expect(screen.queryByText("Arrow keys")).not.toBeInTheDocument();
    expect(screen.queryByText("Pointer")).not.toBeInTheDocument();
  });

  it("does not fall back to keyboard or pointer hints when touch is the only available input", () => {
    render(
      <GameBriefingScreen
        briefing={{
          ...briefing,
          controls: [
            { mode: "keyboard", label: "Arrow keys", action: "Move between choices" },
            { mode: "pointer", label: "Pointer", action: "Select a choice" },
          ],
        }}
        learningItems={[{ term: "แม่น้ำ", translation: "river" }]}
        inputMode="touch"
        onStart={vi.fn()}
      />,
    );

    expect(screen.queryByText("Arrow keys")).not.toBeInTheDocument();
    expect(screen.queryByText("Move between choices")).not.toBeInTheDocument();
    expect(screen.queryByText("Pointer")).not.toBeInTheDocument();
    expect(screen.queryByText("Select a choice")).not.toBeInTheDocument();
    expect(document.querySelectorAll("[data-apk-control-mode]")).toHaveLength(0);
  });

  it("keeps compact and wide briefing content scrollable with a minimum 48px Start target", () => {
    const { container, rerender } = render(
      <GameBriefingScreen
        briefing={briefing}
        layoutProfile="compact"
        learningItems={[{ term: "แม่น้ำ", translation: "river" }]}
        onStart={vi.fn()}
      />,
    );

    const compactDialog = screen.getByRole("dialog", { name: "Temple Word Quest" });
    const compactBody = container.querySelector<HTMLElement>("[data-apk-briefing-region='body']");
    expect(compactDialog).toHaveAttribute("data-apk-layout-profile", "compact");
    expect(compactBody).toHaveStyle({ gridTemplateColumns: "minmax(0, 1fr)", overflowY: "auto" });
    expect(screen.getByRole("button", { name: "Begin quest" })).toHaveStyle({ minBlockSize: "48px" });

    rerender(
      <GameBriefingScreen
        briefing={briefing}
        layoutProfile="wide"
        learningItems={[{ term: "แม่น้ำ", translation: "river" }]}
        onStart={vi.fn()}
      />,
    );

    const wideDialog = screen.getByRole("dialog", { name: "Temple Word Quest" });
    const wideBody = container.querySelector<HTMLElement>("[data-apk-briefing-region='body']");
    expect(wideDialog).toHaveAttribute("data-apk-layout-profile", "wide");
    expect(wideBody).toHaveStyle({
      gridTemplateColumns: "minmax(0, 1fr) minmax(18rem, 0.8fr)",
      overflowY: "auto",
    });
  });

  it("supports pointer-keyboard and hybrid hints, key tokens, defaults, extensions, and pending Start", () => {
    const onStart = vi.fn();
    const briefingWithKeys = {
      title: briefing.title,
      objective: briefing.objective,
      instructions: briefing.instructions,
      learningPreview: briefing.learningPreview,
      controls: [
        { mode: "keyboard" as const, label: "Arrow keys", action: "Move", keys: ["←", "→"] },
        { mode: "pointer" as const, label: "Pointer", action: "Choose" },
        { mode: "touch" as const, label: "Tap", action: "Choose" },
      ],
    };
    const { rerender } = render(
      <GameBriefingScreen
        briefing={briefingWithKeys}
        extension={<span>Optional host action</span>}
        inputMode="pointer-keyboard"
        learningItems={[{ term: "แม่น้ำ", translation: "river" }]}
        onStart={onStart}
        startPending
      />,
    );

    expect(screen.getByText("Arrow keys")).toBeInTheDocument();
    expect(screen.getByText("Pointer")).toBeInTheDocument();
    expect(screen.queryByText("Tap")).not.toBeInTheDocument();
    expect(screen.getByText("←").tagName).toBe("KBD");
    expect(screen.getByText("Optional host action")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Mission objective" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start game" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Start game" })).toHaveAttribute("aria-busy", "true");

    rerender(
      <GameBriefingScreen
        briefing={briefingWithKeys}
        inputMode="hybrid"
        learningItems={[{ term: "แม่น้ำ", translation: "river" }]}
        onStart={onStart}
      />,
    );

    expect(screen.getByText("Tap")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Start game" }));
    expect(onStart).toHaveBeenCalledOnce();
  });
});
