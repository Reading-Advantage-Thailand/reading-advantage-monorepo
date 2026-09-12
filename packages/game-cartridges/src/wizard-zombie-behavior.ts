/** Position in the Wizard simulation world. */
export interface ZombiePursuitPoint {
  readonly x: number;
  readonly y: number;
}

/** Inputs for one zombie's independently timed pursuit. */
export interface WizardZombieIntentInput {
  readonly id: string;
  readonly seed: number;
  readonly timeMs: number;
  readonly position: ZombiePursuitPoint;
  readonly target: ZombiePursuitPoint;
  readonly baseSpeed: number;
}

/** Navigation intent that still requires the map's collision solver. */
export interface WizardZombieIntent {
  readonly target: ZombiePursuitPoint;
  readonly speed: number;
  readonly animationOffsetMs: number;
}

/**
 * Assigns varied pursuit routes, movement rhythms, and animation phases.
 * @param input Current zombie identity, world state, and configured speed.
 * @returns A bounded pursuit intent without changing simulation state.
 */
export function getWizardZombieIntent(input: WizardZombieIntentInput): WizardZombieIntent {
  const ordinal = Number(input.id.match(/\d+$/u)?.[0]
    ?? [...input.id].reduce((sum, character) => sum + character.charCodeAt(0), 0));
  const identity = Math.abs(Math.trunc(input.seed) + ordinal * 37);
  const profile = identity % 4;
  const offset = (identity * 317) % 2800;
  const phase = (Math.max(0, input.timeMs) + offset) % 2800;
  const distance = Math.hypot(input.target.x - input.position.x, input.target.y - input.position.y);
  const speedVariation = 0.88 + (identity % 11) * 0.022;
  let rhythm: number;
  if (profile === 0) rhythm = phase < 450 ? 0 : 0.72;
  else if (profile === 1) rhythm = 0.94;
  else if (profile === 2) rhythm = phase > 2200 ? 0.45 : 0.86;
  else rhythm = phase < 350 ? 0 : phase < 950 ? 1.3 : 0.62;

  // Flankers approach a different side while distant, then commit to contact.
  const flankDistance = distance > 170 && profile !== 0 ? (profile === 2 ? 110 : 55) : 0;
  const approachAngle = Math.atan2(input.position.y - input.target.y, input.position.x - input.target.x);
  const flankAngle = approachAngle + (identity % 2 === 0 ? 1 : -1) * Math.PI * 0.7;
  return {
    target: {
      x: input.target.x + Math.cos(flankAngle) * flankDistance,
      y: input.target.y + Math.sin(flankAngle) * flankDistance,
    },
    speed: Math.max(0, input.baseSpeed) * speedVariation * rhythm,
    animationOffsetMs: offset,
  };
}
