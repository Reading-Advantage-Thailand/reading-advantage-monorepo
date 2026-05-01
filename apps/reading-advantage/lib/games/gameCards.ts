import { withBasePath } from './basePath'

export type GameCard = {
  id: string
  title: string
  description: string
  cover: string
  href?: string
  status: 'playable' | 'coming-soon'
}

export const gameCards: GameCard[] = [
  {
    id: 'magic-defense',
    title: 'Magic Defense',
    description: 'Defend your castles from falling words by typing their translations.',
    cover: withBasePath('/games/cover/magic-defense-cover.png'),
    href: '/games/magic-defense',
    status: 'playable',
  },
  {
    id: 'rpg-battle',
    title: 'RPG Battle',
    description: 'Duel monsters by typing the correct translations.',
    cover: withBasePath('/games/cover/rpg-battle-cover.png'),
    href: '/games/rpg-battle',
    status: 'playable',
  },
  {
    id: 'dragon-flight',
    title: 'Dragon Flight',
    description: 'Choose the correct gate to grow your dragon flight.',
    cover: withBasePath('/games/cover/dragon-flight-cover.png'),
    href: '/games/dragon-flight',
    status: 'playable',
  },
  {
    id: 'wizard-vs-zombie',
    title: 'Wizard vs Zombie',
    description: 'Survive the horde by collecting vocabulary orbs.',
    cover: withBasePath('/games/cover/wizard-vs-zombie-cover.png'),
    href: '/games/wizard-vs-zombie',
    status: 'playable',
  },
  {
    id: 'rune-match',
    title: 'Rune Match',
    description: 'Match vocabulary runes to defeat monsters in this RPG puzzle battle.',
    cover: withBasePath('/games/cover/rune-match-cover.png'),
    href: '/games/rune-match',
    status: 'playable',
  },
  {
    id: 'treasure-chest-rush',
    title: 'Treasure Chest Rush',
    description: 'Stop the spinning locks on the correct translations.',
    cover: withBasePath('/games/cover/treasure-chest-rush-cover.png'),
    status: 'coming-soon',
  },
  {
    id: 'light-barrier',
    title: 'Light Barrier',
    description: 'Connect the correct translations to hold back the horde.',
    cover: withBasePath('/games/cover/light-barrier-cover.png'),
    status: 'coming-soon',
  },
  {
    id: 'word-collapse',
    title: 'Word Collapse',
    description: 'Tap matching word pairs to clear the board.',
    cover: withBasePath('/games/cover/word-collapse-cover.png'),
    status: 'coming-soon',
  },
  {
    id: 'magic-spell-scroll',
    title: 'Magic Spell Scroll',
    description: 'Find camouflaged words hidden in a magical scene.',
    cover: withBasePath('/games/cover/magic-spell-scroll-cover.png'),
    status: 'coming-soon',
  },
  {
    id: 'castle-tower-stack',
    title: 'Castle Tower Stack',
    description: 'Stack matching translations to build a towering fortress.',
    cover: withBasePath('/games/cover/castle-tower-stack-cover.png'),
    status: 'coming-soon',
  },
  {
    id: 'zombie-escape',
    title: 'Zombie Escape',
    description: 'Grab the correct word to survive the undead chase.',
    cover: withBasePath('/games/cover/zombie-escape-cover.png'),
    status: 'coming-soon',
  },
]
