import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative, resolve } from "node:path";

import { scanAPKArchitecture } from "../dist/index.js";

const repositoryRoot = resolve(import.meta.dirname, "../../..");

async function collectSources(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectSources(path)));
    } else if ([".ts", ".tsx"].includes(extname(path)) && !path.includes(".test.")) {
      files.push({
        path: relative(repositoryRoot, path),
        source: await readFile(path, "utf8"),
      });
    }
  }
  return files;
}

const layers = [
  ["contracts", "packages/game-contracts/src"],
  ["runtime", "packages/advantage-play-kit/src"],
  ["cartridge", "packages/game-cartridges/src"],
];

const violations = [];
for (const [layer, directory] of layers) {
  const files = await collectSources(resolve(repositoryRoot, directory));
  violations.push(...scanAPKArchitecture(files, { layer }).violations);
}

if (violations.length > 0) {
  console.error(JSON.stringify({ violations }, null, 2));
  process.exitCode = 1;
} else {
  console.log("APK architecture guard passed.");
}
