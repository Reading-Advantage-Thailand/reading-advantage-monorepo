/** English UI text of Realm Carver 3D (catalog scope `realmCarver`). */
export default {
  realmCarver: {
    title: 'Realm Carver',
    pitch: 'Carve the sentence out of the wild.',
    subtitle: 'Claim the realm word by word',
    briefing: {
      objective: 'Carve the glowing words of each sentence out of the wild, in the order of the sentence.',
      instructions: {
        read: { title: 'Read the sentence', description: 'Each glowing beacon in the wild holds one word. The next word to carve is marked in the sentence bar.' },
        carve: { title: 'Carve a path', description: 'Leave the safe border and draw a path through the beacon, then walk back onto safe land to close the loop.' },
        courage: { title: 'Watch the monsters', description: 'A monster that touches your path fades it. You go back to the border, and the team rests when courage runs out.' },
      },
      controls: {
        touch: { label: 'Hold and drag', action: 'Walk in one direction' },
        pointer: { label: 'WASD or arrows', action: 'Walk' },
      },
      learningPreview: 'Sentences from your story',
      tip: 'Monsters never end the game. If courage runs out, the team rests and comes back.',
      start: 'Carve the realm ⚔️',
    },
    hud: {
      place: 'The Wild Realm',
      realm: 'Realm {realm}/{realms}',
      courage: 'Courage',
      story: '📖 Story',
      move: 'Drag to move',
      carved: 'Carved!',
      notThat: 'Not that word!',
      oops: 'Oops!',
      rested: 'The team rests and returns!',
      regrown: 'The wild grows back!',
      cleared: 'Realm carved!',
      done: { title: 'The realm is yours!', text: 'Every sentence is carved.' },
    },
  },
} as const;
