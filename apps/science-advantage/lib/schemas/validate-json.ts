import type { StandardsAlignment } from '@/lib/enums';
import {
  isValidLessonSlug,
  isValidCurriculumUnitSlug,
  isValidQuestionSlug,
} from './lesson-slug.schema';

export interface StandardData {
  code: string;
  description: string;
}

export interface StandardsFile {
  framework: StandardsAlignment;
  gradeLevel: number;
  standards: StandardData[];
}

export interface LessonData {
  id: string;
  slug: string;
  title: string;
  description: string;
  content: string;
  order: number;
  standards: string[];
  lessonType?: string;
  structuredContent?: object;
}

export interface LessonsFile {
  framework: StandardsAlignment;
  gradeLevel: number;
  unit: number;
  lessons: LessonData[];
}

export interface CurriculumUnitData {
  id: string;
  slug: string;
  title: string;
  description: string;
  order: number;
  lessonIds: string[];
}

export interface CurriculumUnitsFile {
  framework: StandardsAlignment;
  gradeLevel: number;
  units: CurriculumUnitData[];
}

export interface QuizQuestionData {
  id: string;
  slug: string;
  lessonId: string;
  type: string;
  text: string;
  options?: object;
  correctAnswer: object;
  points: number;
  order: number;
}

export interface QuizQuestionsFile {
  framework: StandardsAlignment;
  gradeLevel: number;
  lessonId: string;
  questions: QuizQuestionData[];
}

export function validateStandardsFile(data: unknown): data is StandardsFile {
  if (!data || typeof data !== 'object') {
    throw new Error('Standards file must be a valid JSON object');
  }

  const obj = data as Record<string, unknown>;

  if (!obj.framework || typeof obj.framework !== 'string') {
    throw new Error('Standards file must have a valid "framework" field');
  }

  if (!obj.gradeLevel || typeof obj.gradeLevel !== 'number') {
    throw new Error('Standards file must have a valid "gradeLevel" field');
  }

  if (!Array.isArray(obj.standards)) {
    throw new Error('Standards file must have a "standards" array');
  }

  (obj.standards as unknown[]).forEach((standard: unknown, index: number) => {
    const std = standard as Record<string, unknown>;
    if (!std.code || typeof std.code !== 'string') {
      throw new Error(`Standard at index ${index} must have a "code" field`);
    }
    if (!std.description || typeof std.description !== 'string') {
      throw new Error(`Standard at index ${index} must have a "description" field`);
    }
  });

  return true;
}

export function validateLessonsFile(data: unknown): data is LessonsFile {
  if (!data || typeof data !== 'object') {
    throw new Error('Lessons file must be a valid JSON object');
  }

  const obj = data as Record<string, unknown>;

  if (!obj.framework || typeof obj.framework !== 'string') {
    throw new Error('Lessons file must have a valid "framework" field');
  }

  if (!obj.gradeLevel || typeof obj.gradeLevel !== 'number') {
    throw new Error('Lessons file must have a valid "gradeLevel" field');
  }

  if (!obj.unit || typeof obj.unit !== 'number') {
    throw new Error('Lessons file must have a valid "unit" field');
  }

  if (!Array.isArray(obj.lessons)) {
    throw new Error('Lessons file must have a "lessons" array');
  }

  (obj.lessons as unknown[]).forEach((lesson: unknown, index: number) => {
    const l = lesson as Record<string, unknown>;
    if (!l.id || typeof l.id !== 'string') {
      throw new Error(`Lesson at index ${index} must have an "id" field`);
    }
    if (!l.slug || typeof l.slug !== 'string') {
      throw new Error(`Lesson at index ${index} must have a "slug" field`);
    }
    if (!isValidLessonSlug(l.slug)) {
      throw new Error(`Lesson at index ${index} has invalid slug format: ${l.slug}`);
    }
    if (!l.title || typeof l.title !== 'string') {
      throw new Error(`Lesson at index ${index} must have a "title" field`);
    }
    if (!l.description || typeof l.description !== 'string') {
      throw new Error(`Lesson at index ${index} must have a "description" field`);
    }
    if (!l.content || typeof l.content !== 'string') {
      throw new Error(`Lesson at index ${index} must have a "content" field`);
    }
    if (typeof l.order !== 'number') {
      throw new Error(`Lesson at index ${index} must have an "order" field`);
    }
    if (!Array.isArray(l.standards)) {
      throw new Error(`Lesson at index ${index} must have a "standards" array`);
    }
  });

  return true;
}

