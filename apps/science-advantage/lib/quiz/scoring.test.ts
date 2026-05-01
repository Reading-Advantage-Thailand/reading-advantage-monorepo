import { describe, it, expect } from 'vitest';
import { gradeAnswer, calculateTotalScore, calculatePercentage } from './scoring';

describe('gradeAnswer', () => {
  describe('MULTIPLE_CHOICE', () => {
    it('should return true for exact match', () => {
      expect(gradeAnswer('MULTIPLE_CHOICE', 'A', 'A')).toBe(true);
    });

    it('should return false for wrong answer', () => {
      expect(gradeAnswer('MULTIPLE_CHOICE', 'B', 'A')).toBe(false);
    });

    it('should return false for null student answer', () => {
      expect(gradeAnswer('MULTIPLE_CHOICE', null, 'A')).toBe(false);
    });

    it('should return false for undefined student answer', () => {
      expect(gradeAnswer('MULTIPLE_CHOICE', undefined, 'A')).toBe(false);
    });

    it('should be case-sensitive', () => {
      expect(gradeAnswer('MULTIPLE_CHOICE', 'a', 'A')).toBe(false);
    });
  });

  describe('TRUE_FALSE', () => {
    it('should return true for matching true', () => {
      expect(gradeAnswer('TRUE_FALSE', 'True', 'True')).toBe(true);
    });

    it('should return true for matching false', () => {
      expect(gradeAnswer('TRUE_FALSE', 'False', 'False')).toBe(true);
    });

    it('should return false for wrong answer', () => {
      expect(gradeAnswer('TRUE_FALSE', 'True', 'False')).toBe(false);
    });

    it('should handle boolean values', () => {
      expect(gradeAnswer('TRUE_FALSE', true, true)).toBe(true);
      expect(gradeAnswer('TRUE_FALSE', false, true)).toBe(false);
    });
  });

  describe('MULTIPLE_SELECT', () => {
    it('should return true when all correct answers selected in same order', () => {
      expect(gradeAnswer('MULTIPLE_SELECT', ['A', 'C'], ['A', 'C'])).toBe(true);
    });

    it('should return true when all correct answers selected in different order', () => {
      expect(gradeAnswer('MULTIPLE_SELECT', ['C', 'A'], ['A', 'C'])).toBe(true);
    });

    it('should return false when missing an answer', () => {
      expect(gradeAnswer('MULTIPLE_SELECT', ['A'], ['A', 'C'])).toBe(false);
    });

    it('should return false when extra answers included', () => {
      expect(gradeAnswer('MULTIPLE_SELECT', ['A', 'B', 'C'], ['A', 'C'])).toBe(false);
    });

    it('should return false when completely wrong', () => {
      expect(gradeAnswer('MULTIPLE_SELECT', ['B', 'D'], ['A', 'C'])).toBe(false);
    });

    it('should return false if student answer is not an array', () => {
      expect(gradeAnswer('MULTIPLE_SELECT', 'A', ['A', 'C'])).toBe(false);
    });

    it('should return false if correct answer is not an array', () => {
      expect(gradeAnswer('MULTIPLE_SELECT', ['A'], 'A')).toBe(false);
    });

    it('should handle empty arrays', () => {
      expect(gradeAnswer('MULTIPLE_SELECT', [], [])).toBe(true);
    });

    it('should handle single-element arrays', () => {
      expect(gradeAnswer('MULTIPLE_SELECT', ['A'], ['A'])).toBe(true);
    });
  });

  describe('FILL_IN_BLANK', () => {
    it('should return true for exact match', () => {
      expect(gradeAnswer('FILL_IN_BLANK', 'photosynthesis', 'photosynthesis')).toBe(true);
    });

    it('should be case-insensitive', () => {
      expect(gradeAnswer('FILL_IN_BLANK', 'Photosynthesis', 'photosynthesis')).toBe(true);
      expect(gradeAnswer('FILL_IN_BLANK', 'PHOTOSYNTHESIS', 'photosynthesis')).toBe(true);
    });

    it('should trim whitespace', () => {
      expect(gradeAnswer('FILL_IN_BLANK', '  photosynthesis  ', 'photosynthesis')).toBe(true);
    });

    it('should normalize internal whitespace', () => {
      expect(gradeAnswer('FILL_IN_BLANK', 'the   quick   fox', 'the quick fox')).toBe(true);
    });

    it('should return false for wrong answer', () => {
      expect(gradeAnswer('FILL_IN_BLANK', 'respiration', 'photosynthesis')).toBe(false);
    });

    it('should handle null student answer', () => {
      expect(gradeAnswer('FILL_IN_BLANK', null, 'photosynthesis')).toBe(false);
    });

    it('should handle empty string answer', () => {
      expect(gradeAnswer('FILL_IN_BLANK', '', 'photosynthesis')).toBe(false);
    });

    it('should handle numeric answers converted to string', () => {
      expect(gradeAnswer('FILL_IN_BLANK', '42', '42')).toBe(true);
    });
  });

  describe('VOCABULARY_MATCH', () => {
    const correctMatch = {
      'cell': 'basic unit of life',
      'nucleus': 'control center',
      'mitochondria': 'powerhouse',
    };

    it('should return true when all pairs match', () => {
      const studentMatch = {
        'cell': 'basic unit of life',
        'nucleus': 'control center',
        'mitochondria': 'powerhouse',
      };
      expect(gradeAnswer('VOCABULARY_MATCH', studentMatch, correctMatch)).toBe(true);
    });

    it('should return false when a pair is wrong', () => {
      const studentMatch = {
        'cell': 'basic unit of life',
        'nucleus': 'powerhouse', // swapped
        'mitochondria': 'control center', // swapped
      };
      expect(gradeAnswer('VOCABULARY_MATCH', studentMatch, correctMatch)).toBe(false);
    });

    it('should return false when missing a pair', () => {
      const studentMatch = {
        'cell': 'basic unit of life',
        'nucleus': 'control center',
      };
      expect(gradeAnswer('VOCABULARY_MATCH', studentMatch, correctMatch)).toBe(false);
    });

    it('should return false when extra pair provided', () => {
      const studentMatch = {
        'cell': 'basic unit of life',
        'nucleus': 'control center',
        'mitochondria': 'powerhouse',
        'ribosome': 'protein factory',
      };
      expect(gradeAnswer('VOCABULARY_MATCH', studentMatch, correctMatch)).toBe(false);
    });

    it('should return false for null student answer', () => {
      expect(gradeAnswer('VOCABULARY_MATCH', null, correctMatch)).toBe(false);
    });

    it('should return false for non-object student answer', () => {
      expect(gradeAnswer('VOCABULARY_MATCH', 'not an object', correctMatch)).toBe(false);
    });

    it('should return false for null correct answer', () => {
      expect(gradeAnswer('VOCABULARY_MATCH', correctMatch, null)).toBe(false);
    });

    it('should handle empty objects', () => {
      expect(gradeAnswer('VOCABULARY_MATCH', {}, {})).toBe(true);
    });
  });

  describe('Unknown question type', () => {
    it('should return false for unknown question type', () => {
      expect(gradeAnswer('UNKNOWN_TYPE', 'A', 'A')).toBe(false);
    });

    it('should return false for empty string question type', () => {
      expect(gradeAnswer('', 'A', 'A')).toBe(false);
    });
  });
});

