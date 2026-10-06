/** The Griffin Riders Escape cartridge: what the host loads (lazily) to play the game, in 3D or in 2D. */
import type { Cartridge } from '@reading-advantage/advantage-play-kit-3d/factory';
import { briefing } from './briefing.js';
import { manifest } from './manifest.js';
import strings from './strings.en.js';
import { createGame } from './view/game.js';
import { createGameConfig } from './view2d/game.js';

export const cartridge: Cartridge = { manifest, strings, briefing, createGame, createGameConfig };
