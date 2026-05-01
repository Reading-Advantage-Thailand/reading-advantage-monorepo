import { z } from "zod";

// ---------------------------------------------------------------------------
// ENUMS & SHARED TYPES
// ---------------------------------------------------------------------------

const harmonStageEnum = z.enum([
  "You",    // Zone of Comfort
  "Need",   // Desire / Inciting Incident
  "Go",     // Crossing the Threshold
  "Search", // Road of Trials
  "Find",   // Meeting the Goal
  "Take",   // Pay the Price
  "Return", // Bringing it Home
  "Change"  // Master of Two Worlds
]);

const cefrLevelEnum = z.enum([
  "A0", // Starters
  "A1", // Movers
  "A2", // Flyers
  "A2+", // KET
  "B1"  // PET
]);

const translationSchema = z.object({
  th: z.string().describe("Thai translation"),
  cn: z.string().describe("Simplified Chinese translation"),
  tw: z.string().describe("Traditional Chinese translation"),
  vi: z.string().describe("Vietnamese translation"),
});

const characterSchema = z.object({
  name: z.string(),
  description: z.string().describe("Personality and role in the story. Must be relatable to the target age group."),
  visualDescription: z.string().describe("A concise physical appearance description suitable for generating consistent character images."),
});

// ---------------------------------------------------------------------------
// 1. THE BLUEPRINT (Global Planning Phase)
// ---------------------------------------------------------------------------

const storyBlueprintSchema = z.object({
  // High Level Concept
  topic: z.string().describe("The core subject matter of the story."),
  genre: z.string().describe("The literary genre (e.g., Mystery, Adventure, Fantasy)."),
  cefrLevel: cefrLevelEnum.describe("The strictly enforced proficiency level for all generated text."),
  targetAudience: z.string().describe("The specific age range and their interests (e.g., 'Aged 7-8, likes animals')."),

  // Language Planning
  globalVocabularyList: z.array(z.string()).describe(
    "A master list of 20-30 vocabulary words that are challenging yet appropriate for the specific level (e.g., Starters whitelist for A0). These words must be distributed and taught throughout the story."
  ),
  globalGrammarStructures: z.array(z.string()).describe(
    "A whitelist of grammar structures to be used, strictly adhering to the level constraints (e.g., A0: Present Simple only; B1: Past Perfect allowed)."
  ),

  // Narrative Planning (The Harmon Circle)
  harmonOutline: z.array(
    z.object({
      stage: harmonStageEnum,
      chapterNumber: z.number(),
      summary: z.string().describe("A 2-3 sentence summary of the events in this specific stage."),
      plotBeat: z.string().describe("The specific narrative action that fulfills this Harmon stage (e.g., 'You': Establish the hero's normal life)."),
      engagementStrategy: z.string().describe("The specific technique used to maintain reader interest (e.g., 'Cliffhanger ending', 'Funny mistake').")
    })
  ).length(8).describe("A strict 8-step outline following Dan Harmon's Story Circle. Each item corresponds to one chapter."),

  characters: z.array(characterSchema).describe("The cast of the story, typically 2-3 main characters to avoid confusion."),
});

// ---------------------------------------------------------------------------
// 2. THE EXECUTION (Chapter Writing Phase)
// ---------------------------------------------------------------------------

