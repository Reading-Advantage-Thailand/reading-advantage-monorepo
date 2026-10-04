/** English UI text of the Labyrinth of the Goblin King (catalog scope `labyrinth`). */
export default {
  labyrinth: {
    title: 'Labyrinth of the Goblin King',
    pitch: 'Walk the maze and collect the words in order.',
    subtitle: 'Escape the Goblin King',
    briefing: {
      objective: 'Build each sentence word by word. Walk to the glowing orb with the next word.',
      instructions: {
        read: { title: 'Follow the sentence', description: 'One of your sentences shows at the top. The next word is still hidden.' },
        orbs: { title: 'Find the next word', description: 'Walk through the maze to the orb with the next word. A wrong orb fizzles and the orbs move.' },
        goblins: { title: 'Watch the goblins', description: 'A goblin pushes you back to the last crossing. A finished sentence makes you glow, so the goblins run away.' },
      },
      controls: {
        touch: { label: 'Swipe or drag', action: 'Pick the next turn. You turn at the next crossing.' },
        pointer: { label: 'WASD or arrows', action: 'Pick the next turn' },
      },
      learningPreview: 'Your sentences',
      tip: 'You cannot lose. A goblin only sends you back, so take your time.',
      start: 'Enter the labyrinth 🗡️',
    },
    hud: {
      place: 'Goblin King’s Labyrinth',
      sentence: 'Sentence {n}/{total}',
      coins: '🪙 {coins}',
      story: '📖 Story',
      move: 'Drag to turn',
      right: 'Yes!',
      wrong: 'Not this word',
      moved: 'The orbs moved',
      bump: 'Oof! Back to the crossing',
      built: 'Sentence built!',
      aura: 'You glow! Catch a goblin!',
      caught: 'Caught!',
      gate: 'The gate is open! Run to the gate!',
      done: { title: 'You escaped!', text: 'The Goblin King lost his labyrinth.' },
    },
  },
} as const;
