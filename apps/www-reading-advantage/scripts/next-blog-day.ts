#!/usr/bin/env tsx
/**
 * Determines the next blog day to generate for the active marketing campaign.
 * This script is a guardrail to prevent phase/day confusion.
 *
 * Usage:
 *   npx tsx scripts/next-blog-day.ts
 */

import fs from 'fs';
import path from 'path';

const MARKETING_PLAN = path.resolve('measure/marketing_plan_30_days.md');
const CURRENT_DIRECTIVE = path.resolve('measure/current_directive.md');

function main() {
  console.log('=== Blog Marketing Campaign Status ===\n');

  // 1. Read current directive
  if (!fs.existsSync(CURRENT_DIRECTIVE)) {
    console.error('ERROR: measure/current_directive.md not found!');
    process.exit(1);
  }
  const directive = fs.readFileSync(CURRENT_DIRECTIVE, 'utf-8');
  const phaseMatch = directive.match(/\*\*Phase:\*\*\s*(\d+)/);
  const nextDayMatch = directive.match(/\*\*Next Day to Generate:\*\*\s*Day\s*(\d+)/);
  const trackMatch = directive.match(/\*\*Track:\*\*\s*`([^`]+)`/);

  console.log('Current Directive:');
  console.log(`  Phase: ${phaseMatch ? phaseMatch[1] : 'UNKNOWN'}`);
  console.log(`  Track: ${trackMatch ? trackMatch[1] : 'UNKNOWN'}`);
  console.log(`  Next Day (from directive): ${nextDayMatch ? `Day ${nextDayMatch[1]}` : 'UNKNOWN'}`);
  console.log('');

  // 2. Scan existing day-numbered blog images to find highest completed day
  const BLOG_IMAGES_DIR = path.resolve('public/blog');
  let maxDay = 0;
  let imageCount = 0;

  if (fs.existsSync(BLOG_IMAGES_DIR)) {
    const images = fs.readdirSync(BLOG_IMAGES_DIR);
    for (const img of images) {
      const match = img.match(/^day(\d{2})-/);
      if (match) {
        imageCount++;
        const dayNum = parseInt(match[1], 10);
        if (dayNum > maxDay) maxDay = dayNum;
      }
    }
  }

  const nextDayFromFiles = maxDay + 1;

  console.log(`Day-numbered images found: ${imageCount}`);
  console.log(`Highest day found: ${maxDay > 0 ? `Day ${maxDay}` : 'None'}`);
  console.log(`Next day (from files): Day ${nextDayFromFiles}`);
  console.log('');

  // 3. Determine authoritative next day
  const directiveNextDay = nextDayMatch ? parseInt(nextDayMatch[1], 10) : 0;
  const finalNextDay = directiveNextDay > 0 ? directiveNextDay : nextDayFromFiles;

  console.log('=== AUTHORITATIVE NEXT DAY ===');
  console.log(`\n  >>> GENERATE DAY ${finalNextDay} <<<\n`);

  if (finalNextDay > 30) {
    console.log('WARNING: Day is > 30. Phase 1 should be complete.');
    console.log('If Phase 1 is truly done, update current_directive.md to Phase 2.');
  }

  if (finalNextDay <= 30) {
    // Show the topic
    if (fs.existsSync(MARKETING_PLAN)) {
      const plan = fs.readFileSync(MARKETING_PLAN, 'utf-8');
      const lines = plan.split('\n');
      for (const line of lines) {
        if (line.startsWith(`| ${finalNextDay} `)) {
          console.log(`Topic: ${line}`);
          break;
        }
      }
    }
  }
}

main();
