/**
 * Exports one authored StandardPlayMap to JSON on stdout.
 *
 * Usage: tsx export-play-map.ts <module-file> <export-name>
 * Example: tsx export-play-map.ts ../src/wizard-graveyard-map.ts WIZARD_GRAVEYARD_MAP
 */
import { resolve } from "node:path";

/** Reads the module file and export name from argv. */
const [moduleFile, exportName] = process.argv.slice(2);
if (!moduleFile || !exportName) {
  console.error("Usage: tsx export-play-map.ts <module-file> <export-name>");
  process.exit(2);
}

const modulePath = resolve(process.cwd(), moduleFile);
const loaded = (await import(modulePath)) as Record<string, unknown>;
const map = loaded[exportName];
if (!map) {
  console.error(`Export ${exportName} not found in ${modulePath}`);
  process.exit(3);
}
process.stdout.write(`${JSON.stringify(map, null, 2)}\n`);
