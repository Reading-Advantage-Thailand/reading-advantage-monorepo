# Grade 4 Science Lesson Content Authoring Guide

This directory contains JSON seed files for Grade 4 science lessons using the LessonContent schema.

## Content Standards

### Reading Level
- Target: Flesch-Kincaid Grade 4-5 (ages 9-10)
- Sentence length: Average 12-15 words
- Vocabulary: Introduce scientific terms with clear definitions
- Thai translations: Required for all vocabulary and key passages

### Tone and Voice
- Engaging and encouraging
- Age-appropriate explanations
- Real-world connections relevant to Thai students
- Questions to prompt thinking
- Celebration of curiosity and discovery

## Directory Structure

```
grade-4/
├── README.md              # This file
├── lessons/               # LessonContent JSON files
│   ├── g4-plant-life-cycles.json
│   ├── g4-animal-adaptations.json
│   └── ...
├── questions/             # Question bank files
│   ├── g4-plant-life-cycles.json
│   └── ...
└── standards-mapping.json # Standards alignment
```

## Lesson JSON Structure

Each lesson file follows the LessonContent schema from `lib/schemas/lesson-content.schema.ts`:

```json
{
  "version": 1,
  "blocks": [
    {
      "id": "intro",
      "type": "text",
      "content": "Hook text to engage students...",
      "contentThai": "ข้อความเกริ่นนำ..."
    },
    {
      "id": "vocab",
      "type": "vocabulary",
      "terms": [
        {
          "term": "English Term",
          "thai": "คำศัพท์ภาษาไทย",
          "definition": "Clear, grade-appropriate definition"
        }
      ]
    },
    {
      "type": "text",
      "content": "Instructional content..."
    },
    {
      "type": "image",
      "src": "/images/g4-topic-diagram.webp",
      "alt": "Descriptive alt text (min 10 characters)",
      "caption": "Figure caption",
      "captionThai": "คำบรรยายภาพ"
    },
    {
      "type": "reading_passage",
      "title": "Passage Title",
      "titleThai": "ชื่อบทอ่าน",
      "content": "300-500 word reading passage...",
      "contentThai": "บทอ่านภาษาไทย...",
      "wordCount": 350
    },
    {
      "id": "summary",
      "type": "text",
      "content": "Key takeaways..."
    }
  ]
}
```

## Block Types

### Text Block
General instructional content. Markdown supported.

```json
{
  "id": "optional-unique-id",
  "type": "text",
  "content": "Markdown content with **bold** and *italic*",
  "contentThai": "เนื้อหาภาษาไทย (optional)"
}
```

### Vocabulary Block
8-12 terms per lesson required.

```json
{
  "id": "vocab",
  "type": "vocabulary",
  "terms": [
    {
      "term": "Photosynthesis",
      "thai": "การสังเคราะห์ด้วยแสง",
      "definition": "The process plants use to make food from sunlight"
    }
  ]
}
```

### Image Block
Reference provisional image paths (actual images in issue #150).

```json
{
  "type": "image",
  "src": "/images/g4-plant-life-cycles-1.webp",
  "alt": "Diagram showing the stages of a plant's life cycle",
  "caption": "Plant Life Cycle Stages",
  "captionThai": "ระยะต่างๆ ของวัฏจักรชีวิตพืช",
  "aspectRatio": 1.5,
  "attribution": "Science Advantage, 2024"
}
```

### Reading Passage Block
300-500 words required. Should tell a story or present information engagingly.

```json
{
  "type": "reading_passage",
  "title": "The Amazing Journey of a Seed",
  "titleThai": "การเดินทางอันน่าทึ่งของเมล็ดพืช",
  "content": "Long-form content here...",
  "contentThai": "เนื้อหาภาษาไทย...",
  "wordCount": 425
}
```

## Block Ordering Convention

Recommended order for lesson blocks:

1. **Introduction text** - Hook and learning objectives
2. **Vocabulary block** - Key terms for the lesson
3. **Content text blocks** - Main instructional content (2-4 blocks)
4. **Image blocks** - Interspersed with content as needed
5. **Reading passage** - Extended narrative or informational text
6. **Summary text** - Key takeaways

## Question Bank Structure

Each lesson has a corresponding question bank file with 20 questions:

```json
{
  "lessonId": "g4-plant-life-cycles",
  "questions": [
    {
      "id": "q1",
      "type": "multiple_choice",
      "difficulty": "easy",
      "question": "Question text in English?",
      "questionThai": "คำถามภาษาไทย?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanation": "Brief explanation of correct answer"
    }
  ]
}
```

### Question Types
- `multiple_choice` - 4 options, single correct answer
- `multiple_select` - 4-5 options, multiple correct answers
- `true_false` - Binary choice
- `fill_in_blank` - Single word or short phrase answer

### Difficulty Distribution (per lesson)
- Easy (40%): 8 questions - Basic recall and comprehension
- Medium (40%): 8 questions - Application and analysis
- Hard (20%): 4 questions - Synthesis and evaluation

## Validation Requirements

Run `scripts/validate-content.ts` to check:

- [ ] Schema validation against LessonContentSchema
- [ ] Reading passage word counts: 300-500 words
- [ ] Vocabulary counts: 8-12 terms per lesson
- [ ] Question counts: 20 questions per lesson
- [ ] Difficulty distribution: 8 easy, 8 medium, 4 hard
- [ ] Required Thai translations present
- [ ] Image alt text minimum 10 characters

## ID Conventions

### Lesson IDs
Format: `g4-{topic-name}` (lowercase, hyphenated)
Examples: `g4-plant-life-cycles`, `g4-animal-adaptations`

### Block IDs
Optional but recommended for key blocks:
- `intro` - Introduction text
- `vocab` - Vocabulary block
- `content-1`, `content-2` - Numbered content blocks
- `reading` - Reading passage
- `summary` - Summary text

### Question IDs
Format: `q{number}` (sequential within lesson)
Examples: `q1`, `q2`, ... `q20`

## Thai Translation Notes

- Thai translations flagged for native speaker review
- Prioritize accuracy over literal translation
- Scientific terms should use standard Thai equivalents
- Reading passages should sound natural in Thai

## Image Paths

Image paths are provisional. Actual images will be created in issue #150.

Format: `/images/g4-{lesson-topic}-{number}.webp`
Examples:
- `/images/g4-plant-life-cycles-1.webp`
- `/images/g4-animal-adaptations-diagram.webp`

## Related Files

- Schema: `lib/schemas/lesson-content.schema.ts`
- Validation: `scripts/validate-content.ts`
- Existing G3 content: `prisma/seed-data/lessons/thai-g3-unit-1.json`
