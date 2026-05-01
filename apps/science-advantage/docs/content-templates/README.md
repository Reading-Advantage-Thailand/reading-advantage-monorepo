---
title: Lesson Content Templates Guide
type: guide
status: active
created_at: 2025-10-25
tags: [guide, content-authoring, templates, markdown, validation]
description: A guide for content authors on using standardized markdown templates for lessons, labs, and assessments, including validation rules.
---

# Lesson Content Templates

## Overview

This directory contains standardized markdown templates for creating lesson content in Science Advantage. Templates ensure consistency, enable rich interactive frontend components, and support automated question generation for assessments.

## Relationship to Seed Data

Templates serve as **authoring guides** for content creators. The actual lesson content is stored in JSON files under `prisma/seed-data/lessons/` as markdown strings in the `content` field.

**Workflow:**
1. Content author selects appropriate template based on `lessonType`
2. Author fills in template sections following format specifications
3. Complete markdown is stored in `content` field of lesson JSON
4. Seed script validates structure and imports into database
5. Frontend parsers extract structured sections for interactive rendering

## Lesson Types

Science Advantage supports three lesson types:

| Lesson Type | Use Case | Template |
|-------------|----------|----------|
| `LESSON` | Regular instructional lessons | `primary/lesson-template.md` |
| `LAB` | Hands-on laboratory activities | `primary/lab-template.md` |
| `ASSESSMENT` | Quizzes and tests | `primary/assessment-template.md` |

Set `lessonType` field in JSON to match the template used.

## Content Structure Requirements

### Section Headers

All templates use `##` (h2) markdown headers to denote major sections. Section titles are **case-sensitive** and must match exactly for frontend parsers to recognize them.

**Example:**
```markdown
## Key Vocabulary
```

### Structured Format Syntax

Some sections require specific formatting to enable interactive components:

#### Vocabulary (Regular Lessons)

**Format:** `- **Term** (Thai: ไทย) - Definition`

**Rules:**
- Each vocabulary entry is a bullet list item
- English term in bold (`**Term**`)
- Thai translation in parentheses with `Thai:` prefix (`(Thai: คำศัพท์)`)
- Definition follows the dash
- Thai translation is **required** for all terms

**Example:**
```markdown
## Key Vocabulary

- **Observation** (Thai: การสังเกต) - Using your senses to learn about the world around you
- **Living Thing** (Thai: สิ่งมีชีวิต) - Something that is alive and can grow, eat, and reproduce
```

**Validation Regex:** `^- \*\*[^*]+\*\* \(Thai: [^\)]+\) - .+$`

#### Materials (Lab Lessons)

**Format:** `- [quantity] item name`

**Rules:**
- Each material is a bullet list item
- Optional quantity can be number, range, or descriptor
- Item name follows quantity

**Examples:**
```markdown
## Materials

- 1 magnifying glass
- 3-5 plant samples
- Several small rocks
- Paper and pencils
- Safety goggles (one per student)
```

**Validation Regex:** `^- (?:\d+(?:-\d+)?|[Ss]everal|[Oo]ne per student)?\s*.+$`

#### Procedure (Lab Lessons)

**Format:** Numbered list with clear action steps

**Rules:**
- Use numbered markdown lists (`1.`, `2.`, etc.)
- Each step is a complete sentence
- Steps are sequential and actionable
- Can include sub-steps using indented bullets

**Example:**
```markdown
## Procedure

1. Put on your safety goggles.
2. Choose one plant sample to observe.
   - Look at the leaves, stem, and any flowers
   - Note the colors and shapes
3. Use the magnifying glass to look closely at the plant.
4. Draw what you see in your science notebook.
5. Write three observations about your plant.
```

**Validation:** Must start with `1.` and contain at least 3 numbered steps.

#### Safety Notes (Lab Lessons)

**Format:** `⚠ Warning text`

**Rules:**
- Each safety note starts with warning emoji (`⚠` or `⚠️`)
- Can be bullet list or paragraph format
- Use clear, age-appropriate language

**Example:**
```markdown
## Safety Notes

⚠ Always wear safety goggles during the lab.
⚠ Do not taste or smell any materials unless instructed.
⚠ Tell your teacher immediately if you spill something.
```

### Free-Form Sections

The following sections use standard markdown without special formatting:

- **Introduction**: Hook and lesson overview
- **Main Content**: Core instructional content
- **Reading Passage**: Science reading (300-500 words for Grade 3)
- **Summary**: Key takeaways and review
- **Learning Objectives**: Bullet list of what students will learn
- **Observations**: Data tables or free-form observations
- **Conclusion Questions**: Reflection questions

Use headings, bold, italic, lists, and other markdown as appropriate for readability.

## Grade Level Guidelines

### Primary Level (Grades 3-6)

**Reading Passages:**
- Grade 3: 300-500 words
- Grade 4: 400-600 words
- Grade 5: 500-700 words
- Grade 6: 600-800 words

**Vocabulary:**
- 8-12 key terms per lesson
- Grade-appropriate definitions (1-2 sentences)
- Always include Thai translations

**Language:**
- Clear, simple sentences
- Active voice preferred
- Age-appropriate vocabulary
- Engaging, conversational tone

## Validation

The seed script (`prisma/seed.ts`) validates lesson content during import:

1. **Lesson Type Match**: Verifies content contains required sections for its `lessonType`
   - `LESSON` must have: Introduction, Main Content, Key Vocabulary, Reading Passage, Summary
   - `LAB` must have: Introduction, Materials, Procedure
   - `ASSESSMENT` must have: Instructions

2. **Structured Format**: Validates formatted sections match regex patterns
   - Vocabulary entries have proper format with Thai translations
   - Materials list is properly formatted
   - Procedure has numbered steps

3. **Bilingual Content**: Ensures all vocabulary includes Thai translations

**Seed script will fail with detailed errors if validation fails.**

## Template Files

- **[primary/lesson-template.md](primary/lesson-template.md)**: Regular instructional lesson template
- **[primary/lab-template.md](primary/lab-template.md)**: Laboratory activity template
- **[primary/assessment-template.md](primary/assessment-template.md)**: Assessment lesson template

## Example Lessons

See completed examples in `prisma/seed-data/lessons/thai-g3-unit-1.json`:

- **Lesson Type: LESSON**: Lessons 1, 4, 5, 7, 8
- **Lesson Type: LAB**: Lesson 6 (Lab: Observing Living Things)

## Future Expansion

Templates for secondary level (Grades 7-12) will be added in `docs/content-templates/secondary/` with adjusted reading passage lengths and vocabulary complexity.

## Questions?

For questions about content authoring or template usage, contact the curriculum team or open a GitHub issue with the `area:content` label.
