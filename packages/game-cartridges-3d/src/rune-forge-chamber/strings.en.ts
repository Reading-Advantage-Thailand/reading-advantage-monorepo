/** English UI text of Rune Forge Chamber 3D (catalog scope `runeForgeChamber`). */
export default {
  runeForgeChamber: {
    title: 'Rune Forge Chamber',
    pitch: 'Strike the glowing runes in sentence order.',
    subtitle: 'Forge each sentence rune by rune',
    briefing: {
      objective: 'Strike the orbiting runes in the order of the sentence to forge each blade.',
      instructions: {
        read: { title: 'Read the sentence', description: 'The blanks at the top show the sentence from your story, word by word.' },
        pick: { title: 'Pick the next rune', description: 'Runes circle the anvil. Tap the rune with the next word, or use the arrows and Space.' },
        forge: { title: 'Forge the blade', description: 'A right rune strikes into the blade. A wrong rune goes dim, then you try again.' },
      },
      controls: {
        touch: { label: 'Tap a rune', action: 'Strike it into the blade' },
        pointer: { label: 'Arrows and Space', action: 'Move between the runes and pick one' },
      },
      learningPreview: 'Sentences from your story',
      tip: 'A wrong rune only goes dim for a moment. Nothing here ends the game.',
      start: 'Light the forge 🔨',
    },
    hud: {
      place: 'The Rune Forge',
      blade: 'Blade {blade}/{blades}',
      story: '📖 Story',
      aim: 'Tap the next rune',
      right: 'Yes!',
      dim: 'Not yet!',
      done: { title: 'The blades are forged!', text: 'Every sentence glows on the anvil.' },
    },
  },
} as const;
