export { stories, storyRecords } from "@reading-advantage/db/schema";
export { getStory, listStories, listPrimaryStories, getStoryForStudent, getChapterForStudent } from "./queries.js";
export { recordStoryRead } from "./mutations.js";
export { STORY_PERMISSIONS } from "./permissions.js";
export { StoryError, StoryNotFoundError, ChapterNotFoundError } from "./errors.js";
export {
  STORIES_PAGE_SIZE,
  listPrimaryStoriesInputSchema,
  listPrimaryStoriesOutputSchema,
  storyCardSchema,
  getStoryForStudentInputSchema,
  getStoryForStudentOutputSchema,
  storyChapterItemSchema,
  storyCharacterSchema,
  getChapterForStudentInputSchema,
  getChapterForStudentOutputSchema,
  chapterWordSchema,
  type GetChapterForStudentInput,
  type GetChapterForStudentOutput,
  type ChapterWord,
  type GetStoryForStudentInput,
  type GetStoryForStudentOutput,
  type StoryChapterItem,
  type StoryCharacter,
  type ListPrimaryStoriesInput,
  type ListPrimaryStoriesOutput,
  type StoryCard,
} from "./contracts.js";
export {
  LEGACY_STORY_TABLE,
  legacyStoryIdSchema,
  resolveLegacyChapter,
  resolveLegacyStoryId,
  resolveLegacyStoryIdInputSchema,
  resolveLegacyStoryIdOutputSchema,
} from "./legacy-id.js";
