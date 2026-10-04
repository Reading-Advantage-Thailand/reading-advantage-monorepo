/**
 * Sound for every game, synthesized with Web Audio (no files to download): short effects and a
 * soft looping tune in a few moods. Games add their own effects with `defineSfx` and their own
 * tunes with `defineMood`. Nothing plays before the first user gesture (browser rule);
 * `installAudioUnlock` unlocks on every tap and key, which also resumes sound after a phone lock.
 */

/** Builds sounds from tones and noise; the argument of every `defineSfx` recipe. */
export interface Synth {
  /** A tone of `freq` Hz for `dur` s; `slide` multiplies the pitch over the tone; `when` delays it. */
  tone(freq: number, dur: number, type: OscillatorType, gain: number, when?: number, slide?: number): void;
  /** Low-passed white noise (hits, whooshes, fizz). */
  noise(dur: number, gain: number, cutoff: number, when?: number): void;
}

export type SfxRecipe = (s: Synth) => void;

/** A looping tune: one chord per bar, eighth-note arpeggio, bass on each bar, optional drum. */
export interface Mood {
  bpm: number;
  /** MIDI notes of each bar's chord. */
  chords: number[][];
  /** Play every eighth (true) or every quarter (false). */
  busy: boolean;
  /** A low drum on beats 1 and 3. */
  drum: boolean;
}

const MINOR_VAULT = [
  [57, 60, 64],
  [53, 57, 60],
  [55, 59, 62],
  [52, 55, 59],
];

const BUILT_IN_MOODS: Record<string, Mood> = {
  calm: { bpm: 80, chords: MINOR_VAULT, busy: false, drum: false },
  battle: { bpm: 104, chords: MINOR_VAULT, busy: true, drum: false },
  boss: { bpm: 132, chords: MINOR_VAULT, busy: true, drum: true },
};

const BUILT_IN_SFX: Record<string, SfxRecipe> = {
  tap: (s) => s.tone(700, 0.06, 'sine', 0.15, 0, 0.7),
  page: (s) => s.noise(0.12, 0.12, 2400),
  correct: (s) => [523, 659, 784, 1047].forEach((f, i) => s.tone(f, 0.35, 'triangle', 0.18, i * 0.07)),
  wrong: (s) => {
    s.tone(330, 0.22, 'triangle', 0.16, 0, 0.8);
    s.tone(262, 0.32, 'triangle', 0.14, 0.14, 0.85);
  },
  hit: (s) => {
    s.tone(140, 0.25, 'sine', 0.5, 0, 0.4);
    s.noise(0.14, 0.25, 1800);
  },
  whoosh: (s) => s.noise(0.35, 0.22, 900),
  spawn: (s) => {
    s.tone(110, 0.8, 'sawtooth', 0.12, 0, 0.6);
    s.noise(0.6, 0.12, 500);
  },
  roar: (s) => {
    s.tone(95, 1.4, 'sawtooth', 0.25, 0, 0.55);
    s.tone(140, 1.2, 'square', 0.08, 0.05, 0.6);
    s.noise(1.2, 0.3, 700);
  },
  defeat: (s) => [392, 330, 262].forEach((f, i) => s.tone(f, 0.25, 'triangle', 0.12, i * 0.09, 0.9)),
  heal: (s) => [1047, 1319, 1568, 2093].forEach((f, i) => s.tone(f, 0.4, 'sine', 0.08, i * 0.06)),
  victory: (s) => [523, 659, 784, 1047, 784, 1047].forEach((f, i) => s.tone(f, i === 5 ? 0.9 : 0.28, 'square', 0.1, i * 0.13)),
};

const hz = (midi: number): number => 440 * Math.pow(2, (midi - 69) / 12);

export class AudioBus {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private timer = 0;
  private nextNote = 0;
  private step = 0;
  private mood = 'none';
  private readonly sfx = new Map(Object.entries(BUILT_IN_SFX));
  private readonly moods = new Map(Object.entries(BUILT_IN_MOODS));
  private suspended = false;
  muted = false;

  /** Adds or replaces an effect (a game's own sounds). */
  defineSfx(name: string, recipe: SfxRecipe): void {
    this.sfx.set(name, recipe);
  }

  /** Adds or replaces a music mood. */
  defineMood(name: string, mood: Mood): void {
    this.moods.set(name, mood);
  }

