import { client } from "./client.js";

/**
 * Registers a SIGTERM handler to gracefully close the database connection
 * when the process receives a termination signal in production.
 */
export function registerShutdownHandler() {
  if (typeof process !== "undefined" && process.env?.NODE_ENV === "production") {
    process.on("SIGTERM", async () => {
      await client.end();
      process.exit(0);
    });
  }
}
