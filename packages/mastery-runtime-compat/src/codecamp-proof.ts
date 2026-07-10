import {
  computeWeightedReadiness,
  validateKnowledgeSpace,
  type KnowledgeSpace,
  type KnowledgeStateEntry,
} from "@reading-advantage/knowledge-space-core";
import { getRecommendedNext } from "@reading-advantage/knowledge-space-practice";
import { mapPracticeToSrsRating } from "@reading-advantage/practice-core";
import { reviewCard, type SrsCardState } from "@reading-advantage/srs-engine";
import {
  MASTERY_PERSISTENCE_CONTRACT_VERSION,
  type CommitMasteryEvidenceInput,
  type MasteryProvenance,
} from "@reading-advantage/domain/mastery/contracts";
import { createInMemoryMasteryPersistence } from "@reading-advantage/domain/mastery/adapters/memory";
import { commitMasteryEvidence } from "@reading-advantage/domain/mastery/service";

import { runConsumerCompatibilityGate } from "./check-consumer.js";
import { runtimeManifest } from "./index.js";

const NOW = "2026-07-10T12:00:00.000Z";
const SCHOOL_ID = "11111111-1111-4111-8111-111111111111";
const STUDENT_ID = "student-codecamp-proof";
const COMMIT_OBJECTIVE = "codecamp.git.commit";
const PULL_REQUEST_OBJECTIVE = "codecamp.git.pull-request";
const PERSISTENCE_RATINGS = {
  Again: "again",
  Hard: "hard",
  Good: "good",
  Easy: "easy",
} as const;

const GRAPH: KnowledgeSpace = {
  nodes: [
    {
      id: COMMIT_OBJECTIVE,
      kind: "skill",
      title: "Create a Git commit",
      domain: "codecamp",
      sourceRefs: ["synthetic-codecamp-proof.v1"],
      reviewStatus: "approved",
      metadata: {},
      independentPracticeReady: true,
      exceptions: [
        { type: "alignment", reason: "Synthetic release fixture." },
        { type: "generator", reason: "The fixture supplies fixed evidence." },
      ],
    },
    {
      id: PULL_REQUEST_OBJECTIVE,
      kind: "skill",
      title: "Open a pull request",
      domain: "codecamp",
      sourceRefs: ["synthetic-codecamp-proof.v1"],
      reviewStatus: "approved",
      metadata: {},
      independentPracticeReady: true,
      exceptions: [
        { type: "alignment", reason: "Synthetic release fixture." },
        { type: "generator", reason: "The fixture supplies fixed evidence." },
      ],
    },
  ],
  edges: [
    {
      id: "codecamp.git.edge.commit-before-pull-request",
      type: "prerequisite_for",
      sourceId: COMMIT_OBJECTIVE,
      targetId: PULL_REQUEST_OBJECTIVE,
      weight: 1,
      confidence: "high",
      sourceRefs: ["synthetic-codecamp-proof.v1"],
      reviewStatus: "approved",
    },
  ],
};

const PROVENANCE: MasteryProvenance = {
  normativeSpecVersion: "kst-srs.v3.2",
  engineContractVersion: "mastery-runtime-0.1.0",
  graphRelease: "knowledge-space-synthetic-codecamp-proof-v1.0.0",
  configVersion: "codecamp-proof.v1",
  paramsVersion: "fsrs.synthetic.v1",
  adapterVersion: MASTERY_PERSISTENCE_CONTRACT_VERSION,
};

