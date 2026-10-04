/** English UI text of Archer's Revenge (catalog scope `archersRevenge`). */
export default {
  archersRevenge: {
    title: 'Archer’s Revenge',
    pitch: 'Read the meaning and shoot the enemy with the right word.',
    subtitle: 'Shoot the word',
    briefing: {
      objective: 'Help the archer beat the enemy formations: read the meaning, then shoot the enemy whose shield shows the matching English word.',
      instructions: {
        read: { title: 'Read the meaning', description: 'The card shows a meaning. Find the English word with the same meaning.' },
        aim: { title: 'Aim and shoot', description: 'Every enemy hides behind a shield with a word. Tap the word to shoot that enemy.' },
        shield: { title: 'Shields hold', description: 'A wrong arrow bounces off, and that enemy cannot be shot again for this meaning. There is no timer.' },
      },
      controls: { touch: { label: 'Tap', action: 'Tap a word to shoot' }, pointer: { label: 'Click', action: 'Click a word to shoot' } },
      learningPreview: 'Your words',
      tip: 'A wrong arrow costs courage, and the enemy strikes. Courage always comes back.',
      start: 'Start the battle 🏹',
    },
    hud: {
      place: 'The Sunken Vault',
      progress: 'Wave {wave}/{count} · {done}/{size}',
      courage: 'Courage',
      story: '📖 Story',
      shootThe: 'Shoot the enemy with this word',
      right: 'Bullseye! ✓',
      blocked: 'The shield held! Try another enemy.',
      coins: '+{count}',
      courageLost: '-1 ❤',
      intro: 'A new formation marches in!',
      rest: { title: 'Take a deep breath', text: 'The heroes rest together and feel brave again.' },
      victory: { title: 'Victory!', text: 'The Sunken Vault is safe.' },
    },
    monsters: { skeleton: 'Skeletons', mimic: 'Mimics' },
    heroes: { knight: 'Knight', wizard: 'Archer', cleric: 'Cleric' },
  },
} as const;
