import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { Catalog } from '../contracts/index.js';
import {
  catalogKeys,
  createI18n,
  format,
  hasKey,
  lookup,
  mergeCatalogs,
  pluralCategory,
} from '../i18n/catalog.js';
import { literalTextAssignments, literalWords, missingKeys, readTemplate, scanKeys, stripComments } from '../i18n/scan.js';

const ROOT = process.cwd();

const walk = (dir: string): string[] => {
  let files: string[] = [];
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return [];
  }
  for (const name of entries) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) files = files.concat(walk(path));
    else if (path.endsWith('.ts') && !path.endsWith('.d.ts')) files.push(path);
  }
  return files;
};

const potionRush: Catalog = {
  potionRush: {
    title: 'Potion Rush',
    hud: {
      served: { one: '{count} potion served', other: '{count} potions served' },
      orderFrom: '{name} wants:',
      tips: { other: 'Tips: {count}' },
    },
  },
};

const host: Catalog = {
  selector: { title: 'Choose a story', level: { comingSoon: 'Coming soon' } },
  potionRush: { subtitle: 'Alchemical management' },
};

describe('createI18n', () => {
  it('merges nested catalogs; a later leaf wins', () => {
    const merged = mergeCatalogs(host, potionRush, { selector: { title: 'Pick a story' } });
    expect(lookup(merged, 'potionRush.subtitle')).toBe('Alchemical management');
    expect(lookup(merged, 'potionRush.title')).toBe('Potion Rush');
    expect(lookup(merged, 'selector.title')).toBe('Pick a story');
    expect(lookup(merged, 'selector.level.comingSoon')).toBe('Coming soon');
    expect(createI18n([host, potionRush]).catalog).toEqual(mergeCatalogs(host, potionRush));
    expect(host).toEqual({ selector: { title: 'Choose a story', level: { comingSoon: 'Coming soon' } }, potionRush: { subtitle: 'Alchemical management' } });
  });

  it('scope(prefix) returns t(key) relative to the prefix, and scopes nest', () => {
    const i18n = createI18n([host, potionRush]);
    const t = i18n.scope('potionRush').t;
    expect(t('title')).toBe('Potion Rush');
    expect(i18n.t('potionRush.title')).toBe('Potion Rush');
    expect(i18n.scope('potionRush').scope('hud').t('orderFrom', { name: 'Mia' })).toBe('Mia wants:');
    expect(i18n.scope('potionRush').scope('hud').prefix).toBe('potionRush.hud');
    expect(i18n.prefix).toBe('');
  });

  it('interpolates {name}; an unknown placeholder stays as written', () => {
    expect(format('{name} wants {count}', { name: 'Mia', count: 3 })).toBe('Mia wants 3');
    expect(format('{name} wants {count}', { name: 'Mia' })).toBe('Mia wants {count}');
    expect(format('no params')).toBe('no params');
    const t = createI18n([potionRush]).scope('potionRush.hud').t;
    expect(t('orderFrom', { name: 'Tom' })).toBe('Tom wants:');
  });

  it('picks .one or .other from count, and .other without a count', () => {
    expect(pluralCategory(1)).toBe('one');
    expect(pluralCategory(0)).toBe('other');
    expect(pluralCategory(2)).toBe('other');
    const t = createI18n([potionRush]).scope('potionRush.hud').t;
    expect(t('served', { count: 1 })).toBe('1 potion served');
    expect(t('served', { count: 0 })).toBe('0 potions served');
    expect(t('served', { count: 5 })).toBe('5 potions served');
    expect(t('served')).toBe('{count} potions served');
    expect(t('tips', { count: 1 })).toBe('Tips: 1');
  });

  it('renders a missing key as the full key and reports it once', () => {
    const missing: string[] = [];
    const i18n = createI18n([potionRush], { onMissing: (key) => missing.push(key) });
    const t = i18n.scope('potionRush').t;
    expect(t('hud.nope')).toBe('potionRush.hud.nope');
    expect(t('hud.nope')).toBe('potionRush.hud.nope');
    expect(i18n.t('other.key', { count: 2 })).toBe('other.key');
    // A scope node is not a string: a missing key too.
    expect(t('hud')).toBe('potionRush.hud');
    expect(missing).toEqual(['potionRush.hud.nope', 'other.key', 'potionRush.hud']);
    expect(createI18n([]).t('x.y')).toBe('x.y');
  });

  it('has() and catalogKeys() see leaves and plural nodes', () => {
    const i18n = createI18n([potionRush]);
    expect(i18n.has('potionRush.title')).toBe(true);
    expect(i18n.scope('potionRush').has('hud.served')).toBe(true);
    expect(i18n.has('potionRush.hud')).toBe(false);
    expect(i18n.has('potionRush.missing')).toBe(false);
    expect(hasKey(potionRush, 'potionRush.hud.served.one')).toBe(true);
    expect(catalogKeys(potionRush)).toEqual([
      'potionRush.title',
      'potionRush.hud.served',
      'potionRush.hud.orderFrom',
      'potionRush.hud.tips',
    ]);
  });
});

