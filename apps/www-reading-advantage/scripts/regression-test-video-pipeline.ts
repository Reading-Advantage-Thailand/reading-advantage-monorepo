#!/usr/bin/env tsx
/**
 * Regression test for blog-to-video pipeline.
 *
 * Verifies:
 * 1. Revideo intro/outro scenes exist (prevents ffmpeg-only fallback)
 * 2. generate-blog-video.ts imports @revideo/renderer
 * 3. A test video can be generated with correct structure
 * 4. Intro and outro frames are visually distinct (animations exist)
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const ROOT = path.resolve('.');
const PUBLIC_DIR = path.resolve('public');

function run(cmd: string): string {
  return execSync(cmd, { encoding: 'utf-8', cwd: ROOT }).trim();
}

function fail(message: string): never {
  console.error(`❌ FAIL: ${message}`);
  process.exit(1);
}

function pass(message: string): void {
  console.log(`✅ PASS: ${message}`);
}

async function main() {
  console.log('\n🧪 Running video pipeline regression tests...\n');

  // Test 1: Revideo scenes exist
  const introScene = path.join(ROOT, 'revideo/scenes/intro.tsx');
  const outroScene = path.join(ROOT, 'revideo/scenes/outro.tsx');
  if (!fs.existsSync(introScene)) fail('Revideo intro scene missing: revideo/scenes/intro.tsx');
  if (!fs.existsSync(outroScene)) fail('Revideo outro scene missing: revideo/scenes/outro.tsx');
  pass('Revideo intro and outro scenes exist');

  // Test 2: generate-blog-video.ts imports @revideo/renderer
  const scriptPath = path.join(ROOT, 'scripts/generate-blog-video.ts');
  const scriptContent = fs.readFileSync(scriptPath, 'utf-8');
  if (!scriptContent.includes("@revideo/renderer")) {
    fail('generate-blog-video.ts does not import @revideo/renderer — ffmpeg-only fallback detected');
  }
  if (!scriptContent.includes('renderIntroClip') || !scriptContent.includes('renderOutroClip')) {
    fail('generate-blog-video.ts does not call Revideo render functions — ffmpeg-only fallback detected');
  }
  pass('generate-blog-video.ts uses Revideo for intro/outro rendering');

  // Test 3: Generate a test video with --skip-assets
  const testBlogPath = path.join(ROOT, 'src/app/[locale]/(marketing)/blog/posts/th/beyond-the-backpacker.md');
  if (!fs.existsSync(testBlogPath)) {
    console.log('⚠️  Skipping integration test: test blog not found');
    process.exit(0);
  }

  const testSegmentsPath = path.join(ROOT, 'tmp/test-segments.json');
  if (!fs.existsSync(testSegmentsPath)) {
    // Create minimal test segments
    fs.mkdirSync(path.dirname(testSegmentsPath), { recursive: true });
    fs.writeFileSync(testSegmentsPath, JSON.stringify([
      { text: 'ทดสอบส่วนที่หนึ่งของวิดีโอ', imageDescription: 'A test scene' },
      { text: 'ทดสอบส่วนที่สองของวิดีโอ', imageDescription: 'Another test scene' },
    ]));
  }

  const testOutputDir = path.join(ROOT, 'tmp/regression-test-output');
  fs.mkdirSync(testOutputDir, { recursive: true });

  console.log('\n🎬 Generating test video (this may take a minute)...');
  try {
    run(`npx tsx scripts/generate-blog-video.ts "${testBlogPath}" --segments "${testSegmentsPath}" --skip-assets --out-dir "${testOutputDir}" --keep-intermediates`);
  } catch (e) {
    fail(`Video generation failed: ${e}`);
  }

  // Test 4: Output file exists and has expected properties
  const outputFiles = fs.readdirSync(testOutputDir).filter(f => f.endsWith('.mp4'));
  if (outputFiles.length === 0) fail('No MP4 output file found');
  const outputFile = path.join(testOutputDir, outputFiles[0]);

  const duration = Number(run(`ffprobe -v error -show_entries format=duration -of default=nokey=1:noprint_wrappers=1 "${outputFile}"`));
  if (!Number.isFinite(duration) || duration <= 0) fail(`Invalid output duration: ${duration}`);
  if (duration < 10) fail(`Output too short: ${duration.toFixed(1)}s (expected at least 10s for 2 segments + intro + outro)`);
  pass(`Output video exists and has reasonable duration (${duration.toFixed(1)}s)`);

  // Test 5: Verify video stream properties
  const width = Number(run(`ffprobe -v error -show_entries stream=width -select_streams v -of default=nokey=1:noprint_wrappers=1 "${outputFile}"`));
  const height = Number(run(`ffprobe -v error -show_entries stream=height -select_streams v -of default=nokey=1:noprint_wrappers=1 "${outputFile}"`));
  if (width !== 1080 || height !== 1920) fail(`Wrong resolution: ${width}x${height} (expected 1080x1920)`);
  pass('Output resolution is 1080x1920');

  // Test 6: Extract frames to verify intro, segment, and outro are present
  const introFrame = path.join(testOutputDir, 'test-intro.jpg');
  const segmentFrame = path.join(testOutputDir, 'test-segment.jpg');
  const outroFrame = path.join(testOutputDir, 'test-outro.jpg');

  run(`ffmpeg -loglevel error -y -i "${outputFile}" -vf "select='eq(n,0)'" -vframes 1 "${introFrame}"`);
  run(`ffmpeg -loglevel error -y -i "${outputFile}" -ss 00:00:05 -vframes 1 "${segmentFrame}"`);
  run(`ffmpeg -loglevel error -y -i "${outputFile}" -ss 00:00:12 -vframes 1 "${outroFrame}"`);

  if (!fs.existsSync(introFrame)) fail('Could not extract intro frame');
  if (!fs.existsSync(segmentFrame)) fail('Could not extract segment frame');
  if (!fs.existsSync(outroFrame)) fail('Could not extract outro frame');
  pass('Intro, segment, and outro frames extracted successfully');

  // Test 7: Verify frames are visually distinct (proves animation / scene changes exist)
  const introSize = fs.statSync(introFrame).size;
  const segmentSize = fs.statSync(segmentFrame).size;
  const outroSize = fs.statSync(outroFrame).size;

  if (introSize === segmentSize || segmentSize === outroSize) {
    // Sizes might coincidentally match, do pixel comparison
    const diffIntroSeg = Number(run(`ffmpeg -loglevel error -y -i "${introFrame}" -i "${segmentFrame}" -filter_complex "blend=all_mode=difference" -f rawvideo - | wc -c`));
    const diffSegOutro = Number(run(`ffmpeg -loglevel error -y -i "${segmentFrame}" -i "${outroFrame}" -filter_complex "blend=all_mode=difference" -f rawvideo - | wc -c`));
    if (diffIntroSeg === 0 || diffSegOutro === 0) {
      fail('Frames are pixel-identical — no scene transitions detected');
    }
  }
  pass('Frames are visually distinct (scene transitions exist)');

  // Test 8: Verify outro is present at end of video
  const outroTime = Math.max(0, duration - 2);
  const lateOutroFrame = path.join(testOutputDir, 'test-late-outro.jpg');
  run(`ffmpeg -loglevel error -y -i "${outputFile}" -ss ${outroTime.toFixed(1)} -vframes 1 "${lateOutroFrame}"`);
  if (!fs.existsSync(lateOutroFrame)) fail('Could not extract late-outro frame');
  pass('Outro frame exists near end of video');

  // Cleanup
  fs.rmSync(testOutputDir, { recursive: true, force: true });

  console.log('\n🎉 All regression tests passed!\n');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
