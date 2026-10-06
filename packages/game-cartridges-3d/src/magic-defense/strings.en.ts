/** English UI text of Magic Defense (catalog scope `magicDefense`). */
export default {
  magicDefense: {
    title: 'Magic Defense',
    pitch: 'Cast the right word to break the missiles before they hit the castles.',
    subtitle: 'Break the missile',
    briefing: {
      objective: 'Defend the castles of the Sunken Vault: every missile shows a meaning, and the right English spell word breaks it before it lands.',
      instructions: {
        read: { title: 'Read the missile', description: 'An enemy casts a missile at a castle. The missile shows a meaning.' },
        cast: { title: 'Cast the word', description: 'Tap the English spell word with the same meaning. The right word breaks the missile.' },
        storm: { title: 'Call the storm', description: 'Each right word fills the storm. When it is full, tap Storm to mend every castle. There is no timer.' },
      },
      controls: { touch: { label: 'Tap', action: 'Tap a spell word' }, pointer: { label: 'Click', action: 'Click a spell word' } },
      learningPreview: 'Your words',
      tip: 'A wrong word fails, and the missile hurts a castle. If every castle falls, the heroes rest and the castles stand again.',
      start: 'Defend the castles 🏰',
    },
    hud: {
      place: 'The Sunken Vault',
      progress: 'Wave {wave}/{count} · {done}/{size}',
      castles: 'Castles',
      stormButton: '⚡ Storm',
      story: '📖 Story',
      castThe: 'Cast the spell word with this meaning',
      missile: '☄ Missile',
      right: 'The missile breaks! ✓',
      blocked: 'The spell failed! Try another word.',
      castleHit: '-1 ❤',
      intro: 'New casters march in!',
      rest: { title: 'Take a deep breath', text: 'The heroes rest together, and the castles stand again.' },
      storm: { title: 'Storm!', text: 'Every castle is mended.' },
      victory: { title: 'Victory!', text: 'The castles of the Sunken Vault are safe.' },
    },
    monsters: { skeleton: 'Skeletons', mimic: 'Mimics' },
    heroes: { knight: 'Knight', wizard: 'Wizard', cleric: 'Cleric' },
  },
} as const;
