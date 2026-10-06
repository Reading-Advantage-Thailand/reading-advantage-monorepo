/**
 * The objective key in code (track primary_objective_tags_20261006, FR-1) and the parser of the
 * Workbooks tags export (FR-2).
 */
import { graphReleaseSchema, tagsExportSchema, type KeyDrift, type ObjectiveKeyEntry, type ParsedTagsExport } from "./contracts.js";
import { GRAPH_RELEASE, OBJECTIVE_KEY } from "./objective-key.data.js";

let byId: Map<string, ObjectiveKeyEntry> | null = null;

/**
 * The objective key indexed by short id.
 * @returns A map from short id to entry, built once.
 */
export function objectiveKeyById(): ReadonlyMap<string, ObjectiveKeyEntry> {
  byId ??= new Map(OBJECTIVE_KEY.map((entry) => [entry.shortId, entry]));
  return byId;
}

/**
 * Resolves a Workbooks short id to its objective.
 * @param shortId The short id, for example `R17.2`.
 * @returns The objective with its GSE node.
 * @throws When the short id is not in the key.
 */
export function resolveObjective(shortId: string): ObjectiveKeyEntry {
  const entry = objectiveKeyById().get(shortId);
  if (!entry) throw new Error(`Unknown objective short id "${shortId}"`);
  return entry;
}

/**
 * Parses a tags export and compares its header key with the key in code.
 * @param value The parsed JSON of `content/primary/tags.json`.
 * @returns The packages, the graph releases, and the header drift.
 * @throws ZodError when the file is malformed or a package uses a short id the header lacks.
 */
export function parseTagsExport(value: unknown): ParsedTagsExport {
  const file = tagsExportSchema.parse(value);
  const key = objectiveKeyById();
  const keyDrift: KeyDrift[] = [];
  const unknownToCode: string[] = [];
  for (const [shortId, header] of Object.entries(file.objectiveKey)) {
    const code = key.get(shortId);
    if (!code) unknownToCode.push(shortId);
    else if (code.nodeId !== header.nodeId) keyDrift.push({ shortId, exportNodeId: header.nodeId, codeNodeId: code.nodeId });
  }
  const graphRelease = graphReleaseSchema.parse({
    gse: { file: file.graphs.gse.file, commit: file.graphs.gse.commit, schemaVersion: file.graphs.gse.schemaVersion },
    vocabulary: { file: file.graphs.vocabulary.file, commit: file.graphs.vocabulary.commit, schemaVersion: file.graphs.vocabulary.schemaVersion },
  });
  return { graphRelease, packages: file.packages, keyDrift, unknownToCode };
}

export { GRAPH_RELEASE, OBJECTIVE_KEY };
