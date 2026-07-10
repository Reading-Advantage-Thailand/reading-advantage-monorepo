// Domain-neutral knowledge-space.v1 TypeScript types

export type NodeKind =
  | 'domain'
  | 'content_group'
  | 'instructional_unit'
  | 'standard'
  | 'skill'
  | 'concept'
  | 'worked_example'
  | 'task_blueprint'
  | 'generator'
  | 'renderer'
  | 'misconception';

export type EdgeType =
  | 'contains'
  | 'appears_in_context'
  | 'aligned_to_standard'
  | 'prerequisite_for'
  | 'supports'
  | 'extends'
  | 'equivalent_to'
  | 'transfers_to'
  | 'common_misconception_with'
  | 'rendered_by'
  | 'generated_by'
  | 'evidenced_by'
  | 'remediated_by';

export type ConfidenceLevel = 'low' | 'medium' | 'high';

export type ReviewStatus = 'draft' | 'reviewed' | 'approved' | 'rejected';

export type ExceptionType = 'alignment' | 'generator' | 'source' | 'other';

export interface SourceRef {
  source: string;
  location?: string;
  url?: string;
  note?: string;
}

export interface Exception {
  type: ExceptionType;
  reason: string;
  reviewer?: string;
  date?: string;
}

export interface KnowledgeSpaceNode {
  id: string;
  kind: NodeKind;
  title: string;
  domain: string;
  description?: string;
  sourceRefs?: Array<SourceRef | string>;
  derived?: boolean;
  derivationMethod?: string;
  reviewStatus: ReviewStatus;
  metadata: Record<string, unknown>;
  difficulty?: number;
  alignmentRefs?: string[];
  rendererKey?: string;
  generatorKey?: string;
  independentPracticeReady?: boolean;
  exceptions?: Exception[];
}

export interface KnowledgeSpaceEdge {
  id: string;
  type: EdgeType;
  sourceId: string;
  targetId: string;
  weight: number;
  confidence: ConfidenceLevel;
  sourceRefs?: Array<SourceRef | string>;
  derived?: boolean;
  derivationMethod?: string;
  reviewStatus: ReviewStatus;
  rationale?: string;
  metadata?: Record<string, unknown>;
}

export interface KnowledgeSpace {
  nodes: KnowledgeSpaceNode[];
  edges: KnowledgeSpaceEdge[];
}

export interface DomainAdapter {
  domain: string;
  validateNodeMetadata: (node: KnowledgeSpaceNode) => { valid: boolean; errors?: string[] };
}

export interface ValidationError {
  code: string;
  message: string;
  nodeId?: string;
  edgeId?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}
