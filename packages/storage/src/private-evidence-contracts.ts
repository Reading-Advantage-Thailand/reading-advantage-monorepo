/** Company and optional school boundary attached to a private evidence read. */
export interface PrivateEvidenceScope {
  /** Company that owns the evidence reference. */
  readonly companyId: string;
  /** Optional school to which the evidence read is scoped. */
  readonly schoolId?: string;
}

/** Authenticated authorization context supplied by the Company Identity boundary. */
export type PrivateEvidenceAuthorization = Readonly<Record<string, unknown>>;

/** Authorization boundary for one exact private evidence reference and scope. */
export interface PrivateEvidenceAuthorizationPort {
  /**
   * Authorizes the exact reference, scope, and authenticated authorization context.
   * @param input Reference, scope, and authenticated authorization context to evaluate.
   * @returns The authorization decision for the requested read.
   */
  authorize(input: {
    readonly evidenceReference: string;
    readonly scope: PrivateEvidenceScope;
    readonly authorization: PrivateEvidenceAuthorization;
  }): Promise<PrivateEvidenceAuthorizationDecision>;
}

/** Provider-neutral authorization result for a private evidence read. */
export interface PrivateEvidenceAuthorizationDecision {
  /** Whether the exact requested private evidence read is allowed. */
  readonly decision: "allow" | "deny";
}

/** Bytes and minimal metadata returned by an injected private evidence driver. */
export interface PrivateEvidenceDriverReadResult {
  /** Private evidence payload bytes. */
  readonly bytes: Uint8Array;
  /** Content type reported by the private evidence store. */
  readonly contentType: string;
}

/** Provider-neutral bounded byte-read boundary for private evidence. */
export interface PrivateEvidenceDriver {
  /**
   * Reads one private evidence reference with a caller-provided byte bound.
   * @param input Exact reference, maximum byte count, and optional cancellation signal.
   * @returns Private bytes and minimal metadata needed for a provider-neutral snapshot.
   */
  read(input: {
    readonly evidenceReference: string;
    readonly maxBytes: number;
    readonly signal?: AbortSignal;
  }): Promise<PrivateEvidenceDriverReadResult>;
}

/** Input for an authorized, digest-bound private evidence read. */
export interface AuthorizedPrivateEvidenceReadInput {
  /** Exact immutable private evidence reference to read. */
  readonly evidenceReference: string;
  /** Company and optional school scope to bind to the reference. */
  readonly scope: PrivateEvidenceScope;
  /** Authenticated authorization context to pass to the authorization boundary. */
  readonly authorization: PrivateEvidenceAuthorization;
  /** Expected lowercase SHA-256 payload digest. */
  readonly expectedPayloadDigest: string;
  /** Positive finite integer maximum payload size in bytes. */
  readonly maxBytes: number;
  /** Optional cancellation signal for the storage read. */
  readonly signal?: AbortSignal;
}

/** Provider-neutral immutable snapshot returned after an authorized digest check. */
export interface AuthorizedPrivateEvidenceSnapshot {
  /** Exact private evidence reference that was authorized and read. */
  readonly evidenceReference: string;
  /** Exact lowercase SHA-256 digest verified for the returned bytes. */
  readonly payloadDigest: string;
  /** Bounded private evidence payload bytes. */
  readonly bytes: Uint8Array;
  /** Minimal provider-neutral payload metadata. */
  readonly metadata: {
    /** Number of bytes in the returned payload. */
    readonly contentLength: number;
    /** Content type reported by the private evidence store. */
    readonly contentType: string;
  };
}

/** Public reader boundary for authorized, bounded, digest-verified evidence. */
export interface AuthorizedPrivateEvidenceReader {
  /**
   * Reads one authorized private evidence object and returns a safe snapshot.
   * @param input Exact evidence reference, scope, authorization, digest, and byte bound.
   * @returns Provider-neutral snapshot containing only bounded verified bytes and metadata.
   */
  readAuthorizedEvidence(
    input: AuthorizedPrivateEvidenceReadInput,
  ): Promise<AuthorizedPrivateEvidenceSnapshot>;
}

/** Dependencies used to construct an authorized private evidence reader. */
export interface AuthorizedPrivateEvidenceReaderDependencies {
  /** Company Identity authorization boundary. */
  readonly authorizationPort: PrivateEvidenceAuthorizationPort;
  /** Provider-neutral private evidence byte reader. */
  readonly driver: PrivateEvidenceDriver;
  /** Payload digest function supplied by the caller. */
  readonly digest: (bytes: Uint8Array) => Promise<string>;
  /** Optional owner-controlled maximum byte ceiling for every read. */
  readonly maxBytes?: number;
}