/** Result of the deterministic public-package Codecamp proof. */
export interface SyntheticCodecampProofResult {
  /** Compatibility status for the fixed Codecamp consumer. */
  compatibility: "pass";
  /** Whether the two-skill knowledge graph passed structural validation. */
  graphValid: true;
  /** First objective selected before any direct mastery evidence. */
  initialObjective: string;
  /** Readiness score associated with the first objective. */
  initialReadiness: number;
  /** Status of the evidence and SRS state commit. */
  commitStatus: "applied";
  /** Status returned when the same idempotency key is replayed. */
  replayStatus: "replayed";
  /** Persisted card revision after the reviewed submission. */
  cardRevision: number;
  /** Persisted objective-state revision after the reviewed submission. */
  stateRevision: number;
  /** Rating written to the immutable review record. */
  persistedReviewRating: "again" | "hard" | "good" | "easy";
  /** SRS state recorded before the independent-practice review. */
  persistedReviewBeforeState: "new" | "learning" | "review" | "relearning";
  /** SRS state recorded after the independent-practice review. */
  persistedReviewAfterState: "new" | "learning" | "review" | "relearning";
  /** Mastery read back from persistence and used for the next projection. */
  persistedMastery: number;
  /** Objective projected after the prerequisite mastery update. */
  nextObjective: string;
  /** Static boundary proof that no Codecamp application module was imported. */
  importedAppCode: false;
}

function currentConsumerDescriptor(): Record<string, unknown> {
  const release = runtimeManifest.releaseSets.find(
    (candidate) => candidate.normativeVersion === "kst-srs.v3.2",
  );
  if (!release) throw new Error("No kst-srs.v3.2 runtime release is declared.");
  return {
    name: "codecamp-advantage",
    version: "1.0.0",
    releaseSet: release.id,
    normativeVersion: release.normativeVersion,
    packages: Object.fromEntries(
      release.packages.map((entry) => [entry.name, entry.version]),
    ),
    graph: release.graph,
    contracts: release.contracts,
    persistence: release.persistence,
    fixtures: release.fixtures,
    source: release.source,
    imports: release.packages.map((entry) => ({
      package: entry.name,
      export: ".",
    })),
  };
}

function cardRecord(
  card: SrsCardState,
  revision: number,
): CommitMasteryEvidenceInput["records"]["card"] {
  return {
    id: "22222222-2222-4222-8222-222222222222",
    schoolId: SCHOOL_ID,
    studentId: STUDENT_ID,
    objectiveId: card.objectiveId,
    variantKey: card.variantKey,
    state: card.state,
    stability: card.stability,
    difficulty: card.difficulty,
    dueAt: card.dueDate,
    lastReviewedAt: card.lastReview,
    reps: card.reps,
    lapses: card.lapses,
    revision,
    paramsVersion: PROVENANCE.paramsVersion,
    createdAt: card.createdAt,
    updatedAt: card.updatedAt,
  };
}

