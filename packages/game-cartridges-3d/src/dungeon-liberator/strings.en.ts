/** English UI text of Dungeon Liberator 3D (catalog scope `dungeonLiberator`). */
export default {
  dungeonLiberator: {
    title: 'Dungeon Liberator',
    pitch: 'Free the prisoners in word order.',
    subtitle: 'Rescue in the Sunken Vault',
    briefing: {
      objective: 'Free the villagers in the order of each sentence, and lead them out.',
      instructions: {
        read: { title: 'Read the sentence', description: 'Each villager holds one word of a sentence from the story.' },
        free: { title: 'Free them in order', description: 'Walk to the first word, then the next. Freed villagers follow you.' },
        escape: { title: 'Lead them out', description: 'When the whole sentence follows you, walk through the glowing gate.' },
      },
      controls: {
        touch: { label: 'Hold and drag', action: 'Walk toward your finger' },
        pointer: { label: 'WASD or arrows', action: 'Walk' },
      },
      learningPreview: 'Sentences from your story',
      tip: 'Skeletons scare the villagers back to their spots, but they never end the game.',
      start: 'Enter the vault 🗝️',
    },
    hud: {
      place: 'Sunken Vault',
      room: 'Room {room}/{rooms}',
      story: '📖 Story',
      move: 'Drag to move',
      freed: 'Freed!',
      notYet: 'Not yet!',
      scared: 'Eek!',
      gate: 'The gate is open!',
      done: { title: 'Everyone is free!', text: 'The villagers are safe at home.' },
    },
  },
} as const;
