/** Runs the native TypeScript checker with a validated bounded checker count. */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const checkers = process.env.TS7_CHECKERS ?? "1";

if (checkers !== "1" && checkers !== "2") {
  console.error(`TS7_CHECKERS must be 1 or 2; received ${checkers}.`);
  process.exitCode = 2;
} else {
  const repositoryRoot = fileURLToPath(new URL("..", import.meta.url));
  const compiler = `${repositoryRoot}/node_modules/typescript7/bin/tsc`;
  const result = spawnSync(
    process.execPath,
    [compiler, "--checkers", checkers, ...process.argv.slice(2)],
    { cwd: process.cwd(), stdio: "inherit" },
  );

  if (result.error) {
    throw result.error;
  }

  process.exitCode = result.status ?? 1;
}
