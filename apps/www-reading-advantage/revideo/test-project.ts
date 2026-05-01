import {makeProject} from '@revideo/core';
import testScene from './test-scene';

export default makeProject({
  scenes: [testScene],
  settings: {
    shared: {
      size: {x: 1080, y: 1920},
      background: '#000000',
      range: [0, 1],
    },
    rendering: {
      fps: 30,
      resolutionScale: 1,
      exporter: {
        name: '@revideo/core/ffmpeg',
        options: {},
      },
    },
    preview: {
      fps: 30,
      resolutionScale: 0.5,
    },
  },
});
