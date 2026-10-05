"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { isSoundMuted, playSound, setSoundMuted, SOUND_CHANGE_EVENT, type SoundName } from "@/lib/sounds";

/** The signed-in user id for the per-student mute setting; null outside the app shell. */
const SoundUserContext = createContext<string | null>(null);

/**
 * Gives every `useSound` below it the signed-in user, so the mute setting is stored per student.
 * @param props.userId The signed-in user id.
 * @param props.children The app content.
 * @returns The provider.
 */
export function SoundProvider({ userId, children }: { userId: string | null; children: ReactNode }) {
  return <SoundUserContext.Provider value={userId}>{children}</SoundUserContext.Provider>;
}

/**
 * Sound for the signed-in student (FR-9): `play` is silent while muted, and `muted` follows the
 * setting stored for this student, also when another component changes it. Outside a
 * `SoundProvider` the setting is stored for "anonymous".
 * @returns The mute state, a setter, and the play function.
 */
export function useSound() {
  const userId = useContext(SoundUserContext);
  const [muted, setMutedState] = useState(false);

  useEffect(() => {
    setMutedState(isSoundMuted(userId));
    const follow = () => setMutedState(isSoundMuted(userId));
    window.addEventListener(SOUND_CHANGE_EVENT, follow);
    return () => window.removeEventListener(SOUND_CHANGE_EVENT, follow);
  }, [userId]);

  const setMuted = useCallback((next: boolean) => setSoundMuted(userId, next), [userId]);
  const play = useCallback((name: SoundName) => playSound(name, userId), [userId]);

  return { muted, setMuted, play };
}
