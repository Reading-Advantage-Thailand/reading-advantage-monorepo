/**
 * The griffin as a mount: Gryphon Patrol, Griffin Sky-Joust, and Griffin Riders Escape show the
 * Forge model `assets/griffin.ts` in its `fly` loop, with the student's hero on its back. Its
 * attack, hit, and roar clips also happen in the air, so they blend with the fly loop.
 */
export const GRIFFIN_MODEL = 'griffin';

/**
 * Where the rider stands, in the griffin's model meters: on the back between the wings, in the fly
 * loop (the clip lifts the body 0.4 m and tilts it nose down). `up` is the height above the model
 * origin; `forward` is along the griffin's facing.
 */
export const GRIFFIN_SEAT = { up: 0.84, forward: -0.04 } as const;
