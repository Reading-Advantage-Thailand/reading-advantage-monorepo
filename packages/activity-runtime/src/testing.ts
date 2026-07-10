import { activitySchema, type Activity } from "./core.js";

/**
 * Creates a minimal valid activity fixture for consumers and adapter tests.
 * @param overrides Optional top-level activity fields to replace.
 * @returns A fully validated activity.v1 fixture.
 */
export function createActivityFixture(overrides: Partial<Activity> = {}): Activity {
  return activitySchema.parse({
    schemaVersion: "activity.v1",
    activityId: "activity.fixture",
    activityVersion: "1.0.0",
    graphVersion: "graph.fixture.v1",
    objectiveId: "objective.fixture",
    variantKey: "variant.fixture.v1",
    mode: "worked_example",
    title: { en: "Fixture activity" },
    accessibility: { transcriptRequired: false, captionsRequired: false },
    resources: [],
    checkpoints: [],
    tutorialSteps: [],
    ...overrides,
  });
}
