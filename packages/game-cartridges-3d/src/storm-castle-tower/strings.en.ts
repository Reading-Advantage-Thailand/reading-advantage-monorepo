/** English UI text of Storm Castle Tower 3D (catalog scope `stormCastleTower`). */
export default {
  stormCastleTower: {
    title: 'Storm Castle Tower',
    pitch: 'Climb the tower, word by word.',
    subtitle: 'Open the windows in order',
    briefing: {
      objective: 'Climb the tower and open the word windows in the order of the sentence.',
      instructions: {
        read: { title: 'Read the sentence', description: 'The sentence shows the words you have built. The next window holds the next word.' },
        climb: { title: 'Climb to the right window', description: 'Each ledge has a few windows. Climb into the window with the next word. A wrong window shuts and costs courage.' },
        dodge: { title: 'Step away from the storm', description: 'Oil and rocks fall down the tower. Step to another column. A hit costs courage and one ledge, but it never ends the game.' },
      },
      controls: {
        touch: { label: 'Hold and drag', action: 'Climb and step sideways' },
        pointer: { label: 'Arrows or WASD', action: 'Climb and step sideways' },
      },
      learningPreview: 'Your sentences',
      tip: 'Hazards and wrong windows cost courage, but they never end the game. The team rests and comes back.',
      start: 'Start the climb 🏰',
    },
    hud: {
      place: 'The Storm Castle Tower',
      tower: 'Tower {tower}/{towers}',
      courage: 'Courage',
      story: '📖 Story',
      move: 'Drag to climb',
      opened: 'Yes!',
      shut: 'Not this one!',
      hit: 'Ouch!',
      courageLost: '-1 ❤',
      rested: 'The team rests and returns.',
      summit: 'The top is open!',
      climbUp: 'Climb to the top',
      done: { title: 'The tower is yours!', text: 'Every sentence is built.' },
    },
  },
} as const;
