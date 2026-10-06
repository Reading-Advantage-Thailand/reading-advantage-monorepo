/**
 * A bot that plays Griffin Sky-Joust from the state alone (the QC driver and the tests use it).
 * It hovers above the riders, drifts over the rider with the next word, and lets gravity drop it
 * on that rider from above. After a strike it climbs back through a gap, and it waits when
 * another rider crosses the dive. QC calls it a few times a second, as a student taps.
 */
import { ARENA, TUNING, isTarget, resumeGriffinSkyJoust, type JoustCommand, type JoustState } from '../core/index.js';

/** Coasting time constant of the sideways speed, in seconds (damping 0.98 per 16.67 ms). */
const TAU = -0.01667 / Math.log(TUNING.damping);

/** Signed shortest distance from `from` to `to` on the wrapping arena. */
const wrapDx = (from: number, to: number): number => {
  const w = ARENA.width;
  return ((((to - from + w / 2) % w) + w) % w) - w / 2;
};

/** Where the griffin ends up after `seconds` without another sideways command. */
const coast = (x: number, vx: number, seconds: number): number => x + vx * TAU * (1 - Math.exp(-seconds / TAU));

const reach = TUNING.griffinRadius + TUNING.riderRadius;

export function nextCommand(state: JoustState): JoustCommand | null {
  if (state.phase !== 'playing' || state.restMs > 0) return null;
  const g = state.griffin;
  const riders = state.riders;
  const minY = riders.length > 0 ? Math.min(...riders.map((r) => r.y)) : TUNING.riderTop;
  const hoverY = Math.max(TUNING.topMargin + 14, minY - 100);
  const flap = (): JoustCommand | null => (g.vy >= -60 ? { type: 'flap', dir: 0 } : null);
  const hover = (): JoustCommand | null => (g.y > hoverY ? flap() : null);
  const steer = (err: number): JoustCommand | null => (Math.abs(err) > 14 ? { type: 'drift', dir: err > 0 ? 1 : -1 } : null);

  const targets = riders.filter((r) => isTarget(state, r));
  if (targets.length === 0) return hover();

  // The rider to strike: the one the griffin reaches soonest sideways.
  const target = targets.reduce((a, b) => (Math.abs(wrapDx(g.x, a.x)) <= Math.abs(wrapDx(g.x, b.x)) ? a : b));
  const fall = Math.max(0, target.y - reach - g.y);
  const seconds = Math.max(0.3, Math.sqrt((2 * fall) / TUNING.gravity));
  const aim = Math.max(target.radius, Math.min(ARENA.width - target.radius, target.x + target.vx * seconds));
  const err = wrapDx(coast(g.x, g.vx, seconds), aim);

  const above = g.y < target.y - reach - 4;
  const overBand = g.y <= minY - reach - 4;

  // Dive: look ahead with a copy of the game. Slide `k` steps toward `dir`, then fall; the plan
  // that takes the next word before any bump wins (the shortest slide first).
  if (above || overBand || g.y < target.y - 10) {
    const plan = divePlan(state);
    if (plan) return plan.k > 0 ? { type: 'drift', dir: plan.dir } : null;
  }

  if (overBand) {
    // Hover over the target until the dive is clear.
    const go = steer(err);
    const lift = hover();
    if (go && lift && go.type === 'drift') return { type: 'flap', dir: go.dir }; // lift and slide in one beat
    return go ?? lift;
  }

  // Under or inside the band: climb through a gap. A rider above and near the column makes the
  // griffin slide away first.
  const near = riders
    .filter((r) => r.y < g.y + 20 && g.y - r.y < 170 && Math.abs(wrapDx(g.x, r.x)) < reach + 80)
    .sort((a, b) => Math.abs(wrapDx(g.x, a.x)) - Math.abs(wrapDx(g.x, b.x)))[0];
  if (near) {
    const d = wrapDx(g.x, near.x);
    return { type: 'drift', dir: d > 0 ? -1 : 1 };
  }
  return flap();
}

/** Steps a dive plan looks ahead (1.5 s). */
const HORIZON = 45;
const SLIDES = [0, 1, 2, 3, 4, 5, 6, 8, 10, 13];

/** The shortest slide-then-fall plan that strikes the next word, or null when none does. */
function divePlan(state: JoustState): { k: number; dir: -1 | 1 } | null {
  for (const k of SLIDES) {
    for (const dir of k === 0 ? ([1] as const) : ([-1, 1] as const)) {
      const sim = resumeGriffinSkyJoust(state, 1);
      const wanted = state.word;
      let ok = false;
      for (let i = 0; i < HORIZON; i++) {
        if (i < k) sim.dispatch({ type: 'drift', dir });
        const events = sim.tick();
        const bump = events.some((e) => e.type === 'bumped');
        if (bump) break;
        if (events.some((e) => e.type === 'wordStruck') || sim.state.word > wanted || sim.state.sentence !== state.sentence) {
          ok = true;
          break;
        }
      }
      if (ok) return { k, dir };
    }
  }
  return null;
}
