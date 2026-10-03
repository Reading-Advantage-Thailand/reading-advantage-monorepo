#!/usr/bin/env node
// Copies one game from the Forge demo repository and rewrites its imports to the kit subpaths.
// Usage: node scripts/port-game.mjs <forge-repo-dir> <game-id>
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';

const [forge, id] = process.argv.slice(2);
if (!forge || !id) throw new Error('Usage: port-game.mjs <forge-repo-dir> <game-id>');
const pkg = join(import.meta.dirname, '..');
const kit = '@reading-advantage/advantage-play-kit-3d';

/** Kit modules that the kit exports under a shorter subpath. */
const SUBPATH = { 'i18n/catalog': 'i18n', 'contracts/model-pack': 'contracts' };

const walk = (dir) =>
  readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });

/** `../../apk3d/<sub>/(index|file).js` becomes a kit subpath. */
const rewrite = (src) =>
  src
    .replace(/'demo', 'public', 'packs'/g, "'assets', 'packs'")
    .replace(/'demo', 'public', 'assets', 'apk'/g, "'assets', 'apk'")
    .replace(/'demo\/public\/assets\/apk\//g, "'assets/apk/")
    .replace(/demo\/public\/packs/g, 'assets/packs')
    // legacy loose model files do not exist here; tests/packs/pack-bindings covers the bindings
    .replace(/\n  it\('every (?:3D )?model file exists[^']*'[\s\S]*?\n  \}\);\n/g, '')
    .replace(/'(?:\.\.\/)+src\/games\/shared\//g, "'../../src/shared/")
    .replace(/'(?:\.\.\/)+src\/games\/([\w-]+)\//g, "'../../src/$1/")
    .replace(/'(?:\.\.\/)+src\/apk3d\/([^']+?)(?:\/index)?\.js'/g, (_m, sub) => `'${kit}/${SUBPATH[sub] ?? sub}'`)
    .replace(/'((?:\.\.\/)+)apk3d\/([^']+?)(?:\/index)?\.js'/g, (_m, _up, sub) => `'${kit}/${SUBPATH[sub] ?? sub}'`);

const copy = (from, to, filter) => {
  if (!existsSync(from)) return;
  rmSync(to, { recursive: true, force: true });
  for (const f of walk(from)) {
    if (filter && !filter(f)) continue;
    const dest = join(to, f.slice(from.length + 1));
    mkdirSync(dirname(dest), { recursive: true });
    if (f.endsWith('.ts')) writeFileSync(dest, rewrite(readFileSync(f, 'utf8')));
    else if (f.endsWith('.css')) {
      const name = basename(f);
      writeFileSync(dest + '.ts', `// Generated from ${name} (the stylesheet text; installed once by installCss).\nexport default \`${readFileSync(f, 'utf8').replace(/[`\\]|\$\{/g, '\\$&')}\`;\n`);
    } else cpSync(f, dest);
  }
};

copy(join(forge, 'src/games', id), join(pkg, 'src', id));
copy(join(forge, 'tests/games', id), join(pkg, 'tests', id));

// CSS import -> installCss
for (const f of walk(join(pkg, 'src', id)).filter((p) => p.endsWith('.ts'))) {
  let s = readFileSync(f, 'utf8');
  const m = s.match(/^import '\.\/([\w-]+)\.css';$/m);
  if (!m) continue;
  const v = m[1].replace(/-/g, '_') + 'Css';
  s = s.replace(m[0], `import ${v} from './${m[1]}.css.js';\nimport { installCss } from '${kit}/hud';\ninstallCss('${m[1]}', ${v});`);
  writeFileSync(f, s);
}
console.log(`ported ${id}`);
