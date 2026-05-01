/**
 * Lesson Content JSON Schema
 *
 * Defines Zod schemas and TypeScript types for structured lesson content blocks.
 * These schemas enable the frontend to render rich, interactive lesson experiences
 * with vocabulary flashcards, reading passages, procedures, materials lists, and media.
 *
 * @example JSON structure:
 * ```json
 * {
 *   "version": 1,
 *   "blocks": [
 *     {
 *       "id": "intro-text",
 *       "type": "text",
 *       "content": "Welcome to today's lesson on photosynthesis.",
 *       "contentThai": "ยินดีต้อนรับสู่บทเรียนวันนี้เกี่ยวกับการสังเคราะห์ด้วยแสง"
 *     },
 *     {
 *       "type": "vocabulary",
 *       "terms": [
 *         {
 *           "term": "Photosynthesis",
 *           "thai": "การสังเคราะห์ด้วยแสง",
 *           "definition": "The process by which plants convert sunlight into energy",
 *           "audioUrl": "/audio/photosynthesis.mp3"
 *         }
 *       ]
 *     },
 *     {
 *       "type": "image",
 *       "src": "/images/plant-diagram.png",
 *       "alt": "Diagram showing the parts of a plant involved in photosynthesis",
 *       "caption": "Parts of a plant",
 *       "captionThai": "ส่วนต่างๆ ของพืช",
 *       "aspectRatio": 1.5,
 *       "attribution": "Science Textbook, 2024"
 *     },
 *     {
 *       "type": "reading_passage",
 *       "title": "How Plants Make Food",
 *       "titleThai": "พืชสร้างอาหารอย่างไร",
 *       "content": "Plants are amazing organisms that can make their own food...",
 *       "contentThai": "พืชเป็นสิ่งมีชีวิตที่น่าทึ่งที่สามารถสร้างอาหารเองได้...",
 *       "wordCount": 150
 *     },
 *     {
 *       "type": "materials",
 *       "items": [
 *         { "quantity": "2", "item": "Small plants", "itemThai": "ต้นไม้ขนาดเล็ก" },
 *         { "item": "Water" }
 *       ]
 *     },
 *     {
 *       "type": "procedure",
 *       "steps": [
 *         {
 *           "stepNumber": 1,
 *           "instruction": "Place one plant in sunlight",
 *           "instructionThai": "วางต้นไม้หนึ่งต้นไว้ในที่มีแสงแดด",
 *           "subSteps": ["Choose a sunny windowsill", "Ensure the plant is stable"]
 *         },
 *         {
 *           "stepNumber": 2,
 *           "instruction": "Place the other plant in a dark closet"
 *         }
 *       ]
 *     }
 *   ]
 * }
 * ```
 */

import { z, ZodError } from 'zod';

// =============================================================================
// Sub-schemas for complex nested structures
// =============================================================================

/**
 * Schema for a vocabulary term with optional Thai translation and audio
 */
export const VocabularyTermSchema = z.object({
  term: z.string().min(1, 'Term is required'),
  thai: z.string().min(1, 'Thai translation is required'),
  definition: z.string().min(1, 'Definition is required'),
  audioUrl: z.string().url().optional(),
});

/**
 * Schema for a material item in a materials list
 */
export const MaterialItemSchema = z.object({
  quantity: z.string().optional(),
  item: z.string().min(1, 'Item name is required'),
  itemThai: z.string().optional(),
});

/**
 * Schema for a procedure step with optional sub-steps
 */
export const ProcedureStepSchema = z.object({
  stepNumber: z.number().int().positive('Step number must be positive'),
  instruction: z.string().min(1, 'Instruction is required'),
  instructionThai: z.string().optional(),
  subSteps: z.array(z.string()).optional(),
});

// =============================================================================
// Content Block Schemas
// =============================================================================

/**
 * Text block for general content
 */
export const TextBlockSchema = z.object({
  id: z.string().optional(),
  type: z.literal('text'),
  content: z.string().min(1, 'Content is required'),
  contentThai: z.string().optional(),
});

/**
 * Vocabulary block containing a list of terms
 */
export const VocabularyBlockSchema = z.object({
  id: z.string().optional(),
  type: z.literal('vocabulary'),
  terms: z.array(VocabularyTermSchema).min(1, 'At least one term is required'),
});

/**
 * Image block with accessibility requirements
 */
export const ImageBlockSchema = z.object({
  id: z.string().optional(),
  type: z.literal('image'),
  src: z.string().min(1, 'Image source is required'),
  alt: z.string().min(10, 'Alt text must be at least 10 characters for accessibility'),
  caption: z.string().optional(),
  captionThai: z.string().optional(),
  aspectRatio: z.number().positive().optional(),
  attribution: z.string().optional(),
});

/**
 * Reading passage block for longer text content
 */
export const ReadingPassageBlockSchema = z.object({
  id: z.string().optional(),
  type: z.literal('reading_passage'),
  title: z.string().min(1, 'Title is required'),
  titleThai: z.string().optional(),
  content: z.string().min(1, 'Content is required'),
  contentThai: z.string().optional(),
  wordCount: z.number().int().nonnegative('Word count must be non-negative'),
});

/**
 * Procedure block for step-by-step instructions
 */
export const ProcedureBlockSchema = z.object({
  id: z.string().optional(),
  type: z.literal('procedure'),
  steps: z.array(ProcedureStepSchema).min(1, 'At least one step is required'),
});

