/**
 * Level Test Contract Red Tests
 *
 * Proves that malformed level-test assessment JSON returned by the AI is
 * rejected at the boundary (Zod validation / structured error) rather than
 * being forwarded to the client as a successful response with a null
 * assessment.
 *
 * Evidence refs: Reading C-RA-CRIT-04; Reading migration M-RA-SEC-4.
 *
 * @jest-environment node
 */

import { NextRequest } from "next/server";
import type { ExtendedNextRequest } from "@/server/controllers/auth-controller";

var streamTextMock: jest.Mock;

jest.mock("@reading-advantage/ai", () => ({
  streamText: (streamTextMock = jest.fn()),
}));

jest.mock("@/utils/openai", () => ({
  openai: jest.fn(() => "mock-model"),
  openaiModel5: "mock-model-5",
}));

import { handleLevelTestChat } from "@/server/controllers/level-test-controller";

function makeRequest(body: object): ExtendedNextRequest {
  const req = new NextRequest("http://localhost:3000/api/v1/level-test/chat", {
    method: "POST",
    body: JSON.stringify(body),
  }) as ExtendedNextRequest;
  req.session = {
    user: {
      id: "user-1",
      role: "STUDENT",
      schoolId: "school-a",
      license_id: "license-a",
    },
  } as any;
  return req;
}

function makeStream(chunks: string[]) {
  return {
    textStream: (async function* () {
      for (const chunk of chunks) {
        yield chunk;
      }
    })(),
  };
}

describe("level test assessment contract (Red)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("rejects malformed assessment JSON with a 400 response", async () => {
    streamTextMock.mockResolvedValue(
      makeStream([
        'Here is your assessment:\n```json\n{"level": "B1", "sublevel": "+", "explanation": "good", "strengths": ["vocab"], "improvements": ["grammar"], "nextSteps": "read more"\n',
        " trailing garbage that breaks JSON parsing",
      ])
    );

    const res = await handleLevelTestChat(
      makeRequest({
        messages: [{ text: "I am ready", sender: "user" }],
        forceAssessment: true,
      })
    );

    expect(res.status).toBe(400);
  });

  it("rejects assessment JSON missing required level/sublevel fields", async () => {
    streamTextMock.mockResolvedValue(
      makeStream([
        '```json\n{"explanation": "good", "strengths": [], "improvements": [], "nextSteps": "read"}\n```',
      ])
    );

    const res = await handleLevelTestChat(
      makeRequest({
        messages: [{ text: "I am ready", sender: "user" }],
        forceAssessment: true,
      })
    );

    expect(res.status).toBe(400);
  });

  it("does not return assessment:null as a successful 200 response", async () => {
    streamTextMock.mockResolvedValue(
      makeStream([
        "Here is your assessment. I could not determine a level.",
      ])
    );

    const res = await handleLevelTestChat(
      makeRequest({
        messages: [{ text: "I am ready", sender: "user" }],
        forceAssessment: true,
      })
    );

    const body = await res.json();

    // A valid-but-null assessment forwarded as 200 is the false-green state
    // this test falsifies.
    if (res.status === 200) {
      expect(body.assessment).not.toBeNull();
    } else {
      expect(res.status).toBeGreaterThanOrEqual(400);
    }
  });

  it("accepts well-formed assessment JSON", async () => {
    streamTextMock.mockResolvedValue(
      makeStream([
        '```json\n{"level": "B1", "sublevel": "+", "explanation": "Good work", "strengths": ["vocabulary"], "improvements": ["past tense"], "nextSteps": "Practice reading"}\n```',
      ])
    );

    const res = await handleLevelTestChat(
      makeRequest({
        messages: [{ text: "I am ready", sender: "user" }],
        forceAssessment: true,
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.assessment).toMatchObject({
      level: "B1",
      sublevel: "+",
    });
  });
});
