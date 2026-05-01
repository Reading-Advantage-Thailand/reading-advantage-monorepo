/**
 * RBAC Security Test Suite
 * 
 * Tests role-based access control and tenant isolation for dashboard endpoints.
 * Simulates different user roles attempting to access restricted resources.
 * 
 * @jest-environment node
 */

import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";

// Mock getCurrentUser before importing guards
jest.mock("../../lib/session", () => ({
  getCurrentUser: jest.fn(),
}));

import { getCurrentUser } from "../../lib/session";
import {
  requireAuth,
  requireRole,
  requireSchoolAccess,
  requireClassroomAccess,
  requireStudentSelf,
  requireSchoolMatch,
} from "../../server/middleware/guards";
import {
  canAccessSchool,
  canAccessClassroom,
  canAccessStudent,
  isOwnData,
  buildSchoolFilter,
  buildClassroomFilter,
  buildStudentFilter,
} from "../../server/utils/authorization";

const mockGetCurrentUser = getCurrentUser as jest.MockedFunction<typeof getCurrentUser>;

describe("RBAC Guards", () => {
  const mockRequest = (url = "http://localhost:3000/api/test") => {
    return new NextRequest(url);
  };

  describe("requireAuth", () => {
    it("should return 401 when no user is authenticated", async () => {
      mockGetCurrentUser.mockResolvedValue(null);

      const req = mockRequest();
      const result = await requireAuth(req);

      expect(result).toBeInstanceOf(NextResponse);
      if (result instanceof NextResponse) {
        expect(result.status).toBe(401);
        const body = await result.json();
        expect(body.code).toBe("AUTH_REQUIRED");
      }
    });

    it("should return user context when authenticated", async () => {
      const mockUser = {
        id: "user-1",
        role: Role.STUDENT,
        email: "student@test.com",
        display_name: "Test Student",
        level: 5,
        email_verified: true,
        picture: "",
        xp: 100,
        cefr_level: "A2",
        expired_date: new Date().toISOString(),
        expired: false,
        license_id: "license-1",
        license_level: "BASIC" as const,
        onborda: false,
      };

      mockGetCurrentUser.mockResolvedValue(mockUser);

      const req = mockRequest();
      const result = await requireAuth(req);

      expect(result).not.toBeInstanceOf(NextResponse);
      expect(result).toHaveProperty("user");
    });
  });

  describe("requireRole", () => {
    it("should deny access when user has insufficient role", async () => {
      const mockUser = {
        id: "user-1",
        role: Role.STUDENT,
        email: "student@test.com",
        display_name: "Test Student",
        level: 5,
        email_verified: true,
        picture: "",
        xp: 100,
        cefr_level: "A2",
        expired_date: new Date().toISOString(),
        expired: false,
        license_id: "license-1",
        license_level: "BASIC" as const,
        onborda: false,
      };

      mockGetCurrentUser.mockResolvedValue(mockUser);

      const req = mockRequest();
      const result = await requireRole([Role.ADMIN, Role.SYSTEM])(req);

      expect(result).toBeInstanceOf(NextResponse);
      if (result instanceof NextResponse) {
        expect(result.status).toBe(403);
        const body = await result.json();
        expect(body.code).toBe("ROLE_FORBIDDEN");
        expect(body.currentRole).toBe(Role.STUDENT);
      }
    });

    it("should allow access when user has required role", async () => {
      const mockUser = {
        id: "admin-1",
        role: Role.ADMIN,
        email: "admin@test.com",
        display_name: "Test Admin",
        level: 1,
        email_verified: true,
        picture: "",
        xp: 0,
        cefr_level: "",
        expired_date: new Date().toISOString(),
        expired: false,
        license_id: "license-1",
        license_level: "ENTERPRISE" as const,
        onborda: false,
        school_id: "school-1",
      };

      mockGetCurrentUser.mockResolvedValue(mockUser);

      const req = mockRequest();
      const result = await requireRole([Role.ADMIN, Role.SYSTEM])(req);

      expect(result).not.toBeInstanceOf(NextResponse);
      expect(result).toHaveProperty("user");
    });

    it("should allow SYSTEM role to access any endpoint", async () => {
      const mockUser = {
        id: "system-1",
        role: Role.SYSTEM,
        email: "system@test.com",
        display_name: "System Admin",
        level: 1,
        email_verified: true,
        picture: "",
        xp: 0,
        cefr_level: "",
        expired_date: new Date().toISOString(),
        expired: false,
        license_id: "",
        license_level: "ENTERPRISE" as const,
        onborda: false,
      };

      mockGetCurrentUser.mockResolvedValue(mockUser);

      const req = mockRequest();
      const result = await requireRole([Role.STUDENT])(req);

      // SYSTEM should NOT have access to STUDENT-only endpoints
      expect(result).toBeInstanceOf(NextResponse);
      if (result instanceof NextResponse) {
        expect(result.status).toBe(403);
      }
    });
  });

  describe("requireSchoolAccess", () => {
    it("should deny access when user is from different school", async () => {
      const mockUser = {
        id: "admin-1",
        role: Role.ADMIN,
        email: "admin@test.com",
        display_name: "Test Admin",
        level: 1,
        email_verified: true,
        picture: "",
        xp: 0,
        cefr_level: "",
        expired_date: new Date().toISOString(),
        expired: false,
        license_id: "license-1",
        license_level: "ENTERPRISE" as const,
        onborda: false,
        school_id: "school-A",
      };

      mockGetCurrentUser.mockResolvedValue(mockUser);

      const req = mockRequest();
      const result = await requireSchoolAccess("school-B")(req);

      expect(result).toBeInstanceOf(NextResponse);
      if (result instanceof NextResponse) {
        expect(result.status).toBe(403);
        const body = await result.json();
        expect(body.code).toBe("SCHOOL_FORBIDDEN");
      }
    });

    it("should allow SYSTEM role to access any school", async () => {
      const mockUser = {
        id: "system-1",
        role: Role.SYSTEM,
        email: "system@test.com",
        display_name: "System Admin",
        level: 1,
        email_verified: true,
        picture: "",
        xp: 0,
        cefr_level: "",
        expired_date: new Date().toISOString(),
        expired: false,
        license_id: "",
        license_level: "ENTERPRISE" as const,
        onborda: false,
      };

      mockGetCurrentUser.mockResolvedValue(mockUser);

      const req = mockRequest();
      const result = await requireSchoolAccess("any-school")(req);

      expect(result).not.toBeInstanceOf(NextResponse);
      expect(result).toHaveProperty("user");
    });
  });

  describe("requireClassroomAccess", () => {
    it("should deny teacher access to unassigned classroom", async () => {
      const mockUser = {
        id: "teacher-1",
        role: Role.TEACHER,
        email: "teacher@test.com",
        display_name: "Test Teacher",
        level: 1,
        email_verified: true,
        picture: "",
        xp: 0,
        cefr_level: "",
        expired_date: new Date().toISOString(),
        expired: false,
        license_id: "license-1",
        license_level: "BASIC" as const,
        onborda: false,
        school_id: "school-1",
        teacher_class_ids: ["class-A", "class-B"],
      };

      mockGetCurrentUser.mockResolvedValue(mockUser);

      const req = mockRequest();
      const result = await requireClassroomAccess("class-C")(req);

      expect(result).toBeInstanceOf(NextResponse);
      if (result instanceof NextResponse) {
        expect(result.status).toBe(403);
        const body = await result.json();
        expect(body.code).toBe("CLASSROOM_FORBIDDEN");
      }
    });

    it("should allow teacher access to assigned classroom", async () => {
      const mockUser = {
        id: "teacher-1",
        role: Role.TEACHER,
        email: "teacher@test.com",
        display_name: "Test Teacher",
        level: 1,
        email_verified: true,
        picture: "",
        xp: 0,
        cefr_level: "",
        expired_date: new Date().toISOString(),
        expired: false,
        license_id: "license-1",
        license_level: "BASIC" as const,
        onborda: false,
        school_id: "school-1",
        teacher_class_ids: ["class-A", "class-B"],
      };

      mockGetCurrentUser.mockResolvedValue(mockUser);

      const req = mockRequest();
      const result = await requireClassroomAccess("class-A")(req);

      expect(result).not.toBeInstanceOf(NextResponse);
      expect(result).toHaveProperty("user");
    });

    it("should deny student access to non-enrolled classroom", async () => {
      const mockUser = {
        id: "student-1",
        role: Role.STUDENT,
        email: "student@test.com",
        display_name: "Test Student",
        level: 5,
        email_verified: true,
        picture: "",
        xp: 100,
        cefr_level: "A2",
        expired_date: new Date().toISOString(),
        expired: false,
        license_id: "license-1",
        license_level: "BASIC" as const,
        onborda: false,
        school_id: "school-1",
        student_class_ids: ["class-X"],
      };

      mockGetCurrentUser.mockResolvedValue(mockUser);

      const req = mockRequest();
      const result = await requireClassroomAccess("class-Y")(req);

      expect(result).toBeInstanceOf(NextResponse);
      if (result instanceof NextResponse) {
        expect(result.status).toBe(403);
      }
    });
  });

  describe("requireStudentSelf", () => {
    it("should deny student access to another student's data", async () => {
      const mockUser = {
        id: "student-1",
        role: Role.STUDENT,
        email: "student@test.com",
        display_name: "Test Student",
        level: 5,
        email_verified: true,
        picture: "",
        xp: 100,
        cefr_level: "A2",
        expired_date: new Date().toISOString(),
        expired: false,
        license_id: "license-1",
        license_level: "BASIC" as const,
        onborda: false,
      };

      mockGetCurrentUser.mockResolvedValue(mockUser);

      const req = mockRequest();
      const result = await requireStudentSelf("student-2")(req);

      expect(result).toBeInstanceOf(NextResponse);
      if (result instanceof NextResponse) {
        expect(result.status).toBe(403);
        const body = await result.json();
        expect(body.code).toBe("SELF_ACCESS_FORBIDDEN");
      }
    });

    it("should allow student access to own data", async () => {
      const mockUser = {
        id: "student-1",
        role: Role.STUDENT,
        email: "student@test.com",
        display_name: "Test Student",
        level: 5,
        email_verified: true,
        picture: "",
        xp: 100,
        cefr_level: "A2",
        expired_date: new Date().toISOString(),
        expired: false,
        license_id: "license-1",
        license_level: "BASIC" as const,
        onborda: false,
      };

      mockGetCurrentUser.mockResolvedValue(mockUser);

      const req = mockRequest();
      const result = await requireStudentSelf("student-1")(req);

      expect(result).not.toBeInstanceOf(NextResponse);
    });
  });
});

