/** English UI text of Potion Rush 3D (catalog scope `potionRush`). */
export default {
  potionRush: {
    title: 'Potion Rush',
    pitch: 'Brew sentences for busy customers.',
    subtitle: 'Potion shop rush',
    briefing: {
      objective: 'Serve every customer the sentence they ask for.',
      instructions: {
        read: { title: 'Read the order', description: 'Each customer asks for one sentence from the story.' },
        brew: { title: 'Brew in order', description: 'Drag the words from the conveyor into their cauldron, first word first.' },
        serve: { title: 'Serve', description: 'When the potion glows, tap it to serve the customer.' },
      },
      controls: {
        touch: { label: 'Drag', action: 'Move a word into a cauldron (or tap it)' },
        pointer: { label: 'Drag', action: 'Move a word into a cauldron (or click it)' },
      },
      learningPreview: 'Sentences from your story',
      tip: 'A wrong word jumps back onto the conveyor. Customers who wait too long sit down and come back later.',
      start: 'Open the shop 🧪',
    },
    hud: {
      place: 'Potion shop',
      served: 'Served {served}/{total}',
      coins: 'Coins',
      story: '📖 Story',
      serve: 'Serve!',
      rush: 'Rush hour!',
      waitHere: 'I will wait here.',
      back: 'I am back!',
      next: 'Next: {word}',
      tip: '+{tip} tip',
      coinsGained: '+{coins}',
      done: { title: 'Shop closed!', text: 'Every customer got their potion.' },
    },
  },
} as const;
