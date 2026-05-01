import { describe, it, expect } from 'vitest';
import {
  parseVocabulary,
  parseMaterials,
  parseProcedure,
  extractVocabulary,
  parseMarkdownSections
} from './content-parsers';

describe('Content Parsers', () => {
  describe('parseVocabulary', () => {
    it('should parse vocabulary with correct format', () => {
      const content = `
- **Observe** (Thai: สังเกต) - To look at something carefully and notice details
- **Question** (Thai: คำถาม) - Something you ask when you want to know more
- **Predict** (Thai: การทำนาย) - A guess about what you think will happen
`;

      const result = parseVocabulary(content);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        term: 'Observe',
        thai: 'สังเกต',
        definition: 'To look at something carefully and notice details'
      });
      expect(result[1]).toEqual({
        term: 'Question',
        thai: 'คำถาม',
        definition: 'Something you ask when you want to know more'
      });
      expect(result[2]).toEqual({
        term: 'Predict',
        thai: 'การทำนาย',
        definition: 'A guess about what you think will happen'
      });
    });

    it('should handle empty content', () => {
      const result = parseVocabulary('');
      expect(result).toHaveLength(0);
    });
  });

  describe('parseMaterials', () => {
    it('should parse materials with quantities', () => {
      const content = `
- 3 bean seeds
- 1 small plastic cup or pot
- Several small objects
- One per student magnifying glass
`;

      const result = parseMaterials(content);

      expect(result).toHaveLength(4);
      expect(result[0]).toEqual({ quantity: '3', item: 'bean seeds' });
      expect(result[1]).toEqual({ quantity: '1', item: 'small plastic cup or pot' });
      expect(result[2]).toEqual({ quantity: 'Several', item: 'small objects' });
      expect(result[3]).toEqual({ quantity: 'One per student', item: 'magnifying glass' });
    });

    it('should parse materials without quantities', () => {
      const content = `
- Paper towels for cleanup
- Science notebook and pencil
`;

      const result = parseMaterials(content);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ item: 'Paper towels for cleanup' });
      expect(result[1]).toEqual({ item: 'Science notebook and pencil' });
    });
  });

  describe('parseProcedure', () => {
    it('should parse numbered steps', () => {
      const content = `
1. Take your three bean seeds and look at them carefully
2. Use the magnifying glass to see details
3. Draw one seed in your notebook and write 3 observations
`;

      const result = parseProcedure(content);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        stepNumber: 1,
        instruction: 'Take your three bean seeds and look at them carefully',
        subSteps: []
      });
      expect(result[1].stepNumber).toBe(2);
      expect(result[2].stepNumber).toBe(3);
    });

    it('should parse steps with sub-steps', () => {
      const content = `
1. Examine Your Seeds
  - Use the magnifying glass to see details
  - Draw one seed in your notebook
2. Prepare Your Pot
  - Fill your cup about 3/4 full with potting soil
`;

      const result = parseProcedure(content);

      expect(result).toHaveLength(2);
      expect(result[0].subSteps).toHaveLength(2);
      expect(result[0].subSteps).toEqual([
        'Use the magnifying glass to see details',
        'Draw one seed in your notebook'
      ]);
      expect(result[1].subSteps).toHaveLength(1);
    });
  });

  describe('parseMarkdownSections', () => {
    it('should parse sections by headers', () => {
      const content = `
## Introduction

This is the introduction.

## Main Content

This is the main content.

### Subtopic 1

This is a subtopic.

## Summary

This is the summary.
`;

      const result = parseMarkdownSections(content);

      expect(result).toHaveLength(4);
      expect(result[0]).toEqual({
        title: 'Introduction',
        content: 'This is the introduction.',
        level: 2
      });
      expect(result[1].title).toBe('Main Content');
      expect(result[2].title).toBe('Subtopic 1');
      expect(result[2].level).toBe(3);
      expect(result[3].title).toBe('Summary');
    });
  });

  describe('extractVocabulary', () => {
    it('should extract vocabulary from full lesson content', () => {
      const content = `
## Introduction

Some intro text.

## Main Content

Main content here.

## Key Vocabulary

- **Scientist** (Thai: นักวิทยาศาสตร์) - A person who studies the world and asks questions
- **Experiment** (Thai: การทดลอง) - A test to find out if your prediction is right

## Summary

Summary text.
`;

      const result = extractVocabulary(content);

      expect(result).toHaveLength(2);
      expect(result[0].term).toBe('Scientist');
      expect(result[0].thai).toBe('นักวิทยาศาสตร์');
      expect(result[1].term).toBe('Experiment');
    });
  });
});
