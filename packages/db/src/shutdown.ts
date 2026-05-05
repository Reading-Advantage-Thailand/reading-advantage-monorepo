import { client } from "./client.js";

export function registerShutdownHandler() {
  if (typeof process !== "undefined" && process.env?.NODE_ENV === "production") {
    process.on("SIGTERM", async () => {
      await client.end();
      process.exit(0);
    });
  }
}
