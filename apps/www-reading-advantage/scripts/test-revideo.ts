#!/usr/bin/env tsx
import { renderVideo } from '@revideo/renderer';
import path from 'path';

async function main() {
  console.log('Testing Revideo rendering...');
  
  try {
    const renderedPath = await renderVideo({
      projectFile: path.resolve('revideo/test-project.ts'),
      variables: {},
      settings: {
        outFile: 'test-output.mp4',
        outDir: path.resolve('tmp'),
        logProgress: true,
        puppeteer: {
          args: ['--no-sandbox', '--disable-setuid-sandbox', '--single-process'],
        },
        projectSettings: {
          exporter: {
            name: '@revideo/core/ffmpeg',
            options: {
              format: 'mp4',
            },
          },
        },
      },
    });
    
    console.log('✅ Video rendered successfully!');
    console.log('Output:', renderedPath);
  } catch (err) {
    console.error('❌ Video rendering failed:', err);
    process.exit(1);
  }
}

main();