/**
 * Materials block for listing required items
 */
export const MaterialsBlockSchema = z.object({
  id: z.string().optional(),
  type: z.literal('materials'),
  items: z.array(MaterialItemSchema).min(1, 'At least one item is required'),
});

/**
 * Review question item for fun review blocks
 */
export const ReviewQuestionItemSchema = z.object({
  questionId: z.string().min(1, 'Question ID is required'),
  text: z.string().min(1, 'Question text is required'),
  textThai: z.string().optional(),
});

/**
 * Review block for fun review lessons
 */
export const ReviewBlockSchema = z.object({
  id: z.string().optional(),
  type: z.literal('review'),
  title: z.string().min(1, 'Review title is required'),
  titleThai: z.string().optional(),
  questions: z.array(ReviewQuestionItemSchema).min(1, 'At least one question is required'),
});

/**
 * Quiz option for multiple choice questions
 */
export const QuizOptionSchema = z.object({
  id: z.string().min(1, 'Option ID is required'),
  text: z.string().min(1, 'Option text is required'),
  textThai: z.string().optional(),
  isCorrect: z.boolean().optional(),
});

/**
 * Quiz question item for quiz/assessment blocks
 */
export const QuizQuestionItemSchema = z.object({
  questionId: z.string().min(1, 'Question ID is required'),
  type: z.enum(['multiple_choice', 'multiple_select', 'true_false', 'fill_in_blank', 'vocabulary_match']),
  text: z.string().min(1, 'Question text is required'),
  textThai: z.string().optional(),
  options: z.array(QuizOptionSchema).optional(),
});

/**
 * Quiz/Assessment block for summative assessments
 */
export const QuizBlockSchema = z.object({
  id: z.string().optional(),
  type: z.literal('quiz'),
  title: z.string().min(1, 'Quiz title is required'),
  titleThai: z.string().optional(),
  passingScore: z.number().int().min(0).max(100).optional(),
  questions: z.array(QuizQuestionItemSchema).min(1, 'At least one question is required'),
});

// =============================================================================
// Discriminated Union for All Content Blocks
// =============================================================================

/**
 * Discriminated union of all content block types
 * Uses the `type` field to discriminate between block schemas
 */
export const ContentBlockSchema = z.discriminatedUnion('type', [
  TextBlockSchema,
  VocabularyBlockSchema,
  ImageBlockSchema,
  ReadingPassageBlockSchema,
  ProcedureBlockSchema,
  MaterialsBlockSchema,
  ReviewBlockSchema,
  QuizBlockSchema,
]);

// =============================================================================
// Root Lesson Content Schema
// =============================================================================

/**
 * Root schema for lesson content with version and blocks array
 * Uses `.strip()` to remove unknown fields for forward compatibility
 */
export const LessonContentSchema = z.object({
  version: z.literal(1),
  blocks: z.array(ContentBlockSchema),
}).strip();

// =============================================================================
// TypeScript Types (inferred from schemas)
// =============================================================================

export type VocabularyTerm = z.infer<typeof VocabularyTermSchema>;
export type MaterialItem = z.infer<typeof MaterialItemSchema>;
export type ProcedureStep = z.infer<typeof ProcedureStepSchema>;

export type TextBlock = z.infer<typeof TextBlockSchema>;
export type VocabularyBlock = z.infer<typeof VocabularyBlockSchema>;
export type ImageBlock = z.infer<typeof ImageBlockSchema>;
export type ReadingPassageBlock = z.infer<typeof ReadingPassageBlockSchema>;
export type ProcedureBlock = z.infer<typeof ProcedureBlockSchema>;
export type MaterialsBlock = z.infer<typeof MaterialsBlockSchema>;
export type ReviewBlock = z.infer<typeof ReviewBlockSchema>;
export type QuizBlock = z.infer<typeof QuizBlockSchema>;
export type ReviewQuestionItem = z.infer<typeof ReviewQuestionItemSchema>;
export type QuizQuestionItem = z.infer<typeof QuizQuestionItemSchema>;
export type QuizOption = z.infer<typeof QuizOptionSchema>;

export type ContentBlock = z.infer<typeof ContentBlockSchema>;
export type LessonContent = z.infer<typeof LessonContentSchema>;

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Validate lesson content data against the schema
 * Throws ZodError if validation fails
 *
 * @param data - Unknown data to validate
 * @returns Validated and typed LessonContent
 * @throws {ZodError} If validation fails
 *
 * @example
 * ```ts
 * try {
 *   const content = validateLessonContent(jsonData);
 *   console.log(content.blocks.length);
 * } catch (error) {
 *   if (error instanceof ZodError) {
 *     console.error('Validation errors:', error.issues);
 *   }
 * }
 * ```
 */
export function validateLessonContent(data: unknown): LessonContent {
  return LessonContentSchema.parse(data);
}

/**
 * Check if data is valid lesson content without throwing
 *
 * @param data - Unknown data to validate
 * @returns true if valid, false otherwise
 *
 * @example
 * ```ts
 * if (isValidLessonContent(jsonData)) {
 *   // Safe to use as LessonContent
 *   renderLesson(jsonData as LessonContent);
 * }
 * ```
 */
export function isValidLessonContent(data: unknown): data is LessonContent {
  return LessonContentSchema.safeParse(data).success;
}

// Re-export ZodError for consumers to catch validation errors
export { ZodError };
