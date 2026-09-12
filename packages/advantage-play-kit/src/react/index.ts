/** Accessible React host for APK cartridges. */
export { APKGameHost } from "./apk-game-host.js";
/** Searchable standard-pack QC gallery. */
export { StandardAssetGallery } from "./standard-asset-gallery.js";

/** Public React host props. */
export type { APKGameHostProps, APKHostCompletionConfirmation } from "./apk-game-host.js";
/** Public standard-pack gallery props. */
export type { StandardAssetGalleryProps } from "./standard-asset-gallery.js";

/** Shared authenticated student RPG state hook. */
export { useStudentRpg } from "./use-student-rpg.js";

/** Public student RPG hook configuration and result. */
export type { UseStudentRpgOptions, UseStudentRpgResult } from "./use-student-rpg.js";

/** Shared confirmed reward panel for authenticated student catalogs. */
export { StudentRpgCatalogPanel } from "./student-rpg-catalog-panel.js";

/** Public student catalog reward panel props. */
export type { StudentRpgCatalogPanelProps } from "./student-rpg-catalog-panel.js";

/** Shared server-issued reading challenge run hook. */
export { startStudentReadingChallengeRun, useStudentChallengeRun } from "./use-student-challenge-run.js";

/** Public student challenge run hook contracts. */
export type {
  UseStudentChallengeRunOptions,
  UseStudentChallengeRunResult,
} from "./use-student-challenge-run.js";

/** Shared authenticated class challenge catalog panel. */
export { StudentChallengeCatalogPanel } from "./student-challenge-catalog-panel.js";

/** Public class challenge catalog panel contracts. */
export type {
  StudentChallengeCatalogGame,
  StudentChallengeCatalogPanelProps,
} from "./student-challenge-catalog-panel.js";

/** Shared teacher class challenge form. */
export { TeacherChallengePanel } from "./teacher-challenge-panel.js";

/** Public teacher challenge form contracts. */
export type { TeacherChallengeGame, TeacherChallengePanelProps } from "./teacher-challenge-panel.js";
