/** The Dragon Rider 3D rules core: pure rules on a seeded state (imports only contracts and sim). */
export * from './types.js';
export { type DragonRiderInput } from './content.js';
export { TUNING, bossPowerOf, createDragonRider, correctGateOf, type DragonRiderSimulation } from './sim.js';
export { evidenceItemsOf, evidenceOf, scoreOf, resultsOf } from './evidence.js';
