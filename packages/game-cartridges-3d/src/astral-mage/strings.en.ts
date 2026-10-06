/** English UI text of Astral Mage 3D (catalog scope `astralMage`). */
export default {
  astralMage: {
    title: 'Astral Mage',
    pitch: 'Cast spells at word crystals in order.',
    subtitle: 'Build the sentence from the stars',
    briefing: {
      objective: 'Shoot the word crystals in the order of the sentence to build each spell.',
      instructions: {
        read: { title: 'Read the sentence', description: 'The blanks at the top show one of your sentences, word by word.' },
        aim: { title: 'Aim at the next word', description: 'Tap the crystal with the next word, or use the arrows and Space.' },
        build: { title: 'Build the spell', description: 'A right crystal shatters into the sentence. A wrong crystal goes dim, then you try again.' },
      },
      controls: {
        touch: { label: 'Tap a crystal', action: 'Cast a bolt at it' },
        pointer: { label: 'Arrows and Space', action: 'Aim and cast' },
      },
      learningPreview: 'Your sentences',
      tip: 'One crystal holds a word that is not in the sentence. Nothing here ends the game.',
      start: 'Cast the spell ✨',
    },
    hud: {
      place: 'The Spell Circle',
      ritual: 'Spell {ritual}/{rituals}',
      story: '📖 Story',
      aim: 'Tap a crystal',
      struck: 'Yes!',
      dim: 'Not yet!',
      done: { title: 'The spell is complete!', text: 'Every sentence shines in the stars.' },
    },
  },
} as const;
