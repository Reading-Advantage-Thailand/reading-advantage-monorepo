/** English UI text of Sorcerer's Ziggurat 3D (catalog scope `sorcererZiggurat`). */
export default {
  sorcererZiggurat: {
    title: "Sorcerer's Ziggurat",
    pitch: 'Climb the rune cubes in word order.',
    subtitle: 'Climb the tower of runes',
    briefing: {
      objective: 'Climb the ziggurat one rune cube at a time, in the order of each sentence.',
      instructions: {
        read: { title: 'Read the sentence', description: 'The blanks at the top show one of your sentences, word by word.' },
        step: { title: 'Pick the next word', description: 'Three rune cubes wait ahead. Tap the cube with the next word.' },
        climb: { title: 'Reach the crystal', description: 'A right cube lifts you one level. A wrong cube crumbles, then you try again.' },
      },
      controls: {
        touch: { label: 'Tap a rune cube', action: 'Step onto it' },
        pointer: { label: 'Arrows or A, W, D', action: 'Step left, forward, or right' },
      },
      learningPreview: 'Your sentences',
      tip: 'A crumbled cube costs courage, but it never ends the game. The team rests and comes back.',
      start: 'Climb the ziggurat 🔮',
    },
    hud: {
      place: 'The Ziggurat',
      ritual: 'Ritual {ritual}/{rituals}',
      courage: 'Courage',
      story: '📖 Story',
      aim: 'Tap the next word',
      stepped: 'Yes!',
      crumbled: 'Crumble!',
      courageLost: '-1 ❤',
      rested: 'The team rests and returns.',
      cleared: 'The crystal shines!',
      done: { title: 'The ziggurat is climbed!', text: 'Every sentence shines at the top.' },
    },
  },
} as const;
