import { z } from "zod";

const CEFRLevelRequirementsSchema = z.object({
  wordCount: z.object({
    fiction: z.number(),
    nonfiction: z.number(),
  }),
  sentenceStructure: z.object({
    averageWords: z.string(),
    complexity: z.string(),
    allowedStructures: z.array(z.string()),
  }),
  vocabulary: z.object({
    level: z.string(),
    restrictions: z.array(z.string()),
    suggestions: z.array(z.string()),
  }),
  grammar: z.object({
    allowedTenses: z.array(z.string()),
    allowedStructures: z.array(z.string()),
    restrictions: z.array(z.string()),
  }),
  content: z.object({
    plotComplexity: z.string(),
    characterDepth: z.string(),
    themes: z.string(),
    culturalReferences: z.string(),
  }),
  style: z.object({
    tone: z.string(),
    literaryDevices: z.array(z.string()),
    narrativeApproach: z.string(),
  }),
  structure: z.object({
    paragraphLength: z.string(),
    textOrganization: z.string(),
    transitionComplexity: z.string(),
  }),
});

export const CEFRRequirements: Record<
  string,
  z.infer<typeof CEFRLevelRequirementsSchema>
> = {
  A1: {
    wordCount: {
      fiction: 250,
      nonfiction: 250,
    },
    sentenceStructure: {
      averageWords: "4-5 words",
      complexity: "Very simple",
      allowedStructures: [
        "Subject + Verb (I sleep)",
        "Subject + Verb + Object (I like coffee)",
        "Basic questions (Where is...?, What is...?)",
        "Simple negatives (I don't like)",
        "Basic compound sentences with 'and' only",
      ],
    },
    vocabulary: {
      level: "Basic / Beginner (500-600 most frequent words)",
      restrictions: [
        "Limit to 500-600 most frequent English words",
        "No idioms or expressions",
        "No phrasal verbs",
        "No abstract concepts",
        "No synonyms beyond most basic words",
        "Words must relate to immediate personal needs (food, travel, family)",
      ],
      suggestions: [
        "Basic nouns for everyday objects (table, book, water)",
        "Common action verbs (go, eat, sleep, have)",
        "Simple adjectives (big, small, good, bad)",
        "Basic adverbs (here, there, now)",
        "Numbers 1-100",
        "Days, months, basic time expressions",
      ],
    },
    grammar: {
      allowedTenses: [
        "Simple Present (only for facts and habits)",
        "Present Continuous (only for current actions)",
        "Simple Past (only most common regular and irregular verbs)",
      ],
      allowedStructures: [
        "Basic word order (SVO)",
        "Yes/no questions and short answers",
        "Wh- questions (what, where, when)",
        "Basic prepositions (in, on, at, from)",
        "Simple conjunctions (and, but, or)",
        "Basic articles (a, an, the)",
      ],
      restrictions: [
        "No perfect tenses",
        "No future tenses except 'going to' for obvious plans",
        "No passive voice",
        "No conditionals",
        "No reported speech",
        "No complex modals (only can/can't for ability)",
        "No gerunds or infinitive constructions",
      ],
    },
    content: {
      plotComplexity: "Very simple and linear",
      characterDepth: "Basic descriptions and actions only",
      themes: "Concrete, everyday situations only",
      culturalReferences: "Avoid unless extremely basic and universal",
    },
    style: {
      tone: "Simple and direct",
      literaryDevices: ["Basic repetition", "Simple descriptions"],
      narrativeApproach: "Straightforward chronological narration",
    },
    structure: {
      paragraphLength: "2-3 short sentences",
      textOrganization: "Simple chronological order",
      transitionComplexity: "Basic time markers only (then, next)",
    },
  },
  A2: {
    wordCount: {
      fiction: 400,
      nonfiction: 350,
    },
    sentenceStructure: {
      averageWords: "6-7 words",
      complexity: "Simple with some compound sentences",
      allowedStructures: [
        "Simple sentences with more variety",
        "Compound sentences with common conjunctions (and, but, or, so, because)",
        "More complex questions with question words",
        "Simple sentences with time clauses (when, after, before)",
        "Basic sentences with frequency adverbs",
      ],
    },
    vocabulary: {
      level: "Elementary (1000-1500 most frequent words)",
      restrictions: [
        "Limit to ~1000-1500 most frequent words",
        "Only very basic idiomatic expressions (make a mistake, have a good time)",
        "Only simplest phrasal verbs (get up, turn on/off, look for)",
        "Very simple abstract concepts only (like/dislike, happy/sad)",
        "Limited topic range (daily routines, shopping, local geography)",
      ],
      suggestions: [
        "Common vocabulary for routine situations (shopping, travel, food)",
        "Basic descriptive adjectives with common gradation (very happy, too big)",
        "Common adverbs of frequency and manner (usually, sometimes, well, fast)",
        "Simple connectors (first, then, after that, finally)",
        "Basic emotion and opinion vocabulary",
        "Common collocations (make the bed, do homework)",
      ],
    },
    grammar: {
      allowedTenses: [
        "Simple Present (wider use)",
        "Present Continuous (wider use)",
        "Simple Past (regular and common irregular verbs)",
        "Going to future (for plans)",
        "Will (only for simple predictions and offers)",
      ],
      allowedStructures: [
        "Compound sentences with common conjunctions",
        "Basic comparatives and superlatives of adjectives",
        "More prepositions with common uses",
        "Adverbs of frequency (position and use)",
        "Countable and uncountable nouns with some/any",
        "Modal verbs (can, could, should) for basic functions",
        "Basic quantifiers (much, many, a lot of)",
      ],
      restrictions: [
        "No perfect continuous tenses",
        "Limited perfect tenses (only present perfect with ever/never)",
        "No complex conditionals (only zero and first conditional)",
        "Limited passive voice (only simple present and past)",
        "No complex infinitive structures",
        "No subjunctive mood",
        "Limited relative clauses (only with who, which, that)",
      ],
    },
    content: {
      plotComplexity: "Simple with clear sequence",
      characterDepth: "Basic personality traits and motivations",
      themes: "Familiar situations with some personal experiences",
      culturalReferences: "Simple, well-explained references only",
    },
    style: {
      tone: "Clear and friendly",
      literaryDevices: [
        "Simple similes",
        "Basic descriptions",
        "Straightforward dialogue",
      ],
      narrativeApproach: "Clear chronological order with some flashbacks",
    },
    structure: {
      paragraphLength: "3-4 sentences",
      textOrganization: "Clear beginning, middle, and end",
      transitionComplexity: "Basic sequential markers",
    },
  },
  B1: {
    wordCount: { fiction: 600, nonfiction: 600 },
    sentenceStructure: {
      averageWords: "8-10 words",
      complexity: "Mix of simple and compound sentences",
      allowedStructures: ["Complex sentences with common subordinate clauses"],
    },
    vocabulary: {
      level: "Intermediate",
      restrictions: ["Common idiomatic expressions only"],
      suggestions: ["Topic-specific vocabulary", "Common collocations"],
    },
    grammar: {
      allowedTenses: ["All present forms", "All past forms"],
      allowedStructures: ["First and second conditionals", "Passive voice"],
      restrictions: ["Limited perfect continuous forms"],
    },
    content: {
      plotComplexity: "Moderate complexity with subplots",
      characterDepth: "Developed personalities and relationships",
      themes: "Personal and social themes",
      culturalReferences: "Common cultural references with context",
    },
    style: {
      tone: "Natural and conversational",
      literaryDevices: ["Metaphors", "Similes", "Basic symbolism"],
      narrativeApproach: "Mixed chronology with clear markers",
    },
    structure: {
      paragraphLength: "4-6 sentences",
      textOrganization: "Clear structure with some complexity",
      transitionComplexity: "Various transition words and phrases",
    },
  },
  B2: {
    wordCount: { fiction: 1000, nonfiction: 1000 },
    sentenceStructure: {
      averageWords: "10-12 words",
      complexity: "Varied sentence structures",
      allowedStructures: ["Complex sentences", "Varied clause structures"],
    },
    vocabulary: {
      level: "Upper Intermediate",
      restrictions: ["Most idiomatic expressions"],
      suggestions: ["Field-specific terminology", "Nuanced word choices"],
    },
    grammar: {
      allowedTenses: ["All tenses", "Perfect forms", "Continuous forms"],
      allowedStructures: ["All conditionals", "Complex passive constructions"],
      restrictions: ["Very complex or obscure constructions"],
    },
    content: {
      plotComplexity: "Complex plots with multiple threads",
      characterDepth: "Well-developed characters with clear arcs",
      themes: "Abstract and concrete themes",
      culturalReferences: "Varied cultural references with some explanation",
    },
    style: {
      tone: "Sophisticated and nuanced",
      literaryDevices: ["Extended metaphors", "Symbolism", "Irony"],
      narrativeApproach: "Flexible chronology and perspective",
    },
    structure: {
      paragraphLength: "Varied lengths",
      textOrganization: "Complex but clear structure",
      transitionComplexity: "Sophisticated transitions",
    },
  },
  C1: {
    wordCount: { fiction: 1200, nonfiction: 1200 },
    sentenceStructure: {
      averageWords: "15-17 words",
      complexity: "Complex and sophisticated",
      allowedStructures: ["All sentence types", "Multiple subordinate clauses"],
    },
    vocabulary: {
      level: "Advanced",
      restrictions: ["Very rare words"],
      suggestions: ["Sophisticated vocabulary", "Specialized terminology"],
    },
    grammar: {
      allowedTenses: ["Full range of tenses and aspects"],
      allowedStructures: ["All grammatical structures"],
      restrictions: ["Overly archaic constructions"],
    },
    content: {
      plotComplexity: "Sophisticated plots with multiple layers",
      characterDepth: "Complex psychological portrayals",
      themes: "Abstract and philosophical ideas",
      culturalReferences: "Historical, literary, and cultural allusions",
    },
    style: {
      tone: "Nuanced and sophisticated",
      literaryDevices: [
        "Full range of literary devices",
        "Complex narrative techniques",
      ],
      narrativeApproach: "Flexible storytelling with shifts in perspective",
    },
    structure: {
      paragraphLength: "Varied for effect",
      textOrganization: "Sophisticated organization",
      transitionComplexity: "Complex transitions and connections",
    },
  },
  C2: {
    wordCount: { fiction: 1500, nonfiction: 1500 },
    sentenceStructure: {
      averageWords: "18-20 words",
      complexity: "Highly sophisticated",
      allowedStructures: ["Full range of structures", "Literary innovations"],
    },
    vocabulary: {
      level: "Proficient / Native-like",
      restrictions: ["Maintain clarity despite complexity"],
      suggestions: ["Full native-like range", "Creative and innovative usage"],
    },
    grammar: {
      allowedTenses: ["Full native-like range"],
      allowedStructures: ["All possible structures", "Stylistic variations"],
      restrictions: ["Maintain clarity and purpose"],
    },
    content: {
      plotComplexity: "Highly complex and innovative",
      characterDepth: "Sophisticated psychological depth",
      themes: "Philosophical, existential, and literary themes",
      culturalReferences: "Extensive literary and historical references",
    },
    style: {
      tone: "Highly sophisticated",
      literaryDevices: ["Full creative range", "Innovative techniques"],
      narrativeApproach: "Experimental and non-linear storytelling",
    },
    structure: {
      paragraphLength: "Fully flexible",
      textOrganization: "Creative and innovative",
      transitionComplexity: "Sophisticated and creative transitions",
    },
  },
};

export function getCEFRRequirements(level: keyof typeof CEFRRequirements) {
  const requirements = CEFRRequirements[level];
  if (!requirements) {
    throw new Error(`Invalid CEFR level: ${level}`);
  }

  try {
    CEFRLevelRequirementsSchema.parse(requirements);
    return requirements;
  } catch (error) {
    console.error("CEFR data validation failed:", error);
    throw new Error("Invalid CEFR data structure");
  }
}
