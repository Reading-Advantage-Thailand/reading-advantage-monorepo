import { battleEnemies, battleHeroes, battleLocations } from './rpgBattleSelection'
import { withBasePath } from './basePath'

describe('rpgBattleSelection', () => {
  it('defines hero options with sprites', () => {
    expect(battleHeroes).toEqual([
      {
        id: 'male',
        label: 'Male',
        sprite: withBasePath('/games/vocabulary/rpg-battle/hero_male_pose_sheet_3x3.png'),
      },
      {
        id: 'female',
        label: 'Female',
        sprite: withBasePath('/games/vocabulary/rpg-battle/hero_female_pose_sheet_3x3.png'),
      },
    ])
  })

  it('defines the available battle locations', () => {
    expect(battleLocations).toEqual([
      {
        id: 'forest-clearing',
        label: 'Forest Clearing',
        background: withBasePath('/games/vocabulary/rpg-battle/background_forest_clearing.png'),
      },
      {
        id: 'ruined-road',
        label: 'Ruined Road',
        background: withBasePath('/games/vocabulary/rpg-battle/background_ruined_road.png'),
      },
      {
        id: 'magic-arena',
        label: 'Magic Arena',
        background: withBasePath('/games/vocabulary/rpg-battle/background_magic_arena.png'),
      },
      {
        id: 'throne-hall',
        label: 'Throne Hall',
        background: withBasePath('/games/vocabulary/rpg-battle/background_throne_hall.png'),
      },
    ])
  })

  it('defines enemy multipliers and sprites', () => {
    expect(battleEnemies).toEqual([
      {
        id: 'slime',
        label: 'Slime',
        multiplier: 0.5,
        sprite: withBasePath('/games/vocabulary/rpg-battle/enemy_slime_pose_sheet_3x3.png'),
      },
      {
        id: 'goblin',
        label: 'Goblin',
        multiplier: 1,
        sprite: withBasePath('/games/vocabulary/rpg-battle/enemy_goblin_pose_sheet_3x3.png'),
      },
      {
        id: 'spectre',
        label: 'Spectre',
        multiplier: 1.5,
        sprite: withBasePath('/games/vocabulary/rpg-battle/enemy_spectre_pose_sheet_3x3.png'),
      },
      {
        id: 'elemental',
        label: 'Elemental',
        multiplier: 2,
        sprite: withBasePath('/games/vocabulary/rpg-battle/enemy_elemental_pose_sheet_3x3.png'),
      },
    ])
  })
})
