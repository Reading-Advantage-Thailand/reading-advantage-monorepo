/**
 * Time for views: waits and tweens driven by the stage's frame time, not by `setTimeout`, so
 * they stop when the stage pauses and every animation of a game stays in step.
 */
export class Timeline {
  private readonly jobs: ((dt: number) => boolean)[] = [];
  private cleared = 0;

  /** Advances every job by `dt` seconds; the stage calls this once per frame. */
  update(dt: number): void {
    for (let i = this.jobs.length - 1; i >= 0; i--) if (this.jobs[i]!(dt)) this.jobs.splice(i, 1);
  }

  /** Resolves after `seconds` of stage time. */
  wait(seconds: number): Promise<void> {
    return this.tween(seconds, () => undefined);
  }

  /** Calls `step(u)` each frame with u from 0 to 1 over `seconds`, then resolves. */
  tween(seconds: number, step: (u: number) => void): Promise<void> {
    const epoch = this.cleared;
    return new Promise((resolve) => {
      let t = 0;
      this.jobs.push((dt) => {
        if (epoch !== this.cleared) return true;
        t += dt;
        const u = seconds > 0 ? Math.min(1, t / seconds) : 1;
        step(u);
        if (u >= 1) resolve();
        return u >= 1;
      });
    });
  }

  /** Drops every running job (a scene change); their promises never resolve. */
  clear(): void {
    this.cleared++;
    this.jobs.length = 0;
  }
}

/** Smoothstep easing (0 to 1). */
export const smooth = (x: number): number => x * x * (3 - 2 * x);
