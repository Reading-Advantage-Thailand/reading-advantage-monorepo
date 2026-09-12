"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  equipRpgCosmeticInputSchema,
  equipRpgCosmeticResultSchema,
  studentRpgStateSchema,
  type RpgCosmetic,
  type RpgCosmeticId,
  type StudentRpgState,
} from "@reading-advantage/game-contracts";

/** Configuration for one authenticated RPG state owner. */
export interface UseStudentRpgOptions {
  /** Authenticated RPG route used for GET and PATCH requests. */
  readonly endpoint: string;
  /** Stable identity key for the authenticated student. */
  readonly ownerKey: string;
  /** Enables RPG requests for authenticated student surfaces. */
  readonly enabled?: boolean;
}

/** State and actions returned by the shared RPG hook. */
export interface UseStudentRpgResult {
  /** Last validated state for the current endpoint and owner. */
  readonly state: StudentRpgState | null;
  /** Whether the hook is loading RPG state. */
  readonly loading: boolean;
  /** Cosmetic waiting for equipment confirmation. */
  readonly pendingCosmeticId: RpgCosmeticId | null;
  /** Current read or equip failure. */
  readonly failureMessage: string | null;
  /** Newly confirmed unlocks since the current session baseline. */
  readonly newlyUnlockedCosmetics: readonly RpgCosmetic[];
  /** Records the confirmed unlock baseline and clears an earlier notice. */
  readonly beginSession: () => void;
  /** Refreshes state after the caller confirms a saved completion. */
  readonly refreshAfterSavedCompletion: () => Promise<void>;
  /** Requests equipment and reloads confirmed state. */
  readonly equip: (cosmeticId: RpgCosmeticId) => Promise<void>;
  /** Retries the exact failed operation. */
  readonly retry: () => Promise<void>;
}

type RetryAction =
  | { readonly kind: "read" }
  | { readonly kind: "refresh" }
  | { readonly kind: "equip"; readonly cosmeticId: RpgCosmeticId };

type ScopedState = {
  readonly scope: string;
  readonly value: StudentRpgState;
};

/** Returns true when an error came from an intentional request cancellation. */
function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

/**
 * Loads and updates validated RPG state for one authenticated student.
 * @param options Endpoint, stable owner identity, and request enablement.
 * @returns Confirmed state, request status, reward notices, and host actions.
 */
