#!/usr/bin/env tsx
/**
 * Migration script for converting markdown lesson content to structured JSON format
 *
 * This script reads lessons from the database, parses their markdown content using
 * existing content parsers, and converts them to the LessonContent JSON schema format.
 *
 * Usage:
 *   npx tsx scripts/migrate-lesson-content.ts [options]
 *
 * Options:
 *   --dry-run          Preview changes without modifying the database
 *   --lesson-id <id>   Migrate a specific lesson by ID
 *   --validate-only    Only validate existing structuredContent, don't migrate
 *   --force            Overwrite existing structuredContent
 *   --output <target>  Output target: db (default), json, stdout
 *
 * Examples:
 *   npx tsx scripts/migrate-lesson-content.ts --dry-run
 *   npx tsx scripts/migrate-lesson-content.ts --lesson-id clxxxxx --output stdout
 *   npx tsx scripts/migrate-lesson-content.ts --force --output db
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

import { asc, db, eq } from '@reading-advantage/db';
import { scienceLessons } from '@reading-advantage/db/schema';

import {
  parseMarkdownSections,
  parseVocabulary,
  parseMaterials,
  parseProcedure,
  type Section,
  type VocabTerm,
  type Material,
  type ProcedureStep,
} from '@/lib/content-parsers';
import {
  validateLessonContent,
  isValidLessonContent,
  type LessonContent,
  type ContentBlock,
  type TextBlock,
  type VocabularyBlock,
  type ImageBlock,
  type ReadingPassageBlock,
  type ProcedureBlock,
  type MaterialsBlock,
} from '@/lib/schemas/lesson-content.schema';

// =============================================================================
// Types
// =============================================================================

interface CliOptions {
  dryRun: boolean;
  lessonId?: string;
  validateOnly: boolean;
  force: boolean;
  output: 'db' | 'json' | 'stdout';
}

interface MigrationResult {
  lessonId: string;
  title: string;
  status: 'migrated' | 'skipped' | 'validated' | 'error';
  reason?: string;
  blockCount?: number;
  contentHash?: string;
}

interface MigrationReport {
  totalLessons: number;
  migrated: number;
  skipped: number;
  validated: number;
  errors: number;
  results: MigrationResult[];
  startedAt: Date;
  completedAt: Date;
}

interface MigrationMetadata {
  migratedAt: string;
  originalContentHash: string;
  migratedFrom: 'markdown';
  version: string;
}

// =============================================================================
// CLI Argument Parsing
// =============================================================================

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  const options: CliOptions = {
    dryRun: false,
    validateOnly: false,
    force: false,
    output: 'db',
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }

    if (arg === '--validate-only') {
      options.validateOnly = true;
      continue;
    }

    if (arg === '--force') {
      options.force = true;
      continue;
    }

    if (arg === '--lesson-id') {
      const nextArg = args[++i];
      if (!nextArg || nextArg.startsWith('--')) {
        console.error('Error: --lesson-id requires a value');
        process.exit(1);
      }
      options.lessonId = nextArg;
      continue;
    }

    if (arg.startsWith('--lesson-id=')) {
      options.lessonId = arg.split('=')[1];
      continue;
    }

    if (arg === '--output') {
      const nextArg = args[++i];
      if (!nextArg || !['db', 'json', 'stdout'].includes(nextArg)) {
        console.error('Error: --output must be one of: db, json, stdout');
        process.exit(1);
      }
      options.output = nextArg as 'db' | 'json' | 'stdout';
      continue;
    }

    if (arg.startsWith('--output=')) {
      const value = arg.split('=')[1];
      if (!['db', 'json', 'stdout'].includes(value)) {
        console.error('Error: --output must be one of: db, json, stdout');
        process.exit(1);
      }
      options.output = value as 'db' | 'json' | 'stdout';
      continue;
    }

    if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }

    console.warn(`Warning: Unknown argument ignored: ${arg}`);
  }

  return options;
}

function printHelp(): void {
  console.log(`
Migration Script for Lesson Content

Converts markdown lesson content to structured JSON format (LessonContent schema).

Usage:
  npx tsx scripts/migrate-lesson-content.ts [options]

Options:
  --dry-run          Preview changes without modifying the database
  --lesson-id <id>   Migrate a specific lesson by ID
  --validate-only    Only validate existing structuredContent, don't migrate
  --force            Overwrite existing structuredContent
  --output <target>  Output target: db (default), json, stdout
  --help, -h         Show this help message

Examples:
  npx tsx scripts/migrate-lesson-content.ts --dry-run
  npx tsx scripts/migrate-lesson-content.ts --lesson-id clxxxxx --output stdout
  npx tsx scripts/migrate-lesson-content.ts --force --output db
`);
}

// =============================================================================
// Content Hash for Idempotency
// =============================================================================

function computeContentHash(content: string): string {
  return crypto.createHash('md5').update(content).digest('hex');
}

// =============================================================================
// Markdown to LessonContent Conversion
// =============================================================================

/**
 * Parse markdown image syntax: ![alt](src)
 * Returns array of images found in content
 */
