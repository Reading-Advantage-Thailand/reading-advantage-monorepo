/** @jest-environment node */
jest.mock("@reading-advantage/api/routes/auth", () => ({
  handleRegister: jest.fn(),
}), { virtual: true });

import { POST } from "./route";

const { handleRegister: mockHandleRegister } = jest.requireMock(
  "@reading-advantage/api/routes/auth",
) as { handleRegister: jest.Mock };

describe("teacher-managed registration endpoint", () => {
  it("keeps the shared authorized registration handler", () => {
    expect(POST).toBe(mockHandleRegister);
  });
});
