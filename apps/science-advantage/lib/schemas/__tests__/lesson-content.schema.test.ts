import { describe, it, expect } from 'vitest';
import { ZodError } from 'zod';
import {
  TextBlockSchema,
  VocabularyBlockSchema,
  ImageBlockSchema,
  ReadingPassageBlockSchema,
  ProcedureBlockSchema,
  MaterialsBlockSchema,
  ContentBlockSchema,
  LessonContentSchema,
  validateLessonContent,
  isValidLessonContent,
  type LessonContent,
  type ContentBlock,
} from '../lesson-content.schema';

describe('Lesson Content Schema', () => {
  describe('TextBlockSchema', () => {
    it('should parse valid text block correctly', () => {
      const input = {
        type: 'text',
        content: 'Welcome to today\'s lesson on photosynthesis.',
      };

      const result = TextBlockSchema.parse(input);

      expect(result.type).toBe('text');
      expect(result.content).toBe('Welcome to today\'s lesson on photosynthesis.');
      expect(result.contentThai).toBeUndefined();
    });

    it('should parse text block with Thai translation', () => {
      const input = {
        type: 'text',
        content: 'Welcome to today\'s lesson.',
        contentThai: 'ยินดีต้อนรับสู่บทเรียนวันนี้',
      };

      const result = TextBlockSchema.parse(input);

      expect(result.content).toBe('Welcome to today\'s lesson.');
      expect(result.contentThai).toBe('ยินดีต้อนรับสู่บทเรียนวันนี้');
    });

    it('should reject text block with empty content', () => {
      const input = {
        type: 'text',
        content: '',
      };

      expect(() => TextBlockSchema.parse(input)).toThrow(ZodError);
    });
  });

  describe('VocabularyBlockSchema', () => {
    it('should parse valid vocabulary block with multiple terms', () => {
      const input = {
        type: 'vocabulary',
        terms: [
          {
            term: 'Photosynthesis',
            thai: 'การสังเคราะห์ด้วยแสง',
            definition: 'The process by which plants convert sunlight into energy',
          },
          {
            term: 'Chlorophyll',
            thai: 'คลอโรฟิลล์',
            definition: 'The green pigment in plants',
            audioUrl: 'https://example.com/audio/chlorophyll.mp3',
          },
        ],
      };

      const result = VocabularyBlockSchema.parse(input);

      expect(result.type).toBe('vocabulary');
      expect(result.terms).toHaveLength(2);
      expect(result.terms[0].term).toBe('Photosynthesis');
      expect(result.terms[0].audioUrl).toBeUndefined();
      expect(result.terms[1].audioUrl).toBe('https://example.com/audio/chlorophyll.mp3');
    });

    it('should reject vocabulary block with empty terms array', () => {
      const input = {
        type: 'vocabulary',
        terms: [],
      };

      expect(() => VocabularyBlockSchema.parse(input)).toThrow(ZodError);
    });

    it('should reject term with invalid audioUrl', () => {
      const input = {
        type: 'vocabulary',
        terms: [
          {
            term: 'Test',
            thai: 'ทดสอบ',
            definition: 'A test term',
            audioUrl: 'not-a-valid-url',
          },
        ],
      };

      expect(() => VocabularyBlockSchema.parse(input)).toThrow(ZodError);
    });
  });

  describe('ImageBlockSchema', () => {
    it('should parse valid image block with optional fields', () => {
      const input = {
        type: 'image',
        src: '/images/plant-diagram.png',
        alt: 'Diagram showing the parts of a plant involved in photosynthesis',
        caption: 'Parts of a plant',
        captionThai: 'ส่วนต่างๆ ของพืช',
        aspectRatio: 1.5,
        attribution: 'Science Textbook, 2024',
      };

      const result = ImageBlockSchema.parse(input);

      expect(result.type).toBe('image');
      expect(result.src).toBe('/images/plant-diagram.png');
      expect(result.alt).toBe('Diagram showing the parts of a plant involved in photosynthesis');
      expect(result.caption).toBe('Parts of a plant');
      expect(result.captionThai).toBe('ส่วนต่างๆ ของพืช');
      expect(result.aspectRatio).toBe(1.5);
      expect(result.attribution).toBe('Science Textbook, 2024');
    });

    it('should parse image block without optional fields', () => {
      const input = {
        type: 'image',
        src: '/images/diagram.png',
        alt: 'A detailed diagram showing plant anatomy',
      };

      const result = ImageBlockSchema.parse(input);

      expect(result.caption).toBeUndefined();
      expect(result.aspectRatio).toBeUndefined();
    });

    it('should reject image with alt text shorter than 10 characters', () => {
      const input = {
        type: 'image',
        src: '/images/diagram.png',
        alt: 'Plant',
      };

      expect(() => ImageBlockSchema.parse(input)).toThrow(ZodError);
    });
  });

  describe('ReadingPassageBlockSchema', () => {
    it('should parse valid reading passage with word count', () => {
      const input = {
        type: 'reading_passage',
        title: 'How Plants Make Food',
        titleThai: 'พืชสร้างอาหารอย่างไร',
        content: 'Plants are amazing organisms that can make their own food through photosynthesis.',
        contentThai: 'พืชเป็นสิ่งมีชีวิตที่น่าทึ่งที่สามารถสร้างอาหารเองได้ผ่านการสังเคราะห์ด้วยแสง',
        wordCount: 150,
      };

      const result = ReadingPassageBlockSchema.parse(input);

      expect(result.type).toBe('reading_passage');
      expect(result.title).toBe('How Plants Make Food');
      expect(result.wordCount).toBe(150);
    });

    it('should reject reading passage with negative word count', () => {
      const input = {
        type: 'reading_passage',
        title: 'Test',
        content: 'Content here',
        wordCount: -5,
      };

      expect(() => ReadingPassageBlockSchema.parse(input)).toThrow(ZodError);
    });
  });

  describe('ProcedureBlockSchema', () => {
    it('should parse valid procedure with nested sub-steps', () => {
      const input = {
        type: 'procedure',
        steps: [
          {
            stepNumber: 1,
            instruction: 'Place one plant in sunlight',
            instructionThai: 'วางต้นไม้หนึ่งต้นไว้ในที่มีแสงแดด',
            subSteps: ['Choose a sunny windowsill', 'Ensure the plant is stable'],
          },
          {
            stepNumber: 2,
            instruction: 'Place the other plant in a dark closet',
          },
        ],
      };

      const result = ProcedureBlockSchema.parse(input);

      expect(result.type).toBe('procedure');
      expect(result.steps).toHaveLength(2);
      expect(result.steps[0].stepNumber).toBe(1);
      expect(result.steps[0].subSteps).toEqual(['Choose a sunny windowsill', 'Ensure the plant is stable']);
      expect(result.steps[1].subSteps).toBeUndefined();
    });

    it('should reject procedure with non-positive step number', () => {
      const input = {
        type: 'procedure',
        steps: [
          {
            stepNumber: 0,
            instruction: 'Invalid step',
          },
        ],
      };

      expect(() => ProcedureBlockSchema.parse(input)).toThrow(ZodError);
    });
  });

  describe('MaterialsBlockSchema', () => {
    it('should parse valid materials block', () => {
      const input = {
        type: 'materials',
        items: [
          { quantity: '2', item: 'Small plants', itemThai: 'ต้นไม้ขนาดเล็ก' },
          { item: 'Water' },
        ],
      };

      const result = MaterialsBlockSchema.parse(input);

      expect(result.type).toBe('materials');
      expect(result.items).toHaveLength(2);
      expect(result.items[0].quantity).toBe('2');
      expect(result.items[0].itemThai).toBe('ต้นไม้ขนาดเล็ก');
      expect(result.items[1].quantity).toBeUndefined();
    });
  });

  describe('ContentBlockSchema (discriminated union)', () => {
    it('should reject invalid block type', () => {
      const input = {
        type: 'unknown_type',
        content: 'Some content',
      };

      expect(() => ContentBlockSchema.parse(input)).toThrow(ZodError);
    });

    it('should correctly parse different block types', () => {
      const textBlock: ContentBlock = ContentBlockSchema.parse({
        type: 'text',
        content: 'Hello world',
      });
      expect(textBlock.type).toBe('text');

      const vocabBlock: ContentBlock = ContentBlockSchema.parse({
        type: 'vocabulary',
        terms: [{ term: 'Test', thai: 'ทดสอบ', definition: 'A test' }],
      });
      expect(vocabBlock.type).toBe('vocabulary');
    });
  });

  describe('LessonContentSchema', () => {
    it('should parse full lesson content with mixed blocks and version field', () => {
      const input = {
        version: 1,
        blocks: [
          {
            id: 'intro',
            type: 'text',
            content: 'Welcome to the lesson',
          },
          {
            type: 'vocabulary',
            terms: [
              {
                term: 'Photosynthesis',
                thai: 'การสังเคราะห์ด้วยแสง',
                definition: 'Plant food-making process',
              },
            ],
          },
          {
            type: 'image',
            src: '/images/plant.png',
            alt: 'A beautiful green plant in a pot',
          },
          {
            type: 'reading_passage',
            title: 'About Plants',
            content: 'Plants are organisms...',
            wordCount: 50,
          },
          {
            type: 'materials',
            items: [{ item: 'Soil' }],
          },
          {
            type: 'procedure',
            steps: [{ stepNumber: 1, instruction: 'Plant the seed' }],
          },
        ],
      };

      const result = LessonContentSchema.parse(input);

      expect(result.version).toBe(1);
      expect(result.blocks).toHaveLength(6);
      expect(result.blocks[0].type).toBe('text');
      expect(result.blocks[1].type).toBe('vocabulary');
      expect(result.blocks[2].type).toBe('image');
      expect(result.blocks[3].type).toBe('reading_passage');
      expect(result.blocks[4].type).toBe('materials');
      expect(result.blocks[5].type).toBe('procedure');
    });

    it('should reject lesson content without version field', () => {
      const input = {
        blocks: [{ type: 'text', content: 'Hello' }],
      };

      expect(() => LessonContentSchema.parse(input)).toThrow(ZodError);
    });

    it('should reject lesson content with wrong version', () => {
      const input = {
        version: 2,
        blocks: [{ type: 'text', content: 'Hello' }],
      };

      expect(() => LessonContentSchema.parse(input)).toThrow(ZodError);
    });

    it('should strip unknown fields for forward compatibility', () => {
      const input = {
        version: 1,
        blocks: [{ type: 'text', content: 'Hello' }],
        futureField: 'should be stripped',
        anotherUnknown: 123,
      };

      const result = LessonContentSchema.parse(input);

      expect(result.version).toBe(1);
      expect(result.blocks).toHaveLength(1);
      expect((result as Record<string, unknown>).futureField).toBeUndefined();
      expect((result as Record<string, unknown>).anotherUnknown).toBeUndefined();
    });

    it('should preserve block id field when provided', () => {
      const input = {
        version: 1,
        blocks: [
          {
            id: 'my-custom-id',
            type: 'text',
            content: 'Hello world',
          },
          {
            type: 'vocabulary',
            terms: [{ term: 'Test', thai: 'ทดสอบ', definition: 'A test' }],
          },
        ],
      };

      const result = LessonContentSchema.parse(input);

      expect(result.blocks[0].id).toBe('my-custom-id');
      expect(result.blocks[1].id).toBeUndefined();
    });
  });

  describe('validateLessonContent', () => {
    it('should return validated content for valid data', () => {
      const input = {
        version: 1,
        blocks: [{ type: 'text', content: 'Valid content' }],
      };

      const result = validateLessonContent(input);

      expect(result.version).toBe(1);
      expect(result.blocks[0].type).toBe('text');
    });

    it('should throw ZodError on invalid data', () => {
      const input = {
        version: 1,
        blocks: [{ type: 'invalid', content: 'Bad block' }],
      };

      expect(() => validateLessonContent(input)).toThrow(ZodError);
    });

    it('should throw ZodError with missing required fields', () => {
      const input = {
        version: 1,
        blocks: [{ type: 'text' }], // missing 'content'
      };

      expect(() => validateLessonContent(input)).toThrow(ZodError);
    });
  });

  describe('isValidLessonContent', () => {
    it('should return true for valid data', () => {
      const input = {
        version: 1,
        blocks: [{ type: 'text', content: 'Valid content' }],
      };

      expect(isValidLessonContent(input)).toBe(true);
    });

    it('should return false for invalid data', () => {
      const invalidInputs = [
        { version: 1, blocks: [{ type: 'invalid' }] },
        { blocks: [{ type: 'text', content: 'Missing version' }] },
        { version: 2, blocks: [] },
        null,
        undefined,
        'not an object',
        { version: 1 }, // missing blocks
      ];

      for (const input of invalidInputs) {
        expect(isValidLessonContent(input)).toBe(false);
      }
    });

    it('should serve as type guard', () => {
      const unknownData: unknown = {
        version: 1,
        blocks: [{ type: 'text', content: 'Hello' }],
      };

      if (isValidLessonContent(unknownData)) {
        // TypeScript should know this is LessonContent
        const content: LessonContent = unknownData;
        expect(content.version).toBe(1);
      }
    });
  });
});