function commandFor(
  card: SrsCardState,
  revision: number,
  idempotencyKey: string,
  suffix: "seed" | "review",
  mastery: number,
  beforeState: SrsCardState["state"],
  rating: CommitMasteryEvidenceInput["records"]["review"]["rating"],
): CommitMasteryEvidenceInput {
  const seed = suffix === "seed";
  const uuidStem = seed ? "3" : "4";
  return {
    contractVersion: MASTERY_PERSISTENCE_CONTRACT_VERSION,
    schoolId: SCHOOL_ID,
    studentId: STUDENT_ID,
    idempotencyKey,
    expectedRevisions: {
      card: seed ? null : 0,
      state: seed ? null : 0,
    },
    provenance: PROVENANCE,
    audit: {
      actorId: STUDENT_ID,
      requestId: `codecamp-proof-${suffix}`,
      sourceId: "synthetic-codecamp-proof",
      correlationId: "codecamp-proof-flow",
    },
    records: {
      card: cardRecord(card, revision),
      review: {
        id: `${uuidStem}${uuidStem}${uuidStem}${uuidStem}${uuidStem}${uuidStem}${uuidStem}${uuidStem}-${uuidStem}${uuidStem}${uuidStem}${uuidStem}-4${uuidStem}${uuidStem}${uuidStem}-8${uuidStem}${uuidStem}${uuidStem}-${uuidStem}${uuidStem}${uuidStem}${uuidStem}${uuidStem}${uuidStem}${uuidStem}${uuidStem}${uuidStem}${uuidStem}${uuidStem}${uuidStem}`,
        schoolId: SCHOOL_ID,
        cardId: "22222222-2222-4222-8222-222222222222",
        studentId: STUDENT_ID,
        submissionId: `submission-${suffix}`,
        rating,
        beforeState,
        afterState: card.state,
        evidenceReasons: [seed ? "fixture_seed" : "correct_independent_practice"],
        paramsVersion: PROVENANCE.paramsVersion,
        reviewedAt: NOW,
        createdAt: NOW,
      },
      evidence: [
        {
          id: seed
            ? "55555555-5555-4555-8555-555555555555"
            : "66666666-6666-4666-8666-666666666666",
          schoolId: SCHOOL_ID,
          studentId: STUDENT_ID,
          objectiveId: COMMIT_OBJECTIVE,
          variantKey: "git-commit.v1",
          sourceId: `submission-${suffix}`,
          evidenceOrdinal: revision,
          evidenceType: seed ? "fixture_seed" : "independent_practice",
          correctedStrength: mastery,
          practiceCoverage: seed ? 0.1 : 1,
          confidence: seed ? 0.1 : 0.95,
          attemptCount: revision + 1,
          supportMetadata: { revealSteps: 0, misconceptionTags: [] },
          provenance: PROVENANCE,
          createdAt: NOW,
        },
      ],
      state: {
        id: "77777777-7777-4777-8777-777777777777",
        schoolId: SCHOOL_ID,
        studentId: STUDENT_ID,
        objectiveId: COMMIT_OBJECTIVE,
        masteryState: seed ? "introduced" : "mastered",
        mastery,
        retention: mastery,
        evidenceConfidence: seed ? 0.1 : 0.95,
        graphRelease: PROVENANCE.graphRelease,
        revision,
        createdAt: NOW,
        updatedAt: NOW,
      },
      placement: {
        id: seed
          ? "88888888-8888-4888-8888-888888888888"
          : "99999999-9999-4999-8999-999999999999",
        schoolId: SCHOOL_ID,
        studentId: STUDENT_ID,
        objectiveId: COMMIT_OBJECTIVE,
        estimate: mastery,
        confidence: seed ? "low" : "high",
        evidenceType: seed ? "synthetic_seed" : "direct_practice",
        graphRelease: PROVENANCE.graphRelease,
        seedProvenance: PROVENANCE,
        replacedByDirectEvidence: !seed,
        createdAt: NOW,
      },
    },
  };
}

/**
 * Runs the deterministic two-skill Codecamp proof through every public runtime layer.
 * @returns Compatibility, graph, SRS, persistence, replay, and projection evidence.
 * @throws When any public contract rejects the fixed release fixture.
 */
