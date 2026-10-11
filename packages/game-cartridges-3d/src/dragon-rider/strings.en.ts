/** English UI text of Dragon Rider 3D (catalog scope `dragonRider`). */
export default {
  dragonRider: {
    title: 'Dragon Rider',
    pitch: 'Ride between two gates and pick the right meaning.',
    subtitle: 'Ride over the highlands',
    briefing: {
      objective: 'Grow a flock of dragons and win the duel with the dark dragon.',
      instructions: {
        read: { title: 'Read the word', description: 'One of your words shows at the top. Two gates fly toward you.' },
        choose: { title: 'Pick a gate', description: 'Fly through the gate with its meaning. A new dragon joins you.' },
        duel: { title: 'Duel the dark dragon', description: 'A bigger flock fights fresh for longer. Tired dragons rest and come back.' },
      },
      controls: {
        touch: { label: 'Tap or swipe', action: 'Pick left or right' },
        pointer: { label: 'Click or arrow keys', action: 'Pick left or right' },
      },
      learningPreview: 'Your words',
      tip: 'No hurry: the gates wait in front of you until you pick one.',
      start: 'Take off 🐉',
      audio: {
        instructions: {
          read: { title: 'Read the meaning', description: 'A Thai meaning shows at the top. Two gates fly toward you.' },
          choose: { title: 'Listen and pick', description: 'Tap 🔊 to hear a gate. Steer to the gate with the English word.' },
        },
        tip: 'At the gate, your dragon waits until you hear its word.',
      },
    },
    hud: {
      place: 'Dragon Rider',
      gate: 'Gate {index}/{total}',
      flock: 'Flock',
      story: '📖 Story',
      word: 'Which gate means…',
      wordAudio: 'Which gate says the English word for…',
      listen: 'Listen to gate {index}',
      soundOff: 'Turn the sound on to hear the words.',
      joined: '+1 dragon!',
      left: 'A dragon flew home',
      again: 'This word comes back later.',
      boss: { title: 'The dark dragon!', text: 'Its power is {power}. Fire together!' },
      power: 'Dark dragon {hp}/{power}',
      tired: 'A dragon rests',
      rally: 'The flock rallies!',
      done: { title: 'The sky is safe!', text: 'Your flock beat the dark dragon.' },
    },
  },
} as const;
