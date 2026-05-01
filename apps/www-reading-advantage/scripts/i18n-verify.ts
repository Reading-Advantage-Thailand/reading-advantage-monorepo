#!/usr/bin/env tsx
/**
 * i18n:verify - Verify which translation dataset is actively used
 *
 * This script checks the locale configuration to ensure only one
 * translation source is referenced. It fails if:
 * - Both src/locales and src/messages are imported
 * - An unexpected path is referenced
 * - The active source doesn't match the configured source of truth
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const EXPECTED_SOURCE = 'src/locales';
const DEPRECATED_SOURCE = 'src/messages';

interface VerificationResult {
  success: boolean;
  activeSource: string | null;
  errors: string[];
  warnings: string[];
}

function verifyI18nSource(): VerificationResult {
  const result: VerificationResult = {
    success: true,
    activeSource: null,
    errors: [],
    warnings: [],
  };

  try {
    // Read the locale config file
    const configPath = resolve(process.cwd(), 'src/config/locale-config.ts');

    if (!existsSync(configPath)) {
      result.success = false;
      result.errors.push('Config file not found: src/config/locale-config.ts');
      return result;
    }

    const configContent = readFileSync(configPath, 'utf-8');

    // Check for imports from locales directory
    const localesImportPattern = /import\s*\(\s*['"](\.\.\/locales\/[^'"]+)['"]\s*\)/g;
    const localesMatches = Array.from(configContent.matchAll(localesImportPattern));

    // Check for imports from messages directory
    const messagesImportPattern = /import\s*\(\s*['"](\.\.\/messages\/[^'"]+)['"]\s*\)/g;
    const messagesMatches = Array.from(configContent.matchAll(messagesImportPattern));

    // Determine active source
    if (localesMatches.length > 0 && messagesMatches.length === 0) {
      result.activeSource = EXPECTED_SOURCE;
    } else if (messagesMatches.length > 0 && localesMatches.length === 0) {
      result.activeSource = DEPRECATED_SOURCE;
      result.success = false;
      result.errors.push(
        `Active source is deprecated: ${DEPRECATED_SOURCE}\n` +
        `Expected source: ${EXPECTED_SOURCE}`
      );
    } else if (localesMatches.length > 0 && messagesMatches.length > 0) {
      result.success = false;
      result.errors.push(
        'Dual sources detected! Both src/locales and src/messages are imported.\n' +
        'Only one translation source should be active.'
      );
    } else {
      result.success = false;
      result.errors.push(
        'No recognized translation source found in locale-config.ts\n' +
        `Expected imports from: ${EXPECTED_SOURCE}`
      );
    }

    // Verify the source directory exists
    if (result.activeSource) {
      const sourcePath = resolve(process.cwd(), result.activeSource);
      if (!existsSync(sourcePath)) {
        result.success = false;
        result.errors.push(
          `Active source directory does not exist: ${result.activeSource}`
        );
      }
    }

    // Check if deprecated source still exists
    const deprecatedPath = resolve(process.cwd(), DEPRECATED_SOURCE);
    if (existsSync(deprecatedPath)) {
      result.warnings.push(
        `Deprecated source directory still exists: ${DEPRECATED_SOURCE}\n` +
        'Consider removing it to prevent confusion.'
      );
    }

  } catch (error) {
    result.success = false;
    result.errors.push(`Verification failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  return result;
}

function printResult(result: VerificationResult): void {
  console.log('\n🔍 i18n Source Verification\n');
  console.log('='.repeat(50));

  if (result.activeSource) {
    console.log(`\n✓ Active source: ${result.activeSource}`);
  }

  if (result.errors.length > 0) {
    console.log('\n❌ Errors:');
    result.errors.forEach(error => {
      console.log(`\n  ${error.split('\n').join('\n  ')}`);
    });
  }

  if (result.warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    result.warnings.forEach(warning => {
      console.log(`\n  ${warning.split('\n').join('\n  ')}`);
    });
  }

  if (result.success && result.errors.length === 0) {
    console.log('\n✅ Verification passed!');
    console.log(`\nThe application uses a single translation source: ${result.activeSource}`);
  } else {
    console.log('\n❌ Verification failed!');
    console.log('\nPlease fix the errors above before proceeding.');
  }

  console.log('\n' + '='.repeat(50) + '\n');
}

// Run verification
const result = verifyI18nSource();
printResult(result);

// Exit with appropriate code
process.exit(result.success ? 0 : 1);
