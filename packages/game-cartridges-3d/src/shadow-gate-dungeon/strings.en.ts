/** English UI text of Shadow Gate Dungeon 3D (catalog scope `shadowGateDungeon`). */
export default {
  shadowGateDungeon: {
    title: 'Shadow Gate Dungeon',
    pitch: 'Collect word crystals to open the gate.',
    subtitle: 'Delve into the Sunken Vault',
    briefing: {
      objective: 'Collect the word crystals in the order of each sentence, then walk through the gate.',
      instructions: {
        read: { title: 'Read the sentence', description: 'Each room has one sentence from the story. Think of the next word.' },
        collect: { title: 'Touch the next word', description: 'Three crystals glow. Walk to the one with the next word of the sentence.' },
        gate: { title: 'Open the gate', description: 'When the whole sentence is built, walk through the glowing gate.' },
      },
      controls: {
        touch: { label: 'Hold and drag', action: 'Walk toward your finger' },
        pointer: { label: 'WASD or arrows', action: 'Walk' },
      },
      learningPreview: 'Sentences from your story',
      tip: 'A shadow follows you. It pushes you back and shuffles the crystals, but it never ends the game.',
      start: 'Enter the dungeon 🔮',
    },
    hud: {
      place: 'Shadow Gate',
      room: 'Room {room}/{rooms}',
      story: '📖 Story',
      move: 'Drag to move',
      taken: 'Yes!',
      notYet: 'Not yet!',
      bumped: 'Oof!',
      gate: 'The gate is open!',
      done: { title: 'The gate is open!', text: 'You built every sentence.' },
    },
  },
} as const;
