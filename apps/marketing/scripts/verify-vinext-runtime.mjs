import { spawn } from "node:child_process";
import console from "node:console";
import { dirname, resolve } from "node:path";
import process from "node:process";
import { setTimeout } from "node:timers";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(scriptDirectory, "..");
const monorepoRoot = resolve(appRoot, "../..");

/**
 * Boots the compiled vinext server and verifies public and protected responses.
 * @returns A promise that resolves after the compiled runtime responds correctly.
 */
export async function verifyBuiltMarketingRuntime() {
  const port = process.env.MARKETING_RUNTIME_SMOKE_PORT ?? "4389";
  const logs = [];
  const child = spawn(
    process.execPath,
    [resolve(monorepoRoot, "node_modules/vinext/dist/cli.js"), "start"],
    {
      cwd: appRoot,
      env: {
        ...process.env,
        DATABASE_URL:
          process.env.DATABASE_URL ??
          "postgresql://runtime_probe:unused@127.0.0.1:59999/marketing",
        HOSTNAME: "127.0.0.1",
        NODE_ENV: "production",
        PORT: port,
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  child.stdout.on("data", (chunk) => logs.push(String(chunk)));
  child.stderr.on("data", (chunk) => logs.push(String(chunk)));

  try {
    let rootResponse;
    for (let attempt = 0; attempt < 80; attempt += 1) {
      if (child.exitCode !== null) {
        throw new Error(`vinext exited before readiness: ${logs.join("")}`);
      }
      try {
        rootResponse = await globalThis.fetch(`http://127.0.0.1:${port}/`);
        break;
      } catch {
        await new Promise((resolveDelay) => setTimeout(resolveDelay, 250));
      }
    }

    if (!rootResponse || rootResponse.status !== 200) {
      throw new Error(`Marketing root runtime probe failed: ${logs.join("")}`);
    }

    const protectedResponse = await globalThis.fetch(
      `http://127.0.0.1:${port}/api/campaigns`,
    );
    if (protectedResponse.status !== 401) {
      throw new Error(
        `Marketing auth runtime probe expected 401, received ${protectedResponse.status}`,
      );
    }
  } finally {
    if (child.exitCode === null) {
      child.kill("SIGTERM");
    }
    await new Promise((resolveExit) => {
      if (child.exitCode !== null) {
        resolveExit();
        return;
      }
      child.once("exit", resolveExit);
      setTimeout(() => {
        if (child.exitCode === null) child.kill("SIGKILL");
      }, 2_000).unref();
    });
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  verifyBuiltMarketingRuntime().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
