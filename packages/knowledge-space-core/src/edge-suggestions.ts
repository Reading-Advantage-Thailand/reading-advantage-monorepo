// Deterministic edge suggestion from knowledge-space node inventories
//
// Derives containment, placement, prerequisite, and support edges from node
// ID patterns and metadata. All outputs are sorted deterministically so the
// same input always produces the same edges in the same order.

import type {
  KnowledgeSpaceNode,
  KnowledgeSpaceEdge,
  ConfidenceLevel,
} from './types.js';

export interface EdgeSuggestionInput {
  nodes: KnowledgeSpaceNode[];
  coursePrefix: string;
  idPrefix?: string;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

type EdgeCandidate = Omit<KnowledgeSpaceEdge, 'id'>;

/**
 * Build a deterministic sort key from an edge candidate's type, source, and target.
 * @param {EdgeCandidate} e - The edge candidate to build a key for
 * @returns {string} - Composite sort key string
 */
function sortKey(e: EdgeCandidate): string {
  return `${e.type}::${e.sourceId}::${e.targetId}`;
}

/**
 * Create an edge candidate with all required fields and optional metadata.
 * @param {KnowledgeSpaceEdge['type']} type - The edge type
 * @param {string} sourceId - Source node ID
 * @param {string} targetId - Target node ID
 * @param {number} weight - Edge weight between 0 and 1
 * @param {ConfidenceLevel} confidence - Confidence level for the edge
 * @param {boolean} derived - Whether the edge is derived
 * @param {string} derivationMethod - Method used to derive the edge
 * @param {string} rationale - Optional human-readable rationale
 * @param {Record<string, unknown>} metadata - Optional metadata record
 * @returns {EdgeCandidate} - A fully populated edge candidate
 */
function makeCandidate(
  type: KnowledgeSpaceEdge['type'],
  sourceId: string,
  targetId: string,
  weight: number,
  confidence: ConfidenceLevel,
  derived: boolean,
  derivationMethod: string,
  rationale?: string,
  metadata?: Record<string, unknown>,
): EdgeCandidate {
  const base: EdgeCandidate = {
    type,
    sourceId,
    targetId,
    weight,
    confidence,
    reviewStatus: 'draft',
    derived,
    derivationMethod,
  };
  if (rationale) base.rationale = rationale;
  if (metadata) base.metadata = metadata;
  return base;
}

// ---------------------------------------------------------------------------
// Node grouping helpers
// ---------------------------------------------------------------------------

type NodesByModule = Map<string, KnowledgeSpaceNode[]>;

/**
 * Group nodes by a metadata-derived key, filtered to specific node kinds.
 * @param {KnowledgeSpaceNode[]} nodes - All nodes to filter and group
 * @param {KnowledgeSpaceNode['kind'][]} kinds - Node kinds to include
 * @param {(n: KnowledgeSpaceNode) => string | undefined} keyFn - Function extracting the grouping key from a node
 * @returns {Map<string, KnowledgeSpaceNode[]>} - Map from key to arrays of matching nodes
 */
function groupByMeta(
  nodes: KnowledgeSpaceNode[],
  kinds: KnowledgeSpaceNode['kind'][],
  keyFn: (n: KnowledgeSpaceNode) => string | undefined,
): Map<string, KnowledgeSpaceNode[]> {
  const map = new Map<string, KnowledgeSpaceNode[]>();
  const kindSet = new Set<KnowledgeSpaceNode['kind']>(kinds);
  for (const node of nodes) {
    if (!kindSet.has(node.kind)) continue;
    const key = keyFn(node);
    if (key === undefined) continue;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(node);
  }
  return map;
}

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

// ---------------------------------------------------------------------------
// Edge suggestion generators
// ---------------------------------------------------------------------------

/**
 * Suggest contains edges based on hierarchical node relationships (domain, modules, lessons, skills).
 * @param {KnowledgeSpaceNode[]} nodes - All nodes in the knowledge space
 * @returns {EdgeCandidate[]} - Array of containment edge candidates
 */
function suggestContainmentEdges(
  nodes: KnowledgeSpaceNode[],
): EdgeCandidate[] {
  const candidates: EdgeCandidate[] = [];
  const domain = nodes.find((n) => n.kind === 'domain');
  const modules = nodes.filter((n) => n.kind === 'content_group');
  const lessons = nodes.filter((n) => n.kind === 'instructional_unit');
  const skills = nodes.filter((n) => n.kind === 'skill');
  const concepts = nodes.filter((n) => n.kind === 'concept');
  const examples = nodes.filter((n) => n.kind === 'worked_example');

  const METHOD = 'lesson-sequence-containment-v1';

  // domain → module
  if (domain) {
    for (const mod of modules) {
      candidates.push(makeCandidate(
        'contains', domain.id, mod.id, 1.0, 'high', true, METHOD,
        `Domain contains ${mod.title}`,
        { course: metaStr(mod, 'course'), module: metaStr(mod, 'module') },
      ));
    }
  }

  // Build module id → node map for lookup
  const modulesByKey = new Map<string, KnowledgeSpaceNode>();
  for (const mod of modules) {
    const modNum = metaStr(mod, 'module');
    if (modNum) modulesByKey.set(modNum, mod);
  }

  // Build lesson (module+lesson) → node map
  const lessonsByKey = new Map<string, KnowledgeSpaceNode>();
  for (const lesson of lessons) {
    const modNum = metaStr(lesson, 'module');
    const lesNum = metaStr(lesson, 'lesson');
    if (modNum && lesNum) lessonsByKey.set(`${modNum}.${lesNum}`, lesson);
  }

  // module → lesson
  for (const lesson of lessons) {
    const modNum = metaStr(lesson, 'module');
    if (!modNum) continue;
    const mod = modulesByKey.get(modNum);
    if (!mod) continue;
    candidates.push(makeCandidate(
      'contains', mod.id, lesson.id, 1.0, 'high', true, METHOD,
      `Module ${modNum} contains lesson`,
      { module: modNum },
    ));
  }

  // lesson → skill
  for (const skill of skills) {
    const modNum = metaStr(skill, 'module');
    const lesNum = metaStr(skill, 'lesson');
    if (!modNum || !lesNum) continue;
    const lesson = lessonsByKey.get(`${modNum}.${lesNum}`);
    if (!lesson) continue;
    candidates.push(makeCandidate(
      'contains', lesson.id, skill.id, 1.0, 'high', true, METHOD,
      `Lesson contains skill`,
      { module: modNum, lesson: lesNum },
    ));
  }

  // module → concept (ALEKS concepts belong to a module, not a specific lesson)
  for (const concept of concepts) {
    const modNum = metaStr(concept, 'module');
    if (!modNum) continue;
    const mod = modulesByKey.get(modNum);
    if (!mod) continue;
    candidates.push(makeCandidate(
      'contains', mod.id, concept.id, 1.0, 'high', true, METHOD,
      `Module ${modNum} contains concept`,
      { module: modNum },
    ));
  }

  // lesson → worked_example
  for (const example of examples) {
    const modNum = metaStr(example, 'module');
    const lesNum = metaStr(example, 'lesson');
    if (!modNum || !lesNum) continue;
    const lesson = lessonsByKey.get(`${modNum}.${lesNum}`);
    if (!lesson) continue;
    candidates.push(makeCandidate(
      'contains', lesson.id, example.id, 1.0, 'high', true, METHOD,
      `Lesson contains worked example`,
      { module: modNum, lesson: lesNum },
    ));
  }

  return candidates;
}

/**
 * Suggest appears_in_context edges linking skills and examples to their lessons.
 * @param {KnowledgeSpaceNode[]} nodes - All nodes in the knowledge space
 * @returns {EdgeCandidate[]} - Array of placement edge candidates
 */
function suggestPlacementEdges(
  nodes: KnowledgeSpaceNode[],
): EdgeCandidate[] {
  const candidates: EdgeCandidate[] = [];
  const METHOD = 'lesson-sequence-placement-v1';

  const lessons = nodes.filter((n) => n.kind === 'instructional_unit');
  const modules = nodes.filter((n) => n.kind === 'content_group');
  const skills = nodes.filter((n) => n.kind === 'skill');
  const concepts = nodes.filter((n) => n.kind === 'concept');
  const examples = nodes.filter((n) => n.kind === 'worked_example');

  const lessonsByKey = new Map<string, KnowledgeSpaceNode>();
  for (const lesson of lessons) {
    const modNum = metaStr(lesson, 'module');
    const lesNum = metaStr(lesson, 'lesson');
    if (modNum && lesNum) lessonsByKey.set(`${modNum}.${lesNum}`, lesson);
  }

  const modulesByKey = new Map<string, KnowledgeSpaceNode>();
  for (const mod of modules) {
    const modNum = metaStr(mod, 'module');
    if (modNum) modulesByKey.set(modNum, mod);
  }

  // skill → lesson
  for (const skill of skills) {
    const modNum = metaStr(skill, 'module');
    const lesNum = metaStr(skill, 'lesson');
    if (!modNum || !lesNum) continue;
    const lesson = lessonsByKey.get(`${modNum}.${lesNum}`);
    if (!lesson) continue;
    candidates.push(makeCandidate(
      'appears_in_context', skill.id, lesson.id, 0.75, 'medium', true, METHOD,
      `Skill appears in lesson context`,
      { module: modNum, lesson: lesNum },
    ));
  }

  // concept → module (ALEKS concepts appear in module context, not a specific lesson)
  for (const concept of concepts) {
    const modNum = metaStr(concept, 'module');
    if (!modNum) continue;
    const mod = modulesByKey.get(modNum);
    if (!mod) continue;
    candidates.push(makeCandidate(
      'appears_in_context', concept.id, mod.id, 0.75, 'medium', true, METHOD,
      `Concept appears in module context`,
      { module: modNum },
    ));
  }

  // worked_example → lesson
  for (const example of examples) {
    const modNum = metaStr(example, 'module');
    const lesNum = metaStr(example, 'lesson');
    if (!modNum || !lesNum) continue;
    const lesson = lessonsByKey.get(`${modNum}.${lesNum}`);
    if (!lesson) continue;
    candidates.push(makeCandidate(
      'appears_in_context', example.id, lesson.id, 0.75, 'medium', true, METHOD,
      `Worked example appears in lesson context`,
      { module: modNum, lesson: lesNum },
    ));
  }

  return candidates;
}

/**
 * Suggest low-confidence prerequisite_for edges based on lesson sequence ordering.
 * @param {KnowledgeSpaceNode[]} nodes - All nodes in the knowledge space
 * @returns {EdgeCandidate[]} - Array of prerequisite edge candidates
 */
function suggestPrerequisiteEdges(
  nodes: KnowledgeSpaceNode[],
): EdgeCandidate[] {
  const candidates: EdgeCandidate[] = [];
  const METHOD = 'lesson-sequence-prerequisite-v1';

  const skills = nodes.filter((n) => n.kind === 'skill');

  // Group skills by (module, lesson) → sorted list
  const skillsByLesson = new Map<string, KnowledgeSpaceNode[]>();
  for (const skill of skills) {
    const modNum = metaStr(skill, 'module');
    const lesNum = metaStr(skill, 'lesson');
    if (!modNum || !lesNum) continue;
    const key = `${modNum}.${lesNum}`;
    if (!skillsByLesson.has(key)) skillsByLesson.set(key, []);
    skillsByLesson.get(key)!.push(skill);
  }

  // Sort lesson keys: first by module number, then by lesson number
  const lessonKeys = [...skillsByLesson.keys()].sort((a, b) => {
    const [am, al] = a.split('.').map(Number);
    const [bm, bl] = b.split('.').map(Number);
    return am !== bm ? am - bm : al - bl;
  });

  // For each pair of consecutive lessons, link last skill of earlier lesson
  // to first skill of later lesson (low-confidence sequential chain)
  for (let i = 0; i < lessonKeys.length - 1; i++) {
    const currKey = lessonKeys[i];
    const nextKey = lessonKeys[i + 1];
    const currSkills = [...(skillsByLesson.get(currKey) ?? [])].sort((a, b) =>
      a.id.localeCompare(b.id),
    );
    const nextSkills = [...(skillsByLesson.get(nextKey) ?? [])].sort((a, b) =>
      a.id.localeCompare(b.id),
    );
    if (currSkills.length === 0 || nextSkills.length === 0) continue;

    // Link the last skill of currLesson to the first skill of nextLesson
    const source = currSkills[currSkills.length - 1];
    const target = nextSkills[0];

    const [cm, cl] = currKey.split('.');
    const [nm, nl] = nextKey.split('.');
    const transitionNote = cm === nm
      ? `lesson ${cl} precedes lesson ${nl} in module ${cm}`
      : `last lesson of module ${cm} precedes first lesson of module ${nm}`;

    candidates.push(makeCandidate(
      'prerequisite_for', source.id, target.id, 0.5, 'low', true, METHOD,
      `Lesson-sequence prerequisite: ${transitionNote}`,
      { fromLesson: currKey, toLesson: nextKey },
    ));
  }

  return candidates;
}

/**
 * Suggest supports edges from concepts to skills within the same module.
 * @param {KnowledgeSpaceNode[]} nodes - All nodes in the knowledge space
 * @returns {EdgeCandidate[]} - Array of support edge candidates
 */
function suggestSupportEdges(
  nodes: KnowledgeSpaceNode[],
): EdgeCandidate[] {
  const candidates: EdgeCandidate[] = [];
  const METHOD = 'concept-supports-skill-v1';

  const concepts = nodes.filter((n) => n.kind === 'concept');
  // Group skills by module
  const skillsByModule = groupByMeta(nodes, ['skill'], (n) =>
    metaStr(n, 'module'),
  ) as NodesByModule;

  // Each concept supports all skills in the same module
  for (const concept of concepts) {
    const modNum = metaStr(concept, 'module');
    if (!modNum) continue;
    const modSkills = (skillsByModule.get(modNum) ?? []).sort((a, b) =>
      a.id.localeCompare(b.id),
    );
    for (const skill of modSkills) {
      candidates.push(makeCandidate(
        'supports', concept.id, skill.id, 0.75, 'medium', true, METHOD,
        `ALEKS concept supports lesson-level skill in module ${modNum}`,
        { module: modNum },
      ));
    }
  }

  return candidates;
}

// ---------------------------------------------------------------------------
// Task 2.5 — Intra-course equivalence suggestions
// ---------------------------------------------------------------------------

/**
 * Suggest intra-course equivalent_to edges between concepts sharing a familyKey.
 * @param {KnowledgeSpaceNode[]} nodes - All nodes in the knowledge space
 * @returns {EdgeCandidate[]} - Array of equivalence edge candidates
 */
function suggestEquivalenceEdges(
  nodes: KnowledgeSpaceNode[],
): EdgeCandidate[] {
  const candidates: EdgeCandidate[] = [];
  const METHOD = 'intra-course-equivalence-v1';

  // Detect concepts sharing the same familyKey within the same course
  const concepts = nodes.filter((n) => n.kind === 'concept');
  const byFamilyKey = new Map<string, KnowledgeSpaceNode[]>();
  for (const concept of concepts) {
    const fk = metaStr(concept, 'familyKey');
    if (!fk) continue;
    if (!byFamilyKey.has(fk)) byFamilyKey.set(fk, []);
    byFamilyKey.get(fk)!.push(concept);
  }

  for (const group of byFamilyKey.values()) {
    if (group.length < 2) continue;
    const sorted = [...group].sort((a, b) => a.id.localeCompare(b.id));
    for (let i = 0; i < sorted.length - 1; i++) {
      candidates.push(makeCandidate(
        'equivalent_to', sorted[i].id, sorted[i + 1].id, 0.5, 'low', true, METHOD,
        `Concepts share familyKey — potential intra-course equivalent pair`,
        { familyKey: metaStr(sorted[i], 'familyKey') },
      ));
    }
  }

  return candidates;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate deterministic edge suggestions from a set of knowledge-space nodes.
 * @param {EdgeSuggestionInput} input - Nodes, course prefix, and optional ID prefix
 * @returns {KnowledgeSpaceEdge[]} - Deterministically ordered and deduplicated edge suggestions
 */
export function suggestEdges(input: EdgeSuggestionInput): KnowledgeSpaceEdge[] {
  const { nodes, coursePrefix } = input;
  const idPrefix = input.idPrefix ?? coursePrefix;

  // Collect all candidate edges from each rule
  const candidates: EdgeCandidate[] = [
    ...suggestContainmentEdges(nodes),
    ...suggestPlacementEdges(nodes),
    ...suggestPrerequisiteEdges(nodes),
    ...suggestSupportEdges(nodes),
    ...suggestEquivalenceEdges(nodes),
  ];

  // Deduplicate by (type, sourceId, targetId)
  const seen = new Set<string>();
  const unique: EdgeCandidate[] = [];
  for (const c of candidates) {
    const key = sortKey(c);
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(c);
    }
  }

  // Sort deterministically: type → sourceId → targetId
  unique.sort((a, b) => sortKey(a).localeCompare(sortKey(b)));

  // Assign sequential IDs
  return unique.map((candidate, idx) => ({
    id: `${idPrefix}.edge.${String(idx + 1).padStart(4, '0')}`,
    ...candidate,
  }));
}
