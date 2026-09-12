/**
 * Server XP authority for postActivityLog, putActivityLog, and updateUser.
 * Also pins the staff scope on the student data endpoints.
 *
 * @jest-environment node
 */

import { NextRequest } from "next/server";
import type { ExtendedNextRequest } from "@/server/controllers/auth-controller";

var selectMock: jest.Mock;
var fromMock: jest.Mock;
var whereMock: jest.Mock;
var limitMock: jest.Mock;
var insertMock: jest.Mock;
var valuesMock: jest.Mock;
var returningMock: jest.Mock;
var updateMock: jest.Mock;
var setMock: jest.Mock;
var deleteMock: jest.Mock;

jest.mock("@reading-advantage/db", () => {
  const actual = jest.requireActual("@reading-advantage/db");

  selectMock = jest.fn();
  fromMock = jest.fn();
  whereMock = jest.fn();
  limitMock = jest.fn();
  insertMock = jest.fn();
  valuesMock = jest.fn();
  returningMock = jest.fn();
  updateMock = jest.fn();
  setMock = jest.fn();
  deleteMock = jest.fn();

  const mockDb: any = {};
  mockDb.select = selectMock.mockImplementation(() => mockDb);
  mockDb.from = fromMock.mockImplementation(() => mockDb);
  mockDb.where = whereMock.mockImplementation(() => mockDb);
  mockDb.limit = limitMock.mockResolvedValue([]);
  mockDb.innerJoin = jest.fn().mockImplementation(() => mockDb);
  mockDb.insert = insertMock.mockImplementation(() => mockDb);
  mockDb.values = valuesMock.mockImplementation(() => mockDb);
  mockDb.returning = returningMock.mockImplementation(() => mockDb);
  mockDb.update = updateMock.mockImplementation(() => mockDb);
  mockDb.set = setMock.mockImplementation(() => mockDb);
  mockDb.delete = deleteMock.mockImplementation(() => mockDb);
  mockDb.transaction = jest
    .fn()
    .mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn(mockDb),
    );

  return {
    ...actual,
    db: mockDb,
  };
});

jest.mock("@/lib/session", () => ({
  getCurrentUser: jest.fn(),
}));

import {
  getStudentData,
  postActivityLog,
  putActivityLog,
  resetUserProgress,
  updateUserData,
  updateUser,
  xpForActivityType,
} from "@/server/controllers/user-controller";
import { ActivityType } from "@/lib/enums";

interface SessionUser {
  id: string;
  role: string;
  school_id?: string;
}

function makeRequest(
  userId: string,
  body: object,
  options: { method?: string; sessionUser?: SessionUser } = {},
): ExtendedNextRequest {
  const method = options.method ?? "POST";
  const req = new NextRequest(
    `http://localhost:3000/api/v1/users/${userId}/activitylog`,
    {
      method,
      ...(method === "GET" ? {} : { body: JSON.stringify(body) }),
    },
  ) as ExtendedNextRequest;
  req.session = {
    user:
      options.sessionUser ?? {
        id: userId,
        role: "STUDENT",
        school_id: "school-a",
      },
  } as any;
  return req;
}

function makeContext(userId: string) {
  return { params: Promise.resolve({ id: userId }) };
}

function resetDbDefaults() {
  jest.clearAllMocks();
  limitMock.mockResolvedValue([]);
  returningMock.mockResolvedValue([{ id: "activity-1" }]);
}

function findXpLogInsert(): [Record<string, unknown>] | undefined {
  return valuesMock.mock.calls.find(
    ([values]: [Record<string, unknown>]) =>
      values && typeof values === "object" && "activityId" in values,
  );
}

describe("xpForActivityType", () => {
  it("awards the catalog value for a completed matching activity", () => {
    expect(xpForActivityType(ActivityType.SENTENCE_MATCHING, true)).toBe(5);
  });

  it("awards nothing for an incomplete activity", () => {
    expect(xpForActivityType(ActivityType.SENTENCE_MATCHING, false)).toBe(0);
  });
});

