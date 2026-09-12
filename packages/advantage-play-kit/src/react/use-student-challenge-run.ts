"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  studentChallengeRunLaunchSchema,
  type StudentChallengeRunLaunch,
} from "@reading-advantage/game-contracts";
import { z } from "zod";

const startRunInputSchema = z.object({ challengeId: z.string().uuid() }).strict();
const DEFAULT_ENDPOINT = "/api/v1/apk/challenges/runs";
const LOAD_FAILURE = "The challenge could not start. Try again.";
const AUDIO_FAILURE = "This challenge needs prepared answer audio, which is unavailable.";

/** Configuration for one server-issued student challenge run. */
export interface UseStudentChallengeRunOptions {
  /** Stable identity key for the authenticated owner. */
  readonly ownerKey: string;
  /** Challenge selected by the authenticated owner. */
  readonly challengeId?: string | null;
  /** Authenticated route that issues challenge runs. */
  readonly endpoint?: string;
  /** Enables requests for an authenticated owner and selected challenge. */
  readonly enabled?: boolean;
}

/** State returned for one validated reading challenge run. */
export interface UseStudentChallengeRunResult {
  /** Validated server launch for the current owner and challenge. */
  readonly launch: StudentChallengeRunLaunch | null;
  /** Whether the current run request is pending. */
  readonly loading: boolean;
  /** Current launch failure. */
  readonly failureMessage: string | null;
  /** Retries the current owner and challenge request. */
  readonly retry: () => Promise<void>;
}

type ScopedLaunch = {
  readonly scope: string;
  readonly value: StudentChallengeRunLaunch;
};

type ScopedStatus = {
  readonly scope: string;
  readonly loading: boolean;
  readonly failureMessage: string | null;
};

/** Returns true when an error came from an intentional request cancellation. */
function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

/**
 * Starts and validates one server-issued reading challenge run.
 * @param endpoint The authenticated run endpoint.
 * @param challengeId The selected challenge identifier.
 * @param signal The request cancellation signal.
 * @returns The validated server launch.
 * @throws When the route fails, the launch mismatches, or answer audio is required.
 */
export async function startStudentReadingChallengeRun(
  endpoint: string,
  challengeId: string,
  signal: AbortSignal,
): Promise<StudentChallengeRunLaunch> {
  const input = startRunInputSchema.parse({ challengeId });
  const response = await fetch(endpoint, {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
    signal,
  });
  if (!response.ok) throw new Error(LOAD_FAILURE);
  const launch = studentChallengeRunLaunchSchema.parse(await response.json());
  if (launch.challengeId !== challengeId) throw new Error(LOAD_FAILURE);
  if (launch.challenge.modality.modality !== "reading") throw new Error(AUDIO_FAILURE);
  return launch;
}

/**
 * Retains one validated server-issued reading launch for the current owner scope.
 * @param options Owner scope, challenge selection, endpoint, and request enablement.
 * @returns The current launch, request status, failure, and retry action.
 */
export function useStudentChallengeRun({
  ownerKey,
  challengeId = null,
  endpoint = DEFAULT_ENDPOINT,
  enabled = true,
}: UseStudentChallengeRunOptions): UseStudentChallengeRunResult {
  const canStart = enabled && ownerKey.length > 0 && challengeId !== null;
  const scope = useMemo(
    () => JSON.stringify([endpoint, ownerKey, challengeId]),
    [challengeId, endpoint, ownerKey],
  );
  const generationRef = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);
  const [confirmed, setConfirmed] = useState<ScopedLaunch | null>(null);
  const [status, setStatus] = useState<ScopedStatus | null>(null);
  const visibleLaunch = canStart && confirmed?.scope === scope ? confirmed.value : null;
  const visibleStatus = canStart && status?.scope === scope ? status : null;

  const start = useCallback(async () => {
    if (!canStart || challengeId === null) return;
    const generation = generationRef.current;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setConfirmed(null);
    setStatus({ scope, loading: true, failureMessage: null });
    try {
      const launch = await startStudentReadingChallengeRun(endpoint, challengeId, controller.signal);
      if (generation !== generationRef.current || controller.signal.aborted) return;
      setConfirmed({ scope, value: launch });
    } catch (error) {
      if (generation !== generationRef.current || controller.signal.aborted || isAbortError(error)) return;
      setStatus({
        scope,
        loading: false,
        failureMessage: error instanceof Error && error.message === AUDIO_FAILURE ? AUDIO_FAILURE : LOAD_FAILURE,
      });
    } finally {
      if (generation === generationRef.current && !controller.signal.aborted) {
        setStatus((current) => current?.scope === scope
          ? { ...current, loading: false }
          : current);
      }
    }
  }, [canStart, challengeId, endpoint, scope]);

  const retry = useCallback(async () => {
    await start();
  }, [start]);

  useEffect(() => {
    generationRef.current += 1;
    controllerRef.current?.abort();
    setConfirmed(null);
    setStatus(canStart ? { scope, loading: true, failureMessage: null } : null);
    if (canStart) void start();
    return () => {
      generationRef.current += 1;
      controllerRef.current?.abort();
    };
  }, [canStart, scope, start]);

  return {
    launch: visibleLaunch,
    loading: visibleStatus?.loading ?? false,
    failureMessage: visibleStatus?.failureMessage ?? null,
    retry,
  };
}
