/** English UI text of Griffin Sky-Joust 3D (catalog scope `griffinSkyJoust`). */
export default {
  griffinSkyJoust: {
    title: 'Griffin Sky-Joust',
    pitch: 'Dive on the rider with the next word of the sentence.',
    subtitle: 'A joust above the clouds',
    briefing: {
      objective: 'Build each sentence by striking its riders in the right order.',
      instructions: {
        read: { title: 'Read the prompt', description: 'The meaning of a sentence shows at the top, with its blanks.' },
        fly: { title: 'Fly your griffin', description: 'Flap to rise and slide to the side. Gravity pulls you down.' },
        strike: { title: 'Strike from above', description: 'Land on the rider with the next word. A hit from the side or below hurts.' },
      },
      controls: {
        touch: { label: 'Tap to flap', action: 'Tap the left or right side to slide' },
        pointer: { label: 'Space or up arrow', action: 'Flap, and use left and right arrows to slide' },
      },
      learningPreview: 'Your sentences',
      tip: 'No hurry: when your courage runs out, your griffin rests and comes back.',
      start: 'Take off 🦅',
    },
    hud: {
      place: 'Griffin Sky-Joust',
      sentence: 'Sentence {index}/{total}',
      courage: 'Courage',
      story: '📖 Story',
      build: 'Build the sentence in order.',
      next: 'Strike the rider with the next word from above.',
      struck: 'Word!',
      bump: 'Ouch! Strike from above.',
      wrong: 'Not this word. Try again.',
      rested: 'Rested and brave again!',
      resting: 'Resting…',
      done: { title: 'Sentence whole!', text: 'Every word is in its place.' },
      finish: { title: 'The sky is yours!', text: 'Your griffin won every joust.' },
    },
  },
} as const;
