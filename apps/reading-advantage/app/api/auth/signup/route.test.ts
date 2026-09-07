/** @jest-environment node */
import { POST } from "./route";

const mockTransaction = jest.fn();

jest.mock("@reading-advantage/db", () => ({
  db: { transaction: mockTransaction },
}));

describe("obsolete signup endpoint", () => {
  it("denies anonymous account creation with a stable response", async () => {
    const response = await POST();

    expect(response.status).toBe(410);
    await expect(response.json()).resolves.toEqual({
      error: "Self-service signup is unavailable",
    });
    expect(mockTransaction).not.toHaveBeenCalled();
  });
});