describe("postActivityLog XP authority", () => {
  beforeEach(resetDbDefaults);

  it("ignores a client-sent xpEarned and isInitialLevelTest payload", async () => {
    const res = await postActivityLog(
      makeRequest("user-1", {
        activityType: "sentence_matching",
        articleId: "article-1",
        completed: true,
        xpEarned: 221000,
        isInitialLevelTest: true,
      }),
      makeContext("user-1"),
    );

    expect(res.status).toBe(200);
    const xpInsert = findXpLogInsert();
    expect(xpInsert).toBeDefined();
    expect(xpInsert![0].xpEarned).toBe(5);
  });

  it("rejects the reserved pending level-test assessment target", async () => {
    const res = await postActivityLog(
      makeRequest("user-1", {
        activityType: "level_test",
        contentId: "pending-level-test-assessment",
        completed: true,
        details: { assessment: { level: "C2", sublevel: "+" } },
      }),
      makeContext("user-1"),
    );

    expect(res.status).toBe(400);
    expect(insertMock).not.toHaveBeenCalled();
    expect(valuesMock).not.toHaveBeenCalled();
  });
});

describe("putActivityLog XP authority", () => {
  beforeEach(resetDbDefaults);

  it("ignores a client-sent xpEarned and awards the catalog value", async () => {
    const res = await putActivityLog(
      makeRequest(
        "user-1",
        {
          activityType: "sentence_matching",
          articleId: "article-1",
          activityStatus: "completed",
          xpEarned: 221000,
          isInitialLevelTest: true,
        },
        { method: "PUT" },
      ),
      makeContext("user-1"),
    );

    expect(res.status).toBe(200);
    const xpInsert = findXpLogInsert();
    expect(xpInsert).toBeDefined();
    expect(xpInsert![0].xpEarned).toBe(5);
    expect(
      valuesMock.mock.calls.some(
        ([values]: [Record<string, unknown>]) =>
          values && typeof values === "object" && values.xpEarned === 221000,
      ),
    ).toBe(false);
    const userUpdate = setMock.mock.calls.find(
      ([values]: [Record<string, unknown>]) =>
        values && typeof values === "object" && "cefrLevel" in values,
    );
    expect(userUpdate).toBeDefined();
    expect(userUpdate![0].xp).toBe(5);
  });

  it("rejects the reserved pending level-test assessment target", async () => {
    const res = await putActivityLog(
      makeRequest(
        "user-1",
        {
          activityType: "level_test",
          contentId: "pending-level-test-assessment",
          activityStatus: "completed",
          details: { assessment: { level: "C2", sublevel: "+" } },
        },
        { method: "PUT" },
      ),
      makeContext("user-1"),
    );

    expect(res.status).toBe(400);
    expect(insertMock).not.toHaveBeenCalled();
    expect(valuesMock).not.toHaveBeenCalled();
  });
});

describe("updateUser PATCH authority", () => {
  beforeEach(resetDbDefaults);

  it("strips role, XP, level, and CEFR from a self PATCH", async () => {
    const res = await updateUser(
      makeRequest(
        "user-1",
        {
          role: "SYSTEM",
          xp: 999999,
          level: 18,
          cefr_level: "C2",
          license_id: "license-1",
          expired_date: "2099-01-01T00:00:00.000Z",
          name: "New",
        },
        { method: "PATCH" },
      ),
      makeContext("user-1"),
    );

    expect(res.status).toBe(200);
    expect(setMock).toHaveBeenCalledTimes(1);
    const payload = setMock.mock.calls[0][0] as Record<string, unknown>;
    expect(payload).toMatchObject({ name: "New" });
    expect(payload).not.toHaveProperty("role");
    expect(payload).not.toHaveProperty("xp");
    expect(payload).not.toHaveProperty("level");
    expect(payload).not.toHaveProperty("cefrLevel");
    expect(payload).not.toHaveProperty("licenseId");
    expect(payload).not.toHaveProperty("expiredDate");
  });

  it("allows an ADMIN to update a target role through the staff branch", async () => {
    limitMock.mockResolvedValueOnce([{ schoolId: "school-a" }]);

    const res = await updateUser(
      makeRequest(
        "user-1",
        { role: "TEACHER" },
        {
          method: "PATCH",
          sessionUser: {
            id: "admin-1",
            role: "ADMIN",
            school_id: "school-a",
          },
        },
      ),
      makeContext("user-1"),
    );

    expect(res.status).toBe(200);
    expect(setMock).toHaveBeenCalledWith(expect.objectContaining({ role: "TEACHER" }));
  });
});

