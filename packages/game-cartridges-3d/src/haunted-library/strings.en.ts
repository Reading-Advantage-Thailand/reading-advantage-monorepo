/** English UI text of Haunted Library 3D (catalog scope `hauntedLibrary`). */
export default {
  hauntedLibrary: {
    title: 'Haunted Library',
    pitch: 'Open the doors in word order.',
    subtitle: 'Explore the old library',
    briefing: {
      objective: 'Open the library doors in the order of each sentence.',
      instructions: {
        read: { title: 'Read the sentence', description: 'Each door holds one word of one of your sentences.' },
        open: { title: 'Open the doors in order', description: 'Walk to the first word, then tap Open. Then find the next word.' },
        climb: { title: 'Climb the floors', description: 'Walk to either end of a floor to bounce up. Tap Down to drop one floor.' },
      },
      controls: {
        touch: { label: 'Hold and drag', action: 'Walk left and right' },
        pointer: { label: 'Arrows or WASD, Space', action: 'Walk, drop down, open a door' },
      },
      learningPreview: 'Your sentences',
      tip: 'Ghosts and bats cost courage, but they never end the game. The team rests and comes back.',
      start: 'Enter the library 📚',
    },
    hud: {
      place: 'The Haunted Library',
      room: 'Room {room}/{rooms}',
      courage: 'Courage',
      story: '📖 Story',
      move: 'Drag to walk',
      open: 'Open',
      down: 'Down',
      opened: 'Open!',
      wrong: 'Not this one!',
      hit: 'Boo!',
      courageLost: '-1 ❤',
      rested: 'The team rests and returns.',
      cleared: 'Room cleared!',
      done: { title: 'The library is calm!', text: 'Every door is open.' },
    },
  },
} as const;
