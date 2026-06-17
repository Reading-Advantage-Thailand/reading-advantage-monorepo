import * as fs from 'fs';
import * as path from 'path';
import { parseBilingualTitle } from '../../lib/bilingual';

const lessonsDir = path.join(__dirname, '..', 'seed-data', 'lessons');

const files = fs.readdirSync(lessonsDir).filter(f => f.endsWith('.json'));

let totalUpdated = 0;

for (const file of files) {
  const filePath = path.join(lessonsDir, file);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  let fileUpdated = 0;

  for (const lesson of data.lessons) {
    if (lesson.titleThai !== undefined) {
      continue;
    }

    const { english, thai } = parseBilingualTitle(lesson.title);

    if (thai !== null) {
      lesson.title = english;
      lesson.titleThai = thai;
      fileUpdated++;
    }
  }

  if (fileUpdated > 0) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
    console.log(`  Updated ${file}: ${fileUpdated} lessons`);
    totalUpdated += fileUpdated;
  }
}

console.log(`\n✅ Updated ${totalUpdated} lessons across ${files.length} files`);
