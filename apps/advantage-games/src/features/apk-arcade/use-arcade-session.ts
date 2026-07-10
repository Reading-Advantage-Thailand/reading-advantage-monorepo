"use client";

import { useEffect, useState } from "react";

import { sharedSessionResponseSchema } from "@/lib/auth/contracts";

/** Student session exposed to the production arcade UI. */
export type ArcadeSession = {
  /** Authenticated student identity resolved by the server. */
  user: {
    /** Stable server-owned user identifier. */
    id: string;
    /** Uppercase role admitted by the student-only session endpoint. */
    role: "STUDENT";
  };
};

/** State returned while the arcade resolves a private student session. */
export type ArcadeSessionState = {
  /** Resolved student session, or null when access must fail closed. */
  session: ArcadeSession | null;
  /** Browser-safe session lookup state. */
  status: "loading" | "authenticated" | "unauthenticated";
};

/** Resolves the current student through the app-local private session endpoint.
 * @returns The loading, authenticated, or fail-closed session state.
 */
export function useArcadeSession(): ArcadeSessionState {
  const [state, setState] = useState<ArcadeSessionState>({
    session: null,
    status: "loading",
  });

  useEffect(() => {
    const controller = new AbortController();

    void fetch("/api/auth/session", {
      cache: "no-store",
      credentials: "same-origin",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Session lookup failed.");
        return sharedSessionResponseSchema.parse(await response.json());
      })
      .then(({ session }) => {
        if (controller.signal.aborted) return;
        if (session?.user.role === "STUDENT") {
          setState({ session: session as ArcadeSession, status: "authenticated" });
          return;
        }
        setState({ session: null, status: "unauthenticated" });
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setState({ session: null, status: "unauthenticated" });
        }
      });

    return () => controller.abort();
  }, []);

  return state;
}