describe('key scanner', () => {
  const source = `
    const t = i18n.scope('potionRush').t;
    const hud = i18n.scope("potionRush.hud");
    el.textContent = t('title');
    banner(t('hud.served', { count }));
    label.textContent = hud.t('orderFrom', { name });
    next('not a key');
    const dynamic = t(\`hud.\${kind}\`);
    i18n.t('selector.title');
  `;

  it('finds scope prefixes and t() literals with line numbers', () => {
    const scan = scanKeys(source);
    expect(scan.scopes).toEqual(['potionRush', 'potionRush.hud']);
    expect(scan.keys.map((k) => k.key)).toEqual(['title', 'hud.served', 'orderFrom', 'selector.title']);
    expect(scan.keys[0]!.line).toBe(4);
    expect(scan.keys[3]!.line).toBe(9);
  });

  it('ignores t() calls in comments and keeps line numbers', () => {
    const commented = `// t('hud.nope') in a line comment
      /* t('hud.nope') in a block
         comment over two lines */
      const url = 'http://x/y'; // not a comment start inside the string
      t('title');`;
    expect(stripComments(commented).split('\n').length).toBe(5);
    expect(stripComments(commented)).toContain("'http://x/y'");
    expect(scanKeys(commented).keys).toEqual([{ key: 'title', line: 5 }]);
  });

  it('reports keys that resolve neither as written nor under a scope of the file', () => {
    const catalog = mergeCatalogs(host, potionRush);
    expect(missingKeys(catalog, scanKeys(source))).toEqual([]);
    const bad = scanKeys(`const t = i18n.scope('potionRush').t; t('hud.nope'); t('title'); i18n.t('gate.x');`);
    expect(missingKeys(catalog, bad).map((k) => k.key)).toEqual(['hud.nope', 'gate.x']);
    // Without a scope, keys are absolute.
    expect(missingKeys(catalog, scanKeys(`t('title')`)).map((k) => k.key)).toEqual(['title']);
    // A game file gets its catalog root as a base: `context.i18n` is already scoped to the game.
    const gameFile = scanKeys(`const t = i18n.scope('hud').t; t('served'); i18n.t('title'); t('nope');`);
    expect(missingKeys(catalog, gameFile, ['', 'potionRush']).map((k) => k.key)).toEqual(['nope']);
  });

  it('flags literal text assigned to textContent or innerHTML, not markup or expressions', () => {
    const view = `
      title.textContent = 'Potion Rush';
      count.textContent = String(n);
      root.innerHTML = \`<div class="card">\${t('hud.served', { count })}</div>\`;
      root.innerHTML = \`<b>Served:</b> \${count}\`;
      label.innerText = "";
      tray.innerHTML = '';
      note.textContent = t('tip');
      icon.innerHTML = '&nbsp;&rarr;';
      status.innerHTML = \`
        <div class="place">\${host.openStory ? \`<button data-story>\${esc(t('story'))}</button>\` : ''}</div>
        \${cond ? \`<b>Nested words</b>\` : ''}\`;
      list.innerHTML += \`<li>\${x}</li>\`;
      more.innerHTML += 'More';
    `;
    expect(literalTextAssignments(view)).toEqual([
      { line: 2, text: 'Potion Rush' },
      { line: 5, text: 'Served' },
      { line: 10, text: 'Nested words' },
      { line: 14, text: 'More' },
    ]);
    expect(literalWords(readTemplate('`<span>${x}</span> &amp;`', 0).staticText)).toBe('');
    expect(literalWords(readTemplate('`Hello, ${name}!`', 0).staticText)).toBe('Hello');
    expect(readTemplate('`a ${`b ${c}`} d` rest', 0)).toEqual({ end: 17, staticText: 'a  b   d' });
  });
});
