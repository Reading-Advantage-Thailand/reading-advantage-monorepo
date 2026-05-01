#!/usr/bin/env npx tsx
/**
 * Content Validation Script
 *
 * Validates Grade 4 lesson content and question bank files against:
 * - LessonContentSchema from lib/schemas/lesson-content.schema.ts
 * - Word count requirements (reading passages: 300-500 words)
 * - Vocabulary count requirements (8-12 terms per lesson)
 * - Question count requirements (20 questions per lesson)
 * - Difficulty distribution (8 easy, 8 medium, 4 hard)
 *
 * Usage:
 *   npx tsx scripts/validate-content.ts
 *   npx tsx scripts/validate-content.ts --grade 4
 *   npx tsx scripts/validate-content.ts --verbose
 */

import * as fs from 'fs';
import * as path from 'path';
import { LessonContentSchema, type LessonContent } from '@/lib/schemas/lesson-content.schema';
import { ZodError } from 'zod';

// Configuration
const CONTENT_BASE_PATH = 'prisma/data/content';
const MIN_READING_PASSAGE_WORDS = 300;
const MAX_READING_PASSAGE_WORDS = 500;
const MIN_VOCAB_TERMS = 8;
const MAX_VOCAB_TERMS = 12;
const REQUIRED_QUESTIONS = 20;
const REQUIRED_EASY = 8;
const REQUIRED_MEDIUM = 8;
const REQUIRED_HARD = 4;
const MIN_ALT_TEXT_LENGTH = 10;

// Types
interface ValidationResult {
  file: string;
  valid: boolean;
  errors: string[];
  warnings: string[];
}

interface QuestionBank {
  lessonId: string;
  questions: Array<{
    id: string;
    type: string;
    difficulty: string;
    question: string;
    questionThai?: string;
    options: string[];
    correctAnswer: number | string | string[];
    explanation: string;
  }>;
}

interface ContentStats {
  lessonsValidated: number;
  questionsValidated: number;
  totalErrors: number;
  totalWarnings: number;
}

// Helper functions
function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0).length;
}

function validateLessonContent(filePath: string, verbose: boolean): ValidationResult {
  const result: ValidationResult = {
    file: filePath,
    valid: true,
    errors: [],
    warnings: [],
  };

  try {
    const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    // Validate against Zod schema
    try {
      LessonContentSchema.parse(content);
    } catch (error) {
      if (error instanceof ZodError) {
        result.valid = false;
        error.issues.forEach((issue) => {
          result.errors.push(`Schema error at ${issue.path.join('.')}: ${issue.message}`);
        });
      }
    }

    const lessonContent = content as LessonContent;

    // Count vocabulary terms
    let vocabCount = 0;
    let readingPassageCount = 0;

    for (const block of lessonContent.blocks) {
      if (block.type === 'vocabulary') {
        vocabCount += block.terms.length;
      }

      if (block.type === 'reading_passage') {
        readingPassageCount++;
        const wordCount = countWords(block.content);
        const declaredWordCount = block.wordCount;

        // Check word count matches declared count
        if (Math.abs(wordCount - declaredWordCount) > 20) {
          result.warnings.push(
            `Reading passage word count mismatch: declared ${declaredWordCount}, actual ~${wordCount}`
          );
        }

        // Check word count range
        if (wordCount < MIN_READING_PASSAGE_WORDS) {
          result.errors.push(
            `Reading passage too short: ${wordCount} words (min: ${MIN_READING_PASSAGE_WORDS})`
          );
          result.valid = false;
        } else if (wordCount > MAX_READING_PASSAGE_WORDS) {
          result.warnings.push(
            `Reading passage slightly long: ${wordCount} words (recommended max: ${MAX_READING_PASSAGE_WORDS})`
          );
        }
      }

      if (block.type === 'image') {
        if (block.alt.length < MIN_ALT_TEXT_LENGTH) {
          result.errors.push(
            `Image alt text too short: "${block.alt}" (min: ${MIN_ALT_TEXT_LENGTH} chars)`
          );
          result.valid = false;
        }
      }
    }

    // Check vocabulary count
    if (vocabCount < MIN_VOCAB_TERMS) {
      result.errors.push(
        `Too few vocabulary terms: ${vocabCount} (min: ${MIN_VOCAB_TERMS})`
      );
      result.valid = false;
    } else if (vocabCount > MAX_VOCAB_TERMS) {
      result.warnings.push(
        `Many vocabulary terms: ${vocabCount} (recommended max: ${MAX_VOCAB_TERMS})`
      );
    }

    // Check for reading passage
    if (readingPassageCount === 0) {
      result.warnings.push('No reading passage found in lesson');
    }

    if (verbose) {
      console.log(`  Vocabulary terms: ${vocabCount}`);
      console.log(`  Reading passages: ${readingPassageCount}`);
    }
  } catch (error) {
    result.valid = false;
    result.errors.push(`Failed to parse file: ${(error as Error).message}`);
  }

  return result;
}

