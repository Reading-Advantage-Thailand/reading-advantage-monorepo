/** English UI text of Dragon Rider 3D (catalog scope `dragonRider`). */
export default {
  dragonRider: {
    title: 'Dragon Rider',
    pitch: 'Ride between two gates and pick the right meaning.',
    subtitle: 'Ride over the highlands',
    briefing: {
      objective: 'Grow a flock of dragons and win the duel with the dark dragon.',
      instructions: {
        read: { title: 'Read the word', description: 'A word from the story shows at the top. Two gates fly toward you.' },
        choose: { title: 'Pick a gate', description: 'Fly through the gate with its meaning. A new dragon joins you.' },
        duel: { title: 'Duel the dark dragon', description: 'A bigger flock fights fresh for longer. Tired dragons rest and come back.' },
      },
      controls: {
        touch: { label: 'Tap or swipe', action: 'Pick left or right' },
        pointer: { label: 'Click or arrow keys', action: 'Pick left or right' },
      },
      learningPreview: 'Words from your story',
      tip: 'No hurry: the gates wait in front of you until you pick one.',
      start: 'Take off 🐉',
    },
    hud: {
      place: 'Dragon Rider',
      gate: 'Gate {index}/{total}',
      flock: 'Flock',
      story: '📖 Story',
      word: 'Which gate means…',
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
