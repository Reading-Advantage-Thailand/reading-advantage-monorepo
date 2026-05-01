import { describe, expect, it } from 'vitest';
import {
  normalizeQuestionType,
  isValidQuestionType,
  normalizeQuestionFile,
} from '@/lib/grade4-normalization';

describe('normalizeQuestionType', () => {
  it('normalizes lowercase multiple_choice to MULTIPLE_CHOICE', () => {
    expect(normalizeQuestionType('multiple_choice')).toBe('MULTIPLE_CHOICE');
  });

  it('normalizes snake_case multiple_select to MULTIPLE_SELECT', () => {
    expect(normalizeQuestionType('multiple_select')).toBe('MULTIPLE_SELECT');
  });

  it('normalizes hyphenated multiple-select to MULTIPLE_SELECT', () => {
    expect(normalizeQuestionType('multiple-select')).toBe('MULTIPLE_SELECT');
  });

  it('normalizes true_false to TRUE_FALSE', () => {
    expect(normalizeQuestionType('true_false')).toBe('TRUE_FALSE');
  });

  it('normalizes true-false to TRUE_FALSE', () => {
    expect(normalizeQuestionType('true-false')).toBe('TRUE_FALSE');
  });

  it('normalizes fill_in_blank to FILL_IN_BLANK', () => {
    expect(normalizeQuestionType('fill_in_blank')).toBe('FILL_IN_BLANK');
  });

  it('normalizes fill-in-blank to FILL_IN_BLANK', () => {
    expect(normalizeQuestionType('fill-in-blank')).toBe('FILL_IN_BLANK');
  });

  it('normalizes vocabulary_match to VOCABULARY_MATCH', () => {
    expect(normalizeQuestionType('vocabulary_match')).toBe('VOCABULARY_MATCH');
  });

  it('normalizes vocabulary-match to VOCABULARY_MATCH', () => {
    expect(normalizeQuestionType('vocabulary-match')).toBe('VOCABULARY_MATCH');
  });

  it('passes through already-uppercase types unchanged', () => {
    expect(normalizeQuestionType('MULTIPLE_CHOICE')).toBe('MULTIPLE_CHOICE');
    expect(normalizeQuestionType('TRUE_FALSE')).toBe('TRUE_FALSE');
    expect(normalizeQuestionType('FILL_IN_BLANK')).toBe('FILL_IN_BLANK');
  });

  it('handles mixed case gracefully', () => {
    expect(normalizeQuestionType('Multiple_Choice')).toBe('MULTIPLE_CHOICE');
    expect(normalizeQuestionType('True.False')).toBe('TRUE_FALSE');
  });

  it('returns unknown types as-is after uppercasing', () => {
    expect(normalizeQuestionType('essay')).toBe('ESSAY');
  });
});

describe('isValidQuestionType', () => {
  it('returns true for valid types', () => {
    expect(isValidQuestionType('MULTIPLE_CHOICE')).toBe(true);
    expect(isValidQuestionType('MULTIPLE_SELECT')).toBe(true);
    expect(isValidQuestionType('TRUE_FALSE')).toBe(true);
    expect(isValidQuestionType('FILL_IN_BLANK')).toBe(true);
    expect(isValidQuestionType('VOCABULARY_MATCH')).toBe(true);
  });

  it('returns false for invalid types', () => {
    expect(isValidQuestionType('ESSAY')).toBe(false);
    expect(isValidQuestionType('SHORT_ANSWER')).toBe(false);
    expect(isValidQuestionType('unknown')).toBe(false);
  });
});

describe('normalizeQuestionFile', () => {
  it('normalizes all question types in a valid file', () => {
    const input = {
      lessonId: 'g4-test',
      questions: [
        { type: 'multiple_choice', text: 'Q1', correctAnswer: 'A', points: 1, standards: ['Sc1.1-G4'] },
        { type: 'true_false', text: 'Q2', correctAnswer: 'True', points: 1, standards: ['Sc1.1-G4'] },
        { type: 'fill-in-blank', text: 'Q3 ___', correctAnswer: 'answer', points: 1, standards: ['Sc1.1-G4'] },
      ],
    };

    const result = normalizeQuestionFile(input);

    expect(result.questions).toHaveLength(3);
    expect(result.questions[0].type).toBe('MULTIPLE_CHOICE');
    expect(result.questions[1].type).toBe('TRUE_FALSE');
    expect(result.questions[2].type).toBe('FILL_IN_BLANK');
    expect(result.warnings).toHaveLength(0);
  });

  it('warns on unknown question types', () => {
    const input = {
      lessonId: 'g4-test',
      questions: [
        { type: 'essay', text: 'Q1', correctAnswer: 'text', points: 1, standards: ['Sc1.1-G4'] },
      ],
    };

    const result = normalizeQuestionFile(input);

    expect(result.questions[0].type).toBe('ESSAY');
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain('Unknown type');
  });

  it('throws on invalid file structure', () => {
    expect(() => normalizeQuestionFile(null)).toThrow('Invalid questions file');
    expect(() => normalizeQuestionFile({})).toThrow('Invalid questions file');
    expect(() => normalizeQuestionFile({ lessonId: 'test' })).toThrow('Invalid questions file');
  });

  it('preserves all question properties after normalization', () => {
    const input = {
      lessonId: 'g4-test',
      questions: [
        {
          slug: 'my-question',
          type: 'multiple_select',
          text: 'Select all',
          options: ['A', 'B', 'C'],
          correctAnswer: ['A', 'B'],
          points: 2,
          standards: ['Sc1.1-G4', 'Sc2.1-G4'],
        },
      ],
    };

    const result = normalizeQuestionFile(input);

    expect(result.questions[0]).toEqual({
      slug: 'my-question',
      type: 'MULTIPLE_SELECT',
      text: 'Select all',
      options: ['A', 'B', 'C'],
      correctAnswer: ['A', 'B'],
      points: 2,
      standards: ['Sc1.1-G4', 'Sc2.1-G4'],
    });
  });
});
