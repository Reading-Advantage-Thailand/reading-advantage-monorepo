import { createServer } from 'vite';
import revideoPlugin from '@revideo/vite-plugin';
import { rendererPlugin } from '@revideo/renderer/lib/server/renderer-plugin.js';
import path from 'path';

const projectFile = path.resolve('revideo/project.ts');
const plugin = revideoPlugin.default || revideoPlugin;

const server = await createServer({
  configFile: false,
  plugins: [
    plugin({ project: projectFile, output: './tmp/output' }),
    rendererPlugin({}, {}, {}, projectFile),
  ],
});

await server.listen(9999);
await new Promise(r => setTimeout(r, 5000));

// Test accessing the scene module
const res = await fetch('http://localhost:9999/revideo/scenes/blog-video.tsx');
const text = await res.text();
console.log('Scene module status:', res.status);
if (res.status !== 200) {
  console.log('Scene module body:', text);
} else {
  console.log('Scene module (first 1000 chars):');
  console.log(text.slice(0, 1000));
}

await server.close();
