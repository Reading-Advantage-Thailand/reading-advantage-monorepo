/**
 * Content parsing utilities for structured lesson content
 *
 * These parsers extract structured sections from markdown lesson content
 * to enable interactive frontend components (vocabulary flashcards, procedure
 * checklists, materials lists, etc.)
 */

export interface VocabTerm {
  term: string;
  thai: string;
  definition: string;
}

export interface Material {
  quantity?: string;
  item: string;
}

export interface ProcedureStep {
  stepNumber: number;
  instruction: string;
  subSteps?: string[];
}

export interface Section {
  title: string;
  content: string;
  level: number; // h2 = 2, h3 = 3
}

/**
 * Parse markdown content into sections based on headers
 */
export function parseMarkdownSections(content: string): Section[] {
  const sections: Section[] = [];
  const lines = content.split('\n');

  let currentSection: Section | null = null;
  let currentContent: string[] = [];

  for (const line of lines) {
    const h2Match = line.match(/^##\s+(.+)$/);
    const h3Match = line.match(/^###\s+(.+)$/);

    if (h2Match || h3Match) {
      // Save previous section if exists
      if (currentSection) {
        currentSection.content = currentContent.join('\n').trim();
        sections.push(currentSection);
      }

      // Start new section
      if (h2Match) {
        currentSection = {
          title: h2Match[1],
          content: '',
          level: 2
        };
      } else if (h3Match) {
        currentSection = {
          title: h3Match[1],
          content: '',
          level: 3
        };
      }
      currentContent = [];
    } else if (currentSection) {
      currentContent.push(line);
    }
  }

  // Save last section
  if (currentSection) {
    currentSection.content = currentContent.join('\n').trim();
    sections.push(currentSection);
  }

  return sections;
}

/**
 * Parse vocabulary section into structured terms
 *
 * Expected format: - **Term** (Thai: translation) - Definition
 *
 * @param sectionContent - Content of the Key Vocabulary section
 * @returns Array of vocabulary terms
 */
export function parseVocabulary(sectionContent: string): VocabTerm[] {
  const vocab: VocabTerm[] = [];

  // Regex to match vocabulary format: - **Term** (Thai: translation) - Definition
  const vocabPattern = /^-\s+\*\*(.+?)\*\*\s+\(Thai:\s+(.+?)\)\s+-\s+(.+)$/gm;

  let match;
  while ((match = vocabPattern.exec(sectionContent)) !== null) {
    vocab.push({
      term: match[1].trim(),
      thai: match[2].trim(),
      definition: match[3].trim()
    });
  }

  return vocab;
}

/**
 * Parse materials section into structured list
 *
 * Expected format: - [quantity] item name
 *
 * @param sectionContent - Content of the Materials section
 * @returns Array of materials
 */
export function parseMaterials(sectionContent: string): Material[] {
  const materials: Material[] = [];

  // Regex to match materials format: - [optional quantity] item
  const materialPattern = /^-\s+(?:(\d+(?:-\d+)?|[Ss]everal|[Oo]ne per student)\s+)?(.+)$/gm;

  let match;
  while ((match = materialPattern.exec(sectionContent)) !== null) {
    materials.push({
      quantity: match[1]?.trim(),
      item: match[2].trim()
    });
  }

  return materials;
}

/**
 * Parse procedure section into numbered steps
 *
 * Expected format: Numbered list (1., 2., etc.) with optional sub-steps
 *
 * @param sectionContent - Content of the Procedure section
 * @returns Array of procedure steps
 */
export function parseProcedure(sectionContent: string): ProcedureStep[] {
  const steps: ProcedureStep[] = [];
  const lines = sectionContent.split('\n');

  let currentStep: ProcedureStep | null = null;

  for (const line of lines) {
    // Match main step: 1., 2., etc.
    const stepMatch = line.match(/^(\d+)\.\s+(.+)$/);
    // Match sub-step: indented bullet or dash
    const subStepMatch = line.match(/^\s{2,}-\s+(.+)$/);

    if (stepMatch) {
      // Save previous step if exists
      if (currentStep) {
        steps.push(currentStep);
      }

      // Start new step
      currentStep = {
        stepNumber: parseInt(stepMatch[1]),
        instruction: stepMatch[2].trim(),
        subSteps: []
      };
    } else if (subStepMatch && currentStep) {
      // Add sub-step to current step
      currentStep.subSteps!.push(subStepMatch[1].trim());
    }
  }

  // Save last step
  if (currentStep) {
    steps.push(currentStep);
  }

  return steps;
}

/**
 * Get a specific section by title from parsed sections
 */
export function getSection(sections: Section[], title: string): Section | undefined {
  return sections.find(s => s.title.toLowerCase() === title.toLowerCase());
}

/**
 * Extract all vocabulary from lesson content
 * Finds "Key Vocabulary" section and parses it
 */
export function extractVocabulary(content: string): VocabTerm[] {
  const sections = parseMarkdownSections(content);
  const vocabSection = getSection(sections, 'Key Vocabulary');

  if (!vocabSection) {
    return [];
  }

  return parseVocabulary(vocabSection.content);
}

/**
 * Extract materials list from lab content
 * Finds "Materials" section and parses it
 */
export function extractMaterials(content: string): Material[] {
  const sections = parseMarkdownSections(content);
  const materialsSection = getSection(sections, 'Materials');

  if (!materialsSection) {
    return [];
  }

  return parseMaterials(materialsSection.content);
}

/**
 * Extract procedure from lab content
 * Finds "Procedure" section and parses it
 */
export function extractProcedure(content: string): ProcedureStep[] {
  const sections = parseMarkdownSections(content);
  const procedureSection = getSection(sections, 'Procedure');

  if (!procedureSection) {
    return [];
  }

  return parseProcedure(procedureSection.content);
}
