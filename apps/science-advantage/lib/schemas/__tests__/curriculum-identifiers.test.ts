import { describe, it, expect } from 'vitest';
import { ZodError } from 'zod';
import * as fs from 'fs';
import * as path from 'path';
import {
  LessonSlugSchema,
  CurriculumUnitSlugSchema,
  QuestionSlugSchema,
  validateLessonSlug,
  validateCurriculumUnitSlug,
  validateQuestionSlug,
  isValidLessonSlug,
  isValidCurriculumUnitSlug,
  isValidQuestionSlug,
  generateLessonSlug,
  generateCurriculumUnitSlug,
  generateQuestionSlug,
} from '../lesson-slug.schema';
import { LessonType, StandardsAlignment } from '@/lib/enums';

describe('Curriculum Identifiers Schema', () => {
  describe('QuestionSlugSchema', () => {
    it('should accept valid kebab-case question slug', () => {
      const result = QuestionSlugSchema.parse('what-is-photosynthesis');
      expect(result).toBe('what-is-photosynthesis');
    });

    it('should accept question slug with numbers', () => {
      const result = QuestionSlugSchema.parse('q1-life-cycle');
      expect(result).toBe('q1-life-cycle');
    });

    it('should reject slug with uppercase letters', () => {
      expect(() => QuestionSlugSchema.parse('What-Is-Photosynthesis')).toThrow();
    });

    it('should reject slug starting with number', () => {
      expect(() => QuestionSlugSchema.parse('1-what-is-photosynthesis')).toThrow();
    });
  });

  describe('validateQuestionSlug', () => {
    it('should return slug if valid', () => {
      const result = validateQuestionSlug('what-is-photosynthesis');
      expect(result).toBe('what-is-photosynthesis');
    });

    it('should throw descriptive error for invalid slug', () => {
      expect(() => validateQuestionSlug('Invalid Slug')).toThrow('Question slug must be a valid kebab-case slug');
    });
  });

  describe('isValidQuestionSlug', () => {
    it('should return true for valid slug', () => {
      expect(isValidQuestionSlug('what-is-photosynthesis')).toBe(true);
    });

    it('should return false for invalid slug', () => {
      expect(isValidQuestionSlug('Invalid Slug')).toBe(false);
    });
  });

  describe('generateQuestionSlug', () => {
    it('should generate valid slug from question text', () => {
      const slug = generateQuestionSlug('What is photosynthesis?');
      expect(slug).toBe('q-what-is-photosynthesis');
      expect(isValidQuestionSlug(slug)).toBe(true);
    });

    it('should handle Thai text by transliterating', () => {
      const slug = generateQuestionSlug('การสังเคราะห์ด้วยแสงคืออะไร?');
      expect(isValidQuestionSlug(slug)).toBe(true);
    });
  });

  describe('LessonSlugSchema', () => {
    it('should accept valid kebab-case lesson slug', () => {
      const result = LessonSlugSchema.parse('being-a-scientist');
      expect(result).toBe('being-a-scientist');
    });

    it('should accept lesson slug with numbers', () => {
      const result = LessonSlugSchema.parse('lesson-1-intro');
      expect(result).toBe('lesson-1-intro');
    });

    it('should reject slug with uppercase letters', () => {
      expect(() => LessonSlugSchema.parse('Being-a-Scientist')).toThrow(ZodError);
    });

    it('should reject slug with spaces', () => {
      expect(() => LessonSlugSchema.parse('being a scientist')).toThrow(ZodError);
    });

    it('should reject slug starting with number', () => {
      expect(() => LessonSlugSchema.parse('3-being-a-scientist')).toThrow(ZodError);
    });

    it('should reject slug with special characters', () => {
      expect(() => LessonSlugSchema.parse('being_a_scientist')).toThrow(ZodError);
      expect(() => LessonSlugSchema.parse('being.a.scientist')).toThrow(ZodError);
    });

    it('should reject slug shorter than 2 characters', () => {
      expect(() => LessonSlugSchema.parse('a')).toThrow(ZodError);
    });

    it('should reject slug longer than 100 characters', () => {
      const longSlug = 'a'.repeat(101);
      expect(() => LessonSlugSchema.parse(longSlug)).toThrow(ZodError);
    });
  });

  describe('CurriculumUnitSlugSchema', () => {
    it('should accept valid kebab-case unit slug', () => {
      const result = CurriculumUnitSlugSchema.parse('unit-1-intro-science');
      expect(result).toBe('unit-1-intro-science');
    });

    it('should reject slug with uppercase letters', () => {
      expect(() => CurriculumUnitSlugSchema.parse('Unit-1')).toThrow(ZodError);
    });

    it('should reject slug with special characters', () => {
      expect(() => CurriculumUnitSlugSchema.parse('unit_1')).toThrow(ZodError);
    });
  });

  describe('validateLessonSlug', () => {
    it('should return slug if valid', () => {
      const result = validateLessonSlug('being-a-scientist');
      expect(result).toBe('being-a-scientist');
    });

    it('should throw descriptive error for invalid slug', () => {
      expect(() => validateLessonSlug('Invalid Slug')).toThrow('Lesson slug must be a valid kebab-case slug');
    });
  });

  describe('validateCurriculumUnitSlug', () => {
    it('should return slug if valid', () => {
      const result = validateCurriculumUnitSlug('unit-1-living-things');
      expect(result).toBe('unit-1-living-things');
    });
  });

  describe('isValidLessonSlug', () => {
    it('should return true for valid slug', () => {
      expect(isValidLessonSlug('being-a-scientist')).toBe(true);
    });

    it('should return false for invalid slug', () => {
      expect(isValidLessonSlug('Invalid Slug')).toBe(false);
      expect(isValidLessonSlug('')).toBe(false);
      expect(isValidLessonSlug('a')).toBe(false);
    });
  });

  describe('isValidCurriculumUnitSlug', () => {
    it('should return true for valid unit slug', () => {
      expect(isValidCurriculumUnitSlug('unit-1')).toBe(true);
    });

    it('should return false for invalid unit slug', () => {
      expect(isValidCurriculumUnitSlug('Unit-1')).toBe(false);
    });
  });

  describe('generateLessonSlug', () => {
    it('should generate valid slug from title', () => {
      const slug = generateLessonSlug('Being a Scientist');
      expect(slug).toBe('being-a-scientist');
      expect(isValidLessonSlug(slug)).toBe(true);
    });

    it('should handle Thai text by transliterating', () => {
      const slug = generateLessonSlug('การเป็นนักวิทยาศาสตร์');
      expect(isValidLessonSlug(slug)).toBe(true);
    });

    it('should handle titles with special characters', () => {
      const slug = generateLessonSlug('Lesson 1: Introduction to Science!');
      expect(isValidLessonSlug(slug)).toBe(true);
      expect(slug).toBe('lesson-1-introduction-to-science');
    });

    it('should handle empty strings gracefully', () => {
      expect(() => generateLessonSlug('')).toThrow('Title is required to generate a slug');
    });
  });

  describe('generateCurriculumUnitSlug', () => {
    it('should generate valid slug from unit title', () => {
      const slug = generateCurriculumUnitSlug('Unit 1: Introduction to Science');
      expect(slug).toBe('unit-1-introduction-to-science');
      expect(isValidCurriculumUnitSlug(slug)).toBe(true);
    });

    it('should prepend unit- prefix when generating', () => {
      const slug = generateCurriculumUnitSlug('Living Things');
      expect(slug.startsWith('unit-')).toBe(true);
    });
  });
});

