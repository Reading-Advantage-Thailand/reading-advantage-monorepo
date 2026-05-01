#!/usr/bin/env tsx
/**
 * i18n:tree - Display translation keys in a hierarchical tree view
 *
 * Usage:
 *   npm run i18n:tree                           # Show all keys
 *   npm run i18n:tree --scope pages.home        # Filter by namespace
 *   npm run i18n:tree --locale en               # Show only English
 *   npm run i18n:tree --contains "Contact"      # Search for values
 */

import { readdirSync, statSync, readFileSync } from 'fs';
import { join, relative } from 'path';

interface TreeOptions {
  scope?: string;
  locale?: string;
  contains?: string;
}

interface TranslationNode {
  key: string;
  values: Record<string, string | object>;
  children?: Record<string, TranslationNode>;
}

const LOCALES_DIR = 'src/locales';
const SUPPORTED_LOCALES = ['en', 'th', 'zh'];

function parseArgs(): TreeOptions {
  const args = process.argv.slice(2);
  const options: TreeOptions = {};

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--scope':
        options.scope = args[++i];
        break;
      case '--locale':
        options.locale = args[++i];
        break;
      case '--contains':
        options.contains = args[++i];
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
    }
  }

  return options;
}

function printHelp(): void {
  console.log(`
i18n:tree - Display translation keys in a hierarchical tree view

Usage:
  npm run i18n:tree [options]

Options:
  --scope <path>      Filter keys by namespace (e.g., pages.home, components.common)
  --locale <locale>   Show values only for specified locale (en, th, zh)
  --contains <text>   Search for keys with values containing the specified text
  --help, -h          Show this help message

Examples:
  npm run i18n:tree
  npm run i18n:tree --scope pages.home
  npm run i18n:tree --locale en
  npm run i18n:tree --contains "Contact Us"
  npm run i18n:tree --scope components --locale th
`);
}

async function loadLocaleData(locale: string): Promise<any> {
  try {
    // Dynamically import the locale module
    const localeModule = await import(`../${LOCALES_DIR}/${locale}`);
    return localeModule.default || localeModule;
  } catch (error) {
    console.error(`Error loading locale ${locale}:`, error);
    return {};
  }
}

function flattenObject(obj: any, prefix = ''): Record<string, string> {
  const flattened: Record<string, string> = {};

  for (const key in obj) {
    const value = obj[key];
    const newKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      Object.assign(flattened, flattenObject(value, newKey));
    } else {
      flattened[newKey] = String(value);
    }
  }

  return flattened;
}

function buildTree(localeData: Record<string, Record<string, string>>, options: TreeOptions): TranslationNode {
  const root: TranslationNode = {
    key: 'root',
    values: {},
    children: {},
  };

  // Flatten all locale data
  const flattenedData: Record<string, Record<string, string>> = {};
  for (const locale in localeData) {
    flattenedData[locale] = flattenObject(localeData[locale]);
  }

  // Get all unique keys
  const allKeys = new Set<string>();
  for (const locale in flattenedData) {
    Object.keys(flattenedData[locale]).forEach(key => allKeys.add(key));
  }

  // Filter keys by scope
  let filteredKeys = Array.from(allKeys);
  if (options.scope) {
    filteredKeys = filteredKeys.filter(key => key.startsWith(options.scope!));
  }

  // Filter by contains
  if (options.contains) {
    filteredKeys = filteredKeys.filter(key => {
      return Object.values(flattenedData).some(localeData => {
        const value = localeData[key];
        return value && value.toLowerCase().includes(options.contains!.toLowerCase());
      });
    });
  }

  // Build tree structure
  for (const key of filteredKeys) {
    const parts = key.split('.');
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLeaf = i === parts.length - 1;

      if (!current.children) {
        current.children = {};
      }

      if (!current.children[part]) {
        current.children[part] = {
          key: part,
          values: {},
          children: isLeaf ? undefined : {},
        };
      }

      if (isLeaf) {
        // Collect values from all locales
        for (const locale in flattenedData) {
          if (!options.locale || locale === options.locale) {
            current.children[part].values[locale] = flattenedData[locale][key] || '<missing>';
          }
        }
      }

      current = current.children[part];
    }
  }

  return root;
}

function printTree(node: TranslationNode, indent = '', isLast = true, fullKey = ''): void {
  if (!node.children || Object.keys(node.children).length === 0) {
    // Leaf node - print values
    const prefix = indent + (isLast ? '└── ' : '├── ');
    console.log(`${prefix}${node.key}`);

    const valueIndent = indent + (isLast ? '    ' : '│   ');
    for (const [locale, value] of Object.entries(node.values)) {
      const displayValue = typeof value === 'string' && value.length > 60
        ? value.substring(0, 57) + '...'
        : value;
      console.log(`${valueIndent}  [${locale}] ${displayValue}`);
    }
    return;
  }

  // Branch node
  if (fullKey) {
    const prefix = indent + (isLast ? '└── ' : '├── ');
    console.log(`${prefix}${node.key}/`);
  }

  const children = Object.values(node.children);
  const childIndent = fullKey ? indent + (isLast ? '    ' : '│   ') : indent;

  children.forEach((child, index) => {
    const childIsLast = index === children.length - 1;
    const childFullKey = fullKey ? `${fullKey}.${child.key}` : child.key;
    printTree(child, childIndent, childIsLast, childFullKey);
  });
}

async function main() {
  const options = parseArgs();

  console.log('\n🌳 i18n Translation Tree\n');
  console.log('='.repeat(50));

  if (options.scope) {
    console.log(`\n📂 Scope: ${options.scope}`);
  }
  if (options.locale) {
    console.log(`🌍 Locale: ${options.locale}`);
  }
  if (options.contains) {
    console.log(`🔍 Contains: "${options.contains}"`);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Load all locale data
  const localeData: Record<string, any> = {};
  const localesToLoad = options.locale ? [options.locale] : SUPPORTED_LOCALES;

  for (const locale of localesToLoad) {
    localeData[locale] = await loadLocaleData(locale);
  }

  // Build and print tree
  const tree = buildTree(localeData, options);
  printTree(tree, '', true, '');

  console.log('\n' + '='.repeat(50) + '\n');
}

main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
