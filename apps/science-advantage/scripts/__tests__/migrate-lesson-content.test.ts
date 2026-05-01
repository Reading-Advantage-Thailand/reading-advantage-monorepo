import { describe, it, expect, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// Mock Prisma before importing migrate script to avoid database setup
vi.mock('@/lib/prisma', () => ({
  default: {
    lesson: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    $disconnect: vi.fn(),
  },
}));

import {
  convertMarkdownToLessonContent,
  computeContentHash,
  parseMarkdownImages,
  countWords,
  mapSectionToBlockType,
  generateBlockId,
  convertSectionToBlock,
  extractImagesFromContent,
} from '../migrate-lesson-content';
import type { Section } from '@/lib/content-parsers';
import {
  validateLessonContent,
  type LessonContent,
  type TextBlock,
  type VocabularyBlock,
  type MaterialsBlock,
  type ProcedureBlock,
  type ReadingPassageBlock,
  type ImageBlock,
} from '@/lib/schemas/lesson-content.schema';

// =============================================================================
// Helper Functions Tests
// =============================================================================

describe('migrate-lesson-content', () => {
  describe('computeContentHash', () => {
    it('should return consistent MD5 hash for same content', () => {
      const content = 'Hello, World!';
      const hash1 = computeContentHash(content);
      const hash2 = computeContentHash(content);

      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[a-f0-9]{32}$/);
    });

    it('should return different hashes for different content', () => {
      const hash1 = computeContentHash('Content A');
      const hash2 = computeContentHash('Content B');

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('parseMarkdownImages', () => {
    it('should parse single image', () => {
      const content = '![Alt text](https://example.com/image.png)';
      const images = parseMarkdownImages(content);

      expect(images).toHaveLength(1);
      expect(images[0]).toEqual({
        alt: 'Alt text',
        src: 'https://example.com/image.png',
        fullMatch: '![Alt text](https://example.com/image.png)',
      });
    });

    it('should parse multiple images', () => {
      const content = `
Some text
![First image](https://example.com/first.png)
More text
![Second image](https://example.com/second.jpg)
      `;
      const images = parseMarkdownImages(content);

      expect(images).toHaveLength(2);
      expect(images[0].alt).toBe('First image');
      expect(images[1].alt).toBe('Second image');
    });

    it('should handle empty alt text by using default', () => {
      const content = '![](https://example.com/image.png)';
      const images = parseMarkdownImages(content);

      expect(images).toHaveLength(1);
      // Empty alt text defaults to 'Image' for accessibility
      expect(images[0].alt).toBe('Image');
    });

    it('should return empty array for content without images', () => {
      const content = 'Just some text without any images.';
      const images = parseMarkdownImages(content);

      expect(images).toHaveLength(0);
    });
  });

  describe('countWords', () => {
    it('should count words in plain text', () => {
      expect(countWords('Hello world')).toBe(2);
      expect(countWords('This is a sentence with six words')).toBe(7);
    });

    it('should handle markdown formatting', () => {
      // 'Bold text and italic and code' = 6 words
      const content = '**Bold text** and _italic_ and `code`';
      expect(countWords(content)).toBe(6);
    });

    it('should return 0 for empty content', () => {
      expect(countWords('')).toBe(0);
      expect(countWords('   ')).toBe(0);
    });

    it('should handle multiple spaces correctly', () => {
      expect(countWords('Word1    Word2    Word3')).toBe(3);
    });
  });

  describe('mapSectionToBlockType', () => {
    it('should map "Key Vocabulary" to vocabulary', () => {
      expect(mapSectionToBlockType('Key Vocabulary')).toBe('vocabulary');
      expect(mapSectionToBlockType('key vocabulary')).toBe('vocabulary');
      expect(mapSectionToBlockType('KEY VOCABULARY')).toBe('vocabulary');
    });

    it('should map "Materials" to materials', () => {
      expect(mapSectionToBlockType('Materials')).toBe('materials');
      expect(mapSectionToBlockType('materials')).toBe('materials');
    });

    it('should map "Procedure" to procedure', () => {
      expect(mapSectionToBlockType('Procedure')).toBe('procedure');
      expect(mapSectionToBlockType('procedure')).toBe('procedure');
    });

    it('should map "Reading Passage" to reading_passage', () => {
      expect(mapSectionToBlockType('Reading Passage')).toBe('reading_passage');
      expect(mapSectionToBlockType('Reading')).toBe('reading_passage');
      expect(mapSectionToBlockType('Passage')).toBe('reading_passage');
    });

    it('should return null for unknown section types', () => {
      expect(mapSectionToBlockType('Introduction')).toBeNull();
      expect(mapSectionToBlockType('Discussion Questions')).toBeNull();
      expect(mapSectionToBlockType('Summary')).toBeNull();
    });
  });

  describe('generateBlockId', () => {
    it('should generate kebab-case IDs', () => {
      expect(generateBlockId('Key Vocabulary', 0)).toBe('key-vocabulary-0');
      expect(generateBlockId('Reading Passage', 5)).toBe('reading-passage-5');
    });

    it('should handle special characters', () => {
      expect(generateBlockId('Test & Example!', 1)).toBe('test-example-1');
    });

    it('should include index for uniqueness', () => {
      expect(generateBlockId('Test', 0)).toBe('test-0');
      expect(generateBlockId('Test', 10)).toBe('test-10');
    });
  });

  describe('extractImagesFromContent', () => {
    it('should extract images and create ImageBlocks', () => {
      const content = '![A detailed plant diagram](https://example.com/plant.png)';
      const blocks = extractImagesFromContent(content, 0);

      expect(blocks).toHaveLength(1);
      expect(blocks[0].type).toBe('image');
      expect(blocks[0].src).toBe('https://example.com/plant.png');
      expect(blocks[0].alt).toBe('A detailed plant diagram');
    });

    it('should pad short alt text to meet minimum length', () => {
      const content = '![Short](https://example.com/image.png)';
      const blocks = extractImagesFromContent(content, 0);

      expect(blocks[0].alt.length).toBeGreaterThanOrEqual(10);
      expect(blocks[0].alt).toContain('Short');
    });

    it('should use correct starting index for IDs', () => {
      const content = '![Img1](url1) ![Img2](url2)';
      const blocks = extractImagesFromContent(content, 5);

      expect(blocks[0].id).toBe('image-5');
      expect(blocks[1].id).toBe('image-6');
    });
  });

  // =============================================================================
  // Section Conversion Tests
  // =============================================================================

  describe('convertSectionToBlock', () => {
    it('should convert vocabulary section to VocabularyBlock', () => {
      const section: Section = {
        title: 'Key Vocabulary',
        content: '- **Term1** (Thai: คำ1) - Definition one\n- **Term2** (Thai: คำ2) - Definition two',
        level: 2,
      };

      const block = convertSectionToBlock(section, 0) as VocabularyBlock;

      expect(block.type).toBe('vocabulary');
      expect(block.terms).toHaveLength(2);
      expect(block.terms[0].term).toBe('Term1');
      expect(block.terms[0].thai).toBe('คำ1');
      expect(block.terms[0].definition).toBe('Definition one');
    });

    it('should convert materials section to MaterialsBlock', () => {
      const section: Section = {
        title: 'Materials',
        content: '- 3 test tubes\n- 1 beaker\n- Safety goggles',
        level: 2,
      };

      const block = convertSectionToBlock(section, 0) as MaterialsBlock;

      expect(block.type).toBe('materials');
      expect(block.items).toHaveLength(3);
      expect(block.items[0]).toEqual({ quantity: '3', item: 'test tubes' });
      expect(block.items[2]).toEqual({ item: 'Safety goggles' });
    });

    it('should convert procedure section to ProcedureBlock', () => {
      const section: Section = {
        title: 'Procedure',
        content: '1. First step\n  - Sub-step A\n  - Sub-step B\n2. Second step',
        level: 2,
      };

      const block = convertSectionToBlock(section, 0) as ProcedureBlock;

      expect(block.type).toBe('procedure');
      expect(block.steps).toHaveLength(2);
      expect(block.steps[0].stepNumber).toBe(1);
      expect(block.steps[0].instruction).toBe('First step');
      expect(block.steps[0].subSteps).toEqual(['Sub-step A', 'Sub-step B']);
      expect(block.steps[1].subSteps).toBeUndefined();
    });

    it('should convert reading passage section to ReadingPassageBlock', () => {
      const section: Section = {
        title: 'Reading Passage',
        content: 'This is a passage about science. It has multiple sentences.',
        level: 2,
      };

      const block = convertSectionToBlock(section, 0) as ReadingPassageBlock;

      expect(block.type).toBe('reading_passage');
      expect(block.title).toBe('Reading Passage');
      expect(block.content).toBe('This is a passage about science. It has multiple sentences.');
      expect(block.wordCount).toBe(10);
    });

    it('should convert unknown sections to TextBlock (never drop content)', () => {
      const section: Section = {
        title: 'Discussion Questions',
        content: 'What did you learn today?',
        level: 2,
      };

      const block = convertSectionToBlock(section, 0) as TextBlock;

      expect(block.type).toBe('text');
      expect(block.content).toBe('What did you learn today?');
    });

    it('should fallback to TextBlock when vocabulary parsing fails', () => {
      const section: Section = {
        title: 'Key Vocabulary',
        content: 'Some improperly formatted vocabulary content',
        level: 2,
      };

      const block = convertSectionToBlock(section, 0) as TextBlock;

      expect(block.type).toBe('text');
      expect(block.content).toBe('Some improperly formatted vocabulary content');
    });
  });

  // =============================================================================
  // Full Conversion Tests
  // =============================================================================

  describe('convertMarkdownToLessonContent', () => {
    it('should convert simple text content', () => {
      const markdown = `## Introduction

This is a simple introduction.`;

      const result = convertMarkdownToLessonContent(markdown);

      expect(result.version).toBe(1);
      expect(result.blocks).toHaveLength(1);
      expect(result.blocks[0].type).toBe('text');
      expect((result.blocks[0] as TextBlock).content).toBe('This is a simple introduction.');
    });

    it('should convert content with vocabulary section', () => {
      const markdown = `## Key Vocabulary

- **Observe** (Thai: สังเกต) - To look carefully
- **Predict** (Thai: ทำนาย) - To guess what will happen`;

      const result = convertMarkdownToLessonContent(markdown);

      expect(result.blocks).toHaveLength(1);
      const vocabBlock = result.blocks[0] as VocabularyBlock;
      expect(vocabBlock.type).toBe('vocabulary');
      expect(vocabBlock.terms).toHaveLength(2);
    });

    it('should convert content with materials section', () => {
      const markdown = `## Materials

- 2 beakers
- 1 graduated cylinder
- Safety equipment`;

      const result = convertMarkdownToLessonContent(markdown);

      expect(result.blocks).toHaveLength(1);
      const block = result.blocks[0] as MaterialsBlock;
      expect(block.type).toBe('materials');
      expect(block.items).toHaveLength(3);
    });

    it('should convert content with procedure section', () => {
      const markdown = `## Procedure

1. Gather all materials
2. Set up the experiment
  - Place beaker on stand
  - Add water`;

      const result = convertMarkdownToLessonContent(markdown);

      expect(result.blocks).toHaveLength(1);
      const block = result.blocks[0] as ProcedureBlock;
      expect(block.type).toBe('procedure');
      expect(block.steps).toHaveLength(2);
      expect(block.steps[1].subSteps).toHaveLength(2);
    });

    it('should convert content with reading passage and calculate wordCount', () => {
      const markdown = `## Reading Passage

Plants need sunlight water and nutrients to grow. This is photosynthesis.`;

      const result = convertMarkdownToLessonContent(markdown);

      expect(result.blocks).toHaveLength(1);
      const block = result.blocks[0] as ReadingPassageBlock;
      expect(block.type).toBe('reading_passage');
      // 'Plants need sunlight water and nutrients to grow This is photosynthesis' = 11 words
      // (period is removed by markdown cleanup)
      expect(block.wordCount).toBe(11);
    });

    it('should convert markdown images to ImageBlocks', () => {
      const markdown = `## Introduction

![A detailed diagram of photosynthesis](https://example.com/photo.png)

Some text after the image.`;

      const result = convertMarkdownToLessonContent(markdown);

      const imageBlocks = result.blocks.filter(b => b.type === 'image');
      expect(imageBlocks).toHaveLength(1);
      expect((imageBlocks[0] as ImageBlock).src).toBe('https://example.com/photo.png');
    });

    it('should convert mixed content preserving order', () => {
      const markdown = `## Key Vocabulary

- **Term** (Thai: คำ) - Definition

## Materials

- 1 item

## Procedure

1. Do something`;

      const result = convertMarkdownToLessonContent(markdown);

      expect(result.blocks).toHaveLength(3);
      expect(result.blocks[0].type).toBe('vocabulary');
      expect(result.blocks[1].type).toBe('materials');
      expect(result.blocks[2].type).toBe('procedure');
    });

    it('should convert unknown headers to TextBlocks (never drop content)', () => {
      const markdown = `## Summary

This is the summary of the lesson.

## Extra Notes

Additional information here.`;

      const result = convertMarkdownToLessonContent(markdown);

      expect(result.blocks).toHaveLength(2);
      expect(result.blocks[0].type).toBe('text');
      expect(result.blocks[1].type).toBe('text');
      expect((result.blocks[0] as TextBlock).content).toBe('This is the summary of the lesson.');
      expect((result.blocks[1] as TextBlock).content).toBe('Additional information here.');
    });

    it('should handle empty content gracefully', () => {
      const result = convertMarkdownToLessonContent('');

      expect(result.version).toBe(1);
      expect(result.blocks).toHaveLength(0);
    });

    it('should handle content with only whitespace', () => {
      const result = convertMarkdownToLessonContent('   \n\n   ');

      expect(result.version).toBe(1);
      expect(result.blocks).toHaveLength(0);
    });

    it('should preserve intro content before first section', () => {
      const markdown = `This is intro text before any headers.

## First Section

Section content here.`;

      const result = convertMarkdownToLessonContent(markdown);

      expect(result.blocks.length).toBeGreaterThanOrEqual(2);
      const introBlock = result.blocks.find(
        b => b.type === 'text' && (b as TextBlock).content.includes('intro text')
      );
      expect(introBlock).toBeDefined();
    });

    it('should include metadata when provided', () => {
      const markdown = '## Test\n\nContent';
      const metadata = {
        migratedAt: '2024-01-01T00:00:00Z',
        originalContentHash: 'abc123',
        migratedFrom: 'markdown' as const,
        version: '1.0.0',
      };

      const result = convertMarkdownToLessonContent(markdown, metadata);

      expect(
        (result as LessonContent & { _metadata?: typeof metadata })._metadata
      ).toEqual(metadata);
    });
  });

  // =============================================================================
  // Golden Fixture Test
  // =============================================================================

  describe('Golden Fixture', () => {
    it('should match expected output for golden lesson', () => {
      const fixturesPath = path.join(__dirname, '..', 'fixtures');
      const goldenMarkdown = fs.readFileSync(
        path.join(fixturesPath, 'golden-lesson.md'),
        'utf-8'
      );
      const expectedJson = JSON.parse(
        fs.readFileSync(path.join(fixturesPath, 'golden-lesson.expected.json'), 'utf-8')
      );

      const result = convertMarkdownToLessonContent(goldenMarkdown);

      // Remove metadata for comparison
      const resultWithoutMetadata = {
        version: result.version,
        blocks: result.blocks,
      };

      expect(resultWithoutMetadata.version).toBe(expectedJson.version);
      expect(resultWithoutMetadata.blocks.length).toBe(expectedJson.blocks.length);

      // Compare each block type and key properties
      for (let i = 0; i < expectedJson.blocks.length; i++) {
        const expected = expectedJson.blocks[i];
        const actual = resultWithoutMetadata.blocks[i];

        expect(actual.type).toBe(expected.type);

        // Type-specific checks
        if (expected.type === 'vocabulary') {
          expect((actual as VocabularyBlock).terms.length).toBe(expected.terms.length);
        }
        if (expected.type === 'materials') {
          expect((actual as MaterialsBlock).items.length).toBe(expected.items.length);
        }
        if (expected.type === 'procedure') {
          expect((actual as ProcedureBlock).steps.length).toBe(expected.steps.length);
        }
        if (expected.type === 'reading_passage') {
          expect((actual as ReadingPassageBlock).wordCount).toBe(expected.wordCount);
        }
        if (expected.type === 'image') {
          expect((actual as ImageBlock).src).toBe(expected.src);
        }
      }
    });
  });

  // =============================================================================
  // Validation Tests
  // =============================================================================

  describe('Output Validation', () => {
    it('should produce valid LessonContent schema output', () => {
      const markdown = `## Key Vocabulary

- **Test** (Thai: ทดสอบ) - A test term

## Reading Passage

This is a test reading passage with enough words to count.

## Materials

- 1 item

## Procedure

1. Do the thing`;

      const result = convertMarkdownToLessonContent(markdown);

      // Should not throw when validating
      expect(() => {
        validateLessonContent(result);
      }).not.toThrow();
    });

    it('should handle malformed vocabulary gracefully', () => {
      const markdown = `## Key Vocabulary

This is not properly formatted vocabulary.
No bullet points or correct format here.`;

      const result = convertMarkdownToLessonContent(markdown);

      // Should fallback to text block
      expect(result.blocks).toHaveLength(1);
      expect(result.blocks[0].type).toBe('text');
    });
  });

  // =============================================================================
  // Edge Cases
  // =============================================================================

  describe('Edge Cases', () => {
    it('should handle content with only images', () => {
      const markdown = `![Image description that is long enough](https://example.com/img.png)`;

      const result = convertMarkdownToLessonContent(markdown);

      expect(result.blocks.length).toBeGreaterThanOrEqual(1);
      const imageBlock = result.blocks.find(b => b.type === 'image');
      expect(imageBlock).toBeDefined();
    });

    it('should handle deeply nested sub-steps', () => {
      const markdown = `## Procedure

1. Main step
  - Sub-step 1
  - Sub-step 2
  - Sub-step 3
  - Sub-step 4`;

      const result = convertMarkdownToLessonContent(markdown);
      const procBlock = result.blocks[0] as ProcedureBlock;

      expect(procBlock.steps[0].subSteps).toHaveLength(4);
    });

    it('should handle special characters in content', () => {
      const markdown = `## Key Vocabulary

- **H2O** (Thai: น้ำ) - Water (chemical formula)
- **CO2** (Thai: คาร์บอนไดออกไซด์) - Carbon dioxide (CO2)`;

      const result = convertMarkdownToLessonContent(markdown);
      const vocabBlock = result.blocks[0] as VocabularyBlock;

      expect(vocabBlock.terms[0].term).toBe('H2O');
      expect(vocabBlock.terms[1].term).toBe('CO2');
    });

    it('should handle Thai content correctly', () => {
      const markdown = `## Reading Passage

การสังเคราะห์ด้วยแสงเป็นกระบวนการที่พืชใช้แสงอาทิตย์ในการผลิตอาหาร`;

      const result = convertMarkdownToLessonContent(markdown);
      const block = result.blocks[0] as ReadingPassageBlock;

      expect(block.content).toContain('การสังเคราะห์ด้วยแสง');
    });
  });
});
