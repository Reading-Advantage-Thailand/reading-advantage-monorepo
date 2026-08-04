"use client";

import { useRef, useState } from "react";

/** Raw text state and change plumbing for one JSON-edited field. */
export interface JsonFieldState {
  /** Raw text currently shown in the textarea. */
  value: string;
  /** Human parse-error message, or null while the text parses. */
  error: string | null;
  /** Updates the raw text, propagating only successful parses upward. */
  handleChange: (next: string) => void;
}

/**
 * Manages raw JSON text for one editor field so intermediate invalid JSON does
 * not get reverted by a fully controlled textarea.
 *
 * The raw text lives in local state and is propagated upward only when it
 * parses. When the upstream value identity changes externally (a server
 * refresh, a save round-trip), the raw text re-syncs from the new value.
 * @param upstream Structured value owned by the parent, or undefined when empty.
 * @param format Serializer producing the initial raw text from the upstream value.
 * @param onParsed Called with the parsed value when the raw text parses.
 * @returns Raw text, parse error, and the change handler; see JsonFieldState.
 */
export function useJsonField<T>(
  upstream: T | undefined,
  format: (value: T | undefined) => string,
  onParsed: (parsed: unknown) => void,
): JsonFieldState {
  const [value, setValue] = useState<string>(() => format(upstream));
  const [error, setError] = useState<string | null>(null);
  const upstreamRef = useRef(upstream);
  if (upstream !== upstreamRef.current) {
    upstreamRef.current = upstream;
    setValue(format(upstream));
    setError(null);
  }

  const handleChange = (next: string) => {
    setValue(next);
    try {
      const parsed: unknown = JSON.parse(next);
      setError(null);
      onParsed(parsed);
    } catch {
      setError("Invalid JSON. Fix the syntax to save this field.");
    }
  };

  return { value, error, handleChange };
}