const chapterSchema = z.object({
  // Context
  chapterNumber: z.number(),
  stage: harmonStageEnum,
  
  // Chapter-Specific Planning (Mini-Thinking)
  chapterBlueprint: z.object({
    selectedVocabulary: z.array(z.string()).describe("Select 3-8 specific words from the 'globalVocabularyList' to feature and reinforce in THIS chapter."),
    grammarFocus: z.string().describe("Identify 1-2 specific grammar structures from the 'globalGrammarStructures' to be used naturally within THIS chapter."),
    pacing: z.string().describe("Define the pacing for this chapter (e.g., 'Slow and descriptive' or 'Fast and urgent')."),
    cliffhangerOrHook: z.string().describe("Explicitly state the closing sentence or concept that will drive the reader to the next chapter."),
  }).describe("A pre-computation step to plan the specific linguistic and narrative details of this chapter before writing."),

  // Content
  title: z.string().describe("A catchy, short title for the chapter."),
  passage: z.string().describe("The story text for this chapter. MUST adhere to the level constraints (length, vocabulary, grammar). MUST follow the 'harmonOutline' for plot and the 'chapterBlueprint' for language focus."),
  
  // Assets & Metadata
  summary: z.string().describe("A concise 1-sentence summary of this chapter."),
  translatedSummary: translationSchema,
  imageDesc: z.string().describe("A highly detailed visual prompt for an AI image generator to create a scene specifically for this chapter, maintaining character consistency."),
  
  // Educational Assets (Per Chapter)
  wordlist: z.array(z.object({
    vocabulary: z.string().describe("A word from the passage."),
    definition: z.string().describe("A simple, level-appropriate definition in English."),
    translation: translationSchema,
  })).describe("A list of 3-8 key vocabulary words extracted from THIS chapter."),

  sentences: z.array(z.string()).describe("3-5 key sentences from the passage that demonstrate the 'grammarFocus'."),
  sentencesFlashcard: z.array(z.object({
    sentence: z.string().describe("A key sentence from the chapter."),
    translation: translationSchema,
  })).describe("Flashcards for the key sentences of this chapter."),
  
  // Assessment (Per Chapter)
  multipleChoiceQuestions: z.array(z.object({
    question: z.string().describe("A comprehension question based strictly on this chapter's text."),
    options: z.array(z.string()).length(4).describe("4 answer options: 1 correct, 3 plausible distractors."),
    answer: z.string().describe("The correct answer text."),
  })).describe("3-5 Multiple Choice Questions testing detailed comprehension of this chapter."),
  
  shortAnswerQuestions: z.array(z.object({
    question: z.string().describe("An open-ended question requiring a short written response."),
    answer: z.string().describe("A model answer for the question."),
  })).describe("1-3 Short Answer Questions testing recall and simple inference."),
  
  longAnswerQuestions: z.array(z.object({
    question: z.string().describe("A prompt for a longer, reflective response."),
  })).describe("1 Long Answer Question encouraging personal connection or deeper analysis."),
});

// ---------------------------------------------------------------------------
// MAIN SCHEMA
// ---------------------------------------------------------------------------

export const storyGeneratorSchema = z.object({
  // The Model first thinks about the plan...
  blueprint: storyBlueprintSchema.describe("The strategic plan for the entire story, including language targets and the narrative arc."),
  
  // ...then executes the chapters based on that plan.
  chapters: z.array(chapterSchema).describe("The 8 chapters generated sequentially, strictly following the 'blueprint'."),
});

// ---------------------------------------------------------------------------
// ARTICLE SCHEMA (Legacy/Existing - Kept for reference/compatibility)
// ---------------------------------------------------------------------------

export const articleGeneratorSchema = z.object({
  brainstorming: z.string().describe("Brainstorm various ideas for the article or passage in short phrases."),
  planning: z.string().describe("Planning for the passage: strategy for vocabulary and grammar."),
  title: z.string().describe("An interesting title for the article written at the same CEFR level."),
  passage: z.string().describe("The reading passage."),
  summary: z.string(),
  imageDesc: z.string(),
  translatedSummary: translationSchema,
  sentences: z.array(z.string()),
  wordlist: z.array(z.object({
    vocabulary: z.string(),
    definitions: z.object({
      en: z.string(),
      th: z.string(),
      cn: z.string(),
      tw: z.string(),
      vi: z.string(),
    }),
  })),
  flashcard: z.array(z.object({
    sentence: z.string(),
    translation: translationSchema,
  })),
  multipleChoiceQuestions: z.array(z.object({
    question: z.string(),
    options: z.array(z.string()),
    answer: z.string(),
  })),
  shortAnswerQuestions: z.array(z.object({
    question: z.string(),
    answer: z.string(),
  })),
  longAnswerQuestions: z.array(z.object({
    question: z.string(),
  })),
});
