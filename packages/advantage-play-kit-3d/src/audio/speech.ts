/**
 * Read-aloud with the browser's own English voice (story packs have no audio files yet).
 * A real deployment would use the app's recorded or generated audio instead.
 */
let voice: SpeechSynthesisVoice | null = null;

function pickVoice(): SpeechSynthesisVoice | null {
  if (voice || !('speechSynthesis' in window)) return voice;
  const voices = window.speechSynthesis.getVoices().filter((v) => v.lang.startsWith('en'));
  voice = voices.find((v) => /en-US/i.test(v.lang) && /female|samantha|google/i.test(v.name)) ?? voices.find((v) => /en-US/i.test(v.lang)) ?? voices[0] ?? null;
  return voice;
}

export const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window;
// Chrome fills the voice list after the page loads: pick again when it changes.
if (canSpeak) window.speechSynthesis.addEventListener('voiceschanged', () => (voice = null));

/** Speaks `text` slowly; resolves when it ends (or at once when speech is not available). */
export function speak(text: string, rate = 0.85): Promise<void> {
  if (!canSpeak) return Promise.resolve();
  // Chrome on Android can drop a sentence that starts right after cancel(): cancel only when needed.
  if (window.speechSynthesis.speaking || window.speechSynthesis.pending) window.speechSynthesis.cancel();
  return new Promise((resolve) => {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US';
    u.rate = rate;
    const v = pickVoice();
    if (v) u.voice = v;
    u.onend = () => resolve();
    u.onerror = () => resolve();
    window.speechSynthesis.speak(u);
  });
}

export function stopSpeaking(): void {
  if (canSpeak) window.speechSynthesis.cancel();
}
