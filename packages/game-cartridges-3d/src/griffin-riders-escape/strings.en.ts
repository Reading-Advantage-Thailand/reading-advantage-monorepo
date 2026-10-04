/** English UI text of Griffin Riders Escape (catalog scope `griffinRidersEscape`). */
export default {
  griffinRidersEscape: {
    title: 'Griffin Riders Escape',
    pitch: 'Steer the griffin through the gate with the next word.',
    subtitle: 'Fly through the right gate',
    briefing: {
      objective: 'Collect the words of each sentence in order. Steer the griffin through the gate with the next word, and fly around the storms.',
      instructions: {
        read: { title: 'Read the prompt', description: 'The meaning of a sentence shows at the top, with its blanks.' },
        steer: { title: 'Steer to the next word', description: 'Three gates come with three words. Tap a lane or swipe to fly through the gate with the next word.' },
        dodge: { title: 'Fly around the storms', description: 'A bat storm fills one or two lanes. Move to a free lane before it comes.' },
      },
      controls: {
        touch: { label: 'Tap a lane or swipe', action: 'Steer the griffin to a lane' },
        pointer: { label: 'Click or keys A D', action: 'Steer the griffin left or right' },
      },
      learningPreview: 'Your sentences',
      tip: 'A wrong gate or a storm only costs courage. The riders rest, the same word comes back, and courage always comes back.',
      start: 'Start the escape 🦅',
    },
    hud: {
      place: 'Griffin Riders Escape',
      sentence: 'Sentence {index}/{total}',
      courage: 'Courage',
      story: '📖 Story',
      build: 'Build the sentence in order.',
      next: 'Which gate has the next word?',
      collected: 'Word!',
      again: 'Not that gate. Try this word again.',
      stormed: 'A storm! Fly around it next time.',
      rested: 'Rested and brave again!',
      cast: { title: 'Sentence done!', text: 'Every word is in its place.' },
      done: { title: 'You escaped!', text: 'Your griffin carried the riders to safety.' },
    },
  },
} as const;