  /**
   * Call from a user gesture: it creates the context on the first one, and resumes it after the
   * phone suspends it (a lock, a call). `installAudioUnlock` calls it for every gesture.
   */
  unlock(): void {
    // iPhone: Web Audio obeys the ring/silent switch unless the page asks for media playback.
    const session = (navigator as unknown as { audioSession?: { type: string } }).audioSession;
    if (session && session.type !== 'playback') session.type = 'playback';
    if (this.ctx) {
      if (this.ctx.state !== 'running' && !this.suspended) void this.ctx.resume();
      return;
    }
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.8;
    this.master.connect(this.ctx.destination);
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.22;
    this.musicGain.connect(this.master);
    // Older iPhones start the context only when a sound starts inside the gesture.
    const silence = this.ctx.createBufferSource();
    silence.buffer = this.ctx.createBuffer(1, 1, 22050);
    silence.connect(this.ctx.destination);
    silence.start(0);
    void this.ctx.resume();
    if (this.mood !== 'none') this.music(this.mood);
  }

  setMuted(m: boolean): void {
    this.muted = m;
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 0.8, this.ctx.currentTime, 0.05);
  }

  /** Stops all sound while the game is paused (the APK `pause()`); a tap does not resume it. */
  suspend(): void {
    this.suspended = true;
    void this.ctx?.suspend();
  }

  resume(): void {
    this.suspended = false;
    void this.ctx?.resume();
  }

  play(name: string): void {
    if (!this.ctx) return;
    this.sfx.get(name)?.(this.synth(this.master));
  }

  /** Starts, changes, or stops ('none') the looping tune. */
  music(mood: string): void {
    this.mood = mood;
    if (!this.ctx) return;
    if (mood === 'none' || !this.moods.has(mood)) {
      window.clearInterval(this.timer);
      this.timer = 0;
      return;
    }
    if (this.timer) return;
    this.nextNote = this.ctx.currentTime + 0.1;
    this.timer = window.setInterval(() => this.schedule(), 100);
  }

  dispose(): void {
    window.clearInterval(this.timer);
    this.timer = 0;
    void this.ctx?.close();
    this.ctx = null;
  }

  private synth(dest: AudioNode | null): Synth {
    return {
      tone: (freq, dur, type, gain, when = 0, slide = 0) => this.tone(freq, dur, type, gain, when, slide, dest),
      noise: (dur, gain, cutoff, when = 0) => this.noise(dur, gain, cutoff, when, dest),
    };
  }

  private tone(freq: number, dur: number, type: OscillatorType, gain: number, when: number, slide: number, dest: AudioNode | null): void {
    const ctx = this.ctx;
    if (!ctx || !dest) return;
    const t = ctx.currentTime + when;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(dest);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  private noise(dur: number, gain: number, cutoff: number, when: number, dest: AudioNode | null): void {
    const ctx = this.ctx;
    if (!ctx || !dest) return;
    const t = ctx.currentTime + when;
    const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = cutoff;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(dest);
    src.start(t);
  }

  private schedule(): void {
    const ctx = this.ctx;
    const mood = this.moods.get(this.mood);
    if (!ctx || !this.musicGain || !mood) return;
    const eighth = 60 / mood.bpm / 2;
    // After a stall (a background tab, a suspended context), start again from now, not with a burst.
    if (this.nextNote < ctx.currentTime) this.nextNote = ctx.currentTime + 0.05;
    const s = this.synth(this.musicGain);
    while (this.nextNote < ctx.currentTime + 0.3) {
      const when = this.nextNote - ctx.currentTime;
      const chord = mood.chords[Math.floor(this.step / 8) % mood.chords.length]!;
      const k = this.step % 8;
      if (k === 0) s.tone(hz(chord[0]! - 24), eighth * 7.5, 'triangle', 0.35, when);
      const arp = [0, 1, 2, 1, 0, 2, 1, 2][k]! % chord.length;
      if (mood.busy || k % 2 === 0) s.tone(hz(chord[arp]! + 12), eighth * 1.6, 'sine', 0.22, when);
      if (mood.drum && (k === 0 || k === 4)) s.tone(70, 0.18, 'sine', 0.6, when, 0.4);
      this.nextNote += eighth;
      this.step++;
    }
  }
}

/**
 * Unlocks (or resumes) the bus on every tap and key, in the capture phase, so it runs before the
 * tapped control plays its sound. Returns a function that removes the listeners.
 */
export function installAudioUnlock(bus: AudioBus, target: Document | HTMLElement = document): () => void {
  const unlock = (): void => bus.unlock();
  const types = ['touchend', 'click', 'keydown'] as const;
  for (const type of types) target.addEventListener(type, unlock, { capture: true, passive: true });
  return () => {
    for (const type of types) target.removeEventListener(type, unlock, { capture: true });
  };
}
