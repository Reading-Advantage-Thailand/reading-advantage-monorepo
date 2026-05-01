import { z } from 'zod';

export const LessonSlugSchema = z
  .string()
  .min(2, 'Lesson slug must be at least 2 characters')
  .max(100, 'Lesson slug must be at most 100 characters')
  .regex(
    /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/,
    'Lesson slug must be a valid kebab-case slug starting with a letter (lowercase letters, numbers, and hyphens only)'
  );

export const CurriculumUnitSlugSchema = z
  .string()
  .min(2, 'Unit slug must be at least 2 characters')
  .max(100, 'Unit slug must be at most 100 characters')
  .regex(
    /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/,
    'Unit slug must be a valid kebab-case slug starting with a letter (lowercase letters, numbers, and hyphens only)'
  );

export const QuestionSlugSchema = z
  .string()
  .min(2, 'Question slug must be at least 2 characters')
  .max(100, 'Question slug must be at most 100 characters')
  .regex(
    /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/,
    'Question slug must be a valid kebab-case slug starting with a letter (lowercase letters, numbers, and hyphens only)'
  );

export function validateLessonSlug(slug: unknown): string {
  try {
    return LessonSlugSchema.parse(slug);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Lesson slug must be a valid kebab-case slug: ${error.errors.map(e => e.message).join(', ')}`);
    }
    throw error;
  }
}

export function validateCurriculumUnitSlug(slug: unknown): string {
  try {
    return CurriculumUnitSlugSchema.parse(slug);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Unit slug must be a valid kebab-case slug: ${error.errors.map(e => e.message).join(', ')}`);
    }
    throw error;
  }
}

export function validateQuestionSlug(slug: unknown): string {
  try {
    return QuestionSlugSchema.parse(slug);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Question slug must be a valid kebab-case slug: ${error.errors.map(e => e.message).join(', ')}`);
    }
    throw error;
  }
}

export function isValidLessonSlug(slug: unknown): slug is string {
  try {
    LessonSlugSchema.parse(slug);
    return true;
  } catch {
    return false;
  }
}

export function isValidCurriculumUnitSlug(slug: unknown): slug is string {
  try {
    CurriculumUnitSlugSchema.parse(slug);
    return true;
  } catch {
    return false;
  }
}

export function isValidQuestionSlug(slug: unknown): slug is string {
  try {
    QuestionSlugSchema.parse(slug);
    return true;
  } catch {
    return false;
  }
}

function normalizeToKebabCase(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function transliterateThaiToSlug(text: string): string {
  const thaiMap: Record<string, string> = {
    'ก': 'ka', 'ข': 'kha', 'ค': 'kha', 'ง': 'nga',
    'จ': 'ja', 'ฉ': 'ch', 'ช': 'cha', 'ซ': 'so',
    'ฌ': 'cho', 'ญ': 'yu', 'ฎ': 'do', 'ฏ': 'to',
    'ฐ': 'th', 'ฑ': 'th', 'ฒ': 'th', 'ณ': 'no',
    'ด': 'd', 'ต': 't', 'ถ': 'th', 'ท': 'th',
    'ธ': 'th', 'น': 'n', 'บ': 'b', 'ป': 'p',
    'ผ': 'ph', 'ฝ': 'f', 'พ': 'ph', 'ฟ': 'f',
    'ภ': 'ph', 'ม': 'm', 'ย': 'y', 'ร': 'r',
    'ล': 'l', 'ว': 'w', 'ศ': 's', 'ษ': 's',
    'ส': 's', 'ห': 'h', 'ฬ': 'l', 'ฮ': 'h',
    'ะ': 'a', 'ั': 'a', 'า': 'a', 'ิ': 'i',
    'ี': 'i', 'ึ': 'ue', 'ื': 'ue', 'ุ': 'u',
    'ู': 'u', 'เ': 'e', 'แ': 'ae', 'โ': 'o',
    'ใ': 'ai', 'ไ': 'ai',
  };

  let result = '';
  for (const char of text) {
    if (thaiMap[char]) {
      result += thaiMap[char];
    } else if (/[a-zA-Z0-9]/.test(char)) {
      result += char;
    }
  }
  return result;
}

export function generateLessonSlug(title: string): string {
  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    throw new Error('Title is required to generate a slug');
  }

  let slug: string;

  if (/[\u0E00-\u0E7F]/.test(title)) {
    slug = transliterateThaiToSlug(title);
  } else {
    slug = normalizeToKebabCase(title);
  }

  slug = slug.replace(/[^a-z0-9-]/g, '-');
  slug = slug.replace(/-+/g, '-');
  slug = slug.replace(/^-|-$/g, '');

  if (slug.length < 2) {
    throw new Error('Generated slug is too short');
  }

  return slug;
}

export function generateCurriculumUnitSlug(title: string): string {
  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    throw new Error('Title is required to generate a unit slug');
  }

  let slug = generateLessonSlug(title);

  if (!slug.startsWith('unit-')) {
    slug = 'unit-' + slug;
  }

  return slug;
}

export function generateQuestionSlug(title: string): string {
  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    throw new Error('Question text is required to generate a slug');
  }

  const slug = generateLessonSlug(title);

  if (!slug.startsWith('q-')) {
    return 'q-' + slug;
  }

  return slug;
}