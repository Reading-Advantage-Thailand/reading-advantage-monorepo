import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { VertexProvider } from "./vertex.js";
import { createAIClient } from "../client.js";
import { ProviderNotConfiguredError } from "../errors.js";

vi.mock("ai", () => ({
  generateObject: vi.fn(),
  generateText: vi.fn(),
  experimental_generateImage: vi.fn(),
}));

vi.mock("@ai-sdk/google-vertex", () => ({
  createVertex: vi.fn(() =>
    Object.assign(vi.fn((id: string) => `vertex:${id}`), {
      image: vi.fn((id: string) => `image:${id}`),
    })
  ),
}));

import { generateObject } from "ai";
import { createVertex } from "@ai-sdk/google-vertex";

const schema = z.object({ answer: z.string() });
const config = {
  project: "proj-1",
  location: "global",
  clientEmail: "svc@proj-1.iam.gserviceaccount.com",
  privateKey: "line1\\nline2",
};

describe("VertexProvider", () => {
  it("creates the Vertex factory with project, location, and credentials", () => {
    new VertexProvider(config);
    expect(createVertex).toHaveBeenCalledWith({
      project: "proj-1",
      location: "global",
      googleAuthOptions: {
        credentials: {
          client_email: config.clientEmail,
          private_key: "line1\nline2",
        },
      },
    });
  });

  it("passes system, prompt, and the model to generateObject", async () => {
    vi.mocked(generateObject).mockResolvedValueOnce({
      object: { answer: "ok" },
    } as unknown as Awaited<ReturnType<typeof generateObject>>);
    const provider = new VertexProvider({ ...config, model: "gemini-3-flash-preview" });
    const result = await provider.generateObject({
      schema,
      system: "be brief",
      prompt: "question",
    });
    expect(result).toEqual({ answer: "ok" });
    expect(generateObject).toHaveBeenLastCalledWith(
      expect.objectContaining({
        model: "vertex:gemini-3-flash-preview",
        system: "be brief",
        prompt: "question",
      })
    );
  });

  it("records the provider id vertex in provenance", async () => {
    vi.mocked(generateObject).mockResolvedValueOnce({
      object: { answer: "ok" },
    } as unknown as Awaited<ReturnType<typeof generateObject>>);
    const { provenance } = await new VertexProvider(config).generateObjectWithProvenance({
      schema,
      prompt: "q",
    });
    expect(provenance.provider).toBe("vertex");
  });

  it("createAIClient returns a VertexProvider for provider vertex", () => {
    const client = createAIClient({ provider: "vertex", ...{
      project: "p",
      location: "global",
      clientEmail: "a@b.c",
      privateKey: "k",
    } });
    expect(client).toBeInstanceOf(VertexProvider);
  });

  it("throws ProviderNotConfiguredError when a credential is missing", () => {
    const saved = { ...process.env };
    delete process.env.VERTEX_CLIENT_EMAIL;
    delete process.env.VERTEX_PRIVATE_KEY;
    delete process.env.PROJECT_ID;
    try {
      expect(() =>
        createAIClient({ provider: "vertex", project: "p", location: "global" })
      ).toThrow(ProviderNotConfiguredError);
    } finally {
      process.env = saved;
    }
  });
});
