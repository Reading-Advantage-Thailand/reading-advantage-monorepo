import { Hono } from "hono";
import { serve } from "@hono/node-server";
import health from "./health.js";

const app = new Hono();

// Mount sub-routers
app.route("/health", health);

// Stub routes for future webhooks
app.post("/stripe", (c) => c.json({ received: true }, 501));
app.post("/google-classroom", (c) => c.json({ received: true }, 501));

const port = parseInt(process.env.WEBHOOKS_PORT ?? "3002", 10);

console.log(`🎣 Webhooks server starting on port ${port}`);

serve({
  fetch: app.fetch,
  port,
});

export default app;
