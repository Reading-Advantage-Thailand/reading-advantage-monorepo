/**
 * Web Audio sound set for Primary (FR-9), ported from the Tutor Advantage student app. Every
 * sound is a short synth tone, so no audio file is loaded. `playSound` is silent on the server,
 * in a browser without the Web Audio API, and while the student has muted sound.
 */

/** The sounds the app can play. */
export type SoundName = "select" | "submit" | "correct" | "incorrect" | "celebration" | "phaseChange" | "ready" | "notification";

/** The localStorage key prefix of the per-student mute setting. */
export const SOUND_MUTED_KEY_PREFIX = "pa:sound:muted:";
/** Window event sent when the mute setting changes, so every `useSound` hook follows. */
export const SOUND_CHANGE_EVENT = "pa:sound:change";

/**
 * Builds the localStorage key of a student's mute setting.
 * @param userId The signed-in user id, or empty when unknown.
 * @returns The key.
 */
export function soundMutedKey(userId: string | null | undefined): string {
  return `${SOUND_MUTED_KEY_PREFIX}${userId || "anonymous"}`;
}

/**
 * Reads the mute setting of a student.
 * @param userId The signed-in user id.
 * @returns True when the student muted sound. Sound is on by default.
 */
export function isSoundMuted(userId: string | null | undefined): boolean {
  try {
    return typeof window !== "undefined" && window.localStorage.getItem(soundMutedKey(userId)) === "1";
  } catch {
    return false;
  }
}

/**
 * Stores the mute setting of a student and tells every listener.
 * @param userId The signed-in user id.
 * @param muted True to mute.
 */
export function setSoundMuted(userId: string | null | undefined, muted: boolean): void {
  try {
    if (muted) window.localStorage.setItem(soundMutedKey(userId), "1");
    else window.localStorage.removeItem(soundMutedKey(userId));
  } catch {
    // Private mode or a full store: the setting lives only for this page.
  }
  window.dispatchEvent(new CustomEvent(SOUND_CHANGE_EVENT, { detail: { userId: userId || "anonymous", muted } }));
}

let audioCtx: AudioContext | null = null;

/**
 * Returns the shared AudioContext, created on first use and resumed when the browser suspended it.
 * @returns The context, or null when the browser has no Web Audio API.
 */
function getAudioContext(): AudioContext | null {
  const Ctor = window.AudioContext ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  const ctx = audioCtx ?? new Ctor();
  audioCtx = ctx;
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

/**
 * Plays one tone.
 * @param frequency Frequency in Hz.
 * @param duration Length in seconds.
 * @param type The oscillator wave.
 * @param volume Peak gain, 0 to 1.
 * @param delay Start delay in seconds.
 */
function tone(frequency: number, duration: number, type: OscillatorType, volume: number, delay = 0): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  const start = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.01, start + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration);
}

/** The tones of each sound: frequency, duration, wave, volume, and start delay. */
const SOUNDS: Record<SoundName, [number, number, OscillatorType, number, number][]> = {
  select: [[700, 0.05, "sine", 0.15, 0]],
  submit: [[880, 0.08, "sine", 0.2, 0], [1100, 0.12, "sine", 0.15, 0.06]],
  correct: [[523.25, 0.12, "sine", 0.2, 0], [659.25, 0.12, "sine", 0.2, 0.08], [783.99, 0.25, "sine", 0.25, 0.16]],
  incorrect: [[400, 0.15, "triangle", 0.2, 0], [320, 0.25, "triangle", 0.2, 0.12]],
  celebration: [[523.25, 0.15, "sine", 0.15, 0], [659.25, 0.15, "sine", 0.15, 0.1], [783.99, 0.15, "sine", 0.15, 0.2], [1046.5, 0.3, "sine", 0.2, 0.3]],
  phaseChange: [[523.25, 0.15, "sine", 0.2, 0], [659.25, 0.25, "sine", 0.2, 0.1]],
  ready: [[1046.5, 0.15, "sine", 0.2, 0]],
  notification: [[880, 0.5, "sine", 0.3, 0], [1108.73, 0.4, "sine", 0.3, 0.1]],
};

/**
 * Plays a sound unless the student muted sound. Never throws.
 * @param name The sound.
 * @param userId The signed-in user id, for the mute setting.
 */
export function playSound(name: SoundName, userId?: string | null): void {
  if (typeof window === "undefined" || isSoundMuted(userId)) return;
  try {
    for (const [frequency, duration, type, volume, delay] of SOUNDS[name]) tone(frequency, duration, type, volume, delay);
  } catch {
    // A blocked or broken audio context must never break the page.
  }
}
