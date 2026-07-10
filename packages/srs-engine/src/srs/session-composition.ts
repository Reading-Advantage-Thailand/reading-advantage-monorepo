/** Minimum review item fields required for deterministic interleaving. */
export interface InterleavableReviewItem {
  cardId: string;
  objectiveId: string;
  objectivePriority: 'essential' | 'supporting' | 'extension';
}

/** Inputs for deterministic interval fuzzing. */
export interface IntervalFuzzInput {
  cardId: string;
  reps: number;
  intervalDays: number;
}

/** Inputs for choosing the lightest due date inside a bounded fuzz window. */
export interface DueDateBalanceInput {
  baseDueDate: string;
  minimumDueDate: string;
  maximumDueDate: string;
  maximumIntervalDays: number;
  projectedLoadByDate: Readonly<Record<string, number>>;
}

const PRIORITY_ORDER: Readonly<Record<InterleavableReviewItem['objectivePriority'], number>> = {
  essential: 0,
  supporting: 1,
  extension: 2,
};

const DAY_MS = 86_400_000;

/**
 * Presents selected reviews round-robin across deterministically ordered objectives.
 * @param selectedReviews Review membership selected by the queue builder.
 * @returns A reordered copy with identical card membership.
 */
export function interleaveReviewItems<T extends InterleavableReviewItem>(
  selectedReviews: readonly T[],
): T[] {
  const groups = new Map<string, { priority: number; items: T[] }>();
  for (const item of selectedReviews) {
    const group = groups.get(item.objectiveId) ?? {
      priority: PRIORITY_ORDER[item.objectivePriority],
      items: [],
    };
    group.priority = Math.min(group.priority, PRIORITY_ORDER[item.objectivePriority]);
    group.items.push(item);
    groups.set(item.objectiveId, group);
  }

  const orderedGroups = [...groups.entries()].sort(
    ([objectiveA, groupA], [objectiveB, groupB]) =>
      groupA.priority - groupB.priority || objectiveA.localeCompare(objectiveB),
  );
  const offsets = new Map(orderedGroups.map(([objectiveId]) => [objectiveId, 0]));
  const result: T[] = [];

  while (result.length < selectedReviews.length) {
    for (const [objectiveId, group] of orderedGroups) {
      const offset = offsets.get(objectiveId) ?? 0;
      const item = group.items[offset];
      if (!item) continue;
      result.push(item);
      offsets.set(objectiveId, offset + 1);
    }
  }

  return result;
}

/**
 * Applies reproducible interval jitter within plus or minus five percent.
 * @param input Stable card identity, repetition count, and base interval.
 * @returns Fuzzed interval in days without mutable random state.
 */
export function fuzzIntervalDays(input: IntervalFuzzInput): number {
  if (!Number.isFinite(input.intervalDays) || input.intervalDays < 0) {
    throw new Error('intervalDays must be a non-negative finite number');
  }
  const fraction = stableHashFraction(`${input.cardId}:${input.reps}`);
  const jitter = fraction * 0.1 - 0.05;
  return input.intervalDays * (1 + jitter);
}

/**
 * Selects the lightest projected UTC day within a bounded interval window.
 * @param input Base/window dates, maximum interval, and per-day projected loads.
 * @returns ISO timestamp for the selected UTC day, with earliest-date tie-breaking.
 * @throws When dates or the maximum interval are invalid.
 */
export function balanceDueDate(input: DueDateBalanceInput): string {
  const baseMs = parseIso(input.baseDueDate, 'baseDueDate');
  const minimumMs = parseIso(input.minimumDueDate, 'minimumDueDate');
  const requestedMaximumMs = parseIso(input.maximumDueDate, 'maximumDueDate');
  if (!Number.isFinite(input.maximumIntervalDays) || input.maximumIntervalDays < 0) {
    throw new Error('maximumIntervalDays must be a non-negative finite number');
  }
  const maximumMs = Math.min(
    requestedMaximumMs,
    baseMs + input.maximumIntervalDays * DAY_MS,
  );
  if (minimumMs > maximumMs) throw new Error('due-date window is empty');

  let selectedMs = minimumMs;
  let selectedLoad = Number.POSITIVE_INFINITY;
  for (let candidateMs = minimumMs; candidateMs <= maximumMs; candidateMs += DAY_MS) {
    const dateKey = new Date(candidateMs).toISOString().slice(0, 10);
    const load = input.projectedLoadByDate[dateKey] ?? 0;
    if (load < selectedLoad) {
      selectedMs = candidateMs;
      selectedLoad = load;
    }
  }
  return new Date(selectedMs).toISOString();
}

function stableHashFraction(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0) / 0xffffffff;
}

function parseIso(value: string, field: string): number {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) throw new Error(`${field} must be an ISO timestamp`);
  return parsed;
}
