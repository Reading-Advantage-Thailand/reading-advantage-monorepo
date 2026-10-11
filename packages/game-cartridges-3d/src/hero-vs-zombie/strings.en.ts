/** English UI text of Hero vs. Zombie 3D (catalog scope `heroVsZombie`). */
export default {
  heroVsZombie: {
    title: 'Hero vs. Zombie',
    pitch: 'Find the right light orbs and blast the zombies.',
    subtitle: 'Night in the churchyard',
    briefing: {
      objective: 'Find the meaning of every word before the sun rises.',
      instructions: {
        read: { title: 'Read the word', description: 'One of your words glows at the top of the screen.' },
        find: { title: 'Find its meaning', description: 'Run to the light orb with the right meaning. It charges your Blast.' },
        blast: { title: 'Blast the zombies', description: 'Tap Blast to knock down every zombie near you. They get up again later!' },
      },
      controls: {
        touch: { label: 'Drag and tap Blast', action: 'Run, and knock zombies down' },
        pointer: { label: 'WASD and Space', action: 'Run, and Blast' },
      },
      learningPreview: 'Your words',
      tip: 'Zombies only push you back. You cannot lose, so take your time to read.',
      start: 'Face the night 🧟',
      audio: {
        objective: 'Find the English word for every meaning before the sun rises.',
        instructions: {
          read: { title: 'Read the meaning', description: 'A Thai meaning glows at the top of the screen.' },
          find: { title: 'Listen and find', description: 'Touch an orb to hear its word. Touch it again to take it.' },
        },
        tip: 'Zombies wait while you hear the first word of each meaning.',
      },
    },
    hud: {
      place: 'Churchyard',
      round: 'Word {index}/{total}',
      find: 'Find the meaning of',
      findWord: 'Find the English word for',
      listen: 'Listen to orb {index}',
      soundOff: 'Turn the sound on to hear the words.',
      shield: 'Listen!',
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