function parseMarkdownImages(content: string): { alt: string; src: string; fullMatch: string }[] {
  const imagePattern = /!\[([^\]]*)\]\(([^)]+)\)/g;
  const images: { alt: string; src: string; fullMatch: string }[] = [];

  let match;
  while ((match = imagePattern.exec(content)) !== null) {
    images.push({
      alt: match[1] || 'Image',
      src: match[2],
      fullMatch: match[0],
    });
  }

  return images;
}

/**
 * Count words in text content
 */
function countWords(text: string): number {
  const cleaned = text
    .replace(/[#*_`~\[\]()]/g, '') // Remove markdown syntax
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) return 0;
  return cleaned.split(' ').filter(word => word.length > 0).length;
}

/**
 * Map a section title to a known block type, or return null for unknown
 */
function mapSectionToBlockType(title: string): string | null {
  const normalizedTitle = title.toLowerCase().trim();

  const mappings: Record<string, string> = {
    'key vocabulary': 'vocabulary',
    'vocabulary': 'vocabulary',
    'materials': 'materials',
    'procedure': 'procedure',
    'reading passage': 'reading_passage',
    'reading': 'reading_passage',
    'passage': 'reading_passage',
  };

  return mappings[normalizedTitle] || null;
}

/**
 * Generate a block ID from section title
 */
function generateBlockId(title: string, index: number): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${slug}-${index}`;
}

/**
 * Convert a VocabTerm from parser to schema format
 */
function convertVocabTerm(term: VocabTerm): { term: string; thai: string; definition: string } {
  return {
    term: term.term,
    thai: term.thai,
    definition: term.definition,
  };
}

/**
 * Convert a Material from parser to schema format
 */
function convertMaterial(material: Material): { quantity?: string; item: string } {
  const result: { quantity?: string; item: string } = {
    item: material.item,
  };
  if (material.quantity) {
    result.quantity = material.quantity;
  }
  return result;
}

/**
 * Convert a ProcedureStep from parser to schema format
 */
function convertProcedureStep(step: ProcedureStep): {
  stepNumber: number;
  instruction: string;
  subSteps?: string[];
} {
  const result: { stepNumber: number; instruction: string; subSteps?: string[] } = {
    stepNumber: step.stepNumber,
    instruction: step.instruction,
  };
  if (step.subSteps && step.subSteps.length > 0) {
    result.subSteps = step.subSteps;
  }
  return result;
}

/**
 * Convert a section to a content block
 */
function convertSectionToBlock(section: Section, index: number): ContentBlock {
  const blockType = mapSectionToBlockType(section.title);
  const blockId = generateBlockId(section.title, index);

  switch (blockType) {
    case 'vocabulary': {
      const terms = parseVocabulary(section.content);
      if (terms.length > 0) {
        const block: VocabularyBlock = {
          id: blockId,
          type: 'vocabulary',
          terms: terms.map(convertVocabTerm),
        };
        return block;
      }
      // If no terms parsed, fall through to text block
      break;
    }

    case 'materials': {
      const items = parseMaterials(section.content);
      if (items.length > 0) {
        const block: MaterialsBlock = {
          id: blockId,
          type: 'materials',
          items: items.map(convertMaterial),
        };
        return block;
      }
      break;
    }

    case 'procedure': {
      const steps = parseProcedure(section.content);
      if (steps.length > 0) {
        const block: ProcedureBlock = {
          id: blockId,
          type: 'procedure',
          steps: steps.map(convertProcedureStep),
        };
        return block;
      }
      break;
    }

    case 'reading_passage': {
      const content = section.content.trim();
      if (content) {
        const block: ReadingPassageBlock = {
          id: blockId,
          type: 'reading_passage',
          title: section.title,
          content: content,
          wordCount: countWords(content),
        };
        return block;
      }
      break;
    }
  }

  // Default: convert to TextBlock (never drop content)
  // Reading passages must be explicitly marked with headers like "## Reading Passage"
  const textBlock: TextBlock = {
    id: blockId,
    type: 'text',
    content: section.content.trim() || section.title,
  };
  return textBlock;
}

/**
 * Extract images from section content and return as ImageBlocks
 */
function extractImagesFromContent(content: string, startIndex: number): ImageBlock[] {
  const images = parseMarkdownImages(content);
  return images.map((img, i) => {
    // Ensure alt text meets minimum length requirement (10 chars)
    let alt = img.alt;
    if (alt.length < 10) {
      alt = `Image: ${alt}`.padEnd(10, ' ');
    }

    const block: ImageBlock = {
      id: `image-${startIndex + i}`,
      type: 'image',
      src: img.src,
      alt: alt,
    };
    return block;
  });
}

/**
 * Convert markdown content to LessonContent structure
 */
export function convertMarkdownToLessonContent(
  markdownContent: string,
  metadata?: MigrationMetadata
): LessonContent {
  const blocks: ContentBlock[] = [];
  const sections = parseMarkdownSections(markdownContent);

  // Handle content before first section (intro text) or all content if no sections
  const firstSectionIndex = markdownContent.search(/^##\s+/m);

  // Determine intro content: everything before first section, or all content if no sections
  let introContent: string | null = null;
  if (firstSectionIndex === -1) {
    // No sections found - treat all content as intro
    introContent = markdownContent.trim();
  } else if (firstSectionIndex > 0) {
    // Content before first section
    introContent = markdownContent.substring(0, firstSectionIndex).trim();
  }

  if (introContent) {
    // Check for images in intro
    const introImages = extractImagesFromContent(introContent, 0);
    blocks.push(...introImages);

    // Remove image markdown from intro text
    let cleanedIntro = introContent;
    for (const img of parseMarkdownImages(introContent)) {
      cleanedIntro = cleanedIntro.replace(img.fullMatch, '').trim();
    }

    if (cleanedIntro) {
      const introBlock: TextBlock = {
        id: 'intro-0',
        type: 'text',
        content: cleanedIntro,
      };
      blocks.push(introBlock);
    }
  }

  // Process each section
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];

    // Extract images from section content first
    const sectionImages = extractImagesFromContent(section.content, blocks.length);
    blocks.push(...sectionImages);

    // Remove image markdown from section content before converting
    let cleanedContent = section.content;
    for (const img of parseMarkdownImages(section.content)) {
      cleanedContent = cleanedContent.replace(img.fullMatch, '').trim();
    }

    // Update section with cleaned content
    const cleanedSection: Section = {
      ...section,
      content: cleanedContent,
    };

    // Skip empty sections after image removal
    if (!cleanedContent && !mapSectionToBlockType(section.title)) {
      continue;
    }

    const block = convertSectionToBlock(cleanedSection, blocks.length);
    blocks.push(block);
  }

  const lessonContent: LessonContent = {
    version: 1,
    blocks,
  };

  // Add metadata if provided (stored separately, not in schema)
  if (metadata) {
    (lessonContent as LessonContent & { _metadata?: MigrationMetadata })._metadata = metadata;
  }

  return lessonContent;
}

// =============================================================================
// Migration Logic
// =============================================================================

async function migrateLesson(
  lesson: { id: string; title: string; content: string | null; structuredContent: unknown },
  options: CliOptions
): Promise<MigrationResult> {
  const result: MigrationResult = {
    lessonId: lesson.id,
    title: lesson.title,
    status: 'skipped',
  };

  // Validation-only mode
  if (options.validateOnly) {
    if (!lesson.structuredContent) {
      result.status = 'skipped';
      result.reason = 'No structuredContent to validate';
      return result;
    }

    try {
      const validated = validateLessonContent(lesson.structuredContent);
      result.status = 'validated';
      result.blockCount = validated.blocks.length;
    } catch (error) {
      result.status = 'error';
      result.reason = `Validation failed: ${error instanceof Error ? error.message : String(error)}`;
    }
    return result;
  }

  // Check if lesson has markdown content
  if (!lesson.content || lesson.content.trim() === '') {
    result.status = 'skipped';
    result.reason = 'No markdown content to migrate';
    return result;
  }

  // Check if already migrated (unless --force)
  if (lesson.structuredContent && !options.force) {
    // Check if valid
    if (isValidLessonContent(lesson.structuredContent)) {
      result.status = 'skipped';
      result.reason = 'Already has valid structuredContent (use --force to overwrite)';
      return result;
    }
  }

  // Compute content hash for idempotency
  const contentHash = computeContentHash(lesson.content);

  // Convert markdown to structured content
  const metadata: MigrationMetadata = {
    migratedAt: new Date().toISOString(),
    originalContentHash: contentHash,
    migratedFrom: 'markdown',
    version: '1.0.0',
  };

  let lessonContent: LessonContent;
  try {
    lessonContent = convertMarkdownToLessonContent(lesson.content, metadata);

    // Validate the output
    validateLessonContent(lessonContent);
  } catch (error) {
    result.status = 'error';
    result.reason = `Conversion failed: ${error instanceof Error ? error.message : String(error)}`;
    return result;
  }

  result.blockCount = lessonContent.blocks.length;
  result.contentHash = contentHash;

  // Handle output based on mode
  if (options.dryRun) {
    result.status = 'migrated';
    result.reason = 'Dry run - no changes made';

    if (options.output === 'stdout') {
      console.log(`\n--- Lesson: ${lesson.title} (${lesson.id}) ---`);
      console.log(JSON.stringify(lessonContent, null, 2));
    }

    return result;
  }

  // Apply changes based on output mode
  switch (options.output) {
    case 'stdout':
      console.log(`\n--- Lesson: ${lesson.title} (${lesson.id}) ---`);
      console.log(JSON.stringify(lessonContent, null, 2));
      result.status = 'migrated';
      break;

    case 'json': {
      const outputDir = path.join(process.cwd(), 'scripts', 'migration-output');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      const outputPath = path.join(outputDir, `${lesson.id}.json`);
      fs.writeFileSync(outputPath, JSON.stringify(lessonContent, null, 2));
      result.status = 'migrated';
      result.reason = `Output saved to ${outputPath}`;
      break;
    }

    case 'db':
    default:
      await db
        .update(scienceLessons)
        .set({ structuredContent: lessonContent as object })
        .where(eq(scienceLessons.id, lesson.id));
      result.status = 'migrated';
      break;
  }

  return result;
}

// =============================================================================
// Main Entry Point
// =============================================================================

async function main(): Promise<void> {
  const options = parseArgs();
  const startedAt = new Date();

  console.log('Lesson Content Migration Tool\n');
  console.log(`Mode: ${options.dryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log(`Output: ${options.output}`);
  console.log(`Validate only: ${options.validateOnly}`);
  console.log(`Force overwrite: ${options.force}`);
  if (options.lessonId) {
    console.log(`Target lesson: ${options.lessonId}`);
  }
  console.log('');

  if (options.dryRun) {
    console.log('DRY RUN MODE - No changes will be made to the database\n');
  }

  // Fetch lessons
  const lessons = await db
    .select({
      id: scienceLessons.id,
      title: scienceLessons.title,
      content: scienceLessons.content,
      structuredContent: scienceLessons.structuredContent,
    })
    .from(scienceLessons)
    .where(options.lessonId ? eq(scienceLessons.id, options.lessonId) : undefined)
    .orderBy(asc(scienceLessons.order));

  if (lessons.length === 0) {
    console.log('No lessons found matching criteria.');
    return;
  }

  console.log(`Found ${lessons.length} lesson(s) to process\n`);

  const results: MigrationResult[] = [];

  for (const lesson of lessons) {
    console.log(`Processing: ${lesson.title} (${lesson.id})`);

    const result = await migrateLesson(lesson, options);
    results.push(result);

    const statusIcon =
      result.status === 'migrated'
        ? '[OK]'
        : result.status === 'validated'
          ? '[VALID]'
          : result.status === 'skipped'
            ? '[SKIP]'
            : '[ERR]';

    console.log(`  ${statusIcon} ${result.reason || `${result.blockCount} blocks`}`);
  }

  // Generate report
  const report: MigrationReport = {
    totalLessons: lessons.length,
    migrated: results.filter(r => r.status === 'migrated').length,
    skipped: results.filter(r => r.status === 'skipped').length,
    validated: results.filter(r => r.status === 'validated').length,
    errors: results.filter(r => r.status === 'error').length,
    results,
    startedAt,
    completedAt: new Date(),
  };

  console.log('\n--- Migration Report ---');
  console.log(`Total lessons: ${report.totalLessons}`);
  console.log(`Migrated: ${report.migrated}`);
  console.log(`Skipped: ${report.skipped}`);
  console.log(`Validated: ${report.validated}`);
  console.log(`Errors: ${report.errors}`);
  console.log(
    `Duration: ${(report.completedAt.getTime() - report.startedAt.getTime()) / 1000}s`
  );

  if (report.errors > 0) {
    console.log('\nErrors:');
    for (const result of results.filter(r => r.status === 'error')) {
      console.log(`  - ${result.title}: ${result.reason}`);
    }
  }

  // Exit with error code if there were errors
  if (report.errors > 0) {
    process.exit(1);
  }
}

// Only run main() when executed directly (not when imported for testing)
const isMainModule = typeof require !== 'undefined' && require.main === module;
const isDirectExecution = process.argv[1]?.includes('migrate-lesson-content');

if (isMainModule || isDirectExecution) {
  main().catch(error => {
    console.error('Migration failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  });
}

// Export for testing
export {
  parseArgs,
  computeContentHash,
  parseMarkdownImages,
  countWords,
  mapSectionToBlockType,
  generateBlockId,
  convertSectionToBlock,
  extractImagesFromContent,
  type CliOptions,
  type MigrationResult,
  type MigrationReport,
  type MigrationMetadata,
};
