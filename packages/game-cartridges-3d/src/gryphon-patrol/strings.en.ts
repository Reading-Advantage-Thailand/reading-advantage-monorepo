/** English UI text of Gryphon Patrol (catalog scope `gryphonPatrol`). */
export default {
  gryphonPatrol: {
    title: 'Gryphon Patrol',
    pitch: 'Fly the gryphon and shoot the bat that carries the next word.',
    subtitle: 'Shoot the next word',
    briefing: {
      objective: 'Collect the words of each sentence in order. Shoot the bat that carries the next word, then fly to take the word.',
      instructions: {
        read: { title: 'Read the prompt', description: 'The meaning of a sentence shows at the top, with its blanks.' },
        aim: { title: 'Shoot the next word', description: 'Every bat carries a word on a banner. Tap the bat with the next word of the sentence.' },
        collect: { title: 'Take the word', description: 'The right bat drops a glowing orb. Your gryphon flies to it and fills the blank.' },
      },
      controls: {
        touch: { label: 'Tap', action: 'Tap a bat to shoot it' },
        pointer: { label: 'Click or keys 1 2 3 4', action: 'Click a bat to shoot it' },
      },
      learningPreview: 'Your sentences',
      tip: 'No hurry: the bats keep circling until you shoot. A wrong shot only costs courage, and courage always comes back.',
      start: 'Start the patrol 🦅',
    },
    hud: {
      place: 'Gryphon Patrol',
      sentence: 'Sentence {index}/{total}',
      courage: 'Courage',
      story: '📖 Story',
      build: 'Build the sentence in order.',
      next: 'Which bat has the next word?',
      right: 'Bullseye!',
      collected: 'Word!',
      again: 'Not that one. Try this word again.',
      rested: 'Rested and brave again!',
      cast: { title: 'Sentence done!', text: 'Every word is in its place.' },
      done: { title: 'The sky is safe!', text: 'Your gryphon patrolled every sentence.' },
    },
  },
} as const;
