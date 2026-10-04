import { consumeRateLimit, type RateLimitConfig, type RateLimitStore } from "@reading-advantage/auth";
import { StudentLoginError } from "./errors.js";

/** Window and maximum of each student-login bucket (FR-2). */
export const STUDENT_LOGIN_LIMITS = {
  /** All code and picture requests from one IP. A school can share one IP, so the limit is high. */
  ip: { windowMs: 10 * 60 * 1000, maxAttempts: 150 } satisfies RateLimitConfig,
  /** All name-list and picture requests for one class. */
  classroom: { windowMs: 10 * 60 * 1000, maxAttempts: 200 } satisfies RateLimitConfig,
  /** Failed code lookups from every IP together. Guards the 30-bit code space. */
  globalMiss: { windowMs: 10 * 60 * 1000, maxAttempts: 200 } satisfies RateLimitConfig,
  /** Failed QR card scans from one IP. Successful scans do not count, so a class can scan together. */
  cardMiss: { windowMs: 10 * 60 * 1000, maxAttempts: 30 } satisfies RateLimitConfig,
} as const;

const GLOBAL_MISS_KEY = "username:student-code-miss-global";

function limited(retriesAfter: number | undefined): StudentLoginError {
  return new StudentLoginError("rate_limited", "Too many attempts. Try again later.", retriesAfter ?? 60);
}

/**
 * Charges one code or picture request to the IP bucket and checks the global miss bucket.
 * @param store Shared rate-limit store.
 * @param ip Client IP, or null when unknown (all unknown clients share one bucket).
 * @returns Resolves when the request may go on.
 * @throws {StudentLoginError} With code `rate_limited` when a bucket is full.
 */
export async function guardCodeEntry(store: RateLimitStore, ip: string | null): Promise<void> {
  const ipResult = await consumeRateLimit(store, `ip:${ip ?? "unknown"}`, STUDENT_LOGIN_LIMITS.ip);
  if (!ipResult.allowed) throw limited(ipResult.retriesAfter);
  const now = Date.now();
  const entry = await store.get(GLOBAL_MISS_KEY);
  const config = STUDENT_LOGIN_LIMITS.globalMiss;
  if (entry && now - entry.windowStart < config.windowMs && entry.failedCount >= config.maxAttempts) {
    throw limited(Math.ceil((config.windowMs - (now - entry.windowStart)) / 1000));
  }
}

/**
 * Counts one failed code lookup in the global miss bucket.
 * @param store Shared rate-limit store.
 * @returns Resolves when the miss is stored.
 */
export async function recordCodeMiss(store: RateLimitStore): Promise<void> {
  await consumeRateLimit(store, GLOBAL_MISS_KEY, STUDENT_LOGIN_LIMITS.globalMiss);
}

/**
 * Charges one request to the class bucket.
 * @param store Shared rate-limit store.
 * @param classroomId The class the code belongs to.
 * @returns Resolves when the request may go on.
 * @throws {StudentLoginError} With code `rate_limited` when the bucket is full.
 */
export async function guardClassAttempt(store: RateLimitStore, classroomId: string): Promise<void> {
  const result = await consumeRateLimit(
    store,
    `username:student-code-class:${classroomId}`,
    STUDENT_LOGIN_LIMITS.classroom,
  );
  if (!result.allowed) throw limited(result.retriesAfter);
}

const cardMissKey = (ip: string | null) => `username:student-card-miss:${ip ?? "unknown"}`;

/**
 * Checks that the IP has not used up its failed card scans. It does not count the request.
 * @param store Shared rate-limit store.
 * @param ip Client IP, or null when unknown (all unknown clients share one bucket).
 * @returns Resolves when the scan may go on.
 * @throws {StudentLoginError} With code `rate_limited` when the IP has too many failed scans.
 */
export async function guardCardScan(store: RateLimitStore, ip: string | null): Promise<void> {
  const now = Date.now();
  const entry = await store.get(cardMissKey(ip));
  const config = STUDENT_LOGIN_LIMITS.cardMiss;
  if (entry && now - entry.windowStart < config.windowMs && entry.failedCount >= config.maxAttempts) {
    throw limited(Math.ceil((config.windowMs - (now - entry.windowStart)) / 1000));
  }
}

/**
 * Counts one failed card scan for the IP.
 * @param store Shared rate-limit store.
 * @param ip Client IP, or null when unknown.
 * @returns Resolves when the miss is stored.
 */
export async function recordCardMiss(store: RateLimitStore, ip: string | null): Promise<void> {
  await consumeRateLimit(store, cardMissKey(ip), STUDENT_LOGIN_LIMITS.cardMiss);
}
