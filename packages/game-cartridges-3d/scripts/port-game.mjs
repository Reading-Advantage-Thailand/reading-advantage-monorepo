#!/usr/bin/env node
// Copies games from the Forge demo repository and rewrites their imports to the kit subpaths.
// Forge owns the games: change a game there, then copy it here.
// Usage: node scripts/port-game.mjs <forge-repo-dir> <game-id ...|all> [--check]
// --check writes nothing: it copies into a temporary folder and lists every file of the package
// copy that differs from what Forge gives (an edit made only here), then exits 1 on a difference.
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, relative } from 'node:path';

const args = process.argv.slice(2);
const check = args.includes('--check');
const [forge, ...named] = args.filter((a) => !a.startsWith('--'));
if (!forge || named.length === 0) throw new Error('Usage: port-game.mjs <forge-repo-dir> <game-id ...|all> [--check]');
const pkg = join(import.meta.dirname, '..');
const kit = '@reading-advantage/advantage-play-kit-3d';

/** Kit modules that the kit exports under a shorter subpath. */
const kitExports = Object.keys(JSON.parse(readFileSync(join(pkg, '..', 'advantage-play-kit-3d', 'package.json'), 'utf8')).exports);
/** A deep kit path the kit does not export falls back to its folder index (stage/timeline -> stage). */
const subpathOf = (sub) => SUBPATH[sub] ?? (kitExports.includes('./' + sub) || !kitExports.includes('./' + sub.split('/')[0]) ? sub : sub.split('/')[0]);
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
    .replace(/'src\/games\/(?!shared)/g, "'src/")
    // legacy loose model files do not exist here; tests/packs/pack-bindings covers the bindings
    .replace(/\n  it\('every (?:3D )?(?:model )?files? exists?[^']*'[\s\S]*?\n  \}\);\n/g, '')
    .replace(/'(?:\.\.\/)+src\/games\/shared\//g, "'../../src/shared/")
    .replace(/'(?:\.\.\/)+src\/games\/([\w-]+)\//g, "'../../src/$1/")
    .replace(/'(?:\.\.\/)+src\/apk3d\/([^']+?)(?:\/index)?\.js'/g, (_m, sub) => `'${kit}/${subpathOf(sub)}'`)
    .replace(/'((?:\.\.\/)+)apk3d\/([^']+?)(?:\/index)?\.js'/g, (_m, _up, sub) => `'${kit}/${subpathOf(sub)}'`);

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

/** Copies one game (its source and tests) into `root/src/<id>` and `root/tests/<id>`. */
function port(id, root) {
  copy(join(forge, 'src/games', id), join(root, 'src', id));
  copy(join(forge, 'tests/games', id), join(root, 'tests', id));

  // CSS import -> installCss
  for (const f of walk(join(root, 'src', id)).filter((p) => p.endsWith('.ts'))) {
    let s = readFileSync(f, 'utf8');
    const m = s.match(/^import '\.\/([\w-]+)\.css';$/m);
    if (!m) continue;
    const v = m[1].replace(/-/g, '_') + 'Css';
    s = s.replace(m[0], `import ${v} from './${m[1]}.css.js';\nimport { installCss } from '${kit}/hud';\ninstallCss('${m[1]}', ${v});`);
    writeFileSync(f, s);
  }
}

/** The files under `dir` as relative paths (none when it does not exist). */
const filesOf = (dir) => (existsSync(dir) ? walk(dir).map((f) => relative(dir, f)) : []);

/** The games of this package (every game folder of src except the shared code). */
const packageGames = () => readdirSync(join(pkg, 'src'), { withFileTypes: true }).filter((d) => d.isDirectory() && d.name !== 'shared').map((d) => d.name);

const ids = named.length === 1 && named[0] === 'all' ? packageGames() : named;
if (!check) {
  for (const id of ids) {
    port(id, pkg);
    console.log(`ported ${id}`);
  }
} else {
  const temp = mkdtempSync(join(tmpdir(), 'port-game-'));
  const drift = [];
  try {
    for (const id of ids) {
      port(id, temp);
      for (const part of ['src', 'tests']) {
        const want = join(temp, part, id);
        const have = join(pkg, part, id);
        for (const f of new Set([...filesOf(want), ...filesOf(have)])) {
          const a = existsSync(join(want, f)) ? readFileSync(join(want, f)) : null;
          const b = existsSync(join(have, f)) ? readFileSync(join(have, f)) : null;
          if (a === null) drift.push(`only here ${part}/${id}/${f}`);
          else if (b === null) drift.push(`missing ${part}/${id}/${f}`);
          else if (!a.equals(b)) drift.push(`differs ${part}/${id}/${f}`);
        }
      }
    }
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
  for (const line of drift) console.log(line);
  if (drift.length) {
    console.log(`port-game: ${drift.length} difference(s); make the change in Forge, then copy it`);
    process.exit(1);
  }
  console.log(`port-game: ${ids.length} game(s) match Forge`);
}
