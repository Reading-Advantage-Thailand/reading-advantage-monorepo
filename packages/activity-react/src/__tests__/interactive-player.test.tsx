import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { activitySchema } from "@reading-advantage/activity-runtime/core";
import { InteractiveActivityPlayer } from "../interactive-activity-player.js";
import { createFakeMediaController } from "../testing.js";

const activity = activitySchema.parse({
  schemaVersion: "activity.v1",
  activityId: "activity.player-demo",
  activityVersion: "1.0.0",
  graphVersion: "graph.v1",
  objectiveId: "git.commit.create",
  variantKey: "video.v1",
  mode: "worked_example",
  title: { en: "Create a commit" },
  accessibility: { transcriptRequired: true, captionsRequired: true, nonVideoAlternativeResourceId: "diagram.flow" },
  resources: [
    {
      kind: "video",
      resourceId: "video.demo",
      provider: "youtube",
      videoId: "abc123",
      captionsAvailable: true,
      transcriptResourceId: "transcript.demo",
      segments: [{ segmentId: "segment.stage", label: { en: "Stage files" }, startSeconds: 12, endSeconds: 35 }]
    },
    { kind: "transcript", resourceId: "transcript.demo", language: "en", text: "Stage files before committing." },
    { kind: "diagram", resourceId: "diagram.flow", assetId: "diagram.asset", alt: { en: "Working tree flows to staging" } }
  ],
  checkpoints: [{
    checkpointId: "checkpoint.stage",
    stepId: "ido.stage",
    objectiveId: "git.commit.create",
    variantKey: "checkpoint.v1",
    trigger: { resourceId: "video.demo", segmentId: "segment.stage" },
    question: {
      kind: "single_choice",
      prompt: { en: "What does git add do?" },
      options: [{ optionId: "stage", label: { en: "Stages changes" } }, { optionId: "publish", label: { en: "Publishes changes" } }],
      correctOptionIds: ["stage"]
    },
    feedback: { correct: { en: "Correct" }, incorrect: { en: "Review staging" } },
    remediation: [{ kind: "video_segment", resourceId: "video.demo", segmentId: "segment.stage" }, { kind: "diagram", resourceId: "diagram.flow" }],
    evidence: { behavior: "assessed", weight: 0.5 },
    gate: "pause_non_blocking"
  }],
  tutorialSteps: []
});

describe("InteractiveActivityPlayer", () => {
  it("renders accessible controls, transcript, and non-video alternative", () => {
    const controller = createFakeMediaController();
    render(<InteractiveActivityPlayer activity={activity} controller={controller} locale="en" onAssess={vi.fn()} />);
    expect(screen.getByRole("region", { name: "Create a commit" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Play" })).toHaveAttribute("data-slot", "activity-play-toggle");
    fireEvent.click(screen.getByRole("button", { name: "Show transcript" }));
    expect(screen.getByText("Stage files before committing.")).toBeVisible();
    expect(screen.getByRole("img", { name: "Working tree flows to staging" })).toBeInTheDocument();
  });

  it("pauses at a cue, shows feedback, and replays the trusted segment", async () => {
    const controller = createFakeMediaController();
    const onAssess = vi.fn(async ({ answer }: { answer: unknown }) => ({ isCorrect: answer === "stage" }));
    render(<InteractiveActivityPlayer activity={activity} controller={controller} locale="en" onAssess={onAssess} />);
    act(() => controller.emit({ status: "playing", currentSeconds: 36, durationSeconds: 90, captionsEnabled: true }));
    expect(controller.pause).toHaveBeenCalled();
    expect(screen.getByRole("group", { name: "What does git add do?" })).toBeVisible();
    fireEvent.click(screen.getByLabelText("Publishes changes"));
    fireEvent.click(screen.getByRole("button", { name: "Check answer" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Review staging");
    fireEvent.click(screen.getByRole("button", { name: "Replay Stage files" }));
    expect(controller.seek).toHaveBeenCalledWith(12);
    expect(controller.play).toHaveBeenCalled();
  });

  it("keeps YouTube continuation non-blocking and announces a correct retry", async () => {
    const controller = createFakeMediaController();
    const onAssess = vi.fn(async ({ answer }: { answer: unknown }) => ({ isCorrect: answer === "stage" }));
    render(<InteractiveActivityPlayer activity={activity} controller={controller} locale="en" onAssess={onAssess} />);
    act(() => controller.emit({ status: "playing", currentSeconds: 36, durationSeconds: 90, captionsEnabled: true }));
    expect(screen.getByRole("button", { name: "Continue video" })).toBeEnabled();
    fireEvent.click(screen.getByLabelText("Stages changes"));
    fireEvent.click(screen.getByRole("button", { name: "Check answer" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Correct"));
    fireEvent.click(screen.getByRole("button", { name: "Continue video" }));
    expect(controller.play).toHaveBeenCalled();
  });
});
