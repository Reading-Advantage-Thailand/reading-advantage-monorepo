/** English UI text of Village Guardian 3D (catalog scope `villageGuardian`). */
export default {
  villageGuardian: {
    title: 'Village Guardian',
    pitch: 'Guard the villagers in word order.',
    subtitle: 'Watch over the village',
    briefing: {
      objective: 'Call the villagers in the order of each sentence, and lead them into the barn.',
      instructions: {
        read: { title: 'Read the sentence', description: 'Each villager holds one word of one of your sentences.' },
        call: { title: 'Call them in order', description: 'Walk to the first word, then the next. Called villagers follow you.' },
        barn: { title: 'Lead them to the barn', description: 'When the whole sentence follows you, walk to the glowing barn door.' },
      },
      controls: {
        touch: { label: 'Hold and drag', action: 'Walk toward your finger' },
        pointer: { label: 'WASD or arrows', action: 'Walk' },
      },
      learningPreview: 'Your sentences',
      tip: 'Bandits and goblins scare the villagers back home, but they never end the game.',
      start: 'Guard the village 🛡️',
    },
    hud: {
      place: 'The Village',
      village: 'Village {village}/{villages}',
      story: '📖 Story',
      move: 'Drag to move',
      joined: 'Safe!',
      notYet: 'Not yet!',
      scared: 'Eek!',
      barn: 'The barn is open!',
      done: { title: 'The village is safe!', text: 'Everyone is in the barn.' },
    },
  },
} as const;
