import { sessionUserSchema } from "../lib/session";
import { Role, LicenseType } from "@prisma/client";

describe("sessionUserSchema", () => {
  it("accepts a valid email", () => {
    const result = sessionUserSchema.parse({
      id: "u1",
      username: "user1",
      email: "user@example.com",
      display_name: "User",
      role: Role.STUDENT,
      level: 1,
      email_verified: true,
      picture: "",
      xp: 100,
      cefr_level: "A1",
      expired_date: "",
      expired: false,
      license_id: "",
      license_level: LicenseType.BASIC,
      onborda: false,
    });
    expect(result.email).toBe("user@example.com");
  });

  it("accepts empty string email (null/undefined from DB)", () => {
    const result = sessionUserSchema.parse({
      id: "u1",
      username: "user1",
      email: "",
      display_name: "User",
      role: Role.STUDENT,
      level: 1,
      email_verified: false,
      picture: "",
      xp: 100,
      cefr_level: "A1",
      expired_date: "",
      expired: false,
      license_id: "",
      license_level: LicenseType.BASIC,
      onborda: false,
    });
    expect(result.email).toBe("");
  });

  it("accepts undefined email", () => {
    const result = sessionUserSchema.parse({
      id: "u1",
      username: "user1",
      email: undefined,
      display_name: "User",
      role: Role.STUDENT,
      level: 1,
      email_verified: false,
      picture: "",
      xp: 100,
      cefr_level: "A1",
      expired_date: "",
      expired: false,
      license_id: "",
      license_level: LicenseType.BASIC,
      onborda: false,
    });
    expect(result.email).toBeUndefined();
  });

  it("rejects invalid email format", () => {
    expect(() =>
      sessionUserSchema.parse({
        id: "u1",
        username: "user1",
        email: "not-an-email",
        display_name: "User",
        role: Role.STUDENT,
        level: 1,
        email_verified: false,
        picture: "",
        xp: 100,
        cefr_level: "A1",
        expired_date: "",
        expired: false,
        license_id: "",
        license_level: LicenseType.BASIC,
        onborda: false,
      })
    ).toThrow();
  });
});
