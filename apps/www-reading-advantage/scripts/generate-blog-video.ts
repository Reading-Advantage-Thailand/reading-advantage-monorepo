#!/usr/bin/env tsx
/**
 * Blog-to-Video Generation Pipeline (Rev 6 — Revideo with ffmpeg fallback)
 *
 * - Intro: Revideo animated scene (logo bounce, title slide-up) — falls back to
 *   ffmpeg static frame with fade if Revideo times out
 * - Segments: ffmpeg with Ken Burns zoompan, bottom-third subtitles, fade in/out
 * - Outro: Revideo animated scene (brand bg, logo bounce, CTA slide-up) — falls back
 *   to ffmpeg static frame with fade if Revideo times out
 * - Assembly: ffmpeg concat + mux + jingle mix
 *
 * Usage:
 *   npx tsx scripts/generate-blog-video.ts <path-to-blog.md> [--segments segments.json]
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import matter from 'gray-matter';
import { renderVideo } from '@revideo/renderer';

interface Segment {
  text: string;
  imageDescription: string;
}

interface BlogMeta {
  title: string;
  excerpt: string;
  coverImage?: string;
  tags?: string[];
}

const PUBLIC_DIR_ABS = path.resolve('public');
const FALLBACK_IMAGE_PATH = path.resolve(PUBLIC_DIR_ABS, 'images/logo.jpg');
const JINGLE_PATH = path.resolve(PUBLIC_DIR_ABS, 'audio/reading-advantage-jingle.mp3');
const THAI_FONT = '/usr/share/fonts/truetype/freefont/FreeSerifBold.ttf';

const args = process.argv.slice(2);
const blogPath = args[0];
const outDir = args.includes('--out-dir')
  ? args[args.indexOf('--out-dir') + 1]
  : 'public/videos';
const segmentsPath = args.includes('--segments')
  ? args[args.indexOf('--segments') + 1]
  : null;
const skipAssets = args.includes('--skip-assets');
const keepIntermediates = args.includes('--keep-intermediates');

if (!blogPath) {
  console.error('Error: Please provide a path to a blog markdown file.');
  console.error('Usage: npx tsx scripts/generate-blog-video.ts <path-to-blog.md> [--segments segments.json]');
  process.exit(1);
}

const blogAbsPath = path.resolve(blogPath);
if (!fs.existsSync(blogAbsPath)) {
  console.error(`Error: Blog file not found: ${blogAbsPath}`);
  process.exit(1);
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\u0E00-\u0E7F]+/g, '-')
    .replace(/^-|-$/g, '');
}

function runCommand(cmd: string): string {
  console.log(`> ${cmd}`);
  return execSync(cmd, { encoding: 'utf-8', cwd: process.cwd() });
}

function getMediaDurationSeconds(filePath: string): number | null {
  try {
    const output = runCommand(
      `ffprobe -v error -show_entries format=duration -of default=nokey=1:noprint_wrappers=1 "${filePath}"`
    ).trim();
    const duration = Number(output);
    if (Number.isFinite(duration) && duration > 0) {
      return duration;
    }
  } catch (error) {
    console.warn(`   Failed to read media duration for ${filePath}`);
  }
  return null;
}

function getAudioStreamDurationSeconds(filePath: string): number | null {
  try {
    const output = runCommand(
      `ffprobe -v error -select_streams a:0 -show_entries stream=duration -of default=nokey=1:noprint_wrappers=1 "${filePath}"`
    ).trim();
    const duration = Number(output);
    if (Number.isFinite(duration) && duration > 0) {
      return duration;
    }
  } catch (error) {
    console.warn(`   Failed to read audio stream duration for ${filePath}`);
  }
  return null;
}

function detectLanguage(text: string): 'th' | 'en' {
  return /[\u0E00-\u0E7F]/.test(text) ? 'th' : 'en';
}

function resolveCoverImagePath(coverImage: string | undefined, blogAbsPath: string): string | null {
  if (!coverImage) return null;
  const trimmed = coverImage.trim();
  if (!trimmed || trimmed.startsWith('http://') || trimmed.startsWith('https://')) return null;
  if (trimmed.startsWith('/')) {
    const publicPath = path.resolve(PUBLIC_DIR_ABS, trimmed.replace(/^\/+/, ''));
    return fs.existsSync(publicPath) ? publicPath : null;
  }
  const candidates = [
    path.resolve(path.dirname(blogAbsPath), trimmed),
    path.resolve(PUBLIC_DIR_ABS, trimmed),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

function findFirstImageFile(rootDir: string): string | null {
  const allowedExts = new Set(['.png', '.jpg', '.jpeg', '.webp', '.avif']);
  const queue: string[] = [rootDir];
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || !fs.existsSync(current)) continue;
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const absoluteEntryPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        queue.push(absoluteEntryPath);
        continue;
      }
      if (allowedExts.has(path.extname(entry.name).toLowerCase())) {
        return absoluteEntryPath;
      }
    }
  }
  return null;
}

/** Word-wrap text for ffmpeg drawtext (newline separated). */
function wrapText(text: string, maxCharsPerLine: number, maxLines: number): string {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (!cleaned) return '';

  const charCount = (value: string) => Array.from(value).length;

  // Force-break any token that exceeds maxCharsPerLine into char chunks
  function chunkToken(token: string): string[] {
    if (charCount(token) <= maxCharsPerLine) return [token];
    const chars = Array.from(token);
    const chunks: string[] = [];
    for (let i = 0; i < chars.length; i += maxCharsPerLine) {
      chunks.push(chars.slice(i, i + maxCharsPerLine).join(''));
    }
    return chunks;
  }

  let tokens: string[];

  if (typeof Intl !== 'undefined' && typeof Intl.Segmenter !== 'undefined') {
    const segmenter = new Intl.Segmenter('th', { granularity: 'word' });
    const segmented = Array.from(segmenter.segment(cleaned), part => part.segment).filter(Boolean);
    tokens = segmented.length > 0 ? segmented : cleaned.split(/(\s+)/).filter(Boolean);
  } else {
    tokens = cleaned.split(/(\s+)/).filter(Boolean);
  }

  // Flatten: force-break oversized tokens, drop pure-whitespace tokens
  const flatTokens: string[] = [];
  for (const token of tokens) {
    if (!token.trim()) continue;
    flatTokens.push(...chunkToken(token));
  }

  const lines: string[] = [];
  let currentLine = '';

  for (const token of flatTokens) {
    const nextLine = `${currentLine}${token}`;
    if (currentLine && charCount(nextLine) > maxCharsPerLine) {
      lines.push(currentLine.trim());
      currentLine = token;
    } else {
      currentLine = nextLine;
    }
  }

  if (currentLine.trim()) {
    lines.push(currentLine.trim());
  }

  if (lines.length > maxLines) {
    const trimmed = lines.slice(0, maxLines);
    const lastLine = trimmed[maxLines - 1];
    const clipped = Array.from(lastLine).slice(0, Math.max(0, maxCharsPerLine - 1)).join('').trimEnd();
    trimmed[maxLines - 1] = `${clipped}…`;
    return trimmed.join('\n');
  }

  return lines.join('\n');
}

