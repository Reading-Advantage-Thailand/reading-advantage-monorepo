/** The story input contract lives in game-contracts; the kit re-exports it for the games. */
export {
  CEFR_LEVELS,
  baseLevel,
  cefrLevelSchema,
  normalizeCefrLevel,
  parseStoryIndex,
  parseStoryInput,
  storyFillSchema,
  storyIndexEntrySchema,
  storyIndexSchema,
  storyInputSchema,
  storyParagraphSchema,
  storyQuestionSchema,
  storySentenceSchema,
  storySourceSchema,
  storyVocabularySchema,
  toSentenceInput,
  toStoryIndexEntry,
  toVocabularyInput,
} from '@reading-advantage/game-contracts';
export type { CefrLevel, StoryFill, StoryIndexEntry, StoryInput, StoryParagraph, StoryQuestion, StorySentence, StoryVocabulary } from '@reading-advantage/game-contracts';
