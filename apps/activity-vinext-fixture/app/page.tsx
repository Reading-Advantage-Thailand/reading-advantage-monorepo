"use client";

import { TutorialActivityPanel } from "@reading-advantage/activity-react";
import { activitySchema } from "@reading-advantage/activity-runtime/core";

const activity = activitySchema.parse({
  schemaVersion: "activity.v1", activityId: "fixture.vinext.tutorial", activityVersion: "1.0.0", graphVersion: "fixture.graph.v1", objectiveId: "fixture.objective", variantKey: "fixture.guided", mode: "guided_practice",
  title: { en: "Vinext shared tutorial fixture" }, accessibility: { transcriptRequired: false, captionsRequired: false, nonVideoAlternativeResourceId: "diagram.fixture" },
  resources: [{ kind: "diagram", resourceId: "diagram.fixture", assetId: "diagram.fixture", alt: { en: "Fixture boundary" } }], checkpoints: [],
  tutorialSteps: [{ stepId: "fixture.step", order: 1, objectiveId: "fixture.objective", variantKey: "fixture.guided", instruction: { en: "Verify the shared package renders under Vinext." }, resourceRefs: [{ kind: "diagram", resourceId: "diagram.fixture" }], checks: [{ checkId: "fixture.check", kind: "file_contains", expected: "shared" }], hints: [], reveals: [], scaffoldLevel: 0 }],
});

/** Renders the same shared tutorial export inside a real Vinext build host. */
export default function Page() {
  return <main><TutorialActivityPanel activity={activity} locale="en" onCheck={async () => ({ passed: true, checks: [{ checkId: "fixture.check", passed: true }] })} /></main>;
}
