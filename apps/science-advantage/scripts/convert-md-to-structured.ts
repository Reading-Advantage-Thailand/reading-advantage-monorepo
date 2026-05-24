/**
 * Script to convert Grade 3 markdown content to structured JSON format.
 *
 * Usage: npx tsx scripts/convert-md-to-structured.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface VocabularyTerm {
  term: string;
  thai: string;
  definition: string;
}

interface TextBlock {
  id: string;
  type: 'text';
  content: string;
  contentThai?: string;
}

interface VocabularyBlock {
  id: string;
  type: 'vocabulary';
  terms: VocabularyTerm[];
}

interface ReadingPassageBlock {
  id: string;
  type: 'reading_passage';
  title: string;
  titleThai?: string;
  content: string;
  contentThai?: string;
  wordCount: number;
}

interface MaterialItem {
  name: string;
  nameThai?: string;
  quantity?: string;
  notes?: string;
}

interface MaterialsBlock {
  id: string;
  type: 'materials';
  items: MaterialItem[];
}

interface ProcedureStep {
  step: number;
  instruction: string;
  instructionThai?: string;
}

interface ProcedureBlock {
  id: string;
  type: 'procedure';
  steps: ProcedureStep[];
}

type ContentBlock = TextBlock | VocabularyBlock | ReadingPassageBlock | MaterialsBlock | ProcedureBlock;

interface LessonContent {
  version: 1;
  blocks: ContentBlock[];
}

interface Section {
  title: string;
  content: string;
}

function parseMarkdownSections(content: string): Section[] {
  const sections: Section[] = [];
  const lines = content.split('\n');

  let currentSection: Section | null = null;
  let contentLines: string[] = [];

  for (const line of lines) {
    const headerMatch = line.match(/^##\s+(.+)$/);

    if (headerMatch) {
      // Save previous section
      if (currentSection) {
        currentSection.content = contentLines.join('\n').trim();
        sections.push(currentSection);
      }

      // Start new section
      currentSection = {
        title: headerMatch[1].trim(),
        content: ''
      };
      contentLines = [];
    } else if (currentSection) {
      contentLines.push(line);
    }
  }

  // Save last section
  if (currentSection) {
    currentSection.content = contentLines.join('\n').trim();
    sections.push(currentSection);
  }

  return sections;
}

function parseVocabulary(content: string): VocabularyTerm[] {
  const terms: VocabularyTerm[] = [];
  const lines = content.split('\n');

  for (const line of lines) {
    // Format: - **Term** (Thai: ไทย) - Definition
    const match = line.match(/^-\s+\*\*([^*]+)\*\*\s+\(Thai:\s*([^)]+)\)\s+-\s+(.+)$/);
    if (match) {
      terms.push({
        term: match[1].trim(),
        thai: match[2].trim(),
        definition: match[3].trim()
      });
    }
  }

  return terms;
}

function parseMaterials(content: string): MaterialItem[] {
  const items: MaterialItem[] = [];
  const lines = content.split('\n');

  let currentCategory = '';

  for (const line of lines) {
    // Skip headers
    if (line.startsWith('**') && line.endsWith('**')) {
      currentCategory = line.replace(/\*\*/g, '').replace(':', '').trim();
      continue;
    }

    // Parse material items
    const itemMatch = line.match(/^-\s+(.+)$/);
    if (itemMatch) {
      const itemText = itemMatch[1].trim();
      items.push({
        name: itemText,
        notes: currentCategory || undefined
      });
    }
  }

  return items;
}

function parseProcedure(content: string): ProcedureStep[] {
  const steps: ProcedureStep[] = [];
  const lines = content.split('\n');

  let stepNumber = 0;
  let currentInstruction: string[] = [];
  let inStep = false;

  for (const line of lines) {
    // Match numbered steps like "1. **Step Title**"
    const stepMatch = line.match(/^(\d+)\.\s+\*\*([^*]+)\*\*$/);

    if (stepMatch) {
      // Save previous step
      if (inStep && currentInstruction.length > 0) {
        steps.push({
          step: stepNumber,
          instruction: currentInstruction.join('\n').trim()
        });
      }

      stepNumber = parseInt(stepMatch[1], 10);
      currentInstruction = [stepMatch[2].trim()];
      inStep = true;
    } else if (inStep && line.trim()) {
      // Continue adding content to current step
      currentInstruction.push(line.trim().replace(/^\s+-\s+/, '• '));
    }
  }

  // Save last step
  if (inStep && currentInstruction.length > 0) {
    steps.push({
      step: stepNumber,
      instruction: currentInstruction.join('\n').trim()
    });
  }

  return steps;
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(word => word.length > 0).length;
}

