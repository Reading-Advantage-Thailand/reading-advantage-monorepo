#!/usr/bin/env tsx
/**
 * Migration script for seed data JSON files
 *
 * This script helps update JSON seed data files when the database schema changes.
 * It creates backups before making changes and supports dry-run mode.
 *
 * Usage:
 *   npm run migrate:seed-data -- --type=<type> --migration=<name> [--dry-run]
 *
 * Examples:
 *   npm run migrate:seed-data -- --type=lessons --migration=add-slug-field --dry-run
 *   npm run migrate:seed-data -- --type=all --migration=add-metadata
 */

import * as fs from 'fs';
import * as path from 'path';

interface MigrationOptions {
  type: 'standards' | 'lessons' | 'questions' | 'curriculum-units' | 'all';
  migration: string;
  dryRun: boolean;
}

function parseArgs(): MigrationOptions {
  const args = process.argv.slice(2);

  const type = args.find(arg => arg.startsWith('--type='))?.split('=')[1] || 'all';
  const migration = args.find(arg => arg.startsWith('--migration='))?.split('=')[1] || '';
  const dryRun = args.includes('--dry-run');

  if (!migration) {
    console.error('❌ Error: --migration parameter is required');
    console.log('\nUsage: npm run migrate:seed-data -- --type=<type> --migration=<name> [--dry-run]');
    process.exit(1);
  }

  if (!['standards', 'lessons', 'questions', 'curriculum-units', 'all'].includes(type)) {
    console.error(`❌ Error: Invalid type "${type}"`);
    console.error('Valid types: standards, lessons, questions, curriculum-units, all');
    process.exit(1);
  }

  return {
    type: type as MigrationOptions['type'],
    migration,
    dryRun,
  };
}

function createBackup(filePath: string): void {
  const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
  const backupPath = `${filePath}.backup.${timestamp}`;

  fs.copyFileSync(filePath, backupPath);
  console.log(`  📦 Created backup: ${path.basename(backupPath)}`);
}

function migrateFile(filePath: string, migrationName: string, dryRun: boolean): void {
  console.log(`\n📄 Processing: ${filePath}`);

  if (!fs.existsSync(filePath)) {
    console.log('  ⚠ File not found - skipping');
    return;
  }

  // Read current file
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  let data: any;

  try {
    data = JSON.parse(fileContent);
  } catch (error) {
    console.error(`  ❌ Invalid JSON in ${filePath}`);
    return;
  }

  // Create backup before modifying
  if (!dryRun) {
    createBackup(filePath);
  }

  // Apply migration based on name
  // This is a template - actual migrations should be defined based on schema changes
  let modified = false;

  switch (migrationName) {
    case 'example-add-metadata':
      // Example: Add metadata field to all items
      if (Array.isArray(data.standards)) {
        data.standards = data.standards.map((item: any) => ({
          ...item,
          metadata: item.metadata || {},
        }));
        modified = true;
      }
      if (Array.isArray(data.lessons)) {
        data.lessons = data.lessons.map((item: any) => ({
          ...item,
          metadata: item.metadata || {},
        }));
        modified = true;
      }
      break;

    default:
      console.log(`  ⚠ Unknown migration: ${migrationName}`);
      console.log('  Add migration logic in scripts/migrate-seed-data.ts');
      return;
  }

  if (!modified) {
    console.log('  ℹ No changes needed');
    return;
  }

  // Write updated file
  const updatedContent = JSON.stringify(data, null, 2) + '\n';

  if (dryRun) {
    console.log('  🔍 DRY RUN - Changes that would be made:');
    console.log('  (File would be updated)');
  } else {
    fs.writeFileSync(filePath, updatedContent, 'utf-8');
    console.log('  ✓ File updated successfully');
  }
}

function migrateDirectory(dirPath: string, migrationName: string, dryRun: boolean): void {
  if (!fs.existsSync(dirPath)) {
    console.log(`\n⚠ Directory not found: ${dirPath}`);
    return;
  }

  const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.json'));

  if (files.length === 0) {
    console.log(`\nℹ No JSON files found in ${dirPath}`);
    return;
  }

  console.log(`\n📁 Processing directory: ${dirPath}`);
  console.log(`   Found ${files.length} file(s)`);

  for (const file of files) {
    const filePath = path.join(dirPath, file);
    migrateFile(filePath, migrationName, dryRun);
  }
}

function main() {
  const options = parseArgs();

  console.log('🔄 Seed Data Migration Tool\n');
  console.log(`Migration: ${options.migration}`);
  console.log(`Type: ${options.type}`);
  console.log(`Mode: ${options.dryRun ? 'DRY RUN' : 'LIVE'}\n`);

  if (options.dryRun) {
    console.log('⚠ DRY RUN MODE - No files will be modified\n');
  } else {
    console.log('⚠ LIVE MODE - Files will be modified (backups will be created)\n');
  }

  const seedDataPath = path.join(__dirname, '..', 'prisma', 'seed-data');

  const directories = {
    standards: path.join(seedDataPath, 'standards'),
    lessons: path.join(seedDataPath, 'lessons'),
    questions: path.join(seedDataPath, 'questions'),
    'curriculum-units': path.join(seedDataPath, 'curriculum-units'),
  };

  if (options.type === 'all') {
    Object.entries(directories).forEach(([type, dirPath]) => {
      migrateDirectory(dirPath, options.migration, options.dryRun);
    });
  } else {
    const dirPath = directories[options.type];
    migrateDirectory(dirPath, options.migration, options.dryRun);
  }

  console.log('\n✅ Migration process complete\n');

  if (options.dryRun) {
    console.log('Run without --dry-run to apply changes');
  } else {
    console.log('Backup files created with .backup.<timestamp> extension');
  }
}

main();
