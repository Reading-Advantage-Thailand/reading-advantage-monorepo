import { activitySchema } from "@reading-advantage/activity-runtime/core";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TutorialActivityPanel } from "../tutorial-activity-panel.js";

const activity = activitySchema.parse({
  schemaVersion: "activity.v1", activityId: "tutorial-1", activityVersion: "1.0.0", graphVersion: "graph-1", objectiveId: "objective-1", variantKey: "guided-1", mode: "guided_practice",
  title: { en: "Guided repository", th: "Repository แบบมีคำแนะนำ" }, accessibility: { transcriptRequired: false, captionsRequired: false, nonVideoAlternativeResourceId: "diagram-1" },
  resources: [{ kind: "diagram", resourceId: "diagram-1", assetId: "diagram-1", alt: { en: "Boundary" } }], checkpoints: [],
  tutorialSteps: [{ stepId: "step-1", order: 1, objectiveId: "objective-1", variantKey: "guided-1", instruction: { en: "Edit the cartridge manifest.", th: "แก้ไข cartridge manifest" }, resourceRefs: [{ kind: "diagram", resourceId: "diagram-1" }], checks: [{ checkId: "manifest", kind: "file_contains", expected: "runtimeApiVersion" }], hints: [{ hintId: "hint-1", text: { en: "Inspect the manifest type.", th: "ดู type ของ manifest" } }], reveals: [{ revealId: "reveal-1", text: { en: "Add runtimeApiVersion.", th: "เพิ่ม runtimeApiVersion" } }], scaffoldLevel: 2 }],
});

describe("TutorialActivityPanel", () => {
  it("reveals support, delegates verification, and announces completion", async () => {
    const onSupportUsage = vi.fn();
    const onCheck = vi.fn().mockResolvedValue({ passed: true, checks: [{ checkId: "manifest", passed: true }] });
    render(<TutorialActivityPanel activity={activity} locale="en" onCheck={onCheck} onSupportUsage={onSupportUsage} renderResource={() => <span>Host boundary diagram</span>} />);
    expect(screen.getByRole("progressbar", { name: "Tutorial progress" })).toHaveAttribute("aria-valuenow", "0");
    expect(screen.getByText("Host boundary diagram")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Show next hint" }));
    expect(await screen.findByText("Inspect the manifest type.")).toBeVisible();
    expect(onSupportUsage).toHaveBeenCalledWith({ stepId: "step-1", kind: "hint", supportId: "hint-1" });
    fireEvent.click(screen.getByRole("button", { name: "Run verified checks" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Tutorial complete"));
    expect(onCheck).toHaveBeenCalledWith("step-1");
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "1");
  });

  it("localizes controls and keeps failed checks retryable", async () => {
    render(<TutorialActivityPanel activity={activity} locale="th" onCheck={async () => ({ passed: false, checks: [{ checkId: "manifest", passed: false }] })} />);
    fireEvent.click(screen.getByRole("button", { name: "ตรวจสอบ repository" }));
    expect(await screen.findByRole("status")).toHaveTextContent("ยังต้องแก้ไขบางจุด");
    expect(screen.getByRole("button", { name: "ตรวจสอบ repository" })).toBeEnabled();
  });

  it("hydrates controlled completion from a durable session projection", () => {
    render(<TutorialActivityPanel activity={activity} locale="en" completedStepIds={["step-1"]} onCheck={vi.fn()} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "1");
    expect(screen.getByRole("status")).toHaveTextContent("Tutorial complete");
  });
});
