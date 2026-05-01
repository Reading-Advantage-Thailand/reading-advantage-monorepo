import { StandardsAlignment } from '@prisma/client';

// Type guards and validators for seed data JSON files

interface StandardData {
  code: string;
  description: string;
}

interface StandardsFile {
  framework: StandardsAlignment;
  gradeLevel: number;
  standards: StandardData[];
}

interface LessonData {
  id: string;
  title: string;
  titleThai?: string;
  description: string;
  descriptionThai?: string;
  content: string;
  order: number;
  standards: string[];
}

interface LessonsFile {
  framework: StandardsAlignment;
  gradeLevel: number;
  unit: number;
  lessons: LessonData[];
}

interface CurriculumUnitData {
  id: string;
  title: string;
  description: string;
  order: number;
  lessonIds: string[];
}

interface CurriculumUnitsFile {
  framework: StandardsAlignment;
  gradeLevel: number;
  units: CurriculumUnitData[];
}

// Validation functions

export function validateStandardsFile(data: any): data is StandardsFile {
  if (!data || typeof data !== 'object') {
    throw new Error('Standards file must be a valid JSON object');
  }

  if (!data.framework || typeof data.framework !== 'string') {
    throw new Error('Standards file must have a valid "framework" field');
  }

  if (!data.gradeLevel || typeof data.gradeLevel !== 'number') {
    throw new Error('Standards file must have a valid "gradeLevel" field');
  }

  if (!Array.isArray(data.standards)) {
    throw new Error('Standards file must have a "standards" array');
  }

  data.standards.forEach((standard: any, index: number) => {
    if (!standard.code || typeof standard.code !== 'string') {
      throw new Error(`Standard at index ${index} must have a "code" field`);
    }
    if (!standard.description || typeof standard.description !== 'string') {
      throw new Error(`Standard at index ${index} must have a "description" field`);
    }
  });

  return true;
}

export function validateLessonsFile(data: any): data is LessonsFile {
  if (!data || typeof data !== 'object') {
    throw new Error('Lessons file must be a valid JSON object');
  }

  if (!data.framework || typeof data.framework !== 'string') {
    throw new Error('Lessons file must have a valid "framework" field');
  }

  if (!data.gradeLevel || typeof data.gradeLevel !== 'number') {
    throw new Error('Lessons file must have a valid "gradeLevel" field');
  }

  if (!data.unit || typeof data.unit !== 'number') {
    throw new Error('Lessons file must have a valid "unit" field');
  }

  if (!Array.isArray(data.lessons)) {
    throw new Error('Lessons file must have a "lessons" array');
  }

  data.lessons.forEach((lesson: any, index: number) => {
    if (!lesson.id || typeof lesson.id !== 'string') {
      throw new Error(`Lesson at index ${index} must have an "id" field`);
    }
    if (!lesson.title || typeof lesson.title !== 'string') {
      throw new Error(`Lesson at index ${index} must have a "title" field`);
    }
    if (!lesson.description || typeof lesson.description !== 'string') {
      throw new Error(`Lesson at index ${index} must have a "description" field`);
    }
    if (!lesson.content || typeof lesson.content !== 'string') {
      throw new Error(`Lesson at index ${index} must have a "content" field`);
    }
    if (typeof lesson.order !== 'number') {
      throw new Error(`Lesson at index ${index} must have an "order" field`);
    }
    if (!Array.isArray(lesson.standards)) {
      throw new Error(`Lesson at index ${index} must have a "standards" array`);
    }
    if (lesson.structuredContent !== undefined) {
      const sc = lesson.structuredContent;
      if (typeof sc !== 'object' || sc === null) {
        throw new Error(`Lesson at index ${index}: structuredContent must be an object`);
      }
      if (typeof sc.version !== 'number' || !Array.isArray(sc.blocks)) {
        throw new Error(`Lesson at index ${index}: structuredContent must have "version" (number) and "blocks" (array)`);
      }
    }
  });

  return true;
}

export function validateCurriculumUnitsFile(data: any): data is CurriculumUnitsFile {
  if (!data || typeof data !== 'object') {
    throw new Error('Curriculum units file must be a valid JSON object');
  }

  if (!data.framework || typeof data.framework !== 'string') {
    throw new Error('Curriculum units file must have a valid "framework" field');
  }

  if (!data.gradeLevel || typeof data.gradeLevel !== 'number') {
    throw new Error('Curriculum units file must have a valid "gradeLevel" field');
  }

  if (!Array.isArray(data.units)) {
    throw new Error('Curriculum units file must have a "units" array');
  }

  data.units.forEach((unit: any, index: number) => {
    if (!unit.id || typeof unit.id !== 'string') {
      throw new Error(`Unit at index ${index} must have an "id" field`);
    }
    if (!unit.title || typeof unit.title !== 'string') {
      throw new Error(`Unit at index ${index} must have a "title" field`);
    }
    if (!unit.description || typeof unit.description !== 'string') {
      throw new Error(`Unit at index ${index} must have a "description" field`);
    }
    if (typeof unit.order !== 'number') {
      throw new Error(`Unit at index ${index} must have an "order" field`);
    }
    if (!Array.isArray(unit.lessonIds)) {
      throw new Error(`Unit at index ${index} must have a "lessonIds" array`);
    }
  });

  return true;
}
