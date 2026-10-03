/** English UI text of Rune Match (catalog scope `runeMatch`). */
export default {
  runeMatch: {
    title: 'Rune Match',
    pitch: 'Swap the runes to match the word’s meaning.',
    subtitle: 'Match three',
    briefing: {
      objective: 'Help the heroes beat the monsters: find the meaning of each word on the rune board.',
      instructions: {
        find: { title: 'Read the word', description: 'The word to find shows above the board. Every rune shows a meaning.' },
        swap: { title: 'Swap to match', description: 'Swap two runes next to each other. Make a line of three runes with the right meaning.' },
        look: { title: 'Power runes', description: 'A heart rune line gives courage back. A shield rune line stops the next strike. There is no timer.' },
      },
      controls: { touch: { label: 'Drag or tap', action: 'Drag a rune to its neighbor, or tap two neighbors' }, pointer: { label: 'Drag or click', action: 'Drag a rune to its neighbor, or click two neighbors' } },
      learningPreview: 'Words from your story',
      tip: 'A wrong swap goes back, and the monster strikes. Courage always comes back.',
      start: 'Start the match ✨',
    },
    hud: {
      place: 'The Sunken Vault',
      progress: '{index}/{count} · {name}',
      courage: 'Courage',
      story: '📖 Story',
      find: 'Find the meaning of',
      shield: '🛡',
      blocked: 'Blocked!',
      courageLost: '-1 ❤',
      courageGained: '+1 ❤',
      rest: { title: 'Take a deep breath', text: 'The heroes rest together and feel brave again.' },
      victory: { title: 'Victory!', text: 'The Sunken Vault is safe.' },
      intro: 'A new monster wakes up!',
    },
    monsters: { skeleton: 'Skeleton', mimic: 'Mimic', 'dragon-fire': 'Fire Dragon' },
    heroes: { knight: 'Knight', wizard: 'Wizard', cleric: 'Cleric' },
  },
} as const;
