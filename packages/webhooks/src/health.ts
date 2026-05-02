import { Hono } from "hono";

const health = new Hono();

health.get("/", (c) => {
  return c.json({
    status: "ok",
    service: "reading-advantage-webhooks",
    timestamp: new Date().toISOString(),
  });
});

export default health;