describe('calculateTotalScore', () => {
  it('should sum points for correct answers only', () => {
    const responses = [
      { isCorrect: true, points: 2 },
      { isCorrect: false, points: 1 },
      { isCorrect: true, points: 3 },
    ];
    expect(calculateTotalScore(responses)).toBe(5);
  });

  it('should return 0 for all incorrect answers', () => {
    const responses = [
      { isCorrect: false, points: 2 },
      { isCorrect: false, points: 1 },
    ];
    expect(calculateTotalScore(responses)).toBe(0);
  });

  it('should return full score for all correct answers', () => {
    const responses = [
      { isCorrect: true, points: 2 },
      { isCorrect: true, points: 3 },
    ];
    expect(calculateTotalScore(responses)).toBe(5);
  });

  it('should handle empty array', () => {
    expect(calculateTotalScore([])).toBe(0);
  });

  it('should handle single response', () => {
    expect(calculateTotalScore([{ isCorrect: true, points: 5 }])).toBe(5);
  });
});

describe('calculatePercentage', () => {
  it('should calculate correct percentage', () => {
    expect(calculatePercentage(3, 5)).toBe(60);
  });

  it('should return 100 for perfect score', () => {
    expect(calculatePercentage(5, 5)).toBe(100);
  });

  it('should return 0 for zero score', () => {
    expect(calculatePercentage(0, 5)).toBe(0);
  });

  it('should handle 0 maxScore', () => {
    expect(calculatePercentage(0, 0)).toBe(0);
  });

  it('should round to 2 decimal places', () => {
    expect(calculatePercentage(2, 3)).toBe(66.67);
  });

  it('should handle fractional scores', () => {
    expect(calculatePercentage(1, 3)).toBe(33.33);
  });
});