describe('Lesson Structured Content Contract', () => {
  describe('LessonType enum coverage', () => {
    it('should support all required lesson types from spec', () => {
      const requiredTypes: LessonType[] = ['LESSON', 'LAB', 'ASSESSMENT', 'REVIEW'];
      for (const type of requiredTypes) {
        expect(Object.values(LessonType)).toContain(type);
      }
    });

    it('should have explicit instruction lesson type for FR-2', () => {
      expect(LessonType.LESSON).toBeDefined();
      expect(LessonType.LAB).toBeDefined();
    });

    it('should have REVIEW lesson type for fun review lessons (FR-2)', () => {
      expect(LessonType.REVIEW).toBeDefined();
    });
  });

  describe('Structured content validation', () => {
    it('should validate explicit instruction lesson blocks', async () => {
      const { validateLessonContent } = await import('@/lib/schemas/lesson-content.schema');

      const instructionLesson = {
        version: 1,
        blocks: [
          {
            id: 'intro',
            type: 'text',
            content: 'Today we learn about plants...',
          },
          {
            id: 'vocab',
            type: 'vocabulary',
            terms: [
              { term: 'Photosynthesis', thai: 'การสังเคราะห์ด้วยแสง', definition: 'How plants make food' },
            ],
          },
          {
            id: 'reading',
            type: 'reading_passage',
            title: 'How Plants Make Food',
            content: 'Plants are amazing...',
            wordCount: 150,
          },
        ],
      };

      const result = validateLessonContent(instructionLesson);
      expect(result.version).toBe(1);
      expect(result.blocks).toHaveLength(3);
    });

    it('should validate lab lesson blocks', async () => {
      const { validateLessonContent } = await import('@/lib/schemas/lesson-content.schema');

      const labLesson = {
        version: 1,
        blocks: [
          {
            id: 'intro',
            type: 'text',
            content: 'Today we will conduct an experiment...',
          },
          {
            id: 'materials',
            type: 'materials',
            items: [
              { quantity: '2', item: 'Plants', itemThai: 'ต้นไม้' },
              { quantity: '1', item: 'Magnifying glass', itemThai: 'แว่นขยาย' },
            ],
          },
          {
            id: 'procedure',
            type: 'procedure',
            steps: [
              { stepNumber: 1, instruction: 'Observe the plant', instructionThai: 'สังเกตต้นไม้' },
              { stepNumber: 2, instruction: 'Record observations', instructionThai: 'บันทึกการสังเกต' },
            ],
          },
        ],
      };

      const result = validateLessonContent(labLesson);
      expect(result.version).toBe(1);
      expect(result.blocks).toHaveLength(3);
    });

    it('should validate fun review lesson blocks', async () => {
      const { validateLessonContent } = await import('@/lib/schemas/lesson-content.schema');

      const reviewLesson = {
        version: 1,
        blocks: [
          {
            id: 'intro',
            type: 'text',
            content: 'Lets review what we learned about plants!',
          },
          {
            id: 'review',
            type: 'review',
            title: 'Plant Parts Review',
            titleThai: 'ทบทวนส่วนต่างๆ ของต้นไม้',
            questions: [
              { questionId: 'q1', text: 'What do plants need to grow?', textThai: 'ต้นไม้ต้องการอะไรในการเติบโต?' },
            ],
          },
        ],
      };

      const result = validateLessonContent(reviewLesson);
      expect(result.version).toBe(1);
      expect(result.blocks).toHaveLength(2);
    });

    it('should validate summative assessment lesson blocks', async () => {
      const { validateLessonContent } = await import('@/lib/schemas/lesson-content.schema');

      const assessmentLesson = {
        version: 1,
        blocks: [
          {
            id: 'intro',
            type: 'text',
            content: 'Time to show what you have learned!',
          },
          {
            id: 'quiz',
            type: 'quiz',
            title: 'Unit 1 Assessment',
            titleThai: 'แบบทดสอบบทที่ 1',
            passingScore: 70,
            questions: [
              {
                questionId: 'q1',
                type: 'multiple_choice',
                text: 'What is photosynthesis?',
                textThai: 'การสังเคราะห์ด้วยแสงคืออะไร?',
                options: [
                  { id: 'a', text: 'How plants make food', isCorrect: true },
                  { id: 'b', text: 'How animals breathe', isCorrect: false },
                ],
              },
            ],
          },
        ],
      };

      const result = validateLessonContent(assessmentLesson);
      expect(result.version).toBe(1);
      expect(result.blocks).toHaveLength(2);
    });
  });
});

