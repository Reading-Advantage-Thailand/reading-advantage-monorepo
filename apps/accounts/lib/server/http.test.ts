import { describe, expect, it } from "vitest";

import { readJsonBody } from "./http";

describe("readJsonBody", () => {
  it("returns a JSON object body when the request carries valid JSON", async () => {
    const request = new Request("https://accounts.example.test/api", {
      method: "POST",
      body: JSON.stringify({ username: "rep", idempotencyKey: "abc-123" }),
      headers: { "content-type": "application/json" },
    });

    await expect(readJsonBody(request)).resolves.toEqual({
      username: "rep",
      idempotencyKey: "abc-123",
    });
  });

  it("throws an INVALID_INPUT error for a malformed JSON body", async () => {
    const request = new Request("https://accounts.example.test/api", {
      method: "POST",
      body: "{",
      headers: { "content-type": "application/json" },
    });

    await expect(readJsonBody(request)).rejects.toMatchObject({
      code: "INVALID_INPUT",
      message: "Request body must be valid JSON.",
    });
  });

  it("throws an INVALID_INPUT error when the body parses to null", async () => {
    const request = new Request("https://accounts.example.test/api", {
      method: "POST",
      body: "null",
      headers: { "content-type": "application/json" },
    });

    await expect(readJsonBody(request)).rejects.toMatchObject({
      code: "INVALID_INPUT",
      message: "Request body must be a JSON object.",
    });
  });

  it("throws an INVALID_INPUT error when the body parses to an array", async () => {
    const request = new Request("https://accounts.example.test/api", {
      method: "POST",
      body: "[]",
      headers: { "content-type": "application/json" },
    });

    await expect(readJsonBody(request)).rejects.toMatchObject({
      code: "INVALID_INPUT",
      message: "Request body must be a JSON object.",
    });
  });

  it("throws an INVALID_INPUT error when the body parses to a primitive", async () => {
    const request = new Request("https://accounts.example.test/api", {
      method: "POST",
      body: "42",
      headers: { "content-type": "application/json" },
    });

    await expect(readJsonBody(request)).rejects.toMatchObject({
      code: "INVALID_INPUT",
      message: "Request body must be a JSON object.",
    });
  });
});