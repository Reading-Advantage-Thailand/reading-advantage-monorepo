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
    fireEvent.change(screen.getByRole("slider", { name: "Seek tutorial video" }), { target: { value: "24" } });
    expect(controller.seek).toHaveBeenCalledWith(24);
    fireEvent.click(screen.getByRole("button", { name: "Show transcript" }));
    expect(screen.getByText("Stage files before committing.")).toBeVisible();
    expect(screen.getByRole("img", { name: "Working tree flows to staging" })).toBeInTheDocument();
    expect(screen.getByText("Diagram: Working tree flows to staging")).toBeVisible();
  });

  it("pauses at a cue, shows feedback, and replays the trusted segment", async () => {
    const controller = createFakeMediaController();
    const onAssess = vi.fn(async ({ answer }: { answer: unknown }) => ({ isCorrect: answer === "stage" }));
    render(<InteractiveActivityPlayer activity={activity} controller={controller} locale="en" onAssess={onAssess} />);
    act(() => controller.emit({ status: "playing", currentSeconds: 36, durationSeconds: 90, captionsEnabled: true }));
    expect(controller.pause).toHaveBeenCalled();
    expect(screen.getByRole("group", { name: "What does git add do?" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Check answer" }));
    expect(onAssess).not.toHaveBeenCalled();
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

  it("enforces an explicitly approved hosted hard gate until a correct answer", async () => {
    const hosted = activitySchema.parse({
      ...activity,
      resources: activity.resources.map((resource) => resource.kind === "video" ? {
        ...resource,
        provider: "hosted",
        videoId: undefined,
        assetId: "hosted.asset",
        hardGateApproval: { approvalId: "approval.1", approvedBy: "owner", approvedAt: "2026-07-10T00:00:00Z" }
      } : resource),
      checkpoints: activity.checkpoints.map((checkpoint) => ({ ...checkpoint, gate: "answer_before_continue" }))
    });
    const controller = createFakeMediaController();
    render(<InteractiveActivityPlayer activity={hosted} controller={controller} locale="en" onAssess={async () => ({ isCorrect: true })} />);
    fireEvent.click(screen.getByRole("button", { name: "Play" }));
    expect(controller.play).toHaveBeenCalled();
    act(() => controller.emit({ status: "playing", currentSeconds: 36, durationSeconds: 90, captionsEnabled: true }));
    const continueButton = screen.getByRole("button", { name: "Continue video" });
    expect(continueButton).toBeDisabled();
    const playToggle = screen.getByRole("button", { name: "Pause" });
    expect(playToggle).toBeDisabled();
    expect(screen.getByRole("slider", { name: "Seek tutorial video" })).toBeDisabled();
    fireEvent.click(playToggle);
    expect(controller.play).toHaveBeenCalledTimes(1);
    act(() => controller.emit({ status: "error", currentSeconds: 36, durationSeconds: 90, captionsEnabled: true, errorMessage: "Connection lost" }));
    fireEvent.click(screen.getByRole("button", { name: "Retry media" }));
    expect(controller.seek).toHaveBeenCalledWith(12);
    expect(controller.play).toHaveBeenCalledTimes(2);
    act(() => controller.emit({ status: "playing", currentSeconds: 36, durationSeconds: 90, captionsEnabled: true }));
    expect(controller.pause).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByLabelText("Stages changes"));
    fireEvent.click(screen.getByRole("button", { name: "Check answer" }));
    await waitFor(() => expect(continueButton).toBeEnabled());
    expect(playToggle).toBeEnabled();
  });

  it("localizes essential shared controls for Thai learners", () => {
    const controller = createFakeMediaController();
    render(<InteractiveActivityPlayer activity={activity} controller={controller} locale="th" onAssess={vi.fn()} />);
    expect(screen.getByRole("button", { name: "เล่น" })).toBeVisible();
    expect(screen.getByRole("slider", { name: "เลื่อนวิดีโอบทเรียน" })).toBeVisible();
    expect(screen.getByRole("button", { name: "แสดงบทถอดเสียง" })).toBeVisible();
  });

  it("supports free-text checkpoints and playing-state pause controls", () => {
    const freeText = activitySchema.parse({
      ...activity,
      checkpoints: [{
        ...activity.checkpoints[0],
        question: { kind: "free_text", prompt: { en: "Which command stages files?" }, acceptedAnswers: ["git add"] }
      }]
    });
    const controller = createFakeMediaController();
    render(<InteractiveActivityPlayer activity={freeText} controller={controller} locale="en" onAssess={async () => ({ isCorrect: true })} />);
    act(() => controller.emit({ status: "playing", currentSeconds: 36, durationSeconds: 90, captionsEnabled: true }));
    expect(screen.getByRole("textbox", { name: "Answer" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Pause" }));
    expect(controller.pause).toHaveBeenCalled();
  });

  it("handles resume, focus, watched batches, provider errors, retry, and cleanup", () => {
    const controller = createFakeMediaController();
    const onPositionChange = vi.fn();
    const onWatchedRangesChange = vi.fn();
    const { unmount } = render(
      <InteractiveActivityPlayer
        activity={activity}
        controller={controller}
        locale="en"
        initialPositionSeconds={7}
        onPositionChange={onPositionChange}
        onWatchedRangesChange={onWatchedRangesChange}
        onAssess={async () => ({ isCorrect: true })}
      />
    );
    expect(controller.seek).toHaveBeenCalledWith(7);
    act(() => controller.emit({ status: "playing", currentSeconds: 10, durationSeconds: 90, captionsEnabled: true }));
    act(() => controller.emit({ status: "playing", currentSeconds: 20, durationSeconds: 90, captionsEnabled: true }));
    act(() => controller.emit({ status: "paused", currentSeconds: 20, durationSeconds: 90, captionsEnabled: true }));
    expect(onPositionChange).toHaveBeenLastCalledWith(20);
    expect(onWatchedRangesChange).toHaveBeenCalledWith([{ startSeconds: 10, endSeconds: 20 }]);
    act(() => controller.emit({ status: "playing", currentSeconds: 36, durationSeconds: 90, captionsEnabled: true }));
    expect(screen.getByLabelText("Stages changes")).toHaveFocus();
    act(() => controller.emit({ status: "error", currentSeconds: 36, durationSeconds: 90, captionsEnabled: true, errorMessage: "Connection lost" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Connection lost");
    fireEvent.click(screen.getByRole("button", { name: "Retry media" }));
    expect(controller.play).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Retry media" })).toHaveAttribute("data-touch-target", "true");
    unmount();
    expect(controller.destroy).toHaveBeenCalledOnce();
  });

  it("mounts host media and keeps engagement, multi-select, and remediation contracts distinct", async () => {
    const expanded = activitySchema.parse({
      ...activity,
      accessibility: { ...activity.accessibility, nonVideoAlternativeResourceId: "lesson.staging" },
      resources: [
        {
          kind: "video",
          resourceId: "video.hosted-unrelated",
          provider: "hosted",
          assetId: "hosted.unrelated",
          captionsAvailable: true,
          hardGateApproval: { approvalId: "approval.unrelated", approvedBy: "owner", approvedAt: "2026-07-10T00:00:00Z" },
          segments: [{ segmentId: "segment.unrelated", label: { en: "Unrelated" }, startSeconds: 0, endSeconds: 5 }]
        },
        ...activity.resources,
        { kind: "lesson_section", resourceId: "lesson.staging", sectionId: "staging", label: { en: "Read the staging explanation" } },
        { kind: "repository_location", resourceId: "repo.status", repositoryId: "tutorial", filePath: "src/status.ts", symbol: "getStatus", label: { en: "Inspect the status helper" } }
      ],
      checkpoints: [{
        ...activity.checkpoints[0],
        question: {
          kind: "multiple_choice",
          prompt: { en: "Which items belong to staging?" },
          options: [{ optionId: "tracked", label: { en: "Tracked change" } }, { optionId: "selected", label: { en: "Selected file" } }],
          correctOptionIds: ["tracked", "selected"]
        },
        evidence: { behavior: "engagement", weight: 0 },
        gate: "answer_before_continue",
        remediation: [
          { kind: "video_segment", resourceId: "video.demo", segmentId: "segment.stage" },
          { kind: "diagram", resourceId: "diagram.flow" },
          { kind: "lesson_section", resourceId: "lesson.staging" },
          { kind: "repository_location", resourceId: "repo.status" }
        ]
      }]
    });
    const controller = createFakeMediaController();
    const onAssess = vi.fn();
    const onEngage = vi.fn();
    render(
      <InteractiveActivityPlayer
        activity={expanded}
        controller={controller}
        locale="en"
        onAssess={onAssess}
        onEngage={onEngage}
        renderMedia={({ video }) => <iframe title="Hosted tutorial media" data-resource-id={video.resourceId} />}
        renderResource={({ resource, context }) => resource.kind === "diagram"
          ? <div role="img" aria-label={`${context}: ${resource.alt.en}`}>Rendered diagram</div>
          : undefined}
      />
    );
    expect(screen.getByTitle("Hosted tutorial media")).toHaveAttribute("data-resource-id", "video.hosted-unrelated");
    expect(screen.getAllByRole("link", { name: "Read the staging explanation" })[0]).toBeVisible();
    act(() => controller.emit({ status: "playing", currentSeconds: 36, durationSeconds: 90, captionsEnabled: true }));
    expect(screen.getByRole("button", { name: "Continue video" })).toBeEnabled();
    fireEvent.click(screen.getByLabelText("Tracked change"));
    fireEvent.click(screen.getByLabelText("Selected file"));
    fireEvent.click(screen.getByRole("button", { name: "Check answer" }));
    await waitFor(() => expect(onEngage).toHaveBeenCalledWith({ checkpointId: "checkpoint.stage", answer: ["tracked", "selected"] }));
    expect(onAssess).not.toHaveBeenCalled();
    expect(screen.getByRole("img", { name: "remediation: Working tree flows to staging" })).toBeVisible();
    expect(screen.getAllByRole("link", { name: "Read the staging explanation" })).toHaveLength(2);
    expect(screen.getByText("tutorial/src/status.ts#getStatus")).toBeVisible();
  });

  it("hydrates with a stable reduced-motion value and follows preference changes", async () => {
    let notifyPreferenceChange: (() => void) | undefined;
    const preference = {
      matches: true,
      addEventListener: vi.fn((_event: string, listener: () => void) => { notifyPreferenceChange = listener; }),
      removeEventListener: vi.fn(),
    };
    vi.stubGlobal("matchMedia", vi.fn(() => preference));
    const controller = createFakeMediaController();
    const { unmount } = render(
      <InteractiveActivityPlayer activity={activity} controller={controller} locale="en" onAssess={vi.fn()} />
    );
    await waitFor(() => expect(screen.getByRole("region", { name: "Create a commit" })).toHaveAttribute("data-reduced-motion", "true"));
    preference.matches = false;
    act(() => notifyPreferenceChange?.());
    expect(screen.getByRole("region", { name: "Create a commit" })).toHaveAttribute("data-reduced-motion", "false");
    unmount();
    expect(preference.removeEventListener).toHaveBeenCalledWith("change", expect.any(Function));
    vi.unstubAllGlobals();
  });
});
