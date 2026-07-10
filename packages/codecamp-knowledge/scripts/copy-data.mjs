import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dataFiles = [
  "code-knowledge-space.json",
  "code-knowledge-space.provenance.json",
];

mkdirSync(resolve(packageRoot, "dist/data"), { recursive: true });
for (const file of dataFiles) {
  copyFileSync(
    resolve(packageRoot, "src/data", file),
    resolve(packageRoot, "dist/data", file),
  );
}
