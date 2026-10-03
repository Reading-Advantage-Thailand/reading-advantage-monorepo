/** English UI text of Hero vs. Zombie 3D (catalog scope `heroVsZombie`). */
export default {
  heroVsZombie: {
    title: 'Hero vs. Zombie',
    pitch: 'Find the right light orbs and blast the zombies.',
    subtitle: 'Night in the churchyard',
    briefing: {
      objective: 'Find the meaning of every word before the sun rises.',
      instructions: {
        read: { title: 'Read the word', description: 'A word from the story glows at the top of the screen.' },
        find: { title: 'Find its meaning', description: 'Run to the light orb with the right meaning. It charges your Blast.' },
        blast: { title: 'Blast the zombies', description: 'Tap Blast to knock down every zombie near you. They get up again later!' },
      },
      controls: {
        touch: { label: 'Drag and tap Blast', action: 'Run, and knock zombies down' },
        pointer: { label: 'WASD and Space', action: 'Run, and Blast' },
      },
      learningPreview: 'Words from your story',
      tip: 'Zombies only push you back. You cannot lose, so take your time to read.',
      start: 'Face the night 🧟',
    },
    hud: {
      place: 'Churchyard',
      round: 'Word {index}/{total}',
      find: 'Find the meaning of',
      story: '📖 Story',
      move: 'Drag to move',
      blast: 'Blast',
      light: 'Light!',
      wrong: 'Not that one!',
      again: 'This word comes back later.',
      bump: 'Oof!',
      dawn: { title: 'The sun is rising!', text: 'The zombies crumble to dust.' },
      done: { title: 'You made it to morning!', text: 'Every word lit the way.' },
    },
  },
} as const;
