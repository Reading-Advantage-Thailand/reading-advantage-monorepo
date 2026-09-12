import { parseSessionServiceConfig } from "./config.js";
import { createRoomStore } from "./room-store.js";
import { createSessionServer } from "./server.js";

/**
 * Writes one structured bootstrap event without exposing environment values.
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
 * Boots the session service: config, room store, socket server, signal drain.
 * @returns A promise that resolves once the socket server is listening.
 * @throws When startup configuration is invalid or the server cannot listen.
 */
async function main(): Promise<void> {
  const config = parseSessionServiceConfig(process.env);
  const store = createRoomStore(config.store);
  const sessionServer = createSessionServer({ store });
  let shuttingDown = false;

  /**
   * Drains the socket server once per process on an operating-system signal.
   * @param signal The signal that initiated the drain.
   * @returns A promise settled when the server has closed.
   */
  const shutdown = async (signal: "SIGINT" | "SIGTERM"): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    writeBootstrapEvent("info", "session-service.draining", { signal });
    await sessionServer.close();
    writeBootstrapEvent("info", "session-service.stopped", { signal });
  };

  process.once("SIGINT", () => void shutdown("SIGINT"));
  process.once("SIGTERM", () => void shutdown("SIGTERM"));

  await new Promise<void>((resolve) => {
    sessionServer.httpServer.listen(config.port, config.host, () => resolve());
  });
  writeBootstrapEvent("info", "session-service.ready", {
    host: config.host,
    port: config.port,
    store: config.store.kind,
  });
}

main().catch((error: unknown) => {
  writeBootstrapEvent("error", "session-service.startup_failed", {
    message: error instanceof Error ? error.message : "Unknown startup failure",
  });
  process.exitCode = 1;
});
