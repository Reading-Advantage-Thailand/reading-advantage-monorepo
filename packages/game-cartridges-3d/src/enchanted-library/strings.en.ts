/** English UI text of Enchanted Library 3D (catalog scope `enchantedLibrary`). */
export default {
  enchantedLibrary: {
    title: 'Enchanted Library',
    pitch: 'Find the book for each word.',
    subtitle: 'Collect the right books',
    briefing: {
      objective: 'Collect the book whose English word means the Thai prompt.',
      instructions: {
        find: { title: 'Read the prompt', description: 'Each round shows a Thai word. One book in the hall has the English word for it.' },
        walk: { title: 'Walk to the right book', description: 'Walk into the book with the matching word. A wrong book costs courage.' },
        shield: { title: 'Raise your shield', description: 'Spirits drift through the hall. Tap Shield to turn them away. A right book gives a charge back.' },
      },
      controls: {
        touch: { label: 'Hold and drag, or tap a book', action: 'Walk through the hall' },
        pointer: { label: 'Arrows or WASD, Space', action: 'Walk and raise the shield' },
      },
      learningPreview: 'Your words',
      tip: 'Spirits and wrong books cost courage, but they never end the game. The team rests and comes back.',
      start: 'Enter the hall 📚',
    },
    hud: {
      place: 'The Enchanted Library',
      round: 'Book {round}/{rounds}',
      courage: 'Courage',
      find: 'Find the book for',
      shield: 'Shield',
      story: '📖 Story',
      move: 'Drag to walk',
      got: 'Yes!',
      wrong: 'Not this one!',
      hit: 'Boo!',
      blocked: 'Blocked!',
      courageLost: '-1 ❤',
      rested: 'The team rests and returns.',
      done: { title: 'The library is calm!', text: 'Every book is on its shelf.' },
    },
  },
} as const;
