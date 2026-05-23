import { sessionUserSchema } from "../lib/session";
import { Role, LicenseType } from "@/lib/enums";

const validFullUser = {
  id: "user-123",
  username: "johndoe",
  email: "john@example.com",
  display_name: "John Doe",
  role: Role.TEACHER,
  level: 3,
  email_verified: true,
  picture: "https://example.com/avatar.jpg",
  xp: 500,
  cefr_level: "B1",
  expired_date: "2026-12-31T00:00:00.000Z",
  expired: false,
  license_id: "lic-abc",
  license_level: LicenseType.ENTERPRISE,
  onborda: true,
  school_id: "school-1",
  teacher_class_ids: ["class-1", "class-2"],
  student_class_ids: ["class-3"],
};

const minimalValidUser = {
  id: "user-123",
  username: "johndoe",
  email: "",
  display_name: "John",
  role: Role.STUDENT,
  level: null,
  email_verified: false,
  picture: "",
  xp: null,
  cefr_level: "",
  expired_date: "",
  expired: false,
  license_id: "",
  license_level: LicenseType.BASIC,
  onborda: false,
};

describe("sessionUserSchema", () => {
  describe("valid inputs", () => {
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

    it("accepts a full valid object with all optional fields", () => {
      const result = sessionUserSchema.parse(validFullUser);
      expect(result).toEqual(validFullUser);
    });

    it("accepts minimal valid object with only required fields", () => {
      const result = sessionUserSchema.parse(minimalValidUser);
      expect(result.id).toBe("user-123");
    });

    it("accepts EXPIRED as license_level", () => {
      const result = sessionUserSchema.parse({
        ...minimalValidUser,
        license_level: "EXPIRED" as const,
      });
      expect(result.license_level).toBe("EXPIRED");
    });

    it("accepts null level and xp", () => {
      const result = sessionUserSchema.parse(minimalValidUser);
      expect(result.level).toBeNull();
      expect(result.xp).toBeNull();
    });
  });

  describe("rejects invalid inputs", () => {
    it("rejects invalid email format", () => {
      expect(() =>
        sessionUserSchema.parse({
          ...minimalValidUser,
          email: "not-an-email",
        })
      ).toThrow();
    });

    it("rejects missing required field id", () => {
      const { id, ...rest } = minimalValidUser;
      expect(() => sessionUserSchema.parse(rest)).toThrow();
    });

    it("rejects missing required field username", () => {
      const { username, ...rest } = minimalValidUser;
      expect(() => sessionUserSchema.parse(rest)).toThrow();
    });

    it("rejects missing required field display_name", () => {
      const { display_name, ...rest } = minimalValidUser;
      expect(() => sessionUserSchema.parse(rest)).toThrow();
    });

    it("rejects missing required field role", () => {
      const { role, ...rest } = minimalValidUser;
      expect(() => sessionUserSchema.parse(rest)).toThrow();
    });

    it("rejects invalid role value", () => {
      expect(() =>
        sessionUserSchema.parse({
          ...minimalValidUser,
          role: "INVALID_ROLE",
        })
      ).toThrow();
    });

    it("rejects invalid license_level value", () => {
      expect(() =>
        sessionUserSchema.parse({
          ...minimalValidUser,
          license_level: "INVALID_LICENSE",
        })
      ).toThrow();
    });

    it("rejects email_verified as non-boolean", () => {
      expect(() =>
        sessionUserSchema.parse({
          ...minimalValidUser,
          email_verified: "true",
        })
      ).toThrow();
    });

    it("rejects level as string instead of number", () => {
      expect(() =>
        sessionUserSchema.parse({
          ...minimalValidUser,
          level: "3",
        })
      ).toThrow();
    });

    it("rejects xp as string instead of number", () => {
      expect(() =>
        sessionUserSchema.parse({
          ...minimalValidUser,
          xp: "500",
        })
      ).toThrow();
    });

    it("rejects onborda as string", () => {
      expect(() =>
        sessionUserSchema.parse({
          ...minimalValidUser,
          onborda: "true",
        })
      ).toThrow();
    });

    it("rejects teacher_class_ids as non-array", () => {
      expect(() =>
        sessionUserSchema.parse({
          ...minimalValidUser,
          teacher_class_ids: "class-1",
        })
      ).toThrow();
    });
  });
});