export async function runSyntheticCodecampProof(): Promise<SyntheticCodecampProofResult> {
  const compatibility = runConsumerCompatibilityGate(currentConsumerDescriptor());
  if (!compatibility.compatible) {
    throw new Error(
      `Synthetic Codecamp consumer is incompatible: ${compatibility.issues
        .map((issue) => issue.code)
        .join(", ")}`,
    );
  }

  const graphValidation = validateKnowledgeSpace(GRAPH);
  if (!graphValidation.valid) {
    throw new Error(
      `Synthetic Codecamp graph is invalid: ${graphValidation.errors
        .map((error) => error.code)
        .join(", ")}`,
    );
  }

  const emptyState = new Map<string, KnowledgeStateEntry>();
  const commitReadiness = computeWeightedReadiness(COMMIT_OBJECTIVE, emptyState, GRAPH);
  const pullRequestReadiness = computeWeightedReadiness(
    PULL_REQUEST_OBJECTIVE,
    emptyState,
    GRAPH,
  );
  const initialObjective = getRecommendedNext(
    {
      nodes: GRAPH.nodes,
      edges: GRAPH.edges,
      readinessByNode: {
        [COMMIT_OBJECTIVE]: commitReadiness.score,
        [PULL_REQUEST_OBJECTIVE]: pullRequestReadiness.score,
      },
      goalNodeIds: [PULL_REQUEST_OBJECTIVE],
      misconceptionLinks: [],
    },
    undefined,
    1,
  )[0];
  if (!initialObjective) throw new Error("No initial Codecamp objective was projected.");

  const rating = mapPracticeToSrsRating({
    parts: [
      {
        isCorrect: true,
        hintsUsed: 0,
        revealStepsSeen: 0,
        totalRevealSteps: 0,
        misconceptionTags: [],
      },
    ],
    timingFeatures: {
      hasReliableTiming: false,
      confidence: "low",
      reasons: ["synthetic_fixture_uses_no_wall_clock"],
    },
  });
  const originalCard: SrsCardState = {
    cardId: "22222222-2222-4222-8222-222222222222",
    studentId: STUDENT_ID,
    objectiveId: COMMIT_OBJECTIVE,
    variantKey: "git-commit.v1",
    stability: 0,
    difficulty: 0,
    state: "new",
    dueDate: NOW,
    elapsedDays: 0,
    scheduledDays: 0,
    reps: 0,
    lapses: 0,
    lastReview: null,
    createdAt: NOW,
    updatedAt: NOW,
  };
  const reviewedCard = reviewCard(originalCard, rating.rating, NOW, {
    enableIntervalFuzz: false,
  });

  const persistence = createInMemoryMasteryPersistence();
  await commitMasteryEvidence(
    commandFor(
      originalCard,
      0,
      "codecamp-proof-seed",
      "seed",
      0,
      originalCard.state,
      "good",
    ),
    { persistence },
  );
  const command = commandFor(
    reviewedCard,
    1,
    "codecamp-proof-reviewed-submission",
    "review",
    0.95,
    originalCard.state,
    PERSISTENCE_RATINGS[rating.rating],
  );
  const applied = await commitMasteryEvidence(command, { persistence });
  const replayed = await commitMasteryEvidence(command, { persistence });
  if (applied.status !== "applied" || replayed.status !== "replayed") {
    throw new Error("Synthetic persistence did not apply and replay deterministically.");
  }

  const snapshot = await persistence.readSnapshot({ schoolId: SCHOOL_ID });
  const persistedState = snapshot.states.find(
    (state) =>
      state.studentId === STUDENT_ID &&
      state.objectiveId === COMMIT_OBJECTIVE &&
      state.revision === applied.stateRevision,
  );
  const persistedReview = snapshot.reviews.find(
    (review) => review.submissionId === "submission-review",
  );
  if (!persistedState || persistedState.masteryState !== "mastered") {
    throw new Error("Reviewed mastery state was not persisted as mastered.");
  }
  if (!persistedReview) {
    throw new Error("Independent-practice review was not persisted.");
  }

  const updatedState = new Map<string, KnowledgeStateEntry>([
    [
      persistedState.objectiveId,
      {
        nodeId: persistedState.objectiveId,
        mastery: persistedState.mastery,
        retention: persistedState.retention,
        isProficient: true,
        state: "mastered",
      },
    ],
  ]);
  const nextReadiness = computeWeightedReadiness(
    PULL_REQUEST_OBJECTIVE,
    updatedState,
    GRAPH,
  );
  const nextObjective = getRecommendedNext(
    {
      nodes: GRAPH.nodes.filter((node) => node.id === PULL_REQUEST_OBJECTIVE),
      edges: GRAPH.edges,
      readinessByNode: { [PULL_REQUEST_OBJECTIVE]: nextReadiness.score },
      goalNodeIds: [PULL_REQUEST_OBJECTIVE],
      misconceptionLinks: [],
    },
    undefined,
    1,
  )[0];
  if (!nextObjective) throw new Error("No next Codecamp objective was projected.");

  return {
    compatibility: "pass",
    graphValid: true,
    initialObjective,
    initialReadiness: commitReadiness.score,
    commitStatus: applied.status,
    replayStatus: replayed.status,
    cardRevision: applied.cardRevision,
    stateRevision: applied.stateRevision,
    persistedReviewRating: persistedReview.rating,
    persistedReviewBeforeState: persistedReview.beforeState,
    persistedReviewAfterState: persistedReview.afterState,
    persistedMastery: persistedState.mastery,
    nextObjective,
    importedAppCode: false,
  };
}