/** Write text to a temp file for ffmpeg drawtext textfile option. */
function writeTextFile(text: string, filePath: string): void {
  fs.writeFileSync(filePath, text, 'utf-8');
}

/** Create a temporary Revideo project file for intro or outro. */
function calculateIntroFontSize(title: string): number {
  const len = Array.from(title).length;
  if (len > 70) return 48;
  if (len > 50) return 54;
  return 62;
}

function wrapTitleForRevideo(title: string, maxCharsPerLine: number): string {
  const chars = Array.from(title);
  const lines: string[] = [];
  let currentLine = '';

  for (let i = 0; i < chars.length; i++) {
    const char = chars[i];

    if (char === '\n') {
      lines.push(currentLine);
      currentLine = '';
      continue;
    }

    if (currentLine.length >= maxCharsPerLine) {
      let breakAt = -1;
      for (let j = currentLine.length - 1; j >= Math.max(0, currentLine.length - 10); j--) {
        if (currentLine[j] === ' ') {
          breakAt = j;
          break;
        }
      }

      if (breakAt > 0) {
        lines.push(currentLine.slice(0, breakAt));
        currentLine = currentLine.slice(breakAt + 1) + char;
      } else {
        lines.push(currentLine);
        currentLine = char;
      }
    } else {
      currentLine += char;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines.join('\n');
}

function createRevideoProjectFile(workDir: string, sceneName: 'intro' | 'outro', rangeEnd: number): string {
  const projectPath = path.resolve('revideo', `temp-${sceneName}-${path.basename(workDir)}.ts`);
  const content = `import {makeProject} from '@revideo/core';
import ${sceneName} from './scenes/${sceneName}';

export default makeProject({
  scenes: [${sceneName}],
  settings: {
    shared: {
      size: {x: 1080, y: 1920},
      background: '${sceneName === 'intro' ? '#0a0a0a' : '#2563eb'}',
      range: [0, ${rangeEnd}],
    },
    rendering: {
      fps: 8,
      resolutionScale: 0.5,
      exporter: {
        name: '@revideo/core/ffmpeg',
        options: {
          format: 'mp4',
        },
      },
    },
    preview: {
      fps: 8,
      resolutionScale: 0.5,
    },
  },
});
`;
  fs.writeFileSync(projectPath, content);
  return projectPath;
}

/** Render intro clip. Tries Revideo first, falls back to ffmpeg on timeout. */
async function renderIntroClip(
  logoPath: string,
  title: string,
  duration: number,
  outputPath: string,
  workDir: string,
  fontPath: string = THAI_FONT
): Promise<void> {
  // Try Revideo first
  try {
    const fps = 8;
    const rangeEnd = Math.ceil(duration * fps);
    const projectPath = createRevideoProjectFile(workDir, 'intro', rangeEnd);

    const titleFontSize = calculateIntroFontSize(title);
    const maxCharsPerLine = titleFontSize <= 48 ? 20 : titleFontSize <= 54 ? 22 : 25;
    const wrappedTitle = wrapTitleForRevideo(title, maxCharsPerLine);

    const renderedPath = await Promise.race([
      renderVideo({
        projectFile: projectPath,
        variables: {
          logoPath: path.relative(PUBLIC_DIR_ABS, logoPath).replace(/\\/g, '/'),
          title: wrappedTitle,
          introDuration: duration,
          titleFontSize,
        },
        settings: {
          outFile: path.basename(outputPath),
          outDir: path.dirname(outputPath),
          logProgress: false,
          puppeteer: {
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--single-process'],
          },
        },
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Revideo timeout')), 120000)
      ),
    ]);

    const actualRendered = path.join(path.dirname(outputPath), path.basename(renderedPath));
    if (actualRendered !== outputPath) {
      fs.renameSync(actualRendered, outputPath);
    }

    // Revideo output is video-only — add silent audio track for concat compatibility
    const withAudioPath = path.join(workDir, 'intro-with-audio.mp4');
    runCommand(
      `ffmpeg -loglevel error -y -i "${outputPath}" -f lavfi -i "anullsrc=r=32000:cl=mono" -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -t ${duration} "${withAudioPath}" 2>/dev/null`
    );
    fs.renameSync(withAudioPath, outputPath);

    console.log('   Intro: Revideo render succeeded');
    return;
  } catch (err: any) {
    console.warn(`   Revideo intro failed (${err.message}), falling back to ffmpeg...`);
  }

  // FFmpeg fallback: static frame with fade in/out
  // Calculate max chars per line based on frame width (1080px) and font size
  // Thai characters are ~50-60% of font size in width; add 10% safety margin
  const titleFontSize = calculateIntroFontSize(title);
  const charWidth = titleFontSize * 0.6;
  const titleMaxChars = Math.max(10, Math.floor((1080 * 0.85) / charWidth));
  const wrappedTitle = wrapText(title, titleMaxChars, 4);
  const titleFile = path.join(workDir, 'intro-title.txt');
  writeTextFile(wrappedTitle, titleFile);

  const framePath = path.join(workDir, 'intro-frame.jpg');
  runCommand(
    `ffmpeg -loglevel error -y -f lavfi -i "color=c=#0a0a0a:s=1080x1920" -i "${logoPath}" -filter_complex "
      [1:v]scale=400:400[logo];
      [0:v][logo]overlay=(W-w)/2:(H-h)/2-400:format=auto[tmp];
      [tmp]drawtext=fontfile=${fontPath}:textfile='${titleFile}':fontcolor=white:fontsize=${titleFontSize}:x=(w-text_w)/2:y=950:line_spacing=14
    " -frames:v 1 "${framePath}" 2>/dev/null`
  );

  runCommand(
    `ffmpeg -loglevel error -y -loop 1 -i "${framePath}" -f lavfi -i "anullsrc=r=32000:cl=mono" -filter_complex "[0:v]fade=t=in:st=0:d=0.8,fade=t=out:st=${(duration - 0.8).toFixed(1)}:d=0.8[v]" -map "[v]" -map 1:a -t ${duration} -r 25 -c:v libx264 -preset veryfast -crf 20 -pix_fmt yuv420p -c:a aac -b:a 192k "${outputPath}" 2>/dev/null`
  );
}

/** Render outro clip. Tries Revideo first, falls back to ffmpeg on timeout. */
async function renderOutroClip(
  logoPath: string,
  ctaText: string,
  duration: number,
  outputPath: string,
  workDir: string,
  brandColor: string = '#2563eb',
  fontPath: string = THAI_FONT
): Promise<void> {
  // Try Revideo first
  try {
    const fps = 8;
    const rangeEnd = Math.ceil(duration * fps);
    const projectPath = createRevideoProjectFile(workDir, 'outro', rangeEnd);

    const renderedPath = await Promise.race([
      renderVideo({
        projectFile: projectPath,
        variables: {
          logoPath: path.relative(PUBLIC_DIR_ABS, logoPath).replace(/\\/g, '/'),
          ctaText,
          outroDuration: duration,
          brandColor,
          ctaFontSize: 56,
        },
        settings: {
          outFile: path.basename(outputPath),
          outDir: path.dirname(outputPath),
          logProgress: false,
          puppeteer: {
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--single-process'],
          },
        },
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Revideo timeout')), 120000)
      ),
    ]);

    const actualRendered = path.join(path.dirname(outputPath), path.basename(renderedPath));
    if (actualRendered !== outputPath) {
      fs.renameSync(actualRendered, outputPath);
    }

    // Revideo output is video-only — add silent audio track for concat compatibility
    const withAudioPath = path.join(workDir, 'outro-with-audio.mp4');
    runCommand(
      `ffmpeg -loglevel error -y -i "${outputPath}" -f lavfi -i "anullsrc=r=32000:cl=mono" -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -t ${duration} "${withAudioPath}" 2>/dev/null`
    );
    fs.renameSync(withAudioPath, outputPath);

    console.log('   Outro: Revideo render succeeded');
    return;
  } catch (err: any) {
    console.warn(`   Revideo outro failed (${err.message}), falling back to ffmpeg...`);
  }

  // FFmpeg fallback: static frame with fade in/out
  // Calculate max chars per line based on frame width (1080px) and font size
  const outroFontSize = 56;
  const outroCharWidth = outroFontSize * 0.6;
  const outroMaxChars = Math.max(10, Math.floor((1080 * 0.85) / outroCharWidth));
  const wrappedCta = wrapText(ctaText, outroMaxChars, 3);
  const ctaFile = path.join(workDir, 'outro-cta.txt');
  writeTextFile(wrappedCta, ctaFile);

  const framePath = path.join(workDir, 'outro-frame.jpg');
  runCommand(
    `ffmpeg -loglevel error -y -f lavfi -i "color=c=${brandColor}:s=1080x1920" -i "${logoPath}" -filter_complex "
      [1:v]scale=300:300[logo];
      [0:v][logo]overlay=(W-w)/2:(H-h)/2-350:format=auto[tmp];
      [tmp]drawtext=fontfile=${fontPath}:textfile='${ctaFile}':fontcolor=white:fontsize=${outroFontSize}:x=(w-text_w)/2:y=850:line_spacing=16
    " -frames:v 1 "${framePath}" 2>/dev/null`
  );

  runCommand(
    `ffmpeg -loglevel error -y -loop 1 -i "${framePath}" -f lavfi -i "anullsrc=r=32000:cl=mono" -filter_complex "[0:v]fade=t=in:st=0:d=0.8,fade=t=out:st=${(duration - 0.8).toFixed(1)}:d=0.8[v]" -map "[v]" -map 1:a -t ${duration} -r 25 -c:v libx264 -preset veryfast -crf 20 -pix_fmt yuv420p -c:a aac -b:a 192k "${outputPath}" 2>/dev/null`
  );
}

/** Create segment clip with Ken Burns zoom, bottom text, fade in/out, and embedded audio. */
function createSegmentClip(
  imagePath: string,
  text: string,
  audioPath: string,
  duration: number,
  outputPath: string,
  fontPath: string,
  brandColor: string = '#2563eb'
): void {
  const wrappedText = wrapText(text, 20, 3);
  const textFile = outputPath.replace('.mp4', '-text.txt');
  writeTextFile(wrappedText, textFile);

  const fps = 25;
  const totalFrames = Math.max(1, Math.ceil(duration * fps));
  const fadeDuration = 0.5;
  const fadeOutStart = Math.max(0, duration - fadeDuration);

  // Ken Burns zoom-out from 1.08x to 1.0x over the clip duration
  const zoompanFilter = `zoompan=z='1.08-0.08*in/${totalFrames}':d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)',scale=1080:1920:flags=lanczos`;

  // Dark overlay + bottom text with box + fade
  const overlayFilter = `drawbox=color=black@0.40:t=fill`;
  const textFilter = `drawtext=fontfile=${fontPath}:textfile='${textFile}':fontcolor=white:fontsize=42:box=1:boxcolor=${brandColor}@0.85:boxborderw=12:x=(w-text_w)/2:y=(h-text_h-80):line_spacing=12`;
  const fadeFilter = `fade=t=in:st=0:d=${fadeDuration},fade=t=out:st=${fadeOutStart.toFixed(3)}:d=${fadeDuration}`;

  // Generate video with embedded audio — pad audio to exact video duration so concat has no gaps
  const videoDuration = totalFrames / fps;
  runCommand(
    `ffmpeg -loglevel error -y -loop 1 -i "${imagePath}" -i "${audioPath}" -filter_complex "
      [0:v]${zoompanFilter}[scaled];
      [scaled]${overlayFilter}[dark];
      [dark]${textFilter}[txt];
      [txt]${fadeFilter}
    " -af "apad=whole_dur=${videoDuration.toFixed(3)}" -t ${videoDuration.toFixed(3)} -r ${fps} -c:v libx264 -preset veryfast -crf 20 -pix_fmt yuv420p -c:a aac -b:a 192k "${outputPath}" 2>/dev/null`
  );
}

/** Concatenate multiple video clips into one. */
function concatClips(clips: string[], outputPath: string): void {
  const listPath = outputPath.replace('.mp4', '-list.txt');
  const listContent = clips
    .map(c => `file '${path.resolve(c).replace(/'/g, "'\\''")}'`)
    .join('\n');
  fs.writeFileSync(listPath, listContent);

  runCommand(
    `ffmpeg -loglevel error -y -f concat -safe 0 -i "${listPath}" -c copy "${outputPath}" 2>/dev/null`
  );
}

/** Mix background jingle with video. Audio is already embedded in the video. */
function mixBackgroundMusic(videoPath: string, jinglePath: string, outputPath: string, workDir: string): void {
  if (!jinglePath || !fs.existsSync(jinglePath)) {
    fs.copyFileSync(videoPath, outputPath);
    return;
  }

  const videoDuration = getMediaDurationSeconds(videoPath) ?? 60;
  const jingleLoopPath = path.join(workDir, 'jingle-loop.m4a');

  // Loop jingle to match video duration with fade-out
  runCommand(
    `ffmpeg -loglevel error -y -stream_loop -1 -i "${jinglePath}" -t ${videoDuration.toFixed(1)} -af "volume=0.10,afade=t=out:st=${Math.max(0, videoDuration - 2).toFixed(1)}:d=2" -c:a aac -b:a 192k "${jingleLoopPath}" 2>/dev/null`
  );

  // Mix jingle with video's existing audio — both same duration, amix works correctly
  runCommand(
    `ffmpeg -loglevel error -y -i "${videoPath}" -i "${jingleLoopPath}" -filter_complex "[0:a][1:a]amix=inputs=2:duration=first:dropout_transition=3[mixed]" -map 0:v -map "[mixed]" -c:v copy -c:a aac -b:a 192k -movflags +faststart "${outputPath}" 2>/dev/null`
  );
}

function cleanup(workDir: string): void {
  if (fs.existsSync(workDir)) {
    console.log(`   Cleaning up ${workDir}`);
    fs.rmSync(workDir, { recursive: true, force: true });
  }
  // Clean up temp Revideo project files
  const revideoDir = path.resolve('revideo');
  if (fs.existsSync(revideoDir)) {
    for (const entry of fs.readdirSync(revideoDir)) {
      if (entry.startsWith('temp-intro-') || entry.startsWith('temp-outro-')) {
        fs.rmSync(path.join(revideoDir, entry), { force: true });
      }
    }
  }
}

/** Clean up stale blog-video directories older than 1 hour from tmp/. */
function cleanupStaleTmp(): void {
  const tmpDir = path.resolve('tmp');
  if (!fs.existsSync(tmpDir)) return;
  const oneHourAgo = Date.now() - 3600_000;
  for (const entry of fs.readdirSync(tmpDir)) {
    if (!entry.startsWith('blog-video-')) continue;
    const dirPath = path.join(tmpDir, entry);
    try {
      const stat = fs.statSync(dirPath);
      if (stat.isDirectory() && stat.mtimeMs < oneHourAgo) {
        console.log(`   Removing stale tmp: ${dirPath}`);
        fs.rmSync(dirPath, { recursive: true, force: true });
      }
    } catch {}
  }
}

async function main() {
  cleanupStaleTmp();
  console.log(`\n📄 Parsing blog: ${blogAbsPath}`);
  const raw = fs.readFileSync(blogAbsPath, 'utf-8');
  const parsed = matter(raw);
  const meta = parsed.data as BlogMeta;
  const lang = detectLanguage(meta.title || '');

  const slug = slugify(meta.title || 'blog-video');
  const runId = Date.now();
  const workDir = path.join('tmp', `blog-video-${runId}`);
  fs.mkdirSync(workDir, { recursive: true });

  console.log(`   Title: ${meta.title}`);
  console.log(`   Language: ${lang}`);

  // ========== STEP 1: Load segments ==========
  let segments: Segment[] = [];

  // Resolve segments path: explicit flag → auto-discover next to blog file
  let resolvedSegmentsPath = segmentsPath;
  if (!resolvedSegmentsPath) {
    const blogDir = path.dirname(blogAbsPath);
    const blogBasename = path.basename(blogAbsPath, '.md');
    const autoPath = path.join(blogDir, `${blogBasename}-segments.json`);
    if (fs.existsSync(autoPath)) {
      resolvedSegmentsPath = autoPath;
      console.log(`\n📋 Auto-discovered segments: ${autoPath}`);
    }
  }

  if (resolvedSegmentsPath && fs.existsSync(resolvedSegmentsPath)) {
    console.log(`\n📋 Loading segments from ${resolvedSegmentsPath}`);
    const segmentsRaw = fs.readFileSync(resolvedSegmentsPath, 'utf-8');
    const parsedSegments = JSON.parse(segmentsRaw);
    if (Array.isArray(parsedSegments)) {
      segments = parsedSegments
        .filter((s: any) => s && typeof s.text === 'string' && typeof s.imageDescription === 'string')
        .map((s: any) => ({
          text: s.text.trim(),
          imageDescription: s.imageDescription.trim(),
        }));
    }
  }

  if (segments.length === 0) {
    console.error('\n❌ No segments found. Provide a segments JSON file via:');
    console.error(`   --segments <path>`);
    console.error(`   OR place it at: ${path.dirname(blogAbsPath)}/${path.basename(blogAbsPath, '.md')}-segments.json`);
    console.error(`   Format: [{"text": "...", "imageDescription": "..."}, ...]`);
    process.exit(1);
  }

  console.log(`   Using ${segments.length} segments`);
  segments.forEach((s, i) => console.log(`   ${i + 1}. ${s.text.slice(0, 60)}...`));

  // Sanitize image descriptions: strip prohibited terms and replace with safe alternatives
  const prohibitedTerms = ['chart', 'graph', 'diagram', 'text', 'words', 'letters', 'sign', 'label', 'number', 'ui', 'screen', 'whiteboard'];
  segments.forEach((s, i) => {
    const lower = s.imageDescription.toLowerCase();
    const found = prohibitedTerms.filter(t => lower.includes(t));
    if (found.length > 0) {
      console.warn(`   ⚠️ Segment ${i + 1}: stripping prohibited terms [${found.join(', ')}] from image description`);
      // Remove sentences/phrases containing prohibited terms
      s.imageDescription = s.imageDescription
        .split(/[.!]/)
        .filter(part => {
          const pLower = part.toLowerCase();
          return !prohibitedTerms.some(t => pLower.includes(t));
        })
        .join('.')
        .trim();
      // If sanitization removed everything, use a generic safe description
      if (!s.imageDescription) {
        s.imageDescription = 'A warm, colorful scene with people in a modern educational setting, natural lighting, no objects with writing';
      }
    }
  });

  const fontPath = fs.existsSync(THAI_FONT) ? THAI_FONT : '';
  const logoPath = fs.existsSync(FALLBACK_IMAGE_PATH) ? FALLBACK_IMAGE_PATH : '';
  const coverImageAbsPath = resolveCoverImagePath(meta.coverImage, blogAbsPath);

  try {
    // ========== STEP 2: Generate per-segment assets ==========
    const segmentAssets: { audio: string; image: string; audioDuration: number; segmentDuration: number }[] = [];

    if (!skipAssets) {
      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        const segmentDir = path.join(workDir, `segment-${i}`);
        fs.mkdirSync(segmentDir, { recursive: true });

        // Generate TTS audio
        console.log(`\n🎙️  Segment ${i + 1}: Generating audio...`);
        const audioPath = path.join(segmentDir, 'audio.mp3');
        try {
          runCommand(
            `timeout 120s mmx speech synthesize --text "${segment.text.replace(/"/g, '\\"')}" --out ${audioPath} --quiet`
          );
        } catch (e) {
          console.warn(`   Failed to generate audio, creating silent audio.`);
          runCommand(`ffmpeg -f lavfi -i anullsrc=r=32000:cl=mono -t 5 -q:a 9 -acodec libmp3lame "${audioPath}" -y 2>/dev/null`);
        }

        const audioDuration = getMediaDurationSeconds(audioPath) ?? 5;
        const segmentDuration = audioDuration;
        console.log(`   Audio: ${audioDuration.toFixed(2)}s, Segment video: ${segmentDuration.toFixed(2)}s`);

        // Generate background image
        console.log(`🖼️  Segment ${i + 1}: Generating image...`);
        const imagePath = path.join(segmentDir, 'image.jpg');
        const imagePrompt = `PHOTOREALISTIC SCENE ONLY. Absolutely NO text, writing, letters, words, numbers, signs, labels, charts, graphs, diagrams, UI, screens, or books with visible text anywhere in the image. Scene: ${segment.imageDescription}. Bright colors, modern cinematic style, 9:16 vertical composition. Real-world scene only: people, places, nature, objects. Nothing with writing on it.`;
        try {
          runCommand(
            `timeout 120s mmx image generate --prompt "${imagePrompt.replace(/"/g, '\\"')}" --aspect-ratio 9:16 --n 1 --out-dir ${segmentDir} --out-prefix img --quiet`
          );
          const generatedImage = findFirstImageFile(segmentDir);
          if (generatedImage) {
            fs.renameSync(generatedImage, imagePath);
          } else {
            throw new Error('No image generated');
          }
        } catch (e) {
          console.warn(`   Failed to generate image, using fallback.`);
          if (coverImageAbsPath && fs.existsSync(coverImageAbsPath)) {
            fs.copyFileSync(coverImageAbsPath, imagePath);
          } else {
            runCommand(`ffmpeg -f lavfi -i "color=c=#1e3a5f:s=1080x1920" -frames:v 1 -q:v 2 "${imagePath}" -y 2>/dev/null`);
          }
        }

        segmentAssets.push({ audio: audioPath, image: imagePath, audioDuration, segmentDuration });
      }
    } else {
      console.log('\n⏭️  Skipping asset generation (--skip-assets)');
      for (let i = 0; i < segments.length; i++) {
        const segmentDir = path.join(workDir, `segment-${i}`);
        fs.mkdirSync(segmentDir, { recursive: true });
        const audioPath = path.join(segmentDir, 'audio.mp3');
        const imagePath = path.join(segmentDir, 'image.jpg');
        runCommand(`ffmpeg -f lavfi -i anullsrc=r=32000:cl=mono -t 5 -q:a 9 -acodec libmp3lame "${audioPath}" -y 2>/dev/null`);
        if (coverImageAbsPath && fs.existsSync(coverImageAbsPath)) {
          fs.copyFileSync(coverImageAbsPath, imagePath);
        } else {
          runCommand(`ffmpeg -f lavfi -i "color=c=#1e3a5f:s=1080x1920" -frames:v 1 -q:v 2 "${imagePath}" -y 2>/dev/null`);
        }
        segmentAssets.push({ audio: audioPath, image: imagePath, audioDuration: 5, segmentDuration: 5 });
      }
    }

    // ========== STEP 3: Render intro ==========
    const introDuration = 3;
    const outroDuration = 3;
    const clips: string[] = [];

    console.log('\n🎬 Rendering intro...');
    const introClipPath = path.join(workDir, 'intro.mp4');
    await renderIntroClip(logoPath, meta.title, introDuration, introClipPath, workDir, fontPath);
    clips.push(introClipPath);

    // ========== STEP 4: Render each segment with embedded audio ==========
    console.log('\n🎬 Generating segment clips with Ken Burns + audio...');
    for (let i = 0; i < segments.length; i++) {
      const segmentClipPath = path.join(workDir, `segment-${i}.mp4`);
      console.log(`   Segment ${i + 1} (${segmentAssets[i].segmentDuration.toFixed(2)}s)...`);
      createSegmentClip(
        segmentAssets[i].image,
        segments[i].text,
        segmentAssets[i].audio,
        segmentAssets[i].segmentDuration,
        segmentClipPath,
        fontPath
      );
      clips.push(segmentClipPath);
    }

    // ========== STEP 5: Render outro ==========
    console.log('\n🎬 Rendering outro...');
    const outroClipPath = path.join(workDir, 'outro.mp4');
    const ctaText = lang === 'th'
      ? 'อ่านบทความฉบับเต็มได้ในลิงก์ด้านล่าง!'
      : 'Read the full article — link in description!';
    await renderOutroClip(logoPath, ctaText, outroDuration, outroClipPath, workDir, '#2563eb', fontPath);
    clips.push(outroClipPath);

    // ========== STEP 6: Concatenate all clips (each has video + audio) ==========
    console.log('\n🔗 Concatenating clips...');
    const concatPath = path.join(workDir, 'concatenated.mp4');
    concatClips(clips, concatPath);

    const concatDuration = getMediaDurationSeconds(concatPath);
    const concatAudioDuration = getAudioStreamDurationSeconds(concatPath);
    console.log(`   Concatenated video: ${concatDuration?.toFixed(2) ?? '?'}s, audio: ${concatAudioDuration?.toFixed(2) ?? '?'}s`);

    // ========== STEP 7: Upscale to 1080x1920 ==========
    console.log('\n📐 Upscaling to 1080x1920...');
    const scaledPath = path.join(workDir, 'scaled.mp4');
    runCommand(
      `ffmpeg -loglevel error -y -i "${concatPath}" -vf "scale=1080:1920:flags=lanczos" -c:v libx264 -preset veryfast -crf 20 -pix_fmt yuv420p -c:a copy "${scaledPath}" 2>/dev/null`
    );

    // ========== STEP 8: Mix background jingle ==========
    console.log('\n🎵 Mixing background jingle...');
    const outDirAbs = path.resolve(outDir);
    fs.mkdirSync(outDirAbs, { recursive: true });
    const outputFileName = `${slug}.mp4`;
    const finalOutputPath = path.join(outDirAbs, outputFileName);

    mixBackgroundMusic(scaledPath, fs.existsSync(JINGLE_PATH) ? JINGLE_PATH : '', finalOutputPath, workDir);

    // ========== STEP 9: Verify output ==========
    const finalDuration = getMediaDurationSeconds(finalOutputPath);
    const finalAudioDuration = getAudioStreamDurationSeconds(finalOutputPath);
    console.log(`\n✅ Video rendered successfully!`);
    console.log(`   Output: ${finalOutputPath}`);
    console.log(`   Video duration: ${finalDuration?.toFixed(1) ?? '?'}s`);
    console.log(`   Audio duration: ${finalAudioDuration?.toFixed(1) ?? '?'}s`);
    console.log(`   Resolution: 1080x1920`);
    console.log(`   Segments: ${segments.length}`);

    // Verify audio/video alignment
    if (finalDuration && finalAudioDuration) {
      const diff = Math.abs(finalDuration - finalAudioDuration);
      if (diff <= 0.5) {
        console.log(`   Audio/video sync: PASSED (${diff.toFixed(2)}s difference)`);
      } else {
        console.warn(`   ⚠️ Audio/video sync: WARNING (${diff.toFixed(2)}s difference)`);
      }
    }

    console.log('\n🎉 Done!\n');
  } finally {
    if (!keepIntermediates) {
      cleanup(workDir);
    }
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
