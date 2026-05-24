import { describe, it, expect } from 'vitest';
import { isValidLessonSlug, isValidQuestionSlug } from '../lesson-slug.schema';
import { LessonType, StandardsAlignment } from '@/lib/enums';

describe('Content Migration Validation - Grade 4', () => {
  describe('Lesson slug requirements', () => {
    it('should have proper lesson slugs in content files', async () => {
      const content = await import('@/prisma/data/content/grade-4/lessons/g4-weather-patterns.json');

      expect(content.slug).toBeDefined();
      expect(isValidLessonSlug(content.slug)).toBe(true);
      expect(content.slug).toBe('weather-patterns');
    });

    it('should have kebab-case lesson slugs starting with letter', async () => {
      const lessons = [
        'g4-weather-patterns',
        'g4-plant-life-cycles',
        'g4-animal-adaptations',
        'g4-food-chains',
        'g4-states-of-matter',
        'g4-forces-motion',
        'g4-sound-waves',
        'g4-rocks-minerals',
        'g4-water-cycle',
        'g4-ecosystems',
      ];

      for (const lesson of lessons) {
        const slug = lesson.replace('g4-', '');
        expect(isValidLessonSlug(slug), `${slug} should be valid kebab-case`).toBe(true);
      }
    });
  });

  describe('Standards mapping slug requirements', () => {
    it('should reference lessons by slug not ID in standards mapping', async () => {
      const standardsMapping = await import('@/prisma/data/content/grade-4/standards-mapping.json');

      for (const lesson of standardsMapping.lessons) {
        expect(lesson.slug).toBeDefined();
        expect(isValidLessonSlug(lesson.slug)).toBe(true);
      }
    });

    it('should have 10 Grade 4 science lessons with proper standards', async () => {
      const standardsMapping = await import('@/prisma/data/content/grade-4/standards-mapping.json');

      expect(standardsMapping.lessons).toHaveLength(10);

      const expectedLessonSlugs = [
        'plant-life-cycles',
        'animal-adaptations',
        'food-chains',
        'states-of-matter',
        'forces-motion',
        'sound-waves',
        'weather-patterns',
        'rocks-minerals',
        'water-cycle',
        'ecosystems',
      ];

      for (const expectedSlug of expectedLessonSlugs) {
        const found = standardsMapping.lessons.find((l: { slug: string }) => l.slug === expectedSlug);
        expect(found).toBeDefined();
      }
    });

    it('should have THAI framework and gradeLevel 4 in standards mapping', async () => {
      const standardsMapping = await import('@/prisma/data/content/grade-4/standards-mapping.json');

      expect(standardsMapping.framework).toBe(StandardsAlignment.THAI);
      expect(standardsMapping.gradeLevel).toBe(4);
    });
  });

  describe('Question bank slug requirements', () => {
    it('should reference lesson by slug not lessonId in question files', async () => {
      const questions = await import('@/prisma/data/content/grade-4/questions/g4-weather-patterns.json');

      expect(questions.slug).toBeDefined();
      expect(isValidLessonSlug(questions.slug)).toBe(true);
      expect(questions.slug).toBe('weather-patterns');
    });

    it('should have question slugs in proper format', async () => {
      const questions = await import('@/prisma/data/content/grade-4/questions/g4-weather-patterns.json');

      for (const q of questions.questions) {
        expect(q.slug).toBeDefined();
        expect(isValidQuestionSlug(q.slug)).toBe(true);
      }
    });

    it('should have 20 questions for weather patterns lesson', async () => {
      const questions = await import('@/prisma/data/content/grade-4/questions/g4-weather-patterns.json');

      expect(questions.questions).toHaveLength(20);
    });
  });
});

describe('Content Migration Validation - Lesson Types', () => {
  describe('Lesson type coverage for Grade 4', () => {
    it('should have LESSON, LAB, ASSESSMENT, and REVIEW types available', () => {
      expect(Object.values(LessonType)).toContain('LESSON');
      expect(Object.values(LessonType)).toContain('LAB');
      expect(Object.values(LessonType)).toContain('ASSESSMENT');
      expect(Object.values(LessonType)).toContain('REVIEW');
    });

    it('should support explicit instruction, lab, fun review, and summative assessment lesson types', () => {
      const requiredTypes = [
        { type: 'LESSON', description: 'explicit instruction' },
        { type: 'LAB', description: 'lab' },
        { type: 'REVIEW', description: 'fun review' },
        { type: 'ASSESSMENT', description: 'summative assessment' },
      ];

      for (const { type, description } of requiredTypes) {
        expect(LessonType[type as keyof typeof LessonType]).toBeDefined();
      }
    });
  });
});
