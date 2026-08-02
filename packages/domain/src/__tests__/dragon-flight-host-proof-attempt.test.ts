import { createHash, createHmac } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

import * as hostProof from "../games/host-proof.js";

const SIGNING_SECRET = "dragon-flight-host-proof-test-secret-at-least-32-bytes";
const NOW = "2026-08-01T00:00:00.000Z";
const EXPIRES_AT = "2026-08-01T00:10:00.000Z";

/**
 * Calculates the protocol digest used by signed checkpoint claims.
 * @param value JSON-safe checkpoint input.
 * @returns Lowercase SHA-256 digest matching the domain checkpoint protocol.
 */
function checkpointDigest(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

/**
 * Mints one test-only checkpoint using the known fixture signing secret.
 * @param claims Exact checkpoint claims to serialize and sign.
 * @returns A valid opaque checkpoint for completion-side negative controls.
 */
function signCheckpointFixture(claims: Record<string, unknown>): string {
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  const signature = createHmac("sha256", SIGNING_SECRET).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

const actor = Object.freeze({
  userId: "user-1",
  schoolId: "school-1",
});

const vocabularyInput = Object.freeze([
  Object.freeze({ term: "dragon", translation: "drago" }),
]);

type DragonFlightAction =
  | { sequence: number; kind: "choose-gate"; gate: "left" | "right"; elapsedMs: number }
  | { sequence: number; kind: "launch"; elapsedMs: number };

interface IssuedAttempt {
  attemptId: string;
  credential: string;
  input: readonly { term: string; translation: string }[];
  expiresAt: string;
}

interface DerivedCompletion {
  xpEarned: number;
  score: number;
  accuracy: number;
  correctAnswers: number;
  totalAttempts: number;
  duration: number;
  victory: boolean;
  duplicate: boolean;
}

/** Server-owned completion facts reread after a generic persistence duplicate. */
interface CanonicalCompletion {
  xpEarned: number;
  score: number;
  accuracy: number;
  correctAnswers: number;
  totalAttempts: number;
  duration: number;
  victory: boolean;
}

const verifiedCanonicalCompletion: CanonicalCompletion = Object.freeze({
  xpEarned: 5,
  score: 100,
  accuracy: 1,
  correctAnswers: 1,
  totalAttempts: 1,
  duration: 700,
  victory: true,
});

interface AttemptDependencies {
  secret: string;
  gateToLaunchDwellMs: number;
  now: () => string;
  createAttemptId: () => string;
  loadVocabularyInput: (input: {
    userId: string;
    schoolId: string;
    gameType: "dragon-flight";
    difficulty: "easy" | "medium" | "hard" | "extreme";
  }) => Promise<readonly { term: string; translation: string }[]>;
  recordCompletion: (input: {
    gameType: "dragon-flight";
    difficulty: "easy" | "medium" | "hard" | "extreme";
    score: number;
    accuracy: number;
    correctAnswers: number;
    totalAttempts: number;
    duration: number;
    victory: boolean;
    idempotencyKey: string;
  }) => Promise<{ xpEarned: number; duplicate: boolean }>;
  readCanonicalCompletion: (input: {
    attemptId: string;
    userId: string;
    schoolId: string;
    gameType: "dragon-flight";
    difficulty: "easy" | "medium" | "hard" | "extreme";
  }) => Promise<CanonicalCompletion | null>;
  store: {
    begin(input: {
      attemptId: string;
      userId: string;
      schoolId: string;
      transcriptDigest: string;
      expiresAt: string;
    }): Promise<
      | { kind: "execute"; claimId: string }
      | { kind: "recover"; claimId: string }
      | { kind: "replay"; result: DerivedCompletion }
      | { kind: "conflict" }
    >;
    lookupRecovery(input: {
      attemptId: string;
      userId: string;
      schoolId: string;
      transcriptDigest: string;
      expiresAt: string;
    }): Promise<
      | { kind: "missing" }
      | { kind: "conflict" }
      | { kind: "pending"; claimId: string }
      | { kind: "replay"; result: DerivedCompletion }
    >;
    complete(claimId: string, result: DerivedCompletion): Promise<void>;
    abandon?(claimId: string): Promise<void>;
  };
}

type IssueDragonFlightAttempt = (
  actor: typeof actor,
  input: unknown,
  dependencies: AttemptDependencies,
) => Promise<IssuedAttempt>;

type CompleteDragonFlightAttempt = (
  actor: typeof actor,
  input: unknown,
  dependencies: AttemptDependencies,
) => Promise<DerivedCompletion>;
type AttestDragonFlightAction = (
  actor: typeof actor,
  input: unknown,
  dependencies: AttemptDependencies,
) => Promise<{ checkpoint: string }>;

/**
 * Retrieves an expected public domain operation with a failure that names the
 * missing contract instead of silently testing the legacy completion path.
 * @param name The required host-proof domain export.
 * @returns The typed operation once it is implemented.
 */
function requiredOperation<T>(name: string): T {
  const candidate = (hostProof as Record<string, unknown>)[name];
  expect(candidate, `expected ${name} to be exported from games/host-proof`).toEqual(
    expect.any(Function),
  );
  return candidate as T;
}

/**
 * Creates a deterministic dependency seam for the server-owned credential,
 * input, replay claim, and persistence boundaries.
 * @returns Dependency fakes plus spies used by one host-proof attempt test.
 */
function createDependencies(): AttemptDependencies & {
  recordCompletion: ReturnType<typeof vi.fn>;
  readCanonicalCompletion: ReturnType<typeof vi.fn>;
  loadVocabularyInput: ReturnType<typeof vi.fn>;
  store: AttemptDependencies["store"] & {
    begin: ReturnType<typeof vi.fn>;
    lookupRecovery: ReturnType<typeof vi.fn>;
    complete: ReturnType<typeof vi.fn>;
    abandon: ReturnType<typeof vi.fn>;
  };
} {
  const recordCompletion = vi.fn(async (input) => ({
    xpEarned:
      input.correctAnswers
      + (input.accuracy === 1 ? 2 : 0)
      + (input.victory ? 1 : 0)
      + (input.duration < 60_000 ? 1 : 0),
    duplicate: false,
  }));
  const readCanonicalCompletion = vi.fn(async () => verifiedCanonicalCompletion);
  const loadVocabularyInput = vi.fn(async () => vocabularyInput);
  const begin = vi.fn(async () => ({ kind: "execute" as const, claimId: "claim-1" }));
  const lookupRecovery = vi.fn(async () => ({ kind: "missing" as const }));
  const complete = vi.fn(async () => undefined);
  const abandon = vi.fn(async () => undefined);
  return {
    secret: SIGNING_SECRET,
    gateToLaunchDwellMs: 250,
    now: () => NOW,
    createAttemptId: () => "11111111-1111-1111-1111-111111111111",
    loadVocabularyInput,
    recordCompletion,
    readCanonicalCompletion,
    store: { begin, lookupRecovery, complete, abandon },
  };
}

/**
 * Supplies deterministic server-observed times without trusting any client timestamp.
 * @param dependencies Existing dependency fakes whose persistence spies remain shared.
 * @param timestamps Ordered server timestamps consumed by action observation and completion.
 * @returns Dependencies with a deterministic server clock.
 */
function withServerTimes(
  dependencies: AttemptDependencies,
  timestamps: readonly string[],
): AttemptDependencies {
  let index = 0;
  return {
    ...dependencies,
    now: () => timestamps[Math.min(index++, timestamps.length - 1)] ?? NOW,
  };
}

/**
 * Obtains the server-observed checkpoint chain for one complete ordered action transcript.
 * @param issued Server-issued attempt whose credential binds the action observations.
 * @param actions Runtime actions to submit one at a time to the observation command.
 * @param dependencies Server dependency fakes with a controlled clock.
 * @returns The exact ordered checkpoints required by completion.
 */
async function createActionCheckpointChain(
  issued: IssuedAttempt,
  actions: readonly DragonFlightAction[],
  dependencies: AttemptDependencies,
): Promise<string[]> {
  const attest = requiredOperation<AttestDragonFlightAction>(
    "attestDragonFlightHostProofAction",
  );
  const checkpoints: string[] = [];
  for (const action of actions) {
    const observed = await attest(actor, {
      attemptId: issued.attemptId,
      credential: issued.credential,
      action,
      ...(checkpoints.length === 0 ? {} : { previousCheckpoint: checkpoints.at(-1) }),
    }, dependencies);
    checkpoints.push(observed.checkpoint);
  }
  return checkpoints;
}

/**
 * Builds one verified Dragon Flight completion request using only server-issued checkpoints.
 * @param issued Server-issued attempt that owns the credential and persistence identity.
 * @param dependencies Dependency fakes with a deterministic server clock.
 * @returns A completion request whose idempotency key is the signed attempt identifier.
 */
async function createVerifiedCompletionRequest(
  issued: IssuedAttempt,
  dependencies: AttemptDependencies,
): Promise<{
  attemptId: string;
  credential: string;
  idempotencyKey: string;
  actions: DragonFlightAction[];
  checkpoints: string[];
}> {
  const actions: DragonFlightAction[] = [
    { sequence: 1, kind: "choose-gate", gate: "right", elapsedMs: 400 },
    { sequence: 2, kind: "launch", elapsedMs: 700 },
  ];
  return {
    attemptId: issued.attemptId,
    credential: issued.credential,
    idempotencyKey: issued.attemptId,
    actions,
    checkpoints: await createActionCheckpointChain(issued, actions, dependencies),
  };
}

/**
 * Creates a valid pre-expiry proof transcript whose completion request arrives after its TTL.
 * @param dependencies Test doubles for the signed attempt and durable persistence seams.
 * @returns The issued attempt, signed request, and controlled clock at expiry-plus-one-minute.
 */
async function createExpiredCompletionRequest(
  dependencies: AttemptDependencies,
): Promise<{
  readonly issued: IssuedAttempt;
  readonly request: Awaited<ReturnType<typeof createVerifiedCompletionRequest>>;
  readonly timedDependencies: AttemptDependencies;
}> {
  const issue = requiredOperation<IssueDragonFlightAttempt>(
    "issueDragonFlightHostProofAttempt",
  );
  const issued = await issue(actor, {
    gameType: "dragon-flight",
    difficulty: "medium",
  }, dependencies);
  const timedDependencies = withServerTimes(dependencies, [
    "2026-08-01T00:00:00.300Z",
    "2026-08-01T00:00:00.600Z",
    "2026-08-01T00:11:00.000Z",
  ]);
  return {
    issued,
    request: await createVerifiedCompletionRequest(issued, timedDependencies),
    timedDependencies,
  };
}

describe("Dragon Flight server-issued host-proof attempts", () => {
  it("issues only a server-owned vocabulary input and a short-lived signed credential", async () => {
    const issue = requiredOperation<IssueDragonFlightAttempt>(
      "issueDragonFlightHostProofAttempt",
    );
    const dependencies = createDependencies();

    const issued = await issue(actor, {
      gameType: "dragon-flight",
      difficulty: "medium",
    }, dependencies);

    expect(dependencies.loadVocabularyInput).toHaveBeenCalledWith({
      ...actor,
      gameType: "dragon-flight",
      difficulty: "medium",
    });
    expect(issued).toMatchObject({
      attemptId: "11111111-1111-1111-1111-111111111111",
      input: vocabularyInput,
      expiresAt: EXPIRES_AT,
    });
    expect(issued.credential).toMatch(/^[^.]+\.[^.]+$/);
    expect(issued.credential).not.toContain("drago");
  });

  it("rejects client-supplied vocabulary or completion fields while issuing an attempt", async () => {
    const issue = requiredOperation<IssueDragonFlightAttempt>(
      "issueDragonFlightHostProofAttempt",
    );
    const dependencies = createDependencies();

    await expect(issue(actor, {
      gameType: "dragon-flight",
      difficulty: "medium",
      vocabularyInput,
      score: 99_999,
      xp: 99_999,
    }, dependencies)).rejects.toThrow();
    expect(dependencies.loadVocabularyInput).not.toHaveBeenCalled();
  });

  it("derives Dragon Flight score, accuracy, duration, and XP from the signed attempt transcript", async () => {
    const issue = requiredOperation<IssueDragonFlightAttempt>(
      "issueDragonFlightHostProofAttempt",
    );
    const completeAttempt = requiredOperation<CompleteDragonFlightAttempt>(
      "completeDragonFlightHostProofAttempt",
    );
    const dependencies = createDependencies();
    const issued = await issue(actor, {
      gameType: "dragon-flight",
      difficulty: "medium",
    }, dependencies);
    const actions: DragonFlightAction[] = [
      { sequence: 1, kind: "choose-gate", gate: "right", elapsedMs: 400 },
      { sequence: 2, kind: "launch", elapsedMs: 700 },
    ];

    const timedDependencies = withServerTimes(dependencies, [
      NOW,
      "2026-08-01T00:00:00.300Z",
      "2026-08-01T00:00:00.600Z",
    ]);
    const checkpoints = await createActionCheckpointChain(issued, actions, timedDependencies);

    const result = await completeAttempt(actor, {
      attemptId: issued.attemptId,
      credential: issued.credential,
      idempotencyKey: issued.attemptId,
      actions,
      checkpoints,
    }, timedDependencies);

    expect(result).toMatchObject({
      score: 100,
      accuracy: 1,
      correctAnswers: 1,
      totalAttempts: 1,
      duration: 700,
      xpEarned: 5,
      duplicate: false,
    });
    expect(dependencies.recordCompletion).toHaveBeenCalledWith({
      gameType: "dragon-flight",
      difficulty: "medium",
      score: 100,
      accuracy: 1,
      correctAnswers: 1,
      totalAttempts: 1,
      duration: 700,
      victory: true,
      idempotencyKey: issued.attemptId,
    });
    expect(dependencies.store.complete).toHaveBeenCalledWith(
      "claim-1",
      expect.objectContaining({ xpEarned: 5, score: 100 }),
    );
  });

  it("requires the client idempotency key to equal the signed attempt before claiming or persisting", async () => {
    const issue = requiredOperation<IssueDragonFlightAttempt>(
      "issueDragonFlightHostProofAttempt",
    );
    const completeAttempt = requiredOperation<CompleteDragonFlightAttempt>(
      "completeDragonFlightHostProofAttempt",
    );
    const dependencies = createDependencies();
    const issued = await issue(actor, {
      gameType: "dragon-flight",
      difficulty: "medium",
    }, dependencies);
    const actions: DragonFlightAction[] = [
      { sequence: 1, kind: "choose-gate", gate: "right", elapsedMs: 400 },
      { sequence: 2, kind: "launch", elapsedMs: 700 },
    ];
    const timedDependencies = withServerTimes(dependencies, [
      NOW,
      "2026-08-01T00:00:00.300Z",
      "2026-08-01T00:00:00.600Z",
    ]);
    const checkpoints = await createActionCheckpointChain(issued, actions, timedDependencies);
    const request = {
      attemptId: issued.attemptId,
      credential: issued.credential,
      actions,
      checkpoints,
    };

    await expect(completeAttempt(actor, {
      ...request,
      idempotencyKey: "22222222-2222-2222-2222-222222222222",
    }, timedDependencies)).rejects.toThrow(/(?:idempotency.*attempt|attempt.*idempotency)/u);
    expect(dependencies.store.begin).not.toHaveBeenCalled();
    expect(dependencies.recordCompletion).not.toHaveBeenCalled();

    await expect(completeAttempt(actor, {
      ...request,
      idempotencyKey: issued.attemptId,
    }, timedDependencies)).resolves.toMatchObject({
      xpEarned: 5,
      duplicate: false,
    });
    expect(dependencies.store.lookupRecovery).not.toHaveBeenCalled();
    expect(dependencies.store.begin).toHaveBeenCalledWith(expect.objectContaining({
      attemptId: issued.attemptId,
    }));
    expect(dependencies.recordCompletion).toHaveBeenCalledWith(expect.objectContaining({
      idempotencyKey: issued.attemptId,
    }));
  });

  it("rejects a forged client score or XP before it claims or persists completion", async () => {
    const issue = requiredOperation<IssueDragonFlightAttempt>(
      "issueDragonFlightHostProofAttempt",
    );
    const completeAttempt = requiredOperation<CompleteDragonFlightAttempt>(
      "completeDragonFlightHostProofAttempt",
    );
    const dependencies = createDependencies();
    const issued = await issue(actor, {
      gameType: "dragon-flight",
      difficulty: "medium",
    }, dependencies);

    await expect(completeAttempt(actor, {
      attemptId: issued.attemptId,
      credential: issued.credential,
      idempotencyKey: issued.attemptId,
      actions: [
        { sequence: 1, kind: "choose-gate", gate: "right", elapsedMs: 400 },
        { sequence: 2, kind: "launch", elapsedMs: 700 },
      ],
      score: 99_999,
      accuracy: 1,
      correctAnswers: 99_999,
      totalAttempts: 99_999,
      xp: 99_999,
      duration: 0,
      victory: true,
    }, dependencies)).rejects.toThrow();

    expect(dependencies.store.begin).not.toHaveBeenCalled();
    expect(dependencies.recordCompletion).not.toHaveBeenCalled();
  });

  it("fails closed on a tampered credential, foreign actor, stale credential, or invalid action order", async () => {
    const issue = requiredOperation<IssueDragonFlightAttempt>(
      "issueDragonFlightHostProofAttempt",
    );
    const completeAttempt = requiredOperation<CompleteDragonFlightAttempt>(
      "completeDragonFlightHostProofAttempt",
    );
    const dependencies = createDependencies();
    const issued = await issue(actor, {
      gameType: "dragon-flight",
      difficulty: "medium",
    }, dependencies);
    const validRequest = {
      attemptId: issued.attemptId,
      credential: issued.credential,
      idempotencyKey: issued.attemptId,
      actions: [
        { sequence: 1, kind: "choose-gate" as const, gate: "right" as const, elapsedMs: 400 },
        { sequence: 2, kind: "launch" as const, elapsedMs: 700 },
      ],
    };

    await expect(completeAttempt(actor, {
      ...validRequest,
      credential: `${issued.credential}tampered`,
    }, dependencies)).rejects.toThrow();
    await expect(completeAttempt({ ...actor, userId: "attacker" }, validRequest, dependencies)).rejects.toThrow();
    await expect(completeAttempt(actor, {
      ...validRequest,
      actions: [
        { sequence: 2, kind: "launch", elapsedMs: 700 },
      ],
    }, dependencies)).rejects.toThrow();
    await expect(completeAttempt(actor, validRequest, {
      ...dependencies,
      now: () => "2026-08-01T00:11:00.000Z",
    })).rejects.toThrow();

    expect(dependencies.recordCompletion).not.toHaveBeenCalled();
  });

  it("rejects a server-observed same-instant direct JSON chain before it claims or persists XP", async () => {
    const issue = requiredOperation<IssueDragonFlightAttempt>(
      "issueDragonFlightHostProofAttempt",
    );
    const attest = requiredOperation<AttestDragonFlightAction>(
      "attestDragonFlightHostProofAction",
    );
    const dependencies = createDependencies();
    const issued = await issue(actor, {
      gameType: "dragon-flight",
      difficulty: "medium",
    }, dependencies);
    const actions: DragonFlightAction[] = [
      { sequence: 1, kind: "choose-gate", gate: "right", elapsedMs: 0 },
      { sequence: 2, kind: "launch", elapsedMs: 0 },
    ];
    const first = await attest(actor, {
      attemptId: issued.attemptId,
      credential: issued.credential,
      action: actions[0],
    }, dependencies);
    await expect(attest(actor, {
      attemptId: issued.attemptId,
      credential: issued.credential,
      action: actions[1],
      previousCheckpoint: first.checkpoint,
    }, dependencies)).rejects.toThrow();

    expect(dependencies.store.begin).not.toHaveBeenCalled();
    expect(dependencies.recordCompletion).not.toHaveBeenCalled();
  });

  it("uses one stricter server-only dwell policy for attestation and completion", async () => {
    const issue = requiredOperation<IssueDragonFlightAttempt>(
      "issueDragonFlightHostProofAttempt",
    );
    const attest = requiredOperation<AttestDragonFlightAction>(
      "attestDragonFlightHostProofAction",
    );
    const completeAttempt = requiredOperation<CompleteDragonFlightAttempt>(
      "completeDragonFlightHostProofAttempt",
    );
    const dependencies = createDependencies();
    dependencies.gateToLaunchDwellMs = 3000;
    const issued = await issue(actor, {
      gameType: "dragon-flight",
      difficulty: "medium",
    }, dependencies);
    const actions: DragonFlightAction[] = [
      { sequence: 1, kind: "choose-gate", gate: "right", elapsedMs: 0 },
      { sequence: 2, kind: "launch", elapsedMs: 0 },
    ];
    const timedDependencies = withServerTimes(dependencies, [
      NOW,
      "2026-08-01T00:00:00.250Z",
    ]);
    const first = await attest(actor, {
      attemptId: issued.attemptId,
      credential: issued.credential,
      action: actions[0],
    }, timedDependencies);

    expect(first.minimumNextActionDwellMs).toBe(3000);
    await expect(attest(actor, {
      attemptId: issued.attemptId,
      credential: issued.credential,
      action: actions[1],
      previousCheckpoint: first.checkpoint,
    }, timedDependencies)).rejects.toThrow(/dwell/u);
    await expect(attest(actor, {
      attemptId: issued.attemptId,
      credential: issued.credential,
      action: { ...actions[1], gateToLaunchDwellMs: 0 },
      previousCheckpoint: first.checkpoint,
    }, dependencies)).rejects.toThrow();

    const underDwellCheckpoint = signCheckpointFixture({
      version: 1,
      attemptId: issued.attemptId,
      userId: actor.userId,
      schoolId: actor.schoolId,
      actionDigest: checkpointDigest(actions[1]),
      sequence: 2,
      previousCheckpointDigest: checkpointDigest(first.checkpoint),
      observedAt: "2026-08-01T00:00:00.250Z",
      expiresAt: issued.expiresAt,
    });
    await expect(completeAttempt(actor, {
      attemptId: issued.attemptId,
      credential: issued.credential,
      idempotencyKey: issued.attemptId,
      actions,
      checkpoints: [first.checkpoint, underDwellCheckpoint],
    }, dependencies)).rejects.toThrow(/dwell/u);

    expect(dependencies.store.begin).not.toHaveBeenCalled();
    expect(dependencies.recordCompletion).not.toHaveBeenCalled();
  });

  it("rejects a same-server-time signed checkpoint chain before it claims or persists XP", async () => {
    const issue = requiredOperation<IssueDragonFlightAttempt>(
      "issueDragonFlightHostProofAttempt",
    );
    const attest = requiredOperation<AttestDragonFlightAction>(
      "attestDragonFlightHostProofAction",
    );
    const completeAttempt = requiredOperation<CompleteDragonFlightAttempt>(
      "completeDragonFlightHostProofAttempt",
    );
    const dependencies = createDependencies();
    const issued = await issue(actor, {
      gameType: "dragon-flight",
      difficulty: "medium",
    }, dependencies);
    const actions: DragonFlightAction[] = [
      { sequence: 1, kind: "choose-gate", gate: "right", elapsedMs: 0 },
      { sequence: 2, kind: "launch", elapsedMs: 0 },
    ];
    const first = await attest(actor, {
      attemptId: issued.attemptId,
      credential: issued.credential,
      action: actions[0],
    }, dependencies);
    const sameTimeSecond = signCheckpointFixture({
      version: 1,
      attemptId: issued.attemptId,
      userId: actor.userId,
      schoolId: actor.schoolId,
      actionDigest: checkpointDigest(actions[1]),
      sequence: 2,
      previousCheckpointDigest: checkpointDigest(first.checkpoint),
      observedAt: NOW,
      expiresAt: issued.expiresAt,
    });

    await expect(completeAttempt(actor, {
      attemptId: issued.attemptId,
      credential: issued.credential,
      idempotencyKey: issued.attemptId,
      actions,
      checkpoints: [first.checkpoint, sameTimeSecond],
    }, dependencies)).rejects.toThrow();

    expect(dependencies.store.begin).not.toHaveBeenCalled();
    expect(dependencies.recordCompletion).not.toHaveBeenCalled();
  });


  it("reconciles a persistence-before-finalize ambiguity from the canonical server completion", async () => {
    const issue = requiredOperation<IssueDragonFlightAttempt>(
      "issueDragonFlightHostProofAttempt",
    );
    const completeAttempt = requiredOperation<CompleteDragonFlightAttempt>(
      "completeDragonFlightHostProofAttempt",
    );
    const dependencies = createDependencies();
    const canonical: CanonicalCompletion = { ...verifiedCanonicalCompletion };
    dependencies.store.begin
      .mockResolvedValueOnce({ kind: "execute", claimId: "claim-before-finalize" })
      .mockResolvedValueOnce({ kind: "recover", claimId: "claim-recovery" });
    dependencies.recordCompletion
      .mockResolvedValueOnce({ xpEarned: canonical.xpEarned, duplicate: false })
      .mockResolvedValueOnce({ xpEarned: 0, duplicate: true });
    dependencies.store.complete
      .mockRejectedValueOnce(new Error("durable finalization unavailable"))
      .mockResolvedValueOnce(undefined);
    dependencies.readCanonicalCompletion.mockResolvedValueOnce(canonical);
    const issued = await issue(actor, { gameType: "dragon-flight", difficulty: "medium" }, dependencies);
    const timedDependencies = withServerTimes(dependencies, [
      NOW,
      "2026-08-01T00:00:00.300Z",
      "2026-08-01T00:00:00.600Z",
    ]);
    const request = await createVerifiedCompletionRequest(issued, timedDependencies);

    await expect(completeAttempt(actor, request, timedDependencies)).rejects.toThrow(
      /durable finalization unavailable/u,
    );
    await expect(completeAttempt(actor, request, timedDependencies)).resolves.toMatchObject({
      ...canonical,
      duplicate: true,
    });
    expect(dependencies.readCanonicalCompletion).toHaveBeenCalledWith({
      attemptId: issued.attemptId,
      userId: actor.userId,
      schoolId: actor.schoolId,
      gameType: "dragon-flight",
      difficulty: "medium",
    });
    expect(dependencies.store.complete).toHaveBeenLastCalledWith(
      "claim-recovery",
      expect.objectContaining({ ...canonical, duplicate: false }),
    );
    expect(dependencies.store.abandon).not.toHaveBeenCalled();
  });

  it("reconciles an exact pending attempt after credential expiry so committed XP cannot strand", async () => {
    const completeAttempt = requiredOperation<CompleteDragonFlightAttempt>(
      "completeDragonFlightHostProofAttempt",
    );
    const dependencies = createDependencies();
    dependencies.store.lookupRecovery.mockResolvedValueOnce({
      kind: "pending",
      claimId: "claim-expired-recovery",
    });
    dependencies.readCanonicalCompletion.mockResolvedValueOnce(verifiedCanonicalCompletion);
    const { issued, request, timedDependencies } = await createExpiredCompletionRequest(
      dependencies,
    );

    await expect(completeAttempt(actor, request, timedDependencies)).resolves.toMatchObject({
      ...verifiedCanonicalCompletion,
      duplicate: true,
    });
    expect(dependencies.store.lookupRecovery).toHaveBeenCalledWith(expect.objectContaining({
      attemptId: issued.attemptId,
    }));
    expect(dependencies.store.begin).not.toHaveBeenCalled();
    expect(dependencies.recordCompletion).not.toHaveBeenCalled();
    expect(dependencies.readCanonicalCompletion).toHaveBeenCalledWith({
      attemptId: issued.attemptId,
      userId: actor.userId,
      schoolId: actor.schoolId,
      gameType: "dragon-flight",
      difficulty: "medium",
    });
    expect(dependencies.store.complete).toHaveBeenCalledWith(
      "claim-expired-recovery",
      expect.objectContaining({ ...verifiedCanonicalCompletion, duplicate: false }),
    );
    expect(dependencies.store.abandon).not.toHaveBeenCalled();
  });

  it("rejects an expired first submission after a non-mutating missing lookup", async () => {
    const completeAttempt = requiredOperation<CompleteDragonFlightAttempt>(
      "completeDragonFlightHostProofAttempt",
    );
    const dependencies = createDependencies();
    const { request, timedDependencies } = await createExpiredCompletionRequest(
      dependencies,
    );

    await expect(completeAttempt(actor, request, timedDependencies)).rejects.toThrow(
      /(?:expired|credential)/u,
    );
    expect(dependencies.store.lookupRecovery).toHaveBeenCalledTimes(1);
    expect(dependencies.store.begin).not.toHaveBeenCalled();
    expect(dependencies.recordCompletion).not.toHaveBeenCalled();
    expect(dependencies.store.complete).not.toHaveBeenCalled();
  });

  it("rejects an expired recovery conflict without generic persistence", async () => {
    const completeAttempt = requiredOperation<CompleteDragonFlightAttempt>(
      "completeDragonFlightHostProofAttempt",
    );
    const dependencies = createDependencies();
    dependencies.store.lookupRecovery.mockResolvedValueOnce({ kind: "conflict" });
    const { request, timedDependencies } = await createExpiredCompletionRequest(
      dependencies,
    );

    await expect(completeAttempt(actor, request, timedDependencies)).rejects.toThrow(
      /(?:expired|credential)/u,
    );
    expect(dependencies.store.lookupRecovery).toHaveBeenCalledTimes(1);
    expect(dependencies.store.begin).not.toHaveBeenCalled();
    expect(dependencies.recordCompletion).not.toHaveBeenCalled();
    expect(dependencies.store.complete).not.toHaveBeenCalled();
  });

  it("leaves an expired matching pending attempt pending when canonical completion is absent", async () => {
    const completeAttempt = requiredOperation<CompleteDragonFlightAttempt>(
      "completeDragonFlightHostProofAttempt",
    );
    const dependencies = createDependencies();
    dependencies.store.lookupRecovery.mockResolvedValueOnce({
      kind: "pending",
      claimId: "claim-no-canonical",
    });
    dependencies.readCanonicalCompletion.mockResolvedValueOnce(null);
    const { request, timedDependencies } = await createExpiredCompletionRequest(
      dependencies,
    );

    await expect(completeAttempt(actor, request, timedDependencies)).rejects.toThrow(
      /(?:expired|credential)/u,
    );
    expect(dependencies.store.lookupRecovery).toHaveBeenCalledTimes(1);
    expect(dependencies.readCanonicalCompletion).toHaveBeenCalledTimes(1);
    expect(dependencies.store.begin).not.toHaveBeenCalled();
    expect(dependencies.recordCompletion).not.toHaveBeenCalled();
    expect(dependencies.store.complete).not.toHaveBeenCalled();
  });

  it("leaves an expired matching pending attempt pending when canonical facts mismatch", async () => {
    const completeAttempt = requiredOperation<CompleteDragonFlightAttempt>(
      "completeDragonFlightHostProofAttempt",
    );
    const dependencies = createDependencies();
    dependencies.store.lookupRecovery.mockResolvedValueOnce({
      kind: "pending",
      claimId: "claim-mismatched-canonical",
    });
    dependencies.readCanonicalCompletion.mockResolvedValueOnce({
      ...verifiedCanonicalCompletion,
      score: 999,
    });
    const { request, timedDependencies } = await createExpiredCompletionRequest(
      dependencies,
    );

    await expect(completeAttempt(actor, request, timedDependencies)).rejects.toThrow(
      /(?:expired|credential)/u,
    );
    expect(dependencies.store.lookupRecovery).toHaveBeenCalledTimes(1);
    expect(dependencies.readCanonicalCompletion).toHaveBeenCalledTimes(1);
    expect(dependencies.store.begin).not.toHaveBeenCalled();
    expect(dependencies.recordCompletion).not.toHaveBeenCalled();
    expect(dependencies.store.complete).not.toHaveBeenCalled();
  });

  it("returns an expired completed replay without generic persistence", async () => {
    const completeAttempt = requiredOperation<CompleteDragonFlightAttempt>(
      "completeDragonFlightHostProofAttempt",
    );
    const dependencies = createDependencies();
    const stored: DerivedCompletion = {
      xpEarned: 5,
      score: 100,
      accuracy: 1,
      correctAnswers: 1,
      totalAttempts: 1,
      duration: 700,
      victory: true,
      duplicate: false,
    };
    dependencies.store.lookupRecovery.mockResolvedValueOnce({
      kind: "replay",
      result: stored,
    });
    const { request, timedDependencies } = await createExpiredCompletionRequest(
      dependencies,
    );

    await expect(completeAttempt(actor, request, timedDependencies)).resolves.toMatchObject({
      ...stored,
      duplicate: true,
    });
    expect(dependencies.store.lookupRecovery).toHaveBeenCalledTimes(1);
    expect(dependencies.store.begin).not.toHaveBeenCalled();
    expect(dependencies.recordCompletion).not.toHaveBeenCalled();
    expect(dependencies.store.complete).not.toHaveBeenCalled();
  });

  it("rejects foreign or divergent expired requests before recovery lookup", async () => {
    const completeAttempt = requiredOperation<CompleteDragonFlightAttempt>(
      "completeDragonFlightHostProofAttempt",
    );
    const dependencies = createDependencies();
    const { request, timedDependencies } = await createExpiredCompletionRequest(
      dependencies,
    );

    await expect(completeAttempt({
      userId: "foreign-user",
      schoolId: actor.schoolId,
    }, request, timedDependencies)).rejects.toThrow(/credential/u);
    await expect(completeAttempt(actor, {
      ...request,
      actions: [
        { sequence: 1, kind: "choose-gate", gate: "left", elapsedMs: 400 },
        request.actions[1],
      ],
    }, timedDependencies)).rejects.toThrow();
    expect(dependencies.store.lookupRecovery).not.toHaveBeenCalled();
    expect(dependencies.store.begin).not.toHaveBeenCalled();
    expect(dependencies.recordCompletion).not.toHaveBeenCalled();
    expect(dependencies.store.complete).not.toHaveBeenCalled();
  });

  it("converges concurrent expired retries through pending-or-replay lookup without a second award", async () => {
    const completeAttempt = requiredOperation<CompleteDragonFlightAttempt>(
      "completeDragonFlightHostProofAttempt",
    );
    const dependencies = createDependencies();
    const stored: DerivedCompletion = {
      xpEarned: 5,
      score: 100,
      accuracy: 1,
      correctAnswers: 1,
      totalAttempts: 1,
      duration: 700,
      victory: true,
      duplicate: false,
    };
    dependencies.store.lookupRecovery
      .mockResolvedValueOnce({ kind: "pending", claimId: "claim-converged" })
      .mockResolvedValueOnce({ kind: "replay", result: stored });
    dependencies.readCanonicalCompletion.mockResolvedValueOnce(verifiedCanonicalCompletion);
    const { request, timedDependencies } = await createExpiredCompletionRequest(
      dependencies,
    );

    const results = await Promise.all([
      completeAttempt(actor, request, timedDependencies),
      completeAttempt(actor, request, timedDependencies),
    ]);
    expect(results).toEqual([
      expect.objectContaining({ xpEarned: 5, duplicate: true }),
      expect.objectContaining({ xpEarned: 5, duplicate: true }),
    ]);
    expect(dependencies.store.lookupRecovery).toHaveBeenCalledTimes(2);
    expect(dependencies.store.begin).not.toHaveBeenCalled();
    expect(dependencies.recordCompletion).not.toHaveBeenCalled();
    expect(dependencies.store.complete).toHaveBeenCalledTimes(1);
  });

  it("fails closed when a recovered canonical completion differs from the verified transcript", async () => {
    const issue = requiredOperation<IssueDragonFlightAttempt>(
      "issueDragonFlightHostProofAttempt",
    );
    const completeAttempt = requiredOperation<CompleteDragonFlightAttempt>(
      "completeDragonFlightHostProofAttempt",
    );
    const dependencies = createDependencies();
    dependencies.store.begin.mockResolvedValueOnce({
      kind: "recover",
      claimId: "claim-recovery",
    });
    dependencies.recordCompletion.mockResolvedValueOnce({ xpEarned: 0, duplicate: true });
    dependencies.readCanonicalCompletion.mockResolvedValueOnce({
      xpEarned: 5,
      score: 999,
      accuracy: 1,
      correctAnswers: 1,
      totalAttempts: 1,
      duration: 700,
      victory: true,
    });
    const issued = await issue(actor, { gameType: "dragon-flight", difficulty: "medium" }, dependencies);
    const timedDependencies = withServerTimes(dependencies, [
      NOW,
      "2026-08-01T00:00:00.300Z",
      "2026-08-01T00:00:00.600Z",
    ]);
    const request = await createVerifiedCompletionRequest(issued, timedDependencies);

    const outcome = await completeAttempt(actor, request, timedDependencies).catch((error: unknown) => error);
    expect(outcome).toBeInstanceOf(Error);
    expect(dependencies.store.complete).not.toHaveBeenCalled();
    expect(dependencies.store.abandon).not.toHaveBeenCalled();
  });

  it("fails closed when a recovered canonical completion has the wrong XP despite matching replay facts", async () => {
    const issue = requiredOperation<IssueDragonFlightAttempt>(
      "issueDragonFlightHostProofAttempt",
    );
    const completeAttempt = requiredOperation<CompleteDragonFlightAttempt>(
      "completeDragonFlightHostProofAttempt",
    );
    const dependencies = createDependencies();
    dependencies.store.begin.mockResolvedValueOnce({
      kind: "recover",
      claimId: "claim-recovery",
    });
    dependencies.recordCompletion.mockResolvedValueOnce({ xpEarned: 0, duplicate: true });
    dependencies.readCanonicalCompletion.mockResolvedValueOnce({
      ...verifiedCanonicalCompletion,
      xpEarned: 999,
    });
    const issued = await issue(actor, { gameType: "dragon-flight", difficulty: "medium" }, dependencies);
    const timedDependencies = withServerTimes(dependencies, [
      NOW,
      "2026-08-01T00:00:00.300Z",
      "2026-08-01T00:00:00.600Z",
    ]);
    const request = await createVerifiedCompletionRequest(issued, timedDependencies);

    await expect(completeAttempt(actor, request, timedDependencies)).rejects.toThrow(
      /Canonical Dragon Flight completion does not match the verified transcript/u,
    );
    expect(dependencies.store.complete).not.toHaveBeenCalled();
    expect(dependencies.store.abandon).not.toHaveBeenCalled();
  });

  it("tolerates PostgreSQL REAL rounding for one-third accuracy but rejects material canonical drift", async () => {
    const issue = requiredOperation<IssueDragonFlightAttempt>(
      "issueDragonFlightHostProofAttempt",
    );
    const completeAttempt = requiredOperation<CompleteDragonFlightAttempt>(
      "completeDragonFlightHostProofAttempt",
    );
    const actions: DragonFlightAction[] = [
      { sequence: 1, kind: "choose-gate", gate: "right", elapsedMs: 300 },
      { sequence: 2, kind: "choose-gate", gate: "left", elapsedMs: 500 },
      { sequence: 3, kind: "choose-gate", gate: "left", elapsedMs: 700 },
      { sequence: 4, kind: "launch", elapsedMs: 1_000 },
    ];
    const canonical: CanonicalCompletion = {
      xpEarned: 3,
      score: 100,
      accuracy: Math.fround(1 / 3),
      correctAnswers: 1,
      totalAttempts: 3,
      duration: 1_000,
      victory: true,
    };
    const dependencies = createDependencies();
    dependencies.readCanonicalCompletion.mockResolvedValueOnce(canonical);
    const issued = await issue(actor, { gameType: "dragon-flight", difficulty: "medium" }, dependencies);
    const timedDependencies = withServerTimes(dependencies, [
      NOW,
      "2026-08-01T00:00:00.100Z",
      "2026-08-01T00:00:00.400Z",
      "2026-08-01T00:00:00.700Z",
      "2026-08-01T00:00:01.000Z",
      "2026-08-01T00:00:01.300Z",
    ]);
    const request = {
      attemptId: issued.attemptId,
      credential: issued.credential,
      idempotencyKey: issued.attemptId,
      actions,
      checkpoints: await createActionCheckpointChain(issued, actions, timedDependencies),
    };

    await expect(completeAttempt(actor, request, timedDependencies)).resolves.toMatchObject({
      xpEarned: 3,
      accuracy: 1 / 3,
      correctAnswers: 1,
      totalAttempts: 3,
      duration: 1_000,
      duplicate: false,
    });
    expect(dependencies.store.complete).toHaveBeenCalledWith(
      "claim-1",
      expect.objectContaining({ accuracy: 1 / 3, duplicate: false }),
    );

    const mismatchDependencies = createDependencies();
    mismatchDependencies.readCanonicalCompletion.mockResolvedValueOnce({
      ...canonical,
      accuracy: 0.5,
    });
    const mismatchIssued = await issue(
      actor,
      { gameType: "dragon-flight", difficulty: "medium" },
      mismatchDependencies,
    );
    const mismatchTimedDependencies = withServerTimes(mismatchDependencies, [
      NOW,
      "2026-08-01T00:00:00.100Z",
      "2026-08-01T00:00:00.400Z",
      "2026-08-01T00:00:00.700Z",
      "2026-08-01T00:00:01.000Z",
      "2026-08-01T00:00:01.300Z",
    ]);
    const mismatchRequest = {
      attemptId: mismatchIssued.attemptId,
      credential: mismatchIssued.credential,
      idempotencyKey: mismatchIssued.attemptId,
      actions,
      checkpoints: await createActionCheckpointChain(
        mismatchIssued,
        actions,
        mismatchTimedDependencies,
      ),
    };

    await expect(completeAttempt(
      actor,
      mismatchRequest,
      mismatchTimedDependencies,
    )).rejects.toThrow(/Canonical Dragon Flight completion does not match the verified transcript/u);
    expect(mismatchDependencies.store.complete).not.toHaveBeenCalled();
  });

  it("leaves an ambiguous persistence failure pending so the same signed attempt recovers", async () => {
    const issue = requiredOperation<IssueDragonFlightAttempt>(
      "issueDragonFlightHostProofAttempt",
    );
    const completeAttempt = requiredOperation<CompleteDragonFlightAttempt>(
      "completeDragonFlightHostProofAttempt",
    );
    const dependencies = createDependencies();
    dependencies.store.begin
      .mockResolvedValueOnce({ kind: "execute", claimId: "claim-pending" })
      .mockResolvedValueOnce({ kind: "recover", claimId: "claim-pending" });
    dependencies.recordCompletion
      .mockRejectedValueOnce(new Error("pre-persistence write rejected"))
      .mockResolvedValueOnce({ xpEarned: 5, duplicate: false });
    dependencies.readCanonicalCompletion.mockResolvedValueOnce(null);
    const issued = await issue(actor, { gameType: "dragon-flight", difficulty: "medium" }, dependencies);
    const timedDependencies = withServerTimes(dependencies, [
      NOW,
      "2026-08-01T00:00:00.300Z",
      "2026-08-01T00:00:00.600Z",
    ]);
    const request = await createVerifiedCompletionRequest(issued, timedDependencies);

    await expect(completeAttempt(actor, request, timedDependencies)).rejects.toThrow(
      /pre-persistence write rejected/u,
    );
    await expect(completeAttempt(actor, request, timedDependencies)).resolves.toMatchObject({
      xpEarned: 5,
      score: 100,
      duplicate: false,
    });
    expect(dependencies.store.begin).toHaveBeenNthCalledWith(1, expect.objectContaining({
      attemptId: issued.attemptId,
    }));
    expect(dependencies.store.begin).toHaveBeenNthCalledWith(2, expect.objectContaining({
      attemptId: issued.attemptId,
    }));
    expect(dependencies.recordCompletion).toHaveBeenCalledTimes(2);
    expect(dependencies.store.complete).toHaveBeenCalledTimes(1);
    expect(dependencies.store.complete).toHaveBeenCalledWith(
      "claim-pending",
      expect.objectContaining({ xpEarned: 5, duplicate: false }),
    );
    expect(dependencies.store.abandon).not.toHaveBeenCalled();
    expect(dependencies.readCanonicalCompletion).toHaveBeenCalledTimes(2);
  });

  it("returns the same stored outcome on an idempotent retry without a second XP write", async () => {
    const issue = requiredOperation<IssueDragonFlightAttempt>(
      "issueDragonFlightHostProofAttempt",
    );
    const completeAttempt = requiredOperation<CompleteDragonFlightAttempt>(
      "completeDragonFlightHostProofAttempt",
    );
    const dependencies = createDependencies();
    const issued = await issue(actor, {
      gameType: "dragon-flight",
      difficulty: "medium",
    }, dependencies);
    const expectedReplay: DerivedCompletion = {
      xpEarned: 5,
      score: 100,
      accuracy: 1,
      correctAnswers: 1,
      totalAttempts: 1,
      duration: 700,
      duplicate: true,
    };
    dependencies.store.begin.mockResolvedValueOnce({
      kind: "replay",
      result: expectedReplay,
    });
    const actions: DragonFlightAction[] = [
      { sequence: 1, kind: "choose-gate", gate: "right", elapsedMs: 400 },
      { sequence: 2, kind: "launch", elapsedMs: 700 },
    ];
    const timedDependencies = withServerTimes(dependencies, [
      NOW,
      "2026-08-01T00:00:00.300Z",
      "2026-08-01T00:00:00.600Z",
    ]);
    const checkpoints = await createActionCheckpointChain(issued, actions, timedDependencies);

    await expect(completeAttempt(actor, {
      attemptId: issued.attemptId,
      credential: issued.credential,
      idempotencyKey: issued.attemptId,
      actions,
      checkpoints,
    }, timedDependencies)).resolves.toEqual(expectedReplay);
    expect(dependencies.recordCompletion).not.toHaveBeenCalled();
    expect(dependencies.store.complete).not.toHaveBeenCalled();
  });

  it("does not persist or recover a valid transcript when the atomic claim conflicts", async () => {
    const issue = requiredOperation<IssueDragonFlightAttempt>(
      "issueDragonFlightHostProofAttempt",
    );
    const completeAttempt = requiredOperation<CompleteDragonFlightAttempt>(
      "completeDragonFlightHostProofAttempt",
    );
    const dependencies = createDependencies();
    const issued = await issue(actor, { gameType: "dragon-flight", difficulty: "medium" }, dependencies);
    const actions: DragonFlightAction[] = [
      { sequence: 1, kind: "choose-gate", gate: "right", elapsedMs: 400 },
      { sequence: 2, kind: "launch", elapsedMs: 700 },
    ];
    const timedDependencies = withServerTimes(dependencies, [
      NOW,
      "2026-08-01T00:00:00.300Z",
      "2026-08-01T00:00:00.600Z",
    ]);
    const checkpoints = await createActionCheckpointChain(issued, actions, timedDependencies);
    dependencies.store.begin.mockResolvedValueOnce({ kind: "conflict" });

    await expect(completeAttempt(actor, {
      attemptId: issued.attemptId,
      credential: issued.credential,
      idempotencyKey: issued.attemptId,
      actions,
      checkpoints,
    }, timedDependencies)).rejects.toThrow(/already been claimed/u);

    expect(dependencies.recordCompletion).not.toHaveBeenCalled();
    expect(dependencies.store.complete).not.toHaveBeenCalled();
    expect(dependencies.store.abandon).not.toHaveBeenCalled();
  });

  it("leaves a durable claim pending after an ambiguous authoritative persistence failure", async () => {
    const issue = requiredOperation<IssueDragonFlightAttempt>(
      "issueDragonFlightHostProofAttempt",
    );
    const completeAttempt = requiredOperation<CompleteDragonFlightAttempt>(
      "completeDragonFlightHostProofAttempt",
    );
    const dependencies = createDependencies();
    const issued = await issue(actor, { gameType: "dragon-flight", difficulty: "medium" }, dependencies);
    const actions: DragonFlightAction[] = [
      { sequence: 1, kind: "choose-gate", gate: "right", elapsedMs: 400 },
      { sequence: 2, kind: "launch", elapsedMs: 700 },
    ];
    const timedDependencies = withServerTimes(dependencies, [
      NOW,
      "2026-08-01T00:00:00.300Z",
      "2026-08-01T00:00:00.600Z",
    ]);
    const checkpoints = await createActionCheckpointChain(issued, actions, timedDependencies);
    dependencies.recordCompletion.mockRejectedValueOnce(new Error("authoritative persistence failed"));
    dependencies.readCanonicalCompletion.mockResolvedValueOnce(null);

    await expect(completeAttempt(actor, {
      attemptId: issued.attemptId,
      credential: issued.credential,
      idempotencyKey: issued.attemptId,
      actions,
      checkpoints,
    }, timedDependencies)).rejects.toThrow(/authoritative persistence failed/u);

    expect(dependencies.store.complete).not.toHaveBeenCalled();
    expect(dependencies.store.abandon).not.toHaveBeenCalled();
    expect(dependencies.readCanonicalCompletion).toHaveBeenCalledTimes(1);
  });

  it("rejects missing, forged, foreign, reordered, replayed, and mismatched server checkpoint chains before persistence", async () => {
    const issue = requiredOperation<IssueDragonFlightAttempt>(
      "issueDragonFlightHostProofAttempt",
    );
    const attest = requiredOperation<AttestDragonFlightAction>(
      "attestDragonFlightHostProofAction",
    );
    const completeAttempt = requiredOperation<CompleteDragonFlightAttempt>(
      "completeDragonFlightHostProofAttempt",
    );
    const dependencies = createDependencies();
    const issued = await issue(actor, {
      gameType: "dragon-flight",
      difficulty: "medium",
    }, dependencies);
    const actions: DragonFlightAction[] = [
      { sequence: 1, kind: "choose-gate", gate: "right", elapsedMs: 400 },
      { sequence: 2, kind: "launch", elapsedMs: 700 },
    ];
    const timedDependencies = withServerTimes(dependencies, [
      NOW,
      "2026-08-01T00:00:00.300Z",
      "2026-08-01T00:00:00.600Z",
    ]);
    const checkpoints = await createActionCheckpointChain(issued, actions, timedDependencies);
    expect(checkpoints).toHaveLength(2);
    expect(checkpoints.join(".")).not.toContain(SIGNING_SECRET);

    const baseRequest = {
      attemptId: issued.attemptId,
      credential: issued.credential,
      idempotencyKey: issued.attemptId,
      actions,
      checkpoints,
    };
    const rejectWithoutPersistence = async (input: unknown, overrides: AttemptDependencies = timedDependencies) => {
      await expect(completeAttempt(actor, input, overrides)).rejects.toThrow();
      expect(dependencies.store.begin).not.toHaveBeenCalled();
      expect(dependencies.recordCompletion).not.toHaveBeenCalled();
    };

    await rejectWithoutPersistence({ ...baseRequest, checkpoints: [checkpoints[0]] });
    await rejectWithoutPersistence({ ...baseRequest, checkpoints: [checkpoints[0], `${checkpoints[1]}forged`] });
    await rejectWithoutPersistence({ ...baseRequest, checkpoints: [checkpoints[1], checkpoints[0]] });
    await rejectWithoutPersistence({ ...baseRequest, checkpoints: [checkpoints[0], checkpoints[0]] });
    await rejectWithoutPersistence({
      ...baseRequest,
      actions: [
        { sequence: 1, kind: "choose-gate", gate: "left", elapsedMs: 400 },
        actions[1],
      ],
    });

    await expect(attest({ userId: "attacker", schoolId: actor.schoolId }, {
      attemptId: issued.attemptId,
      credential: issued.credential,
      action: actions[0],
    }, timedDependencies)).rejects.toThrow();
    await expect(attest({ userId: actor.userId, schoolId: "foreign-school" }, {
      attemptId: issued.attemptId,
      credential: issued.credential,
      action: actions[0],
    }, timedDependencies)).rejects.toThrow();
    await expect(attest(actor, {
      attemptId: issued.attemptId,
      credential: issued.credential,
      action: actions[1],
    }, timedDependencies)).rejects.toThrow();

    const otherDependencies: AttemptDependencies = {
      ...dependencies,
      createAttemptId: () => "44444444-4444-4444-4444-444444444444",
    };
    const otherIssued = await issue(actor, {
      gameType: "dragon-flight",
      difficulty: "medium",
    }, otherDependencies);
    const otherTimedDependencies = withServerTimes(otherDependencies, [
      NOW,
      "2026-08-01T00:00:00.300Z",
      "2026-08-01T00:00:00.600Z",
    ]);
    const otherCheckpoints = await createActionCheckpointChain(otherIssued, actions, otherTimedDependencies);
    await rejectWithoutPersistence({ ...baseRequest, checkpoints: otherCheckpoints });
    await rejectWithoutPersistence(baseRequest, {
      ...timedDependencies,
      now: () => "2026-08-01T00:11:00.000Z",
    });
  });
});
