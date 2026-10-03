/** English UI text of Dragon Flight 3D (catalog scope `dragonFlight`). */
export default {
  dragonFlight: {
    title: 'Dragon Flight',
    pitch: 'Fly through the gate with the right meaning.',
    subtitle: 'Flight over the forest',
    briefing: {
      objective: 'Grow a flock of dragons and beat the dark dragon at the end.',
      instructions: {
        read: { title: 'Read the word', description: 'A word from the story shows at the top.' },
        choose: { title: 'Choose the gate', description: 'Fly through the gate with its meaning. A new dragon joins you.' },
        boss: { title: 'Face the dark dragon', description: 'At the end, every dragon in your flock breathes fire.' },
      },
      controls: {
        touch: { label: 'Tap or swipe', action: 'Choose a gate' },
        pointer: { label: 'Click or keys 1 2 3', action: 'Choose a gate' },
      },
      learningPreview: 'Words from your story',
      tip: 'No hurry: your dragon waits in front of the gates until you choose.',
      start: 'Take off 🐉',
    },
    hud: {
      place: 'Dragon Flight',
      gate: 'Gate {index}/{total}',
      flock: 'Flock',
      story: '📖 Story',
      word: 'Which gate means…',
      joined: '+1 dragon!',
      left: 'A dragon flew home',
      again: 'This word comes back later.',
      boss: { title: 'The dark dragon!', text: 'All dragons, fire!' },
      done: { title: 'The sky is safe!', text: 'Your flock beat the dark dragon.' },
    },
  },
} as const;
