export {
  userActivity,
  userWordRecords,
  userSentenceRecords,
  lessonProgress,
  classroomStudents,
  classrooms,
  storyRecords,
  xpLogs,
} from "@reading-advantage/db/schema";
export { getStudentProgress, getLessonProgress } from "./queries.js";
export { recordActivity, updateLessonProgress } from "./mutations.js";
export { PROGRESS_PERMISSIONS } from "./permissions.js";
export { ProgressError, StudentNotFoundError } from "./errors.js";
export {
  recordActivityInputSchema,
  updateLessonProgressInputSchema,
  type RecordActivityInput,
  type UpdateLessonProgressInput,
} from "./contracts.js";
