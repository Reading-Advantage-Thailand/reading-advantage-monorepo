/** English UI text of Spellweaver's Run 3D (catalog scope `spellweaversRun`). */
export default {
  spellweaversRun: {
    title: "Spellweaver's Run",
    pitch: 'Run the spell road and pick the next word of the sentence.',
    subtitle: 'The road of word orbs',
    briefing: {
      objective: 'Collect the words of each sentence in order to cast the spell.',
      instructions: {
        read: { title: 'Read the prompt', description: 'The meaning of a sentence shows at the top, with its blanks.' },
        choose: { title: 'Pick the next word', description: 'Run through the orb with the next word. The word fills its blank.' },
        cast: { title: 'Cast the spell', description: 'A full sentence casts a spell and opens the road to the next one.' },
      },
      controls: {
        touch: { label: 'Tap or swipe', action: 'Choose an orb' },
        pointer: { label: 'Click or keys A S D', action: 'Choose an orb' },
      },
      learningPreview: 'Your sentences',
      tip: 'No hurry: your wizard waits in front of the orbs until you choose.',
      start: 'Start running ✨',
    },
    hud: {
      place: "Spellweaver's Run",
      sentence: 'Spell {index}/{total}',
      courage: 'Courage',
      story: '📖 Story',
      build: 'Build the sentence in order.',
      next: 'Which orb is the next word?',
      collected: 'Word!',
      again: 'Try this word again.',
      rested: 'Rested and brave again!',
      cast: { title: 'Spell cast!', text: 'The whole sentence is ready.' },
      portal: 'The portal is open!',
      done: { title: 'The road is clear!', text: 'Your wizard cast every spell.' },
    },
  },
} as const;