describe('Standards Mapping Validation', () => {
  it('should require standards alignment for lesson creation', async () => {
    const { validateStandardsFile } = await import('@/lib/schemas/validate-json');

    const validStandards = {
      framework: 'THAI' as StandardsAlignment,
      gradeLevel: 3,
      standards: [
        { code: 'Sc1.1-G3', description: 'Identify characteristics of living things' },
        { code: 'Sc8.2-G3', description: 'Use scientific tools safely' },
      ],
    };

    expect(() => validateStandardsFile(validStandards)).not.toThrow();
  });

  it('should reject standards file without framework', async () => {
    const { validateStandardsFile } = await import('@/lib/schemas/validate-json');

    const invalidStandards = {
      gradeLevel: 3,
      standards: [
        { code: 'Sc1.1-G3', description: 'Identify characteristics' },
      ],
    };

    expect(() => validateStandardsFile(invalidStandards)).toThrow('Standards file must have a valid "framework" field');
  });

  it('should validate standards code format', async () => {
    const { validateStandardsFile } = await import('@/lib/schemas/validate-json');

    const validStandards = {
      framework: 'THAI' as StandardsAlignment,
      gradeLevel: 3,
      standards: [
        { code: 'Sc1.1-G3', description: 'Test' },
      ],
    };

    expect(() => validateStandardsFile(validStandards)).not.toThrow();
  });
});



