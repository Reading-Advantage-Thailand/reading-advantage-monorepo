"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ClassLoginApiError, errorKey, postStudentLogin, type ClassLoginErrorKey, type ClassRoster, type Lockout } from "./api";

/** Time between two roster reads while the page is visible. */
export const ROSTER_POLL_MS = 10_000;

// Signed out, no permission, or no class: a later read cannot succeed, so polling stops.
const STOP_POLLING_STATUSES = new Set([401, 403, 404]);

/**
 * Reads the live sign-in roster and the locked students of a class, and reads them again every
 * 10 seconds while the page is visible, and at once when the page becomes visible again. A
 * response that arrives after a newer request is dropped, so a slow old read never overwrites
 * fresh data. Polling stops after a 401, 403, or 404 response.
 * @param classroomId The class to read.
 * @returns The roster (null until the first read), the locked students, the time of the last
 * read in milliseconds, the last error key, and a refresh function.
 */
export function useClassLogin(classroomId: string): {
  roster: ClassRoster | null;
  locked: Lockout[];
  fetchedAt: number;
  error: ClassLoginErrorKey | null;
  refresh: () => Promise<void>;
} {
  const [data, setData] = useState<{ roster: ClassRoster; locked: Lockout[]; fetchedAt: number } | null>(null);
  const [error, setError] = useState<ClassLoginErrorKey | null>(null);
  const latest = useRef(0);
  const stopped = useRef(false);

  const refresh = useCallback(async () => {
    const request = ++latest.current;
    try {
      const [roster, lockouts] = await Promise.all([
        postStudentLogin<ClassRoster>("roster", { classroomId }),
        postStudentLogin<{ locked: Lockout[] }>("lockouts", { classroomId }),
      ]);
      if (request !== latest.current) return;
      setData({ roster, locked: lockouts.locked, fetchedAt: Date.now() });
      setError(null);
    } catch (caught) {
      if (caught instanceof ClassLoginApiError && STOP_POLLING_STATUSES.has(caught.status)) stopped.current = true;
      if (request === latest.current) setError(errorKey(caught));
    }
  }, [classroomId]);

  useEffect(() => {
    stopped.current = false;
    void refresh();
    const onTick = () => {
      if (!stopped.current && document.visibilityState === "visible") void refresh();
    };
    const timer = setInterval(onTick, ROSTER_POLL_MS);
    document.addEventListener("visibilitychange", onTick);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onTick);
    };
  }, [refresh]);

  return { roster: data?.roster ?? null, locked: data?.locked ?? [], fetchedAt: data?.fetchedAt ?? 0, error, refresh };
}
