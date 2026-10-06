/**
 * The battle family's shared types (Monster Encounters, Rune Match, and the next battle games):
 * the party, the monster kinds the stage can show, and the monster fields the stage reads. A
 * game's own state may carry more fields; these stay structural so each core keeps its types.
 */
export type HeroId = 'knight' | 'wizard' | 'cleric';

/** The monsters the stage can show (each is a forge character with its entrance). */
export type EnemyKind = 'skeleton' | 'giant-bat' | 'mimic' | 'dragon-fire';

export interface BattleEnemy {
  id: string;
  kind: EnemyKind;
  hp: number;
  maxHp: number;
  defeated: boolean;
}
