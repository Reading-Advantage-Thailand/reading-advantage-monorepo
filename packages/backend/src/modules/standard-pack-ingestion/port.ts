import type {
  StandardPackSuccessorCommitmentLookup,
  StandardPackSuccessorRegistryRecord,
  StandardPackSuccessorReservationRequest,
  StandardPackSuccessorReservationResult,
} from "./contracts.js";

/** Provider-neutral durable boundary for global standard-pack successor commitments. */
export interface StandardPackSuccessorRegistryPort {
  /**
   * Reads the sole commitment for one predecessor index without granting release authority.
   * @param lookup Exact predecessor-index digest to resolve.
   * @returns The durable record, or null while that predecessor remains open.
   */
  read(
    lookup: Readonly<StandardPackSuccessorCommitmentLookup>,
  ): Promise<Readonly<StandardPackSuccessorRegistryRecord> | null>;

  /**
   * Atomically records one successor or returns the durable exact retry/conflict outcome.
   * @param request Hash-bound candidate, commitment, and trusted authorization claim.
   * @returns Reserved, replayed, or conflicting durable commitment outcome.
   */
  reserve(
    request: Readonly<StandardPackSuccessorReservationRequest>,
  ): Promise<Readonly<StandardPackSuccessorReservationResult>>;
}