describe("updateUserData staff authority", () => {
  beforeEach(resetDbDefaults);

  it("returns 403 for a student before the email lookup", async () => {
    const res = await updateUserData(
      makeRequest(
        "user-1",
        { email: "student@example.com", license_id: "license-1" },
        {
          method: "PATCH",
          sessionUser: {
            id: "student-1",
            role: "STUDENT",
            school_id: "school-a",
          },
        },
      ),
    );

    expect(res.status).toBe(403);
    expect(selectMock).not.toHaveBeenCalled();
  });

  it("allows a SYSTEM session to update a user by email", async () => {
    limitMock
      .mockResolvedValueOnce([{ id: "user-2", email: "student@example.com" }])
      .mockResolvedValueOnce([{ id: "license-1", maxUsers: 10 }]);
    whereMock
      .mockImplementationOnce(() => ({ limit: limitMock }))
      .mockImplementationOnce(() => ({ limit: limitMock }))
      .mockImplementationOnce(() => Promise.resolve([{ licenseUserCount: 0 }]));

    const res = await updateUserData(
      makeRequest(
        "user-1",
        {
          email: "student@example.com",
          role: "TEACHER",
          license_id: "license-1",
        },
        {
          method: "PATCH",
          sessionUser: { id: "system-1", role: "SYSTEM" },
        },
      ),
    );

    expect(res.status).toBe(200);
    expect(setMock).toHaveBeenCalledWith(
      expect.objectContaining({ role: "TEACHER", licenseId: "license-1" }),
    );
  });
});

describe("student data staff scope", () => {
  const crossSchoolTeacher: SessionUser = {
    id: "teacher-1",
    role: "TEACHER",
    school_id: "school-a",
  };
  const sameSchoolAdmin: SessionUser = {
    id: "admin-1",
    role: "ADMIN",
    school_id: "school-a",
  };

  beforeEach(resetDbDefaults);

  it("returns 403 for a cross-school teacher on getStudentData", async () => {
    const res = await getStudentData(
      makeRequest("student-1", {}, { method: "GET", sessionUser: crossSchoolTeacher }),
      makeContext("student-1"),
    );
    expect(res.status).toBe(403);
  });

  it("returns 200 for a same-school admin on getStudentData", async () => {
    limitMock.mockResolvedValue([
      { schoolId: "school-a", id: "student-1", name: "Student One" },
    ]);
    const res = await getStudentData(
      makeRequest("student-1", {}, { method: "GET", sessionUser: sameSchoolAdmin }),
      makeContext("student-1"),
    );
    expect(res.status).toBe(200);
  });

  it("returns 403 for a cross-school teacher on resetUserProgress", async () => {
    const res = await resetUserProgress(
      makeRequest("student-1", {}, { method: "POST", sessionUser: crossSchoolTeacher }),
      makeContext("student-1"),
    );
    expect(res.status).toBe(403);
    expect(deleteMock).not.toHaveBeenCalled();
  });

  it("returns 200 for a same-school admin on resetUserProgress", async () => {
    limitMock.mockResolvedValue([
      { schoolId: "school-a", id: "student-1", name: "Student One" },
    ]);
    const res = await resetUserProgress(
      makeRequest("student-1", {}, { method: "POST", sessionUser: sameSchoolAdmin }),
      makeContext("student-1"),
    );
    expect(res.status).toBe(200);
  });

  it("returns 200 for a teacher linked to the classroom student", async () => {
    limitMock
      .mockResolvedValueOnce([{ id: "classroom-link" }])
      .mockResolvedValueOnce([{ id: "student-1" }]);

    const res = await resetUserProgress(
      makeRequest(
        "student-1",
        {},
        {
          method: "POST",
          sessionUser: {
            id: "teacher-1",
            role: "TEACHER",
            school_id: "school-a",
          },
        },
      ),
      makeContext("student-1"),
    );

    expect(res.status).toBe(200);
    expect(deleteMock).toHaveBeenCalled();
  });
});
