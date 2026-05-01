import { describe, it, expect } from 'vitest';
import {
  validateLessonsSeedFile,
  validateQuizQuestionsSeedFile,
  formatValidationErrors,
  type ValidationError,
} from '@/lib/schemas/seed-validation';
import { LessonContentSchema } from '@/lib/schemas/lesson-content.schema';

describe('Seed Validation', () => {
  describe('validateLessonsSeedFile', () => {
    it('should pass validation for valid lessons file', () => {
      const validData = {
        framework: 'THAI',
        gradeLevel: 3,
        unit: 2,
        lessons: [
          {
            id: 'g3-test-lesson',
            slug: 'test-lesson',
            title: 'Test Lesson',
            description: 'A test lesson',
            content: 'Test content',
            order: 1,
            standards: ['Sc1.1-G3'],
            structuredContent: {
              version: 1,
              blocks: [
                { id: 'intro', type: 'text', content: 'Welcome to the lesson.' },
                {
                  id: 'vocab',
                  type: 'vocabulary',
                  terms: [
                    { term: 'Test', thai: 'ทดสอบ', definition: 'A test term' },
                  ],
                },
              ],
            },
          },
        ],
      };

      const errors = validateLessonsSeedFile(validData, 'test-file.json');
      expect(errors).toHaveLength(0);
    });

    it('should fail validation for missing framework', () => {
      const invalidData = {
        gradeLevel: 3,
        unit: 2,
        lessons: [
          {
            id: 'g3-test',
            title: 'Test',
            description: 'Test',
            content: 'Test',
            order: 1,
            standards: [],
          },
        ],
      };

      const errors = validateLessonsSeedFile(invalidData, 'test.json');
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].message).toContain('Required');
    });

    it('should fail validation for empty lessons array', () => {
      const invalidData = {
        framework: 'THAI',
        gradeLevel: 3,
        unit: 2,
        lessons: [],
      };

      const errors = validateLessonsSeedFile(invalidData, 'test.json');
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].message).toContain('At least one lesson');
    });

    it('should fail validation for lesson missing required fields', () => {
      const invalidData = {
        framework: 'THAI',
        gradeLevel: 3,
        unit: 2,
        lessons: [
          {
            id: 'g3-test',
            // missing title
            description: 'Test',
            content: 'Test',
            order: 1,
            standards: [],
          },
        ],
      };

      const errors = validateLessonsSeedFile(invalidData, 'test.json');
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.message.includes('Required'))).toBe(true);
    });

    it('should fail validation for invalid structuredContent blocks', () => {
      const invalidData = {
        framework: 'THAI',
        gradeLevel: 3,
        unit: 2,
        lessons: [
          {
            id: 'g3-test',
            title: 'Test',
            description: 'Test',
            content: 'Test',
            order: 1,
            standards: [],
            structuredContent: {
              version: 1,
              blocks: [
                { type: 'text', content: '' }, // empty content
              ],
            },
          },
        ],
      };

      const errors = validateLessonsSeedFile(invalidData, 'test.json');
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].lessonId).toBe('g3-test');
    });

    it('should report file path in validation errors', () => {
      const invalidData = {
        // missing framework
        gradeLevel: 3,
        unit: 2,
        lessons: [],
      };

      const errors = validateLessonsSeedFile(invalidData, 'path/to/file.json');
      expect(errors[0].filePath).toBe('path/to/file.json');
    });

    it('should report lesson ID in validation errors for lesson-level issues', () => {
      const invalidData = {
        framework: 'THAI',
        gradeLevel: 3,
        unit: 2,
        lessons: [
          {
            id: 'g3-bad-lesson',
            title: 'Bad Lesson',
            description: 'Test',
            content: 'Test',
            order: 1,
            standards: [],
            structuredContent: {
              version: 1,
              blocks: [
                { type: 'vocabulary', terms: [] }, // empty terms array
              ],
            },
          },
        ],
      };

      const errors = validateLessonsSeedFile(invalidData, 'test.json');
      expect(errors[0].lessonId).toBe('g3-bad-lesson');
    });
  });

  describe('validateQuizQuestionsSeedFile', () => {
    it('should pass validation for valid questions file', () => {
      const validData = {
        lessonId: 'g3-test-lesson',
        questions: [
          {
            type: 'MULTIPLE_CHOICE',
            text: 'What is 2 + 2?',
            correctAnswer: '4',
            points: 10,
            standards: ['Sc1.1-G3'],
          },
        ],
      };

      const errors = validateQuizQuestionsSeedFile(validData, 'test.json');
      expect(errors).toHaveLength(0);
    });

    it('should fail validation for missing lessonId', () => {
      const invalidData = {
        questions: [
          {
            type: 'MULTIPLE_CHOICE',
            text: 'Test?',
            correctAnswer: 'A',
            points: 10,
            standards: ['Sc1.1-G3'],
          },
        ],
      };

      const errors = validateQuizQuestionsSeedFile(invalidData, 'test.json');
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail validation for empty questions array', () => {
      const invalidData = {
        lessonId: 'g3-test',
        questions: [],
      };

      const errors = validateQuizQuestionsSeedFile(invalidData, 'test.json');
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].message).toContain('At least one question');
    });

    it('should fail validation for question missing text', () => {
      const invalidData = {
        lessonId: 'g3-test',
        questions: [
          {
            type: 'MULTIPLE_CHOICE',
            // missing text
            correctAnswer: 'A',
            points: 10,
            standards: ['Sc1.1-G3'],
          },
        ],
      };

      const errors = validateQuizQuestionsSeedFile(invalidData, 'test.json');
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].message).toContain('Required');
    });

    it('should fail validation for question with non-positive points', () => {
      const invalidData = {
        lessonId: 'g3-test',
        questions: [
          {
            type: 'MULTIPLE_CHOICE',
            text: 'Test?',
            correctAnswer: 'A',
            points: 0,
            standards: ['Sc1.1-G3'],
          },
        ],
      };

      const errors = validateQuizQuestionsSeedFile(invalidData, 'test.json');
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].message).toContain('Points');
    });
  });

  describe('formatValidationErrors', () => {
    it('should return empty string for no errors', () => {
      expect(formatValidationErrors([])).toBe('');
    });

    it('should format errors with file path', () => {
      const errors: ValidationError[] = [
        {
          filePath: 'test.json',
          message: 'Framework is required',
        },
      ];

      const formatted = formatValidationErrors(errors);
      expect(formatted).toContain('test.json');
      expect(formatted).toContain('Framework is required');
      expect(formatted).toContain('1 error(s)');
    });

    it('should format errors with lesson ID', () => {
      const errors: ValidationError[] = [
        {
          filePath: 'test.json',
          lessonId: 'g3-test',
          message: 'Content is required',
        },
      ];

      const formatted = formatValidationErrors(errors);
      expect(formatted).toContain('g3-test');
      expect(formatted).toContain('Content is required');
    });

    it('should format multiple errors', () => {
      const errors: ValidationError[] = [
        { filePath: 'a.json', message: 'Error 1' },
        { filePath: 'b.json', message: 'Error 2' },
      ];

      const formatted = formatValidationErrors(errors);
      expect(formatted).toContain('2 error(s)');
      expect(formatted).toContain('Error 1');
      expect(formatted).toContain('Error 2');
    });
  });

  describe('Zod Schemas', () => {
    it('should validate a valid lesson content structure', () => {
      const input = {
        version: 1,
        blocks: [
          { id: 'intro', type: 'text', content: 'Welcome to the lesson.' },
          {
            id: 'vocab',
            type: 'vocabulary',
            terms: [
              { term: 'Test', thai: 'ทดสอบ', definition: 'A test term' },
            ],
          },
        ],
      };

      const result = LessonContentSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should reject lesson content with empty text block', () => {
      const input = {
        version: 1,
        blocks: [{ type: 'text', content: '' }],
      };

      const result = LessonContentSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject lesson content with invalid block type', () => {
      const input = {
        version: 1,
        blocks: [{ type: 'unknown', data: 'test' }],
      };

      const result = LessonContentSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });
});
