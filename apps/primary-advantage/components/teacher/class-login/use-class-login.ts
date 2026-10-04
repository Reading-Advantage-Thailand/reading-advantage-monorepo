"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { errorKey, postStudentLogin, type ClassLoginErrorKey, type ClassRoster } from "./api";

/** Time between two roster reads while the page is visible. */
export const ROSTER_POLL_MS = 10_000;

/**
 * Reads the live sign-in roster of a class and reads it again every 10 seconds while the page
 * is visible, and at once when the page becomes visible again. A response that arrives after a
 * newer request is dropped, so a slow old read never overwrites fresh data.
 * @param classroomId The class to read.
 * @returns The roster (null until the first read), the last error key, and a refresh function.
 */
export function useClassLogin(classroomId: string): {
  roster: ClassRoster | null;
  error: ClassLoginErrorKey | null;
  refresh: () => Promise<void>;
} {
  const [roster, setRoster] = useState<ClassRoster | null>(null);
  const [error, setError] = useState<ClassLoginErrorKey | null>(null);
  const latest = useRef(0);

  const refresh = useCallback(async () => {
    const request = ++latest.current;
    try {
      const next = await postStudentLogin<ClassRoster>("roster", { classroomId });
      if (request !== latest.current) return;
      setRoster(next);
      setError(null);
    } catch (caught) {
      if (request === latest.current) setError(errorKey(caught));
    }
  }, [classroomId]);

  useEffect(() => {
    void refresh();
    const onTick = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const timer = setInterval(onTick, ROSTER_POLL_MS);
    document.addEventListener("visibilitychange", onTick);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onTick);
    };
  }, [refresh]);

  return { roster, error, refresh };
}