function validateQuestionBank(filePath: string, verbose: boolean): ValidationResult {
  const result: ValidationResult = {
    file: filePath,
    valid: true,
    errors: [],
    warnings: [],
  };

  try {
    const content = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as QuestionBank;

    // Check required fields
    if (!content.lessonId) {
      result.errors.push('Missing lessonId field');
      result.valid = false;
    }

    if (!content.questions || !Array.isArray(content.questions)) {
      result.errors.push('Missing or invalid questions array');
      result.valid = false;
      return result;
    }

    // Check question count
    const questionCount = content.questions.length;
    if (questionCount !== REQUIRED_QUESTIONS) {
      result.errors.push(
        `Wrong number of questions: ${questionCount} (required: ${REQUIRED_QUESTIONS})`
      );
      result.valid = false;
    }

    // Count difficulty distribution
    const difficulties: Record<string, number> = { easy: 0, medium: 0, hard: 0 };

    content.questions.forEach((q, index) => {
      // Check required fields
      if (!q.id) {
        result.errors.push(`Question ${index + 1}: missing id`);
        result.valid = false;
      }
      if (!q.type) {
        result.errors.push(`Question ${index + 1}: missing type`);
        result.valid = false;
      }
      if (!q.difficulty) {
        result.errors.push(`Question ${index + 1}: missing difficulty`);
        result.valid = false;
      }
      if (!q.question) {
        result.errors.push(`Question ${index + 1}: missing question text`);
        result.valid = false;
      }
      if (!q.explanation) {
        result.warnings.push(`Question ${index + 1}: missing explanation`);
      }

      // Count difficulties
      if (q.difficulty in difficulties) {
        difficulties[q.difficulty]++;
      } else {
        result.warnings.push(
          `Question ${index + 1}: unknown difficulty "${q.difficulty}"`
        );
      }

      // Validate multiple choice questions
      if (q.type === 'multiple_choice') {
        if (!q.options || q.options.length !== 4) {
          result.errors.push(
            `Question ${index + 1}: multiple_choice should have 4 options`
          );
          result.valid = false;
        }
        if (typeof q.correctAnswer !== 'number' || q.correctAnswer < 0 || q.correctAnswer > 3) {
          result.errors.push(
            `Question ${index + 1}: correctAnswer should be 0-3 for multiple_choice`
          );
          result.valid = false;
        }
      }
    });

    // Check difficulty distribution
    if (difficulties.easy !== REQUIRED_EASY) {
      result.warnings.push(
        `Difficulty distribution: ${difficulties.easy} easy (expected: ${REQUIRED_EASY})`
      );
    }
    if (difficulties.medium !== REQUIRED_MEDIUM) {
      result.warnings.push(
        `Difficulty distribution: ${difficulties.medium} medium (expected: ${REQUIRED_MEDIUM})`
      );
    }
    if (difficulties.hard !== REQUIRED_HARD) {
      result.warnings.push(
        `Difficulty distribution: ${difficulties.hard} hard (expected: ${REQUIRED_HARD})`
      );
    }

    if (verbose) {
      console.log(`  Questions: ${questionCount}`);
      console.log(
        `  Distribution: ${difficulties.easy} easy, ${difficulties.medium} medium, ${difficulties.hard} hard`
      );
    }
  } catch (error) {
    result.valid = false;
    result.errors.push(`Failed to parse file: ${(error as Error).message}`);
  }

  return result;
}