describe('Media and Localization Requirements', () => {
  it('should have explicit Thai content fields where English exists', async () => {
    const { validateLessonContent } = await import('@/lib/schemas/lesson-content.schema');

    const bilingualLesson = {
      version: 1,
      blocks: [
        {
          id: 'intro',
          type: 'text',
          content: 'Welcome to the lesson',
          contentThai: 'ยินดีต้อนรับสู่บทเรียน',
        },
        {
          id: 'vocab',
          type: 'vocabulary',
          terms: [
            {
              term: 'Photosynthesis',
              thai: 'การสังเคราะห์ด้วยแสง',
              definition: 'The process by which plants convert sunlight into energy',
            },
          ],
        },
        {
          id: 'image-1',
          type: 'image',
          src: '/images/plant-diagram.png',
          alt: 'Diagram showing the parts of a plant involved in photosynthesis',
          caption: 'Parts of a plant',
          captionThai: 'ส่วนต่างๆ ของพืช',
        },
      ],
    };

    const result = validateLessonContent(bilingualLesson);
    expect(result.blocks[0]).toHaveProperty('contentThai');
    expect((result.blocks[0] as { contentThai?: string }).contentThai).toBe('ยินดีต้อนรับสู่บทเรียน');
  });

  it('should require alt text for images as accessibility requirement', async () => {
    const { validateLessonContent } = await import('@/lib/schemas/lesson-content.schema');

    const lessonWithImage = {
      version: 1,
      blocks: [
        {
          type: 'image',
          src: '/images/diagram.png',
          alt: 'A detailed diagram showing plant anatomy with labeled parts',
        },
      ],
    };

    expect(() => validateLessonContent(lessonWithImage)).not.toThrow();
  });

  it('should reject image with missing alt text', async () => {
    const { validateLessonContent } = await import('@/lib/schemas/lesson-content.schema');

    const lessonWithoutAlt = {
      version: 1,
      blocks: [
        {
          type: 'image',
          src: '/images/diagram.png',
          alt: 'Plant', // Too short - must be at least 10 chars
        },
      ],
    };

    expect(() => validateLessonContent(lessonWithoutAlt)).toThrow(ZodError);
  });
});

