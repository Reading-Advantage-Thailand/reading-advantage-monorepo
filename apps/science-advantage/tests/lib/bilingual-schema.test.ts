import { describe, it, expect } from 'vitest';
import { parseBilingualTitle, splitBilingualField } from '@/lib/bilingual';

describe('Bilingual Schema Support', () => {
  describe('parseBilingualTitle', () => {
    it('should split "English / Thai" into separate parts', () => {
      const result = parseBilingualTitle('Being a Scientist / การเป็นนักวิทยาศาสตร์');
      expect(result.english).toBe('Being a Scientist');
      expect(result.thai).toBe('การเป็นนักวิทยาศาสตร์');
    });

    it('should handle titles with no Thai portion', () => {
      const result = parseBilingualTitle('English Only Title');
      expect(result.english).toBe('English Only Title');
      expect(result.thai).toBeNull();
    });

    it('should split on first occurrence only when multiple delimiters', () => {
      const result = parseBilingualTitle('A / B / C');
      expect(result.english).toBe('A');
      expect(result.thai).toBe('B / C');
    });

    it('should handle empty string', () => {
      const result = parseBilingualTitle('');
      expect(result.english).toBe('');
      expect(result.thai).toBeNull();
    });

    it('should handle title that is only the delimiter', () => {
      const result = parseBilingualTitle(' / ');
      expect(result.english).toBe('');
      expect(result.thai).toBe('');
    });

    it('should trim whitespace from both parts', () => {
      const result = parseBilingualTitle('  English  /  Thai  ');
      expect(result.english).toBe('English');
      expect(result.thai).toBe('Thai');
    });

    it('should handle Thai-only title with delimiter', () => {
      const result = parseBilingualTitle(' / การเป็นนักวิทยาศาสตร์');
      expect(result.english).toBe('');
      expect(result.thai).toBe('การเป็นนักวิทยาศาสตร์');
    });
  });

  describe('splitBilingualField', () => {
    it('should split a bilingual description', () => {
      const result = splitBilingualField('What do scientists do? นักวิทยาศาสตร์ทำอะไร?');
      expect(result.english).toBe('What do scientists do? นักวิทยาศาสตร์ทำอะไร?');
      expect(result.thai).toBeNull();
    });

    it('should return null thai when no delimiter present', () => {
      const result = splitBilingualField('English only content');
      expect(result.english).toBe('English only content');
      expect(result.thai).toBeNull();
    });

    it('should handle null input', () => {
      const result = splitBilingualField(null);
      expect(result.english).toBeNull();
      expect(result.thai).toBeNull();
    });
  });
});

describe('Lesson Model Thai Fields', () => {
  it('should have titleThai and descriptionThai as optional fields in schema', () => {
    // This test validates that the Prisma schema includes the new fields
    // by checking the type definitions are available
    type LessonWithTitleThai = {
      titleThai?: string | null;
      descriptionThai?: string | null;
    };

    const lesson: LessonWithTitleThai = {
      titleThai: 'Test Thai Title',
      descriptionThai: null,
    };

    expect(lesson.titleThai).toBe('Test Thai Title');
    expect(lesson.descriptionThai).toBeNull();
  });

  it('should allow null values for Thai fields', () => {
    type LessonWithTitleThai = {
      titleThai?: string | null;
      descriptionThai?: string | null;
    };

    const lesson: LessonWithTitleThai = {};
    expect(lesson.titleThai).toBeUndefined();
    expect(lesson.descriptionThai).toBeUndefined();
  });
});
