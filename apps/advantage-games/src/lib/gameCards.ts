import { withBasePath } from './games-runtime'

export type GameCard = {
  id: string
  title: string
  description: string
  cover: string
  href?: string
  status: 'playable' | 'coming-soon'
}

const unroutableGameIds = new Set([
  'astral-mage',
  'sorcerer-ziggurat',
  'dragon-rider',
  'spellweavers-run',
  'griffin-riders-escape',
  'storm-castle-tower',
  'archers-revenge',
  'paladins-twin-soul',
  'griffin-sky-joust',
  'gryphon-patrol',
  'realm-carver',
]);

const catalogCards: GameCard[] = [
  {
    id: 'castle-defense',
    title: 'Castle Defense',
    description: 'Collect words to build towers and defend your castle!',
    cover: withBasePath('/games/cover/castle-defense-cover.png'),
    href: '/student/games/sentence/castle-defense',
    status: 'playable',
  },
  {
    id: 'dragon-rider',
    title: 'Dragon Rider',
    description: 'Ride your dragon to protect your village',
    cover: withBasePath('/games/cover/cover-dragon-rider.png'),
    status: 'playable',
  },
  {
    id: 'magic-defense',
    title: 'Magic Defense',
    description: 'Defend your castles from falling words by typing their translations.',
    cover: withBasePath('/games/cover/magic-defense-cover.png'),
    href: '/student/games/vocabulary/magic-defense',
    status: 'playable',
  },
  {
    id: 'rpg-battle',
    title: 'RPG Battle',
    description: 'Duel monsters by typing the correct translations.',
    cover: withBasePath('/games/cover/rpg-battle-cover.png'),
    href: '/student/games/vocabulary/rpg-battle',
    status: 'playable',
  },
  {
    id: 'dragon-flight',
    title: 'Dragon Flight',
    description: 'Choose the correct gate to grow your dragon flight.',
    cover: withBasePath('/games/cover/dragon-flight-cover.png'),
    href: '/student/games/vocabulary/dragon-flight',
    status: 'playable',
  },
  {
    id: 'wizard-vs-zombie',
    title: 'Wizard vs Zombie',
    description: 'Survive the horde by collecting vocabulary orbs.',
    cover: withBasePath('/games/cover/wizard-vs-zombie-cover.png'),
    href: '/student/games/vocabulary/wizard-vs-zombie',
    status: 'playable',
  },
  {
    id: 'enchanted-library',
    title: 'Enchanted Library',
    description: 'Collect magic books and dodge spirits to master new words.',
    cover: withBasePath('/games/cover/enchanted-library-cover.png'),
    href: '/student/games/vocabulary/enchanted-library',
    status: 'playable',
  },
  {
    id: 'rune-match',
    title: 'Rune Match',
    description: 'Match vocabulary runes to defeat monsters in this RPG puzzle battle.',
    cover: withBasePath('/games/cover/rune-match-cover.png'),
    href: '/student/games/vocabulary/rune-match',
    status: 'playable',
  },
  {
    id: 'alchemists-synthesis',
    title: "Alchemist's Synthesis",
    description: 'Master the art of alchemy by matching and merging vocabulary to synthesize powerful spells!',
    cover: withBasePath('/games/cover/cover-alchemists-synthesis.png'),
    href: '/student/games/vocabulary/alchemists-synthesis',
    status: 'playable',
  },
  {
    id: 'potion-rush',
    title: 'Potion Rush',
    description: 'Manage a busy potion shop! Brew orders by collecting the correct ingredients from the conveyor belt.',
    cover: withBasePath('/games/cover/potion-rush-cover.png'),
    href: '/student/games/sentence/potion-rush',
    status: 'playable',
  },
  {
    id: 'dungeon-liberator',
    title: 'Dungeon Liberator',
    description: 'Rescue prisoners by collecting them in the correct word order and escape the dungeon!',
    cover: withBasePath('/games/cover/dungeon-liberator.png'),
    href: '/student/games/sentence/dungeon-liberator',
    status: 'playable',
  },
  {
    id: 'spellweavers-run',
    title: "Spellweaver's Run",
    description: 'Collect word orbs in the correct order to form sentences in this enchanted forest runner!',
    cover: withBasePath('/games/cover/cover-spellweavers-run.png'),
    status: 'playable',
  },
  {
    id: 'shadow-gate-dungeon',
    title: 'Shadow Gate Dungeon',
    description: 'Collect word crystals and escape the shadow creature in this dark dungeon survival game!',
    cover: withBasePath('/games/cover/cover-shadow-gate-dungeon.png'),
    href: '/student/games/sentence/shadow-gate-dungeon',
    status: 'playable',
  },
  {
    id: 'rune-forge-chamber',
    title: 'Rune Forge Chamber',
    description: 'Tap word circles in the correct order to forge magical runes before the forge cools!',
    cover: withBasePath('/games/cover/cover-rune-forge-chamber.png'),
    href: '/student/games/sentence/rune-forge-chamber',
    status: 'playable',
  },
  {
    id: 'village-guardian',
    title: 'Village Guardian',
    description: 'Defend the village! Rescue villagers in correct order and lead them to safety!',
    cover: withBasePath('/games/cover/cover-village-guardian.png'),
    href: '/student/games/sentence/village-guardian',
    status: 'playable',
  },
  {
    id: 'labyrinth-goblin-king',
    title: 'Labyrinth of the Goblin King',
    description: 'Navigate the maze! Collect word orbs in order and become a Paladin to defeat the goblins!',
    cover: withBasePath('/games/cover/cover-labyrinth-of-the-goblin-king.png'),
    href: '/student/games/sentence/labyrinth-goblin-king',
    status: 'playable',
  },
  {
    id: 'archers-revenge',
    title: "Archer's Revenge",
    description: "Shoot enemies matching the target translation. Don't hit shielded enemies!",
    cover: withBasePath('/games/cover/cover-archers-revenge.png'),
    status: 'playable',
  },
  {
    id: 'storm-castle-tower',
    title: 'Storm the Castle Tower',
    description: 'Scale the castle walls! Collect words in the correct order while dodging boiling oil and falling rocks!',
    cover: withBasePath('/games/cover/cover-storm-the-castle-tower.png'),
    status: 'playable',
  },
  {
    id: 'griffin-sky-joust',
    title: 'Griffin Sky-Joust',
    description: 'Take to the skies! Strike down enemy knights from above in the correct word order!',
    cover: withBasePath('/games/cover/cover-griffin-sky-joust.png'),
    status: 'playable',
  },
  {
    id: 'realm-carver',
    title: 'Realm Carver',
    description: 'Carve a path through the wild magic! Claim territory and capture words in the correct order!',
    cover: withBasePath('/games/cover/cover-realm-carver.png'),
    status: 'playable',
  },
  {
    id: 'paladins-twin-soul',
    title: "Paladin's Twin-Soul",
    description: 'Defend the realm and rescue your twin soul! Match the magic to double your power!',
    cover: withBasePath('/games/cover/cover-paladins-twin-soul.png'),
    status: 'playable',
  },
  {
    id: 'griffin-riders-escape',
    title: "Griffin Rider's Escape",
    description: 'Fly through the magical gates in the correct order to complete the sentence!',
    cover: withBasePath('/games/cover/cover-griffin-riders-escape.png'),
    status: 'playable',
  },
  {
    id: 'astral-mage',
    title: 'Astral Mage',
    description: 'Navigate the magical void and shoot word crystals in the correct order to complete sentences!',
    cover: withBasePath('/games/cover/cover-astral-mage.png'),
    status: 'playable',
  },
  {
    id: 'devourer-slime',
    title: 'Devourer Slime',
    description: 'Start small in a forest arena and eat words in the correct order to grow big enough to devour enemy knights!',
    cover: withBasePath('/games/cover/cover-devourer-slime.png'),
    href: '/student/games/sentence/devourer-slime',
    status: 'playable',
  },
  {
    id: 'sorcerer-ziggurat',
    title: "The Sorcerer's Ziggurat",
    description: 'Jump through an isometric pyramid of cubes to complete ancient rituals in the correct sentence order!',
    cover: withBasePath('/games/cover/cover-sorcerers-ziggurat.png'),
    status: 'playable',
  },
  {
    id: 'haunted-library',
    title: 'The Haunted Library',
    description: 'Navigate the multi-story library and open magical doors in the correct sentence order!',
    cover: withBasePath('/games/cover/cover-haunted-library.png'),
    href: '/student/games/sentence/haunted-library',
    status: 'playable',
  },
  {
    id: 'gryphon-patrol',
    title: 'Gryphon Patrol',
    description: 'Hunt the sentences across the sky!',
    cover: withBasePath('/games/cover/cover-gryphon-patrol.png'),
    status: 'playable',
  },
]

/** Game catalog with titles that do not have a launch route withheld. */
export const gameCards: GameCard[] = catalogCards.map((card) =>
  unroutableGameIds.has(card.id)
    ? { ...card, href: undefined, status: 'coming-soon' }
    : card
)
