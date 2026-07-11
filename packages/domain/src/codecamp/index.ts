export {
  codecampModules, codecampLessons, codecampExercises, codecampQuizQuestions,
  codecampUserProgress, codecampChatConversations, codecampChatMessages,
  codecampExerciseRepos, codecampPrReviews, codecampWebhookEvents,
} from "@reading-advantage/db/schema";

export {
  getModuleBySlug, getModulesWithProgress, getModulesByPhase,
  getModuleWithExercises, checkModulePrerequisite,
} from "./modules.js";

export { getLessonsForModule, getLessonWithContent } from "./lessons.js";

export { submitExerciseAttempt, getExerciseRepos, getExerciseRepoByUrl, linkExerciseRepo } from "./exercises.js";

export { submitQuizAnswers, markTheoryComplete, QUIZ_PASS_THRESHOLD } from "./quizzes.js";

export { saveChatMessage, getChatHistory, getUserConversations, getChatContext } from "./chat.js";

export { updateUserProgress, getUserDashboard } from "./progress.js";

export {
  getPrReviewsForUser, createPrReview, updatePrReview,
  completeApprovedPrReviewLesson, getPrReviewByPrUrl,
  logWebhookEvent, listWebhookEvents,
  type CodecampWebhookEventOutcome,
} from "./pr-reviews.js";

export {
  listDeadReviewJobs, requeueReviewJob,
  type ListReviewJobsInput, type RequeueReviewJobInput,
  type ReviewJobRow,
} from "./review-jobs.js";

export { createInternAccount, updateInternGithubUsername, listInterns, getInternProgress } from "./intern-accounts.js";
export { assertCodecampModuleAssigned, CODECAMP_APK_CURRICULUM_VERSION, filterCodecampModulesForAssignment, hasCodecampAPKCurriculum, isCodecampAPKCurriculumReleased } from "./curriculum-assignments.js";

export { CODECAMP_PERMISSIONS } from "./permissions.js";

export {
  CodecampError, ModuleNotFoundError, LessonNotFoundError,
  ExerciseNotFoundError, ConversationNotFoundError, InternNotFoundError,
} from "./errors.js";

export type { PracticeIssue } from "@reading-advantage/integrations-github";
export { getPracticeIssues } from "./github-issues.js";

export { reviewExercise, reviewResultSchema, apkPrEvaluationSchema, isPassingAPKPrEvaluation, aiClientToGenerateReview, type APKPrEvaluation } from "./review-exercise.js";