export function useStudentRpg({
  endpoint,
  ownerKey,
  enabled = true,
}: UseStudentRpgOptions): UseStudentRpgResult {
  const scope = useMemo(() => JSON.stringify([endpoint, ownerKey]), [endpoint, ownerKey]);
  const generationRef = useRef(0);
  const equipRequestRef = useRef(0);
  const readRequestRef = useRef(0);
  const readPendingRef = useRef(false);
  const controllerRef = useRef<AbortController | null>(null);
  const baselineRef = useRef<{ scope: string; ids: ReadonlySet<RpgCosmeticId> } | null>(null);
  const retryActionRef = useRef<RetryAction | null>(null);
  const [confirmed, setConfirmed] = useState<ScopedState | null>(null);
  const [loading, setLoading] = useState(false);
  const [pendingCosmeticId, setPendingCosmeticId] = useState<RpgCosmeticId | null>(null);
  const [failureMessage, setFailureMessage] = useState<string | null>(null);
  const [newlyUnlockedCosmetics, setNewlyUnlockedCosmetics] = useState<readonly RpgCosmetic[]>([]);
  const visibleState = enabled && confirmed?.scope === scope ? confirmed.value : null;

  const readState = useCallback(async (action: RetryAction): Promise<StudentRpgState | null> => {
    if (!enabled) return null;
    const generation = generationRef.current;
    const readRequest = readRequestRef.current + 1;
    readRequestRef.current = readRequest;
    readPendingRef.current = true;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setLoading(true);
    setFailureMessage(null);
    try {
      const response = await fetch(endpoint, {
        method: "GET",
        credentials: "same-origin",
        signal: controller.signal,
      });
      if (!response.ok) throw new Error("Rewards could not be loaded. Try again.");
      const nextState = studentRpgStateSchema.parse(await response.json());
      if (generation !== generationRef.current || controller.signal.aborted) return null;
      setConfirmed({ scope, value: nextState });
      retryActionRef.current = null;
      return nextState;
    } catch (error) {
      if (generation !== generationRef.current || controller.signal.aborted || isAbortError(error)) return null;
      retryActionRef.current = action;
      setFailureMessage("Rewards could not be loaded. Try again.");
      return null;
    } finally {
      if (readRequest === readRequestRef.current) readPendingRef.current = false;
      if (generation === generationRef.current && !controller.signal.aborted) setLoading(false);
    }
  }, [enabled, endpoint, scope]);

  const refreshAfterSavedCompletion = useCallback(async () => {
    if (!enabled) return;
    const baseline = baselineRef.current;
    const nextState = await readState({ kind: "refresh" });
    if (!nextState || baseline === null || baselineRef.current !== baseline || baseline.scope !== scope) return;
    setNewlyUnlockedCosmetics(nextState.cosmetics.filter(
      (cosmetic) => cosmetic.unlockedAt !== null && !baseline.ids.has(cosmetic.id),
    ));
  }, [enabled, readState, scope]);

  const equip = useCallback(async (cosmeticId: RpgCosmeticId) => {
    if (!enabled) return;
    const input = equipRpgCosmeticInputSchema.parse({ cosmeticId });
    const generation = generationRef.current;
    const equipRequest = equipRequestRef.current + 1;
    equipRequestRef.current = equipRequest;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setPendingCosmeticId(cosmeticId);
    setFailureMessage(null);
    try {
      const response = await fetch(endpoint, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error("Reward could not be equipped. Try again.");
      equipRpgCosmeticResultSchema.parse(await response.json());
      if (generation !== generationRef.current || controller.signal.aborted) return;
      retryActionRef.current = null;
      await readState({ kind: "read" });
    } catch (error) {
      if (generation !== generationRef.current || controller.signal.aborted || isAbortError(error)) return;
      retryActionRef.current = { kind: "equip", cosmeticId };
      setFailureMessage("Reward could not be equipped. Try again.");
    } finally {
      if (generation === generationRef.current && equipRequest === equipRequestRef.current) {
        setPendingCosmeticId(null);
      }
    }
  }, [enabled, endpoint, readState]);

  const beginSession = useCallback(() => {
    if (!enabled) return;
    const current = confirmed?.scope === scope ? confirmed.value : null;
    baselineRef.current = current && !readPendingRef.current ? {
      scope,
      ids: new Set(current.cosmetics.filter(({ unlockedAt }) => unlockedAt !== null).map(({ id }) => id)),
    } : null;
    setNewlyUnlockedCosmetics([]);
  }, [confirmed, enabled, scope]);

  const retry = useCallback(async () => {
    if (!enabled) return;
    const action = retryActionRef.current;
    if (!action) return;
    if (action.kind === "equip") await equip(action.cosmeticId);
    else if (action.kind === "refresh") await refreshAfterSavedCompletion();
    else await readState(action);
  }, [enabled, equip, readState, refreshAfterSavedCompletion]);

  useEffect(() => {
    generationRef.current += 1;
    equipRequestRef.current += 1;
    readRequestRef.current += 1;
    readPendingRef.current = false;
    controllerRef.current?.abort();
    baselineRef.current = null;
    retryActionRef.current = null;
    setConfirmed(null);
    setFailureMessage(null);
    setPendingCosmeticId(null);
    setNewlyUnlockedCosmetics([]);
    setLoading(enabled);
    if (enabled) void readState({ kind: "read" });
    return () => {
      generationRef.current += 1;
      controllerRef.current?.abort();
    };
  }, [enabled, readState, scope]);

  return {
    state: visibleState,
    loading: enabled && loading,
    pendingCosmeticId: visibleState ? pendingCosmeticId : null,
    failureMessage: enabled ? failureMessage : null,
    newlyUnlockedCosmetics: visibleState ? newlyUnlockedCosmetics : [],
    beginSession,
    refreshAfterSavedCompletion,
    equip,
    retry,
  };
}
