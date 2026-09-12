export {
  createClassChallenge,
  startClassChallengeRun,
  type ChallengeGameCapability,
} from "./mutations.js";
export { listClassChallenges, listOwnedChallengeClasses, listStudentChallengeClasses } from "./queries.js";
export {
  createClassChallengeInputSchema,
  listClassChallengesInputSchema,
  listStudentClassesInputSchema,
  studentChallengeClassPageSchema,
  startClassChallengeRunInputSchema,
  type CreateClassChallengeInput,
  type ListClassChallengesInput,
  type ListStudentClassesInput,
  type StudentChallengeClassPage,
  type StartClassChallengeRunInput,
} from "./schema.js";
export { CHALLENGE_PERMISSIONS } from "./permissions.js";
export {
  recordChallengeContribution,
  type ChallengeContributionResult,
  type ChallengeSavedCompletion,
} from "./contributions.js";