function convertToStructuredContent(markdownContent: string, isLab: boolean): LessonContent {
  const sections = parseMarkdownSections(markdownContent);
  const blocks: ContentBlock[] = [];
  let textBlockCounter = 1;

  for (const section of sections) {
    const titleLower = section.title.toLowerCase();

    if (titleLower === 'introduction') {
      blocks.push({
        id: 'intro',
        type: 'text',
        content: section.content
      });
    } else if (titleLower === 'main content') {
      blocks.push({
        id: `content-${textBlockCounter++}`,
        type: 'text',
        content: `## Main Content\n\n${section.content}`
      });
    } else if (titleLower === 'key vocabulary' || titleLower === 'vocabulary') {
      const terms = parseVocabulary(section.content);
      if (terms.length > 0) {
        blocks.push({
          id: 'vocab',
          type: 'vocabulary',
          terms
        });
      }
    } else if (titleLower.startsWith('reading passage')) {
      // Extract title from "Reading Passage: Title" format
      const titleMatch = section.title.match(/Reading Passage[:\s]+(.+)/i);
      const passageTitle = titleMatch ? titleMatch[1].trim() : 'Reading Passage';

      blocks.push({
        id: 'reading',
        type: 'reading_passage',
        title: passageTitle,
        content: section.content,
        wordCount: countWords(section.content)
      });
    } else if (titleLower === 'summary') {
      blocks.push({
        id: 'summary',
        type: 'text',
        content: `## Summary\n\n${section.content}`
      });
    } else if (isLab && titleLower === 'materials') {
      const items = parseMaterials(section.content);
      if (items.length > 0) {
        blocks.push({
          id: 'materials',
          type: 'materials',
          items
        });
      }
    } else if (isLab && titleLower === 'procedure') {
      const steps = parseProcedure(section.content);
      if (steps.length > 0) {
        blocks.push({
          id: 'procedure',
          type: 'procedure',
          steps
        });
      }
    } else if (isLab && titleLower === 'safety notes') {
      blocks.push({
        id: 'safety',
        type: 'text',
        content: `## Safety Notes\n\n${section.content}`
      });
    } else if (isLab && titleLower === 'learning objectives') {
      blocks.push({
        id: 'objectives',
        type: 'text',
        content: `## Learning Objectives\n\n${section.content}`
      });
    } else if (isLab && titleLower === 'observations') {
      blocks.push({
        id: 'observations',
        type: 'text',
        content: `## Observations\n\n${section.content}`
      });
    } else if (isLab && titleLower === 'conclusion questions') {
      blocks.push({
        id: 'conclusion',
        type: 'text',
        content: `## Conclusion Questions\n\n${section.content}`
      });
    } else {
      // Generic section - add as text block
      blocks.push({
        id: `section-${textBlockCounter++}`,
        type: 'text',
        content: `## ${section.title}\n\n${section.content}`
      });
    }
  }

  return {
    version: 1,
    blocks
  };
}

async function main() {
  const inputPath = path.join(__dirname, '..', 'prisma', 'seed-data', 'lessons', 'thai-g3-unit-1.json');
  const outputPath = inputPath; // Overwrite in place

  console.log('Reading Grade 3 lessons file...');
  const fileContent = fs.readFileSync(inputPath, 'utf-8');
  const data = JSON.parse(fileContent);

  console.log(`Found ${data.lessons.length} lessons to convert.\n`);

  for (const lesson of data.lessons) {
    const isLab = lesson.lessonType === 'LAB';
    console.log(`Converting: ${lesson.id} ${isLab ? '(LAB)' : ''}`);

    const structuredContent = convertToStructuredContent(lesson.content, isLab);
    lesson.structuredContent = structuredContent;

    console.log(`  - Created ${structuredContent.blocks.length} blocks`);
    for (const block of structuredContent.blocks) {
      console.log(`    • ${block.type} (${block.id})`);
    }
  }

  console.log('\nWriting updated file...');
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2), 'utf-8');

  console.log('Done! Grade 3 lessons now have structuredContent.');
}

main().catch(console.error);