export function validateCurriculumUnitsFile(data: unknown): data is CurriculumUnitsFile {
  if (!data || typeof data !== 'object') {
    throw new Error('Curriculum units file must be a valid JSON object');
  }

  const obj = data as Record<string, unknown>;

  if (!obj.framework || typeof obj.framework !== 'string') {
    throw new Error('Curriculum units file must have a valid "framework" field');
  }

  if (!obj.gradeLevel || typeof obj.gradeLevel !== 'number') {
    throw new Error('Curriculum units file must have a valid "gradeLevel" field');
  }

  if (!Array.isArray(obj.units)) {
    throw new Error('Curriculum units file must have a "units" array');
  }

  (obj.units as unknown[]).forEach((unit: unknown, index: number) => {
    const u = unit as Record<string, unknown>;
    if (!u.id || typeof u.id !== 'string') {
      throw new Error(`Unit at index ${index} must have an "id" field`);
    }
    if (!u.slug || typeof u.slug !== 'string') {
      throw new Error(`Unit at index ${index} must have a "slug" field`);
    }
    if (!isValidCurriculumUnitSlug(u.slug)) {
      throw new Error(`Unit at index ${index} has invalid slug format: ${u.slug}`);
    }
    if (!u.title || typeof u.title !== 'string') {
      throw new Error(`Unit at index ${index} must have a "title" field`);
    }
    if (!u.description || typeof u.description !== 'string') {
      throw new Error(`Unit at index ${index} must have a "description" field`);
    }
    if (typeof u.order !== 'number') {
      throw new Error(`Unit at index ${index} must have an "order" field`);
    }
    if (!Array.isArray(u.lessonIds)) {
      throw new Error(`Unit at index ${index} must have a "lessonIds" array`);
    }
  });

  return true;
}

export function validateQuizQuestionsFile(data: unknown): data is QuizQuestionsFile {
  if (!data || typeof data !== 'object') {
    throw new Error('Quiz questions file must be a valid JSON object');
  }

  const obj = data as Record<string, unknown>;

  if (!obj.framework || typeof obj.framework !== 'string') {
    throw new Error('Quiz questions file must have a valid "framework" field');
  }

  if (!obj.gradeLevel || typeof obj.gradeLevel !== 'number') {
    throw new Error('Quiz questions file must have a valid "gradeLevel" field');
  }

  if (!obj.lessonId || typeof obj.lessonId !== 'string') {
    throw new Error('Quiz questions file must have a valid "lessonId" field');
  }

  if (!Array.isArray(obj.questions)) {
    throw new Error('Quiz questions file must have a "questions" array');
  }

  (obj.questions as unknown[]).forEach((question: unknown, index: number) => {
    const q = question as Record<string, unknown>;
    if (!q.id || typeof q.id !== 'string') {
      throw new Error(`Question at index ${index} must have an "id" field`);
    }
    if (!q.slug || typeof q.slug !== 'string') {
      throw new Error(`Question at index ${index} must have a "slug" field`);
    }
    if (!isValidQuestionSlug(q.slug)) {
      throw new Error(`Question at index ${index} has invalid slug format: ${q.slug}`);
    }
    if (!q.lessonId || typeof q.lessonId !== 'string') {
      throw new Error(`Question at index ${index} must have a "lessonId" field`);
    }
    if (!q.type || typeof q.type !== 'string') {
      throw new Error(`Question at index ${index} must have a "type" field`);
    }
    if (!q.text || typeof q.text !== 'string') {
      throw new Error(`Question at index ${index} must have a "text" field`);
    }
    if (!q.correctAnswer || typeof q.correctAnswer !== 'object') {
      throw new Error(`Question at index ${index} must have a "correctAnswer" field`);
    }
    if (typeof q.points !== 'number') {
      throw new Error(`Question at index ${index} must have a "points" field`);
    }
    if (typeof q.order !== 'number') {
      throw new Error(`Question at index ${index} must have an "order" field`);
    }
  });

  return true;
}