function printResult(result: ValidationResult): void {
  const status = result.valid ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m';
  console.log(`[${status}] ${path.basename(result.file)}`);

  result.errors.forEach((error) => {
    console.log(`  \x1b[31mERROR:\x1b[0m ${error}`);
  });

  result.warnings.forEach((warning) => {
    console.log(`  \x1b[33mWARNING:\x1b[0m ${warning}`);
  });
}

function main(): void {
  const args = process.argv.slice(2);
  const verbose = args.includes('--verbose') || args.includes('-v');
  const gradeArg = args.find((arg) => arg.startsWith('--grade'));
  const grade = gradeArg ? gradeArg.split('=')[1] || '4' : '4';

  console.log('='.repeat(60));
  console.log(`Content Validation - Grade ${grade}`);
  console.log('='.repeat(60));

  const contentPath = path.join(process.cwd(), CONTENT_BASE_PATH, `grade-${grade}`);

  if (!fs.existsSync(contentPath)) {
    console.error(`\x1b[31mERROR:\x1b[0m Content directory not found: ${contentPath}`);
    process.exit(1);
  }

  const stats: ContentStats = {
    lessonsValidated: 0,
    questionsValidated: 0,
    totalErrors: 0,
    totalWarnings: 0,
  };

  const results: ValidationResult[] = [];

  // Validate lesson files
  const lessonsPath = path.join(contentPath, 'lessons');
  if (fs.existsSync(lessonsPath)) {
    console.log('\n--- Lesson Files ---');
    const lessonFiles = fs.readdirSync(lessonsPath).filter((f) => f.endsWith('.json'));

    for (const file of lessonFiles) {
      const filePath = path.join(lessonsPath, file);
      if (verbose) console.log(`\nValidating: ${file}`);
      const result = validateLessonContent(filePath, verbose);
      results.push(result);
      printResult(result);
      stats.lessonsValidated++;
      stats.totalErrors += result.errors.length;
      stats.totalWarnings += result.warnings.length;
    }
  }

  // Validate question files
  const questionsPath = path.join(contentPath, 'questions');
  if (fs.existsSync(questionsPath)) {
    console.log('\n--- Question Bank Files ---');
    const questionFiles = fs.readdirSync(questionsPath).filter((f) => f.endsWith('.json'));

    for (const file of questionFiles) {
      const filePath = path.join(questionsPath, file);
      if (verbose) console.log(`\nValidating: ${file}`);
      const result = validateQuestionBank(filePath, verbose);
      results.push(result);
      printResult(result);
      stats.questionsValidated++;
      stats.totalErrors += result.errors.length;
      stats.totalWarnings += result.warnings.length;
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`Lessons validated: ${stats.lessonsValidated}`);
  console.log(`Question banks validated: ${stats.questionsValidated}`);
  console.log(`Total errors: ${stats.totalErrors}`);
  console.log(`Total warnings: ${stats.totalWarnings}`);

  const allValid = results.every((r) => r.valid);
  if (allValid) {
    console.log('\n\x1b[32mAll content files passed validation!\x1b[0m');
    process.exit(0);
  } else {
    console.log('\n\x1b[31mSome content files failed validation.\x1b[0m');
    process.exit(1);
  }
}

main();
