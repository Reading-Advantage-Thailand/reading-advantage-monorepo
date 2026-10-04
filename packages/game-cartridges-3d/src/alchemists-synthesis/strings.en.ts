/** English UI text of Alchemist's Synthesis 3D (catalog scope `alchemistsSynthesis`). */
export default {
  alchemistsSynthesis: {
    title: "Alchemist's Synthesis",
    pitch: 'Pick the ingredient that matches the meaning.',
    subtitle: 'Brew the Grand Elixir word by word',
    briefing: {
      objective: 'Pick the ingredient jar that carries the word for each meaning, and fill the cauldron.',
      instructions: {
        read: { title: 'Read the formula', description: 'The recipe card shows the meaning of one of your words.' },
        pick: { title: 'Pick the jar', description: 'Four jars carry English words. Tap the one that matches the meaning.' },
        brew: { title: 'Brew the elixir', description: 'The right jar pours into the cauldron. A wrong jar goes dim, then you try again.' },
      },
      controls: {
        touch: { label: 'Tap a jar', action: 'Pour it into the cauldron' },
        pointer: { label: 'Arrows and Space', action: 'Move between the jars and pick one' },
      },
      learningPreview: 'Your words',
      tip: 'A wrong jar only goes dim for a moment. Nothing here ends the game.',
      start: 'Start brewing 🧪',
    },
    hud: {
      place: 'The Alchemy Lab',
      round: 'Formula {round}/{rounds}',
      formula: 'Which ingredient means',
      story: '📖 Story',
      aim: 'Tap a jar',
      right: 'Yes!',
      dim: 'Not this one!',
      brewed: 'Brewed!',
      done: { title: 'The Grand Elixir is ready!', text: 'Every word is in the cauldron.' },
    },
  },
} as const;
