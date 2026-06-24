/**
 * Error classes for the sales-advantage domain module.
 */
export class SalesError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = "SalesError";
  }
}

/** Thrown when a roleplay is submitted against a rubric still in draft. */
export class RubricNotApprovedError extends SalesError {
  constructor(rubricId: string) {
    super(
      `Rubric '${rubricId}' is not approved — draft rubrics cannot evaluate attempts`,
      "RUBRIC_NOT_APPROVED",
    );
    this.name = "RubricNotApprovedError";
  }
}

/** Thrown when audio storage upload/retrieval fails. */
export class AudioStorageError extends SalesError {
  constructor(detail: string, public readonly cause?: unknown) {
    super(`Audio storage failure: ${detail}`, "AUDIO_STORAGE_ERROR");
    this.name = "AudioStorageError";
  }
}

/** Thrown when a roleplay scenario is not found. */
export class ScenarioNotFoundError extends SalesError {
  constructor(scenarioId: string) {
    super(`Roleplay scenario '${scenarioId}' not found`, "SCENARIO_NOT_FOUND");
    this.name = "ScenarioNotFoundError";
  }
}

/** Thrown when a learner tries to advance to a module whose prerequisites are incomplete. */
export class ModulePrerequisiteNotMetError extends SalesError {
  constructor(moduleSlug: string, prerequisiteSlug: string) {
    super(
      `Cannot start module '${moduleSlug}' — prerequisite '${prerequisiteSlug}' is not complete`,
      "MODULE_PREREQUISITE_NOT_MET",
    );
    this.name = "ModulePrerequisiteNotMetError";
  }
}

/** Thrown when a learner tries to view content that is still in draft. */
export class CurriculumNotApprovedError extends SalesError {
  constructor(lessonId: string) {
    super(
      `Lesson '${lessonId}' is not approved — draft content is invisible to reps`,
      "CURRICULUM_NOT_APPROVED",
    );
    this.name = "CurriculumNotApprovedError";
  }
}
