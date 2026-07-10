// Domain barrel exports
export * as articles from "./articles/index.js";
export * as assignments from "./assignments/index.js";
export * as classes from "./classes/index.js";
export * as progress from "./progress/index.js";
export * as reading from "./reading/index.js";
export * as students from "./students/index.js";
export * as reports from "./reports/index.js";
export * as users from "./users/index.js";
export * as codecamp from "./codecamp/index.js";
export * as licenses from "./licenses/index.js";
export * as stories from "./stories/index.js";
export * as gamification from "./gamification/index.js";
export * as curriculum from "./curriculum/index.js";
export * as quiz from "./quiz/index.js";
export * as teachers from "./teachers/index.js";
export * as mastery from "./mastery/index.js";
export * as ai from "./ai/index.js";
export * as interventions from "./interventions/index.js";
export * as sales from "./sales/index.js";
export {
  createTenantDB,
  type TenantDB,
  TenantScopeError,
} from "./db-contract.js";
export { classifyTable, type TableClassification } from "./tenant-registry.js";

// Reading-specific direct exports (used by reading-advantage controllers/tests)
export {
  getSystemDashboardData,
  systemDashboardQuerySchema,
  type SystemDashboardQuery,
  type SystemDashboardData,
  getSchoolSegmentsData,
  resolveLicenseScope,
  schoolSegmentsQuerySchema,
  type SchoolSegmentsQuery,
  type SchoolSegmentsData,
  type LicenseScopeResult,
  scheduleFsrsReview,
  scheduleFsrsReviewNow,
  type FsrsRating,
  type FsrsCardState,
  type FsrsReviewInput,
  type FsrsReviewOutput,
} from "./reading/index.js";
