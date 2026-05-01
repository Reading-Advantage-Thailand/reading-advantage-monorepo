#!/usr/bin/env tsx
/**
 * i18n:update - Update translation keys across locales
 *
 * Usage:
 *   npm run i18n:update <key> --value.<locale> "text" [--dry-run]
 *
 * Examples:
 *   npm run i18n:update components.common.header.cta --value.en "Book Demo" --value.th "จองสาธิต"
 *   npm run i18n:update pages.home.title --value.en "Welcome" --dry-run
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, relative, sep } from 'path';
import ts from 'typescript';

interface UpdateOptions {
  key: string;
  values: Record<string, string>;
  dryRun: boolean;
}

const LOCALES_DIR = 'src/locales';
const SUPPORTED_LOCALES = ['en', 'th', 'zh'];

function parseArgs(): UpdateOptions | null {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    printHelp();
    process.exit(0);
  }

  const options: UpdateOptions = {
    key: args[0],
    values: {},
    dryRun: false,
  };

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg.startsWith('--value.')) {
      const locale = arg.substring(8); // Remove '--value.' prefix
      const value = args[++i];

      if (!value) {
        console.error(`Error: Missing value for ${arg}`);
        return null;
      }

      if (!SUPPORTED_LOCALES.includes(locale)) {
        console.error(`Error: Unsupported locale "${locale}". Supported: ${SUPPORTED_LOCALES.join(', ')}`);
        return null;
      }

      options.values[locale] = value;
    }
  }

  if (Object.keys(options.values).length === 0) {
    console.error('Error: No values specified. Use --value.<locale> "text"');
    return null;
  }

  return options;
}

function printHelp(): void {
  console.log(`
i18n:update - Update translation keys across locales

Usage:
  npm run i18n:update <key> [options]

Arguments:
  key                 Dot-notation key path (e.g., components.common.header.cta)

Options:
  --value.<locale> "text"    Set value for specific locale (en, th, zh)
  --dry-run                  Show changes without writing files
  --help, -h                 Show this help message

Examples:
  # Update single locale
  npm run i18n:update components.common.header.cta --value.en "Book Demo"

  # Update multiple locales
  npm run i18n:update pages.home.title --value.en "Welcome" --value.th "ยินดีต้อนรับ" --value.zh "欢迎"

  # Preview changes without writing
  npm run i18n:update components.footer.copyright --value.en "© 2025" --dry-run

Notes:
  - This command updates TypeScript locale files in ${LOCALES_DIR}
  - Only specified locales are updated; others remain unchanged
  - Missing translations in non-specified locales will be reported
`);
}

function findLocaleFile(key: string, locale: string): string | null {
  const keyParts = key.split('.');

  // Try to determine the file structure from the key
  // Key format: pages.home.title -> pages/home.ts
  // Key format: components.common.header.cta -> components/common/header.ts

  const possiblePaths: string[] = [];

  // Strategy 1: Try full path segments
  for (let i = keyParts.length - 1; i >= 1; i--) {
    const pathSegments = keyParts.slice(0, i);
    const filePath = resolve(process.cwd(), LOCALES_DIR, ...pathSegments) + '.ts';
    possiblePaths.push(filePath);
  }

  // Strategy 2: Try locale root file (en.ts, th.ts, zh.ts)
  possiblePaths.push(resolve(process.cwd(), LOCALES_DIR, `${locale}.ts`));

  // Find first existing file
  for (const path of possiblePaths) {
    if (existsSync(path)) {
      return path;
    }
  }

  return null;
}

function getLocalKeyParts(key: string, filePath: string): string[] {
  const keyParts = key.split('.');
  const relativePath = relative(resolve(process.cwd(), LOCALES_DIR), filePath)
    .replace(/\.ts$/, '');
  const pathSegments = relativePath.split(sep).filter(Boolean);

  let sliceCount = 0;
  while (
    sliceCount < pathSegments.length &&
    sliceCount < keyParts.length &&
    keyParts[sliceCount] === pathSegments[sliceCount]
  ) {
    sliceCount++;
  }

  return keyParts.slice(sliceCount);
}

function isMatchingPropertyName(name: ts.PropertyName, segment: string): boolean {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name)) {
    return name.text === segment;
  }

  if (ts.isNumericLiteral(name)) {
    return name.text === segment;
  }

  return false;
}

function findLocaleObjectLiteral(sourceFile: ts.SourceFile, locale: string): ts.ObjectLiteralExpression | null {
  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement)) {
      continue;
    }

    const isExported = statement.modifiers?.some(mod => mod.kind === ts.SyntaxKind.ExportKeyword);
    if (!isExported) {
      continue;
    }

    for (const decl of statement.declarationList.declarations) {
      if (
        ts.isIdentifier(decl.name) &&
        decl.name.text === locale &&
        decl.initializer &&
        ts.isObjectLiteralExpression(decl.initializer)
      ) {
        return decl.initializer;
      }
    }
  }

  return null;
}

function findNestedProperty(
  objectLiteral: ts.ObjectLiteralExpression,
  pathSegments: string[]
): ts.PropertyAssignment | null {
  let currentObject = objectLiteral;

  for (let i = 0; i < pathSegments.length; i++) {
    const segment = pathSegments[i];
    const property = currentObject.properties.find(prop => {
      if (!ts.isPropertyAssignment(prop)) {
        return false;
      }

      return prop.name ? isMatchingPropertyName(prop.name, segment) : false;
    });

    if (!property || !ts.isPropertyAssignment(property)) {
      return null;
    }

    if (i === pathSegments.length - 1) {
      return property;
    }

    if (!ts.isObjectLiteralExpression(property.initializer)) {
      return null;
    }

    currentObject = property.initializer;
  }

  return null;
}

function updateTypeScriptFile(
  filePath: string,
  key: string,
  locale: string,
  newValue: string,
  dryRun: boolean
): { success: boolean; oldValue?: string; error?: string } {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);

    const localeObject = findLocaleObjectLiteral(sourceFile, locale);
    if (!localeObject) {
      return { success: false, error: `Locale object not found in ${filePath}` };
    }

    const localKeyParts = getLocalKeyParts(key, filePath);
    if (localKeyParts.length === 0) {
      return { success: false, error: `Unable to derive key path for ${key}` };
    }

    const property = findNestedProperty(localeObject, localKeyParts);
    if (!property) {
      return { success: false, error: `Key "${localKeyParts.join('.')}" not found in ${filePath}` };
    }

    if (!ts.isStringLiteralLike(property.initializer)) {
      return { success: false, error: `Key "${localKeyParts.join('.')}" is not a string literal` };
    }

    const oldValue = property.initializer.text;
    const newLiteral = JSON.stringify(newValue);

    const start = property.initializer.getStart(sourceFile);
    const end = property.initializer.getEnd();

    if (!dryRun) {
      const updatedContent = content.slice(0, start) + newLiteral + content.slice(end);
      writeFileSync(filePath, updatedContent, 'utf-8');
    }

    if (oldValue === newValue) {
      return { success: true, oldValue, error: 'Value unchanged' };
    }

    return { success: true, oldValue };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function main() {
  const options = parseArgs();

  if (!options) {
    process.exit(1);
  }

  console.log('\n📝 i18n Update Tool\n');
  console.log('='.repeat(50));
  console.log(`\n🔑 Key: ${options.key}`);

  if (options.dryRun) {
    console.log('⚠️  DRY RUN MODE - No files will be modified');
  }

  console.log('\n' + '='.repeat(50) + '\n');

  const results: Record<string, { success: boolean; message: string }> = {};
  const missingLocales: string[] = [];

  // Process each locale
  for (const locale of SUPPORTED_LOCALES) {
    if (!options.values[locale]) {
      missingLocales.push(locale);
      continue;
    }

    const value = options.values[locale];
    const localeFile = findLocaleFile(options.key, locale);

    if (!localeFile) {
      results[locale] = {
        success: false,
        message: `❌ Could not find locale file for key: ${options.key}`,
      };
      continue;
    }

    const result = updateTypeScriptFile(localeFile, options.key, locale, value, options.dryRun);

    if (result.success) {
      if (result.oldValue === value) {
        results[locale] = {
          success: true,
          message: `⚪ No change: "${value}"`,
        };
      } else {
        results[locale] = {
          success: true,
          message: `✅ Updated: "${result.oldValue}" → "${value}"`,
        };
      }
    } else {
      results[locale] = {
        success: false,
        message: `❌ Failed: ${result.error}`,
      };
    }
  }

  // Print results
  console.log('Results:\n');
  for (const [locale, result] of Object.entries(results)) {
    console.log(`  [${locale}] ${result.message}`);
  }

  // Warn about missing translations
  if (missingLocales.length > 0) {
    console.log('\n⚠️  Missing translations for locales:');
    missingLocales.forEach(locale => {
      console.log(`  - ${locale}: Translation not provided`);
    });
  }

  console.log('\n' + '='.repeat(50));

  if (options.dryRun) {
    console.log('\n💡 Run without --dry-run to apply these changes\n');
  } else {
    console.log('\n✅ Update complete!\n');
  }

  // Exit with error if any update failed
  const hasFailures = Object.values(results).some(r => !r.success);
  process.exit(hasFailures ? 1 : 0);
}

main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
