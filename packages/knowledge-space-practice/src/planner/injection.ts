/**
 * Domain-neutral planner injection — merges remediation activities into the
 * normal next-activities list. Injected activities are prepended; duplicates
 * by activityId are resolved in favor of the injected copy (it stays at the
 * front and the matching next-list entry is removed).
 *
 * Pure function, no I/O, no app imports.
 */

export interface PlannedActivity {
  readonly activityId: string;
  readonly activityKind: 'worked_example' | 'task_blueprint' | 'skill';
  readonly label: string;
}

export interface PlanRemediationInjectionInput {
  readonly nextActivities: readonly PlannedActivity[];
  readonly injectedActivities: readonly PlannedActivity[];
}

/**
 * Merge injected remediation activities ahead of the normal next list.
 * Dedup policy: if the same activityId appears in both lists, the injected
 * copy wins (stays at the front) and the matching next-list entry is removed.
 *
 * @returns {readonly PlannedActivity[]} - A new array; does not mutate inputs.
 */
export function planRemediationInjection(
  input: PlanRemediationInjectionInput,
): readonly PlannedActivity[] {
  const { nextActivities, injectedActivities } = input;

  if (injectedActivities.length === 0) {
    return nextActivities;
  }

  const injectedIds = new Set(injectedActivities.map((a) => a.activityId));

  const filteredNext = nextActivities.filter((a) => !injectedIds.has(a.activityId));

  return [...injectedActivities, ...filteredNext];
}
