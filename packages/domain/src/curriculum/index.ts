export { scienceLessons } from "@reading-advantage/db/schema";
export { getScienceLesson, listScienceLessons, getLessonBySlug } from "./queries.js";
export { createScienceLesson } from "./mutations.js";
export { CURRICULUM_PERMISSIONS } from "./permissions.js";
export { CurriculumError, LessonNotFoundError } from "./errors.js";
export {
  getScienceLessonInputSchema,
  listScienceLessonsInputSchema,
  createScienceLessonInputSchema,
  type CreateScienceLessonInput,
} from "./contracts.js";