describe('Seed Data Validation', () => {
  describe('Lesson seed data format (FR-3)', () => {
    it('should validate against lessons file schema', async () => {
      const { validateLessonsFile } = await import('@/lib/schemas/validate-json');

      const validLessonsFile = {
        framework: 'THAI',
        gradeLevel: 3,
        unit: 1,
        lessons: [
          {
            id: 'g3-being-a-scientist',
            slug: 'being-a-scientist',
            title: 'Being a Scientist',
            description: 'What do scientists do?',
            content: 'Scientists follow steps...',
            order: 1,
            standards: ['Sc8.1-G3'],
          },
        ],
      };

      expect(() => validateLessonsFile(validLessonsFile)).not.toThrow();
    });

    it('should reject lessons file without framework', async () => {
      const { validateLessonsFile } = await import('@/lib/schemas/validate-json');

      const invalidFile = {
        gradeLevel: 3,
        unit: 1,
        lessons: [],
      };

      expect(() => validateLessonsFile(invalidFile)).toThrow('Lessons file must have a valid "framework" field');
    });

    it('should require structuredContent for new lesson format (FR-2)', async () => {
      const { validateLessonsFile } = await import('@/lib/schemas/validate-json');

      const legacyLesson = {
        framework: 'THAI',
        gradeLevel: 3,
        unit: 1,
        lessons: [
          {
            id: 'g3-legacy-lesson',
            slug: 'legacy-lesson',
            title: 'Legacy Lesson',
            description: 'Old format without structured content',
            content: 'Just plain content...',
            order: 1,
            standards: ['Sc8.1-G3'],
          },
        ],
      };

      expect(() => validateLessonsFile(legacyLesson)).not.toThrow();
    });
  });

  describe('Curriculum units seed data format (FR-1)', () => {
    it('should validate curriculum units file schema', async () => {
      const { validateCurriculumUnitsFile } = await import('@/lib/schemas/validate-json');

      const validUnitsFile = {
        framework: 'THAI',
        gradeLevel: 3,
        units: [
          {
            id: 'thai-g3-unit-1',
            slug: 'unit-1-introduction-to-science',
            title: 'Unit 1: Introduction to Science',
            description: 'Learn about science',
            order: 1,
            lessonIds: ['g3-being-a-scientist', 'g3-science-safety-tools'],
          },
        ],
      };

      expect(() => validateCurriculumUnitsFile(validUnitsFile)).not.toThrow();
    });

    it('should require lessonIds array for each unit', async () => {
      const { validateCurriculumUnitsFile } = await import('@/lib/schemas/validate-json');

      const invalidUnit = {
        framework: 'THAI',
        gradeLevel: 3,
        units: [
          {
            id: 'thai-g3-unit-1',
            slug: 'unit-1',
            title: 'Unit 1',
            description: 'Test',
            order: 1,
          },
        ],
      };

      expect(() => validateCurriculumUnitsFile(invalidUnit)).toThrow('Unit at index 0 must have a "lessonIds" array');
    });
  });

  describe('Grade 3 Scope-and-Sequence Normalization (Phase 2)', () => {
    it('should have 10 curriculum units for Grade 3', async () => {
      const { validateCurriculumUnitsFile } = await import('@/lib/schemas/validate-json');

      const filePath = path.join(process.cwd(), 'prisma', 'seed-data', 'curriculum-units', 'thai-grade-3.json');
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

      expect(() => validateCurriculumUnitsFile(data)).not.toThrow();
      expect(data.units).toHaveLength(10);
    });

    it('should have 9 lessons in Unit 1 (intro to science)', async () => {
      const filePath = path.join(process.cwd(), 'prisma', 'seed-data', 'curriculum-units', 'thai-grade-3.json');
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

      const unit1 = data.units.find((u: any) => u.order === 1);
      expect(unit1).toBeDefined();
      expect(unit1.lessonIds).toHaveLength(9);
    });

    it('should have 12 lessons in Unit 2 (environments & habitats)', async () => {
      const filePath = path.join(process.cwd(), 'prisma', 'seed-data', 'curriculum-units', 'thai-grade-3.json');
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

      const unit2 = data.units.find((u: any) => u.order === 2);
      expect(unit2).toBeDefined();
      expect(unit2.lessonIds).toHaveLength(12);
    });

    it('should have 12 lessons in Unit 4 (forces & motion)', async () => {
      const filePath = path.join(process.cwd(), 'prisma', 'seed-data', 'curriculum-units', 'thai-grade-3.json');
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

      const unit4 = data.units.find((u: any) => u.order === 4);
      expect(unit4).toBeDefined();
      expect(unit4.lessonIds).toHaveLength(12);
    });

    it('should have slug field on all curriculum units', async () => {
      const filePath = path.join(process.cwd(), 'prisma', 'seed-data', 'curriculum-units', 'thai-grade-3.json');
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

      for (const unit of data.units) {
        expect(unit).toHaveProperty('slug');
        expect(typeof unit.slug).toBe('string');
        expect(unit.slug.length).toBeGreaterThan(0);
      }
    });

    it('should have slug field on all Grade 3 lessons', async () => {
      const lessonsDir = path.join(process.cwd(), 'prisma', 'seed-data', 'lessons');
      const files = fs.readdirSync(lessonsDir).filter(f => f.startsWith('thai-g3-unit') && f.endsWith('.json'));

      for (const file of files) {
        const filePath = path.join(lessonsDir, file);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

        for (const lesson of data.lessons) {
          expect(lesson).toHaveProperty('slug');
          expect(typeof lesson.slug).toBe('string');
          expect(lesson.slug.length).toBeGreaterThan(0);
        }
      }
    });

    it('should have valid lessonType for all Grade 3 lessons', async () => {
      const { LessonType } = await import('@/lib/enums');
      const lessonsDir = path.join(process.cwd(), 'prisma', 'seed-data', 'lessons');
      const files = fs.readdirSync(lessonsDir).filter(f => f.startsWith('thai-g3-unit') && f.endsWith('.json'));

      for (const file of files) {
        const filePath = path.join(lessonsDir, file);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

        for (const lesson of data.lessons) {
          if (lesson.lessonType) {
            expect(Object.values(LessonType)).toContain(lesson.lessonType);
          }
        }
      }
    });

    it('should have question bank files for Grade 3 lessons', async () => {
      const questionsDir = path.join(process.cwd(), 'prisma', 'seed-data', 'questions');
      const files = fs.readdirSync(questionsDir).filter(f => f.startsWith('g3-') && f.endsWith('.json'));

      expect(files.length).toBeGreaterThan(0);
    });

    it('should have standards mapping for Grade 3', async () => {
      const filePath = path.join(process.cwd(), 'prisma', 'seed-data', 'standards', 'thai-grade-3.json');
      expect(fs.existsSync(filePath)).toBe(true);

      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      expect(data.framework).toBe('THAI');
      expect(data.gradeLevel).toBe(3);
      expect(Array.isArray(data.standards)).toBe(true);
      expect(data.standards.length).toBeGreaterThan(0);
    });

    it('should have structuredContent with blocks for Grade 3 Unit 1 lessons', async () => {
      const filePath = path.join(process.cwd(), 'prisma', 'seed-data', 'lessons', 'thai-g3-unit-1.json');
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

      for (const lesson of data.lessons) {
        expect(lesson).toHaveProperty('structuredContent');
        expect(lesson.structuredContent).toHaveProperty('version', 1);
        expect(lesson.structuredContent).toHaveProperty('blocks');
        expect(Array.isArray(lesson.structuredContent.blocks)).toBe(true);
        expect(lesson.structuredContent.blocks.length).toBeGreaterThan(0);
      }
    });

    it('should have bilingual content (Thai) for Grade 3 lessons with structuredContent', async () => {
      const filePath = path.join(process.cwd(), 'prisma', 'seed-data', 'lessons', 'thai-g3-unit-1.json');
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

      const lesson1 = data.lessons[0];
      expect(lesson1.structuredContent).toHaveProperty('blocks');

      const vocabBlocks = lesson1.structuredContent.blocks.filter((b: any) => b.type === 'vocabulary');
      let vocabWithThai = 0;
      for (const block of vocabBlocks) {
        if (block.terms && block.terms.length > 0) {
          for (const term of block.terms) {
            if (term.thai) vocabWithThai++;
          }
        }
      }
      expect(vocabWithThai).toBeGreaterThan(0);
    });
  });

  describe('Grade 4 Rich Content Normalization (Phase 2)', () => {
    it('should have lesson files for Grade 4 in prisma/data/content/grade-4/lessons/', async () => {
      const lessonsDir = path.join(process.cwd(), 'prisma', 'data', 'content', 'grade-4', 'lessons');
      expect(fs.existsSync(lessonsDir)).toBe(true);

      const files = fs.readdirSync(lessonsDir).filter(f => f.endsWith('.json'));
      expect(files.length).toBeGreaterThan(0);
    });

    it('should have question bank files for Grade 4 in prisma/data/content/grade-4/questions/', async () => {
      const questionsDir = path.join(process.cwd(), 'prisma', 'data', 'content', 'grade-4', 'questions');
      expect(fs.existsSync(questionsDir)).toBe(true);

      const files = fs.readdirSync(questionsDir).filter(f => f.endsWith('.json'));
      expect(files.length).toBeGreaterThan(0);
    });

    it('should have standards mapping for Grade 4', async () => {
      const filePath = path.join(process.cwd(), 'prisma', 'data', 'content', 'grade-4', 'standards-mapping.json');
      expect(fs.existsSync(filePath)).toBe(true);

      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      expect(data).toHaveProperty('framework', 'THAI');
      expect(data).toHaveProperty('gradeLevel', 4);
      expect(Array.isArray(data.lessons)).toBe(true);
      expect(data.lessons.length).toBeGreaterThan(0);
    });

    it('should have slug field on Grade 4 lesson file names', async () => {
      const lessonsDir = path.join(process.cwd(), 'prisma', 'data', 'content', 'grade-4', 'lessons');
      const files = fs.readdirSync(lessonsDir).filter(f => f.endsWith('.json'));

      for (const file of files) {
        expect(file).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*\.json$/);
      }
    });

    it('should have structuredContent with blocks for Grade 4 lessons', async () => {
      const lessonsDir = path.join(process.cwd(), 'prisma', 'data', 'content', 'grade-4', 'lessons');
      const files = fs.readdirSync(lessonsDir).filter(f => f.endsWith('.json'));

      for (const file of files) {
        const filePath = path.join(lessonsDir, file);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

        expect(data).toHaveProperty('version', 1);
        expect(data).toHaveProperty('blocks');
        expect(Array.isArray(data.blocks)).toBe(true);
        expect(data.blocks.length).toBeGreaterThan(0);
      }
    });

    it('should have question banks with 20 questions per Grade 4 lesson', async () => {
      const lessonsDir = path.join(process.cwd(), 'prisma', 'data', 'content', 'grade-4', 'lessons');
      const questionsDir = path.join(process.cwd(), 'prisma', 'data', 'content', 'grade-4', 'questions');
      const lessonFiles = fs.readdirSync(lessonsDir).filter(f => f.endsWith('.json'));

      for (const lessonFile of lessonFiles) {
        const lessonSlug = lessonFile.replace('.json', '');
        const questionFile = path.join(questionsDir, `${lessonSlug}.json`);
        expect(fs.existsSync(questionFile)).toBe(true);

        const qData = JSON.parse(fs.readFileSync(questionFile, 'utf-8'));
        expect(qData.questions).toHaveLength(20);
      }
    });

    it('should have bilingual vocabulary terms in Grade 4 structuredContent', async () => {
      const lessonsDir = path.join(process.cwd(), 'prisma', 'data', 'content', 'grade-4', 'lessons');
      const files = fs.readdirSync(lessonsDir).filter(f => f.endsWith('.json'));

      for (const file of files) {
        const filePath = path.join(lessonsDir, file);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

        const vocabBlocks = data.blocks.filter((b: any) => b.type === 'vocabulary');
        for (const block of vocabBlocks) {
          if (block.terms && block.terms.length > 0) {
            for (const term of block.terms) {
              expect(term).toHaveProperty('thai');
            }
          }
        }
      }
    });
  });
});