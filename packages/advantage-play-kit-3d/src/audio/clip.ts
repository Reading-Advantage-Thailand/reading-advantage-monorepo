/**
 * Plays one time span of a recorded file (a sentence of the story, a glossary word) and reports the
 * play position, so the reader can mark the sentence being read. One span plays at a time.
 */
export class ClipPlayer {
  private readonly el = typeof Audio === 'undefined' ? null : new Audio();
  private done: (() => void) | null = null;
  private frame = 0;

  get available(): boolean {
    return this.el !== null;
  }

  /**
   * Plays `url` from `start` to `end` seconds; `onTime` gets the position on every frame. Resolves
   * when the span ends, when `stop` is called, or when the file cannot play.
   */
  play(url: string, start: number, end: number, onTime?: (seconds: number) => void): Promise<void> {
    const el = this.el;
    if (!el) return Promise.resolve();
    this.stop();
    return new Promise((resolve) => {
      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        cancelAnimationFrame(this.frame);
        el.pause();
        el.removeEventListener('error', finish);
        if (this.done === finish) this.done = null;
        resolve();
      };
      this.done = finish;
      const tick = () => {
        if (finished) return;
        onTime?.(el.currentTime);
        if (el.currentTime >= end || el.ended) finish();
        else this.frame = requestAnimationFrame(tick);
      };
      const go = () => {
        el.currentTime = start;
        el.play().then(() => (this.frame = requestAnimationFrame(tick)), finish);
      };
      el.addEventListener('error', finish);
      if (!el.src.endsWith(url) && el.src !== new URL(url, document.baseURI).href) {
        el.src = url;
        el.addEventListener('loadedmetadata', go, { once: true });
        el.load();
      } else go();
    });
  }

  stop(): void {
    this.done?.();
  }
}