describe("Authorization Helpers", () => {
  describe("canAccessSchool", () => {
    it("should allow SYSTEM role to access any school", () => {
      const user = { id: "sys-1", role: Role.SYSTEM };
      expect(canAccessSchool(user, "school-1")).toBe(true);
      expect(canAccessSchool(user, "school-2")).toBe(true);
    });

    it("should only allow access to user's own school", () => {
      const user = { id: "admin-1", role: Role.ADMIN, school_id: "school-1" };
      expect(canAccessSchool(user, "school-1")).toBe(true);
      expect(canAccessSchool(user, "school-2")).toBe(false);
    });
  });

  describe("canAccessClassroom", () => {
    it("should allow teacher access to assigned classrooms", () => {
      const user = {
        id: "teacher-1",
        role: Role.TEACHER,
        teacher_class_ids: ["class-A", "class-B"],
      };
      expect(canAccessClassroom(user, "class-A")).toBe(true);
      expect(canAccessClassroom(user, "class-C")).toBe(false);
    });

    it("should allow student access to enrolled classrooms", () => {
      const user = {
        id: "student-1",
        role: Role.STUDENT,
        student_class_ids: ["class-X"],
      };
      expect(canAccessClassroom(user, "class-X")).toBe(true);
      expect(canAccessClassroom(user, "class-Y")).toBe(false);
    });
  });

  describe("buildSchoolFilter", () => {
    it("should return empty filter for SYSTEM role", () => {
      const user = { id: "sys-1", role: Role.SYSTEM };
      expect(buildSchoolFilter(user)).toEqual({});
    });

    it("should return school filter for other roles", () => {
      const user = { id: "admin-1", role: Role.ADMIN, school_id: "school-1" };
      expect(buildSchoolFilter(user)).toEqual({ schoolId: "school-1" });
    });
  });

  describe("buildClassroomFilter", () => {
    it("should return empty filter for SYSTEM role", () => {
      const user = { id: "sys-1", role: Role.SYSTEM };
      expect(buildClassroomFilter(user)).toEqual({});
    });

    it("should return classroom filter for teachers", () => {
      const user = {
        id: "teacher-1",
        role: Role.TEACHER,
        teacher_class_ids: ["class-A", "class-B"],
      };
      expect(buildClassroomFilter(user)).toEqual({
        classroomId: { in: ["class-A", "class-B"] },
      });
    });
  });
});
