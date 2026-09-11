"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Owns quiz sessionStorage reads and writes.
 *
 * Server state remains the source of truth for quiz results; this hook only
 * persists in-progress answers under `quiz_progress_<key>` and the started
 * flag under `quiz_started_<key>` so a refresh mid-quiz does not lose answers.
 * @param storageKey Unique key for the quiz (article id or `storyId_chapter`).
 * @returns Started flag plus load, save, mark-started, and clear operations.
 */
export function useQuizProgress(storageKey: string) {
  const progressKey = `quiz_progress_${storageKey}`;
  const startedKey = `quiz_started_${storageKey}`;

  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    try {
      setHasStarted(sessionStorage.getItem(startedKey) === "true");
    } catch (error) {
      console.error("Failed to read from sessionStorage:", error);
      setHasStarted(false);
    }
  }, [startedKey]);

  const loadProgress = useCallback((): unknown | null => {
    try {
      const saved = sessionStorage.getItem(progressKey);
      return saved ? JSON.parse(saved) : null;
    } catch (error) {
      console.error("Failed to load progress from sessionStorage:", error);
      return null;
    }
  }, [progressKey]);

  const saveProgress = useCallback(
    (progress: unknown) => {
      try {
        sessionStorage.setItem(progressKey, JSON.stringify(progress));
      } catch (error) {
        console.error("Failed to save progress to sessionStorage:", error);
      }
    },
    [progressKey],
  );

  const markStarted = useCallback(() => {
    setHasStarted(true);
    try {
      sessionStorage.setItem(startedKey, "true");
    } catch (error) {
      console.error("Failed to save to sessionStorage:", error);
    }
  }, [startedKey]);

  const clear = useCallback(() => {
    setHasStarted(false);
    try {
      sessionStorage.removeItem(progressKey);
      sessionStorage.removeItem(startedKey);
    } catch (error) {
      console.error("Error clearing session storage:", error);
    }
  }, [progressKey, startedKey]);

  return { hasStarted, loadProgress, saveProgress, markStarted, clear };
}
