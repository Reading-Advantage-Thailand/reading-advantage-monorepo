/**
 * Monster Encounters as a kit `Simulation` (task 11 of docs/apk3d-cartridge.md): commands in,
 * events out, on the quest rules of quest.ts. The game is turn-based, so `tick()` returns no
 * events; the view sends `{ type: 'start' }` once and one `{ type: 'answer', response }` per
 * challenge and animates the returned events in order (the order is documented in quest.ts).
 */
import type { Simulation } from '@reading-advantage/advantage-play-kit-3d/sim';
import type { StoryInput } from '@reading-advantage/advantage-play-kit-3d/contracts';
import { createQuest } from './quest.js';
import type { GameEvent, QuestOptions, QuestResults, QuestState, Response } from './types.js';

export type MonsterEncountersCommand = { type: 'start' } | { type: 'answer'; response: Response };

export interface MonsterEncountersSim extends Simulation<QuestState, MonsterEncountersCommand, GameEvent> {
  /** The run so far (the `victory` event carries the same object at the end). */
  results(): QuestResults;
}

/** The Monster Encounters simulation for a story; pure for a seed. */
export function createMonsterEncounters(story: StoryInput, options: QuestOptions): MonsterEncountersSim {
  const quest = createQuest(story, options);
  return {
    get state() {
      return quest.state;
    },
    dispatch(command) {
      switch (command.type) {
        case 'start':
          return quest.start();
        case 'answer':
          return quest.answer(command.response);
      }
    },
    tick: () => [],
    snapshot: () => structuredClone(quest.state),
    results: () => quest.results(),
  };
}
