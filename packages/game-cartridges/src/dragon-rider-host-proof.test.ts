import { describe, expect, it } from "vitest";
import { DRAGON_RIDER_HOST_PROOF_BINDING } from "../../game-contracts/src/dragon-rider-host-proof-binding.js";
import { dragonRiderHostProofActionSchema, dragonRiderHostProofClientActionSubmissionSchema, replayDragonRiderHostProofTranscript } from "./dragon-rider-host-proof.js";
const input = [{ term: "dragon", translation: "drago" }, { term: "rider", translation: "jinete" }, { term: "gate", translation: "puerta" }, { term: "fire", translation: "fuego" }] as const;
const seed = "seed-123";
/** Builds the server-recorded three-correct, one-wrong gate sequence. */
function records() { const offset = [...seed].reduce((sum, character) => sum + character.charCodeAt(0), 0) % 2; return [0, 60, 120, 180].map((observedElapsedMs, index) => { const correctGate = (offset + index) % 2 === 0 ? "left" : "right"; return { observedElapsedMs, action: { sequence: index + 1, kind: "choose-gate" as const, round: index + 1, gate: index === 2 ? (correctGate === "left" ? "right" : "left") : correctGate } }; }); }
describe("Dragon Rider corrected server-terminal replay", () => {
  it("pins current result evidence", () => expect(DRAGON_RIDER_HOST_PROOF_BINDING.claimEvidence).toMatchObject({ currentResultEvidenceId: "dragon-rider-host-proof-current-result-source-v1", currentResultRangeSha256: "9cc91cc3b7d4606bee91e2ec61c91523895fa7a3eeccef610430563dc5a68fb6" }));
  it("accepts only gate actions and no client timing", () => { expect(() => dragonRiderHostProofActionSchema.parse({ sequence: 1, kind: "enter-boss" })).toThrow(); expect(() => dragonRiderHostProofActionSchema.parse({ sequence: 1, kind: "defeat-boss" })).toThrow(); expect(() => dragonRiderHostProofClientActionSubmissionSchema.parse({ credential: "x", action: { sequence: 1, kind: "choose-gate", round: 1, gate: "left" }, elapsedMs: 1 })).toThrow(); });
  it("requires a server terminal at 150 seconds and derives a 3/4 victory", () => { expect(() => replayDragonRiderHostProofTranscript(input, seed, records(), 149_999)).toThrow(/terminal/i); expect(replayDragonRiderHostProofTranscript(input, seed, records(), 150_000).result).toMatchObject({ correctAnswers: 3, totalAttempts: 4, score: 300, dragonCount: 3, bossPower: 3, victory: true }); });
  it("cannot win with unresolved frozen rounds", () => expect(() => replayDragonRiderHostProofTranscript(input, seed, records().slice(0, 3), 150_000)).toThrow(/unresolved/i));
});
