import { createWorkerHealthServer, createWorkerHealthState } from "./health.js";
import { parseWorkerStartupConfig } from "./startup-config.js";

/**
 * Writes one structured worker bootstrap event without exposing environment values.
 * @param level Event severity.
 * @param event Stable event identifier.
 * @param details Safe structured event details.
 * @returns Nothing after the event is written.
 */
function writeBootstrapEvent(
  level: "error" | "info",
  event: string,
  details: Readonly<Record<string, unknown>>,
): void {
  const destination = level === "error" ? process.stderr : process.stdout;
  destination.write(`${JSON.stringify({ level, event, ...details })}\n`);
}

/**
 * Starts the provider-neutral worker health bootstrap and installs drain signals.
 * @returns A promise that resolves after the health server is accepting requests.
 * @throws When startup configuration is invalid or the health server cannot listen.
 */
async function startWorkerHealthBootstrap(): Promise<void> {
  const config = parseWorkerStartupConfig(process.env);
  const health = createWorkerHealthState({ serviceName: config.serviceName });
  const server = createWorkerHealthServer({
    health,
    host: config.host,
    port: config.port,
  });
  let shuttingDown = false;

  /**
   * Closes readiness and then stops the health server once per process.
   * @param signal Operating-system signal that initiated the drain.
   * @returns A promise settled when the health server has closed.
   */
  const shutdown = async (signal: "SIGINT" | "SIGTERM"): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    health.markDraining();
    writeBootstrapEvent("info", "worker.health.draining", { signal });
    await server.close();
    writeBootstrapEvent("info", "worker.health.stopped", { signal });
  };

  process.once("SIGINT", () => void shutdown("SIGINT"));
  process.once("SIGTERM", () => void shutdown("SIGTERM"));

  await server.listen();
  health.markReady();
  writeBootstrapEvent("info", "worker.health.ready", {
    host: config.host,
    port: config.port,
    service: config.serviceName,
  });
}

startWorkerHealthBootstrap().catch((error: unknown) => {
  writeBootstrapEvent("error", "worker.health.startup_failed", {
    message: error instanceof Error ? error.message : "Unknown startup failure",
  });
  process.exitCode = 1;
});
