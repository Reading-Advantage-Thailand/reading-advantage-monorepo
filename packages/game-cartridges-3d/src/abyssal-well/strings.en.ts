/** English UI text of Abyssal Well (catalog scope `abyssalWell`). */
export default {
  abyssalWell: {
    title: 'Abyssal Well',
    pitch: 'Shoot the creatures in the well in the order of the sentence.',
    subtitle: 'Build the sentence from the deep',
    briefing: {
      objective: 'Creatures with words climb out of the well. Shoot them in the order of the sentence to build it.',
      instructions: {
        read: { title: 'Read the sentence', description: 'The blanks at the top show the sentence from your story, word by word.' },
        aim: { title: 'Aim down a lane', description: 'Tap the creature with the next word, or turn with the arrows and shoot with Space.' },
        build: { title: 'Build the sentence', description: 'A right arrow drops the creature into the sentence. A wrong arrow bounces off and the creature falls back.' },
      },
      controls: {
        touch: { label: 'Tap a creature', action: 'Shoot down its lane' },
        pointer: { label: 'Arrows and Space', action: 'Turn and shoot' },
      },
      learningPreview: 'Sentences from your story',
      tip: 'One creature holds a word that is not in the sentence. A wrong arrow costs courage, and courage always comes back.',
      start: 'Shoot the first word 🏹',
    },
    hud: {
      place: 'The Abyssal Well',
      descent: 'Sentence {descent}/{descents}',
      courage: 'Courage',
      story: '📖 Story',
      aim: 'Tap a creature',
      struck: 'Yes!',
      bounced: 'Not yet!',
      courageLost: '-1 ❤',
      rest: { title: 'Take a deep breath', text: 'The heroes rest together and feel brave again.' },
      done: { title: 'The well is calm!', text: 'Every sentence is built.' },
    },
  },
} as const;
