// Cross-course equivalence engine — domain-neutral
//
// Identifies equivalent_to edges across multiple course knowledge spaces using
// familyKey matching, standard alignment overlap, and title similarity.
// All outputs are deterministic: same input → same output order.

import type {
  KnowledgeSpaceNode,
  KnowledgeSpaceEdge,
  ConfidenceLevel,
} from './types.js';

export interface CrossCourseCourse {
  courseId: string;
  nodes: KnowledgeSpaceNode[];
  edges: KnowledgeSpaceEdge[];
}

export interface CrossCourseInput {
  courses: CrossCourseCourse[];
  idPrefix?: string;
}

export interface CrossCourseValidationResult {
  valid: boolean;
  reason?: string;
}

export interface EquivalenceComponent {
  componentId: string;
  nodeIds: string[];
  courses: string[];
  edges: KnowledgeSpaceEdge[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extract a string value from a node's metadata by field name.
 * @param {KnowledgeSpaceNode} node - The node to read metadata from
 * @param {string} field - The metadata field name
 * @returns {string | undefined} - The string value, or undefined if missing or not a string
 */
function metaStr(node: KnowledgeSpaceNode, field: string): string | undefined {
  const v = node.metadata?.[field];
  return typeof v === 'string' ? v : undefined;
}

/**
 * Extract the course-level prefix (first two dot-separated segments) from a node ID.
 * @param {string} nodeId - The full node ID string
 * @returns {string} - The course prefix, e.g. "math.im1"
 */
function courseFromId(nodeId: string): string {
  // Extract course-level prefix: math.im1, math.im2, math.im3, math.precalc
  const parts = nodeId.split('.');
  return parts.slice(0, 2).join('.');
}

/**
 * Normalize a title string for cross-course comparison by lowercasing and stripping special characters.
 * @param {string} title - The raw title string
 * @returns {string} - Normalized lowercase underscore-separated string
 */
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[_\s-]+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

// ---------------------------------------------------------------------------
// Endpoint validation
// ---------------------------------------------------------------------------

/**
 * Validate that a cross-course edge has valid source and target endpoints.
 * @param {KnowledgeSpaceEdge} edge - The edge to validate
 * @param {KnowledgeSpaceNode[]} nodes - The full set of knowledge space nodes
 * @returns {CrossCourseValidationResult} - Validation result with reason if invalid
 */
export function validateCrossCourseEdges(
  edge: KnowledgeSpaceEdge,
  nodes: KnowledgeSpaceNode[],
): CrossCourseValidationResult {
  const nodeIds = new Set(nodes.map((n) => n.id));

  if (!nodeIds.has(edge.sourceId)) {
    return { valid: false, reason: `Source node "${edge.sourceId}" does not exist` };
  }
  if (!nodeIds.has(edge.targetId)) {
    return { valid: false, reason: `Target node "${edge.targetId}" does not exist` };
  }

  const sourceCourse = courseFromId(edge.sourceId);
  const targetCourse = courseFromId(edge.targetId);
  if (sourceCourse === targetCourse) {
    return {
      valid: false,
      reason: `Source and target are in the same course ("${sourceCourse}") — cross-course edges only`,
    };
  }

  return { valid: true };
}

// ---------------------------------------------------------------------------
// Matching strategies
// ---------------------------------------------------------------------------

/**
 * Extract standard IDs a node is aligned to (via aligned_to_standard edges).
 */
// function getStandardIds(nodeId: string, edges: KnowledgeSpaceEdge[]): Set<string> { ... }

/**
 * Build a global lookup of standard IDs per node across all courses.
 */
function buildStandardLookup(
  courses: CrossCourseCourse[],
): Map<string, Set<string>> {
  const lookup = new Map<string, Set<string>>();
  for (const course of courses) {
    for (const edge of course.edges) {
      if (edge.type !== 'aligned_to_standard') continue;
      const current = lookup.get(edge.sourceId) ?? new Set();
      current.add(edge.targetId);
      lookup.set(edge.sourceId, current);
    }
  }
  return lookup;
}

/**
 * Get node by ID from any course.
 */
function getNodeById(
  courses: CrossCourseCourse[],
  nodeId: string,
): KnowledgeSpaceNode | undefined {
  for (const course of courses) {
    for (const node of course.nodes) {
      if (node.id === nodeId) return node;
    }
  }
  return undefined;
}

/**
 * Make a single edge candidate.
 */
function makeCandidate(
  sourceId: string,
  targetId: string,
  weight: number,
  confidence: ConfidenceLevel,
  derivationMethod: string,
  rationale: string,
  metadata: Record<string, unknown>,
): Omit<KnowledgeSpaceEdge, 'id'> {
  return {
    type: 'equivalent_to',
    sourceId,
    targetId,
    weight,
    confidence,
    reviewStatus: 'draft',
    derived: true,
    derivationMethod,
    rationale,
    metadata,
  };
}

// ---------------------------------------------------------------------------
// Matching: familyKey
// ---------------------------------------------------------------------------

/**
 * Match cross-course equivalences using familyKey grouping and title bridging.
 * @param {CrossCourseCourse[]} courses - All courses with their nodes and edges
 * @param {Map<string, Set<string>>} standardLookup - Pre-built map of node IDs to their aligned standard IDs
 * @returns {Omit<KnowledgeSpaceEdge, 'id'>[]} - Array of equivalence edge candidates from familyKey matching
 */
function matchByFamilyKey(
  courses: CrossCourseCourse[],
  standardLookup: Map<string, Set<string>>,
): Omit<KnowledgeSpaceEdge, 'id'>[] {
  const candidates: Omit<KnowledgeSpaceEdge, 'id'>[] = [];

  // Build a title-normalized index for all relevant nodes (used to bridge
  // familyKey-carrying nodes to nodes whose title matches the familyKey).
  const titleIndex = new Map<string, Array<{ courseId: string; nodeId: string }>>();
  for (const course of courses) {
    for (const node of course.nodes) {
      if (node.kind !== 'skill' && node.kind !== 'concept' && node.kind !== 'worked_example') continue;
      const norm = normalizeTitle(node.title);
      if (!norm) continue;
      const entries = titleIndex.get(norm) ?? [];
      entries.push({ courseId: course.courseId, nodeId: node.id });
      titleIndex.set(norm, entries);
    }
  }

  // Group nodes by familyKey across all courses
  const byFamilyKey = new Map<string, Array<{ courseId: string; nodeId: string }>>();
  for (const course of courses) {
    for (const node of course.nodes) {
      const fk = metaStr(node, 'familyKey');
      if (!fk) continue;
      if (node.kind !== 'skill' && node.kind !== 'concept') continue;
      const entry = { courseId: course.courseId, nodeId: node.id };
      const existing = byFamilyKey.get(fk);
      if (existing) {
        existing.push(entry);
      } else {
        byFamilyKey.set(fk, [entry]);
      }
    }
  }

  // For each familyKey group spanning multiple courses, emit pairwise edges
  for (const [fk, entries] of byFamilyKey) {
    if (entries.length < 2) continue;

    // Group entries by course to avoid intra-course edges
    const byCourse = new Map<string, string[]>();
    for (const e of entries) {
      const ids = byCourse.get(e.courseId) ?? [];
      ids.push(e.nodeId);
      byCourse.set(e.courseId, ids);
    }

    if (byCourse.size < 2) continue;

    // Emit edges between courses
    const courseIds = [...byCourse.keys()].sort();
    for (let i = 0; i < courseIds.length; i++) {
      for (let j = i + 1; j < courseIds.length; j++) {
        const courseA = courseIds[i];
        const courseB = courseIds[j];
        const nodesA = byCourse.get(courseA) ?? [];
        const nodesB = byCourse.get(courseB) ?? [];

        for (const nodeA of nodesA) {
          for (const nodeB of nodesB) {
            // Deterministic source/target ordering: lower ID is source
            const [source, target] = [nodeA, nodeB].sort();

            // Compute confidence:
            //  - high: familyKey match + shared standards between source and target
            //  - medium: familyKey match without shared standards
            const standardsA = standardLookup.get(source) ?? new Set();
            const standardsB = standardLookup.get(target) ?? new Set();
            const sharedStandards = [...standardsA].filter((s) => standardsB.has(s));
            const confidence: ConfidenceLevel =
              sharedStandards.length > 0 ? 'high' : 'medium';

            const method = sharedStandards.length > 0
              ? 'cross-course-familykey-standard-v1'
              : 'cross-course-familykey-v1';

            const rationale = sharedStandards.length > 0
              ? `Shared familyKey "${fk}" and ${sharedStandards.length} shared standard(s) between ${courseA} and ${courseB}`
              : `Shared familyKey "${fk}" between ${courseA} and ${courseB} (no shared standards)`;

            candidates.push(makeCandidate(
              source,
              target,
              confidence === 'high' ? 1.0 : 0.75,
              confidence,
              method,
              rationale,
              {
                familyKey: fk,
                matchType: 'familyKey',
                courses: [courseA, courseB],
                sharedStandards,
              },
            ));
          }
        }
      }
    }
  }

  // Bridge: nodes with familyKey → nodes in other courses whose normalized
  // title matches the familyKey (title as secondary signal per spec).
  for (const [fk, fkEntries] of byFamilyKey) {
    const fkNorm = normalizeTitle(fk);
    const titleMatches = titleIndex.get(fkNorm);
    if (!titleMatches || titleMatches.length === 0) continue;

    // Collect courses with familyKey-carrying nodes
    const fkCourses = new Set(fkEntries.map((e) => e.courseId));

    for (const tm of titleMatches) {
      // Skip if the title-matched node is already tracked via familyKey
      if (fkEntries.some((fe) => fe.nodeId === tm.nodeId)) continue;
      // Skip if same course
      if (fkCourses.has(tm.courseId)) continue;

      for (const fe of fkEntries) {
        const [source, target] = [fe.nodeId, tm.nodeId].sort();

        candidates.push(makeCandidate(
          source,
          target,
          0.75,
          'medium',
          'cross-course-familykey-title-v1',
          `familyKey "${fk}" in ${courseFromId(fe.nodeId)} matches title "${tm.nodeId}" in ${tm.courseId}`,
          {
            familyKey: fk,
            matchType: 'familyKey+title',
            courses: [fe.courseId, tm.courseId],
            sharedStandards: [],
          },
        ));
      }
    }
  }

  return candidates;
}

// ---------------------------------------------------------------------------
// Matching: standard overlap
// ---------------------------------------------------------------------------

/**
 * Match cross-course equivalences by shared standard alignment overlap.
 * @param {CrossCourseCourse[]} courses - All courses with their nodes and edges
 * @param {Map<string, Set<string>>} standardLookup - Pre-built map of node IDs to their aligned standard IDs
 * @returns {Omit<KnowledgeSpaceEdge, 'id'>[]} - Array of equivalence edge candidates from standard overlap
 */
function matchByStandardOverlap(
  courses: CrossCourseCourse[],
  standardLookup: Map<string, Set<string>>,
): Omit<KnowledgeSpaceEdge, 'id'>[] {
  const candidates: Omit<KnowledgeSpaceEdge, 'id'>[] = [];
  const METHOD = 'cross-course-standard-overlap-v1';

  // Build reverse index: standard → [{ courseId, nodeId, kind }]
  const standardToNodes = new Map<string, Array<{ courseId: string; nodeId: string; kind: string }>>();
  for (const [nodeId, standards] of standardLookup) {
    const node = getNodeById(courses, nodeId);
    if (!node) continue;
    // Include skill and worked_example nodes (worked_examples provide
    // standard evidence in PreCalc where skill nodes lack alignment edges).
    if (node.kind !== 'skill' && node.kind !== 'worked_example') continue;
    const courseId = courseFromId(nodeId);
    for (const std of standards) {
      const entries = standardToNodes.get(std) ?? [];
      entries.push({ courseId, nodeId, kind: node.kind });
      standardToNodes.set(std, entries);
    }
  }

  // Track which pairs we've already matched via familyKey (to avoid duplicates)
  const alreadyMatched = new Set<string>();

  // For each standard, find cross-course pairs
  for (const [, entries] of standardToNodes) {
    if (entries.length < 2) continue;

    const byCourse = new Map<string, Array<{ nodeId: string; kind: string }>>();
    for (const e of entries) {
      const ids = byCourse.get(e.courseId) ?? [];
      ids.push({ nodeId: e.nodeId, kind: e.kind });
      byCourse.set(e.courseId, ids);
    }

    if (byCourse.size < 2) continue;

    const courseIds = [...byCourse.keys()].sort();
    for (let i = 0; i < courseIds.length; i++) {
      for (let j = i + 1; j < courseIds.length; j++) {
        const courseA = courseIds[i];
        const courseB = courseIds[j];
        const nodesA = byCourse.get(courseA) ?? [];
        const nodesB = byCourse.get(courseB) ?? [];

        for (const entryA of nodesA) {
          for (const entryB of nodesB) {
            // Skip worked_example ↔ worked_example pairs — too noisy
            if (entryA.kind === 'worked_example' && entryB.kind === 'worked_example') continue;

            const pairKey = [entryA.nodeId, entryB.nodeId].sort().join('||');
            if (alreadyMatched.has(pairKey)) continue;
            alreadyMatched.add(pairKey);

            const [source, target] = [entryA.nodeId, entryB.nodeId].sort();

            const sharedStandards = [
              ...(standardLookup.get(source) ?? new Set()),
            ].filter((s) => (standardLookup.get(target) ?? new Set()).has(s));

            // Confidence: skill↔skill is medium, mixed skill↔worked_example is medium
            const confidence: ConfidenceLevel = 'medium';

            candidates.push(makeCandidate(
              source,
              target,
              0.75,
              confidence,
              METHOD,
              `Shared standard alignment between ${courseA} and ${courseB}`,
              {
                matchType: 'standard',
                courses: [courseA, courseB],
                sharedStandards,
              },
            ));
          }
        }
      }
    }
  }

  return candidates;
}

// ---------------------------------------------------------------------------
// Matching: title/slug similarity
// ---------------------------------------------------------------------------

/**
 * Match cross-course equivalences by normalized title and familyKey similarity.
 * @param {CrossCourseCourse[]} courses - All courses with their nodes and edges
 * @returns {Omit<KnowledgeSpaceEdge, 'id'>[]} - Array of low-confidence equivalence edge candidates from title matching
 */
function matchByTitle(
  courses: CrossCourseCourse[],
): Omit<KnowledgeSpaceEdge, 'id'>[] {
  const candidates: Omit<KnowledgeSpaceEdge, 'id'>[] = [];
  const METHOD = 'cross-course-title-match-v1';

  // Build a title-normalized index by course
  type TitleEntry = { nodeId: string; title: string; normalized: string; courseId: string };
  const byNormalizedTitle = new Map<string, TitleEntry[]>();
  const seenPairs = new Set<string>();

  for (const course of courses) {
    for (const node of course.nodes) {
      if (node.kind !== 'skill' && node.kind !== 'concept' && node.kind !== 'worked_example') continue;
      const normalized = normalizeTitle(node.title);
      if (!normalized) continue;

      // Also try normalizing the familyKey from metadata
      const fk = metaStr(node, 'familyKey');
      const fkNormalized = fk ? normalizeTitle(fk) : undefined;

      const entry: TitleEntry = {
        nodeId: node.id,
        title: node.title,
        normalized,
        courseId: course.courseId,
      };

      // Index by the node's own normalized title
      const titleEntries = byNormalizedTitle.get(normalized) ?? [];
      titleEntries.push(entry);
      byNormalizedTitle.set(normalized, titleEntries);

      // Also index by familyKey if it exists (so IM3 concepts connect to
      // other courses' skills with matching topic names)
      if (fkNormalized && fkNormalized !== normalized) {
        const fkEntries = byNormalizedTitle.get(fkNormalized) ?? [];
        fkEntries.push(entry);
        byNormalizedTitle.set(fkNormalized, fkEntries);
      }
    }
  }

  // For each normalized title group spanning multiple courses, emit edges
  for (const [, entries] of byNormalizedTitle) {
    const byCourse = new Map<string, string[]>();
    for (const e of entries) {
      const ids = byCourse.get(e.courseId) ?? [];
      ids.push(e.nodeId);
      byCourse.set(e.courseId, ids);
    }

    if (byCourse.size < 2) continue;

    const courseIds = [...byCourse.keys()].sort();
    for (let i = 0; i < courseIds.length; i++) {
      for (let j = i + 1; j < courseIds.length; j++) {
        const courseA = courseIds[i];
        const courseB = courseIds[j];
        const nodesA = byCourse.get(courseA) ?? [];
        const nodesB = byCourse.get(courseB) ?? [];

        for (const nodeA of nodesA) {
          for (const nodeB of nodesB) {
            const pairKey = [nodeA, nodeB].sort().join('||');
            if (seenPairs.has(pairKey)) continue;
            seenPairs.add(pairKey);

            const [source, target] = [nodeA, nodeB].sort();

            candidates.push(makeCandidate(
              source,
              target,
              0.5,
              'low',
              METHOD,
              `Title-based match between ${courseA} and ${courseB} — needs review`,
              {
                matchType: 'title',
                courses: [courseA, courseB],
              },
            ));
          }
        }
      }
    }
  }

  return candidates;
}

// ---------------------------------------------------------------------------
// Connected components
// ---------------------------------------------------------------------------

/**
 * Compute connected components of equivalent_to edges across courses.
 * @param {KnowledgeSpaceEdge[]} edges - All knowledge space edges
 * @returns {EquivalenceComponent[]} - Array of equivalence component groups
 */
export function computeEquivalenceComponents(
  edges: KnowledgeSpaceEdge[],
): EquivalenceComponent[] {
  const equivEdges = edges.filter((e) => e.type === 'equivalent_to');
  if (equivEdges.length === 0) return [];

  // Build adjacency list
  const adj = new Map<string, Set<string>>();
  for (const edge of equivEdges) {
    if (!adj.has(edge.sourceId)) adj.set(edge.sourceId, new Set());
    if (!adj.has(edge.targetId)) adj.set(edge.targetId, new Set());
    adj.get(edge.sourceId)!.add(edge.targetId);
    adj.get(edge.targetId)!.add(edge.sourceId);
  }

  // BFS to find connected components
  const visited = new Set<string>();
  const components: Array<{
    nodeIds: string[];
    edges: KnowledgeSpaceEdge[];
  }> = [];

  for (const nodeId of adj.keys()) {
    if (visited.has(nodeId)) continue;

    const componentNodes: string[] = [];
    const queue = [nodeId];
    visited.add(nodeId);

    while (queue.length > 0) {
      const current = queue.shift()!;
      componentNodes.push(current);
      for (const neighbor of adj.get(current) ?? []) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }

    // Collect edges within this component
    const componentNodeSet = new Set(componentNodes);
    const componentEdges = equivEdges.filter(
      (e) => componentNodeSet.has(e.sourceId) && componentNodeSet.has(e.targetId),
    );

    components.push({ nodeIds: componentNodes, edges: componentEdges });
  }

  // Sort components deterministically
  return components
    .map((comp, idx) => {
      const sortedIds = [...comp.nodeIds].sort();
      const courses = [...new Set(sortedIds.map(courseFromId))].sort();
      return {
        componentId: `equivalence-component-${String(idx + 1).padStart(3, '0')}`,
        nodeIds: sortedIds,
        courses,
        edges: [...comp.edges].sort(
          (a, b) => a.sourceId.localeCompare(b.sourceId) || a.targetId.localeCompare(b.targetId),
        ),
      };
    })
    .sort((a, b) => a.componentId.localeCompare(b.componentId));
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Find cross-course equivalence edges for a multi-course input.
 * @param {CrossCourseInput} input - Cross-course input with courses and optional ID prefix
 * @returns {KnowledgeSpaceEdge[]} - Array of equivalent_to edges linking nodes across courses
 */
export function findCrossCourseEquivalences(
  input: CrossCourseInput,
): KnowledgeSpaceEdge[] {
  const { courses } = input;
  const idPrefix = input.idPrefix ?? 'cross-course';

  if (courses.length < 2) return [];

  const standardLookup = buildStandardLookup(courses);

  // Collect all candidate edges from each strategy
  const candidates: Omit<KnowledgeSpaceEdge, 'id'>[] = [];

  // Strategy 1: familyKey matching (highest confidence)
  candidates.push(...matchByFamilyKey(courses, standardLookup));

  // Strategy 2: standard overlap matching
  candidates.push(...matchByStandardOverlap(courses, standardLookup));

  // Strategy 3: title/slug similarity (lowest confidence)
  candidates.push(...matchByTitle(courses));

  // Deduplicate by (sourceId, targetId, type)
  const seen = new Set<string>();
  const unique: Omit<KnowledgeSpaceEdge, 'id'>[] = [];
  for (const c of candidates) {
    const key = `${c.type}::${c.sourceId}::${c.targetId}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(c);
    }
  }

  // Sort deterministically: type → sourceId → targetId
  unique.sort(
    (a, b) =>
      `${a.type}::${a.sourceId}::${a.targetId}`.localeCompare(
        `${b.type}::${b.sourceId}::${b.targetId}`,
      ),
  );

  // Assign sequential IDs
  return unique.map((candidate, idx) => ({
    id: `${idPrefix}.edge.${String(idx + 1).padStart(4, '0')}`,
    ...candidate,
  }));
}
