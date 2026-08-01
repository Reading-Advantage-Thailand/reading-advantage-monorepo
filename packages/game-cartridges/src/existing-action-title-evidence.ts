import { EXISTING_ACTION_EVIDENCE_FIXTURE } from "./existing-action-cutover.evidence.types.js";
import type { ExistingActionTitleEvidenceFixture } from "./existing-action-cutover.evidence.types.js";

/** Returns one title's digest-pinned action evidence fixture. */
function title(publicId: string): ExistingActionTitleEvidenceFixture {
  const fixture = EXISTING_ACTION_EVIDENCE_FIXTURE.titles.find((candidate) => candidate.publicId === publicId);
  if (!fixture) throw new Error(`Existing Action evidence fixture is missing ${publicId}`);
  return Object.freeze(fixture);
}

/** Exact evidence fixture for Archer's Revenge. */
export const ARCHERS_REVENGE_TITLE_EVIDENCE = title("archers-revenge");
/** Exact evidence fixture for Paladin's Twin-Soul. */
export const PALADINS_TWIN_SOUL_TITLE_EVIDENCE = title("paladins-twin-soul");
/** Exact evidence fixture for Griffin Sky-Joust. */
export const GRIFFIN_SKY_JOUST_TITLE_EVIDENCE = title("griffin-sky-joust");
/** Exact evidence fixture for Gryphon Patrol. */
export const GRYPHON_PATROL_TITLE_EVIDENCE = title("gryphon-patrol");
/** Exact evidence fixture for Realm Carver. */
export const REALM_CARVER_TITLE_EVIDENCE = title("realm-carver");

/** Ordered five-title evidence source used solely by Existing Action candidates and `/qc`. */
export const EXISTING_ACTION_TITLE_EVIDENCE: readonly ExistingActionTitleEvidenceFixture[] = Object.freeze([
  ARCHERS_REVENGE_TITLE_EVIDENCE,
  PALADINS_TWIN_SOUL_TITLE_EVIDENCE,
  GRIFFIN_SKY_JOUST_TITLE_EVIDENCE,
  GRYPHON_PATROL_TITLE_EVIDENCE,
  REALM_CARVER_TITLE_EVIDENCE,
]);
