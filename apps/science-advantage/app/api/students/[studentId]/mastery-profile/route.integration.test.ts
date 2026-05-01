import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import type { user as UserModel, Standard } from '@prisma/client';
import { GET } from './route';
import { createSession } from '@/lib/auth/session';

// Mock next/headers for cookies
const mockCookies = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
};

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => mockCookies),
}));

describe('GET /api/students/[studentId]/mastery-profile - Integration Tests', () => {
  let testStudent: UserModel;
  let otherStudent: UserModel;
  let standard1: Standard;
  let standard2: Standard;
  let standard3: Standard;
  let standard4: Standard;

  beforeEach(async () => {
    mockCookies.get.mockReset();
    mockCookies.set.mockReset();
    mockCookies.delete.mockReset();
    mockCookies.get.mockReturnValue(undefined);

    // Clean up
    await prisma.masteryRun.deleteMany();
    await prisma.standardMastery.deleteMany();
    await prisma.$executeRaw`DELETE FROM "_LessonToStandard"`;
    await prisma.$executeRaw`DELETE FROM "_QuizQuestionToStandard"`;
    await prisma.standard.deleteMany();
    await prisma.session.deleteMany();
    await prisma.account.deleteMany();
    await prisma.user.deleteMany();

    // Create test users
    testStudent = await prisma.user.create({
      data: {
        id: 'test-student-mastery',
        name: 'Test Student',
        username: 'teststudent-mastery',
        displayUsername: 'TestStudent',
        email: 'student-mastery@example.com',
        role: 'STUDENT',
        gradeLevel: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    otherStudent = await prisma.user.create({
      data: {
        id: 'other-student-mastery',
        name: 'Other Student',
        username: 'otherstudent-mastery',
        displayUsername: 'OtherStudent',
        email: 'other-mastery@example.com',
        role: 'STUDENT',
        gradeLevel: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });


    // Create test standards (4 standards across 2 strands)
    standard1 = await prisma.standard.create({
      data: {
        code: 'Sc1.1-G3',
        description: 'Identify living things',
        framework: 'THAI',
        gradeLevel: 3,
      },
    });

    standard2 = await prisma.standard.create({
      data: {
        code: 'Sc1.2-G3',
        description: 'Observe life processes',
        framework: 'THAI',
        gradeLevel: 3,
      },
    });

    standard3 = await prisma.standard.create({
      data: {
        code: 'Sc2.1-G3',
        description: 'Describe relationships',
        framework: 'THAI',
        gradeLevel: 3,
      },
    });

    standard4 = await prisma.standard.create({
      data: {
        code: 'Sc2.2-G3',
        description: 'Create food chains',
        framework: 'THAI',
        gradeLevel: 3,
      },
    });

    // Create mastery records for test student
    await prisma.standardMastery.create({
      data: {
        studentId: testStudent.id,
        standardId: standard1.id,
        masteryLevel: 0.85, // Proficient (Sc1)
        evidenceCount: 10,
        lastAssessedAt: new Date('2025-10-20T10:00:00Z'),
      },
    });

    await prisma.standardMastery.create({
      data: {
        studentId: testStudent.id,
        standardId: standard2.id,
        masteryLevel: 0.72, // Developing (Sc1)
        evidenceCount: 8,
        lastAssessedAt: new Date('2025-10-21T10:00:00Z'),
      },
    });

    await prisma.standardMastery.create({
      data: {
        studentId: testStudent.id,
        standardId: standard3.id,
        masteryLevel: 0.45, // Needs Support (Sc2)
        evidenceCount: 5,
        lastAssessedAt: new Date('2025-10-22T10:00:00Z'),
      },
    });

    await prisma.standardMastery.create({
      data: {
        studentId: testStudent.id,
        standardId: standard4.id,
        masteryLevel: 0.55, // Needs Support (Sc2)
        evidenceCount: 6,
        lastAssessedAt: new Date('2025-10-23T10:00:00Z'),
      },
    });
  });

  describe('Authentication & Authorization', () => {
    it('should return 401 when not authenticated', async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/students/${testStudent.id}/mastery-profile`
      );

      const response = await GET(req, {
        params: Promise.resolve({ studentId: testStudent.id }),
      });

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe('Unauthorized');
    });

    it('should allow student to access their own profile', async () => {
      const sessionToken = await createSession(testStudent.id);
      mockCookies.get.mockReturnValue({ value: sessionToken });

      const req = new NextRequest(
        `http://localhost:3000/api/students/${testStudent.id}/mastery-profile`
      );

      const response = await GET(req, {
        params: Promise.resolve({ studentId: testStudent.id }),
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.student.id).toBe(testStudent.id);
    });

    it('should deny student from accessing another student profile', async () => {
      const sessionToken = await createSession(otherStudent.id);
      mockCookies.get.mockReturnValue({ value: sessionToken });

      const req = new NextRequest(
        `http://localhost:3000/api/students/${testStudent.id}/mastery-profile`
      );

      const response = await GET(req, {
        params: Promise.resolve({ studentId: testStudent.id }),
      });

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.error).toBe('Forbidden');
    });
  });

  describe('Response Format & Data Grouping', () => {
    it('should return READY status when no pending mastery runs', async () => {
      const sessionToken = await createSession(testStudent.id);
      mockCookies.get.mockReturnValue({ value: sessionToken });

      const req = new NextRequest(
        `http://localhost:3000/api/students/${testStudent.id}/mastery-profile`
      );

      const response = await GET(req, {
        params: Promise.resolve({ studentId: testStudent.id }),
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.status).toBe('READY');
      expect(body.retryAfterSeconds).toBeUndefined();
    });

    it('should return CALCULATING status when mastery run is pending', async () => {
      // Create a pending mastery run
      const attempt = await prisma.attempt.create({
        data: {
          studentId: testStudent.id,
          lessonId: 'lesson-id',
          attemptNumber: 1,
          maxScore: 100,
          completedAt: new Date(),
        },
      });

      await prisma.masteryRun.create({
        data: {
          attemptId: attempt.id,
          studentId: testStudent.id,
          status: 'PROCESSING',
        },
      });

      const sessionToken = await createSession(testStudent.id);
      mockCookies.get.mockReturnValue({ value: sessionToken });

      const req = new NextRequest(
        `http://localhost:3000/api/students/${testStudent.id}/mastery-profile`
      );

      const response = await GET(req, {
        params: Promise.resolve({ studentId: testStudent.id }),
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.status).toBe('CALCULATING');
      expect(body.retryAfterSeconds).toBe(10);
    });

    it('should group standards by strand and sort by weakest first', async () => {
      const sessionToken = await createSession(testStudent.id);
      mockCookies.get.mockReturnValue({ value: sessionToken });

      const req = new NextRequest(
        `http://localhost:3000/api/students/${testStudent.id}/mastery-profile`
      );

      const response = await GET(req, {
        params: Promise.resolve({ studentId: testStudent.id }),
      });

      expect(response.status).toBe(200);
      const body = await response.json();

      expect(body.strands).toHaveLength(2);

      // Sc2 should come first (average ~0.50) because it's weaker than Sc1 (average ~0.79)
      expect(body.strands[0].code).toBe('Sc2');
      expect(body.strands[0].masteryAverage).toBeCloseTo(0.5, 2);
      expect(body.strands[0].standards).toHaveLength(2);

      expect(body.strands[1].code).toBe('Sc1');
      expect(body.strands[1].masteryAverage).toBeCloseTo(0.79, 2);
      expect(body.strands[1].standards).toHaveLength(2);
    });

    it('should include correct mastery labels', async () => {
      const sessionToken = await createSession(testStudent.id);
      mockCookies.get.mockReturnValue({ value: sessionToken });

      const req = new NextRequest(
        `http://localhost:3000/api/students/${testStudent.id}/mastery-profile`
      );

      const response = await GET(req, {
        params: Promise.resolve({ studentId: testStudent.id }),
      });

      expect(response.status).toBe(200);
      const body = await response.json();

      const sc1Strand = body.strands.find(
        (s: { code: string }) => s.code === 'Sc1'
      );
      const sc2Strand = body.strands.find(
        (s: { code: string }) => s.code === 'Sc2'
      );
      const sc1Standards = sc1Strand?.standards;
      const sc2Standards = sc2Strand?.standards;

      // Check Sc1.1 (0.85 = Proficient)
      const sc11 = sc1Standards.find(
        (s: { code: string }) => s.code === 'Sc1.1-G3'
      );
      expect(sc11.masteryLabel).toBe('Proficient');
      expect(sc11.masteryColorToken).toBe('strong');

      // Check Sc1.2 (0.72 = Developing)
      const sc12 = sc1Standards.find(
        (s: { code: string }) => s.code === 'Sc1.2-G3'
      );
      expect(sc12.masteryLabel).toBe('Developing');
      expect(sc12.masteryColorToken).toBe('caution');

      // Check Sc2.1 (0.45 = Needs Support)
      const sc21 = sc2Standards.find(
        (s: { code: string }) => s.code === 'Sc2.1-G3'
      );
      expect(sc21.masteryLabel).toBe('Needs Support');
      expect(sc21.masteryColorToken).toBe('critical');
    });

    it('should include all required fields in standard records', async () => {
      const sessionToken = await createSession(testStudent.id);
      mockCookies.get.mockReturnValue({ value: sessionToken });

      const req = new NextRequest(
        `http://localhost:3000/api/students/${testStudent.id}/mastery-profile`
      );

      const response = await GET(req, {
        params: Promise.resolve({ studentId: testStudent.id }),
      });

      expect(response.status).toBe(200);
      const body = await response.json();

      const firstStandard = body.strands[0]?.standards[0];
      expect(firstStandard).toHaveProperty('standardId');
      expect(firstStandard).toHaveProperty('code');
      expect(firstStandard).toHaveProperty('titleEn');
      expect(firstStandard).toHaveProperty('titleTh');
      expect(firstStandard).toHaveProperty('masteryLevel');
      expect(firstStandard).toHaveProperty('masteryLabel');
      expect(firstStandard).toHaveProperty('masteryColorToken');
      expect(firstStandard).toHaveProperty('evidenceCount');
      expect(firstStandard).toHaveProperty('lastAssessedAt');
    });
  });

  describe('Pagination', () => {
    it('should paginate results with limit and cursor', async () => {
      const sessionToken = await createSession(testStudent.id);
      mockCookies.get.mockReturnValue({ value: sessionToken });

      // First page with limit=2
      const req1 = new NextRequest(
        `http://localhost:3000/api/students/${testStudent.id}/mastery-profile?limit=2`
      );

      const response1 = await GET(req1, {
        params: Promise.resolve({ studentId: testStudent.id }),
      });

      expect(response1.status).toBe(200);
      const body1 = await response1.json();

      // Should have nextCursor since we have 4 records but limit is 2
      expect(body1.nextCursor).toBeDefined();
      expect(body1.nextCursor).toBeTruthy();

      // Total standards across all strands should be 2
      const totalStandards1 = body1.strands.reduce(
        (sum: number, strand: { standards: unknown[] }) =>
          sum + strand.standards.length,
        0
      );
      expect(totalStandards1).toBe(2);

      // Second page
      const req2 = new NextRequest(
        `http://localhost:3000/api/students/${testStudent.id}/mastery-profile?limit=2&cursor=${body1.nextCursor}`
      );

      const response2 = await GET(req2, {
        params: Promise.resolve({ studentId: testStudent.id }),
      });

      expect(response2.status).toBe(200);
      const body2 = await response2.json();

      // Should have remaining records
      const totalStandards2 = body2.strands.reduce(
        (sum: number, strand: { standards: unknown[] }) =>
          sum + strand.standards.length,
        0
      );
      expect(totalStandards2).toBe(2);

      // No more pages
      expect(body2.nextCursor).toBeNull();
    });

    it('should enforce maximum limit of 200', async () => {
      const sessionToken = await createSession(testStudent.id);
      mockCookies.get.mockReturnValue({ value: sessionToken });

      const req = new NextRequest(
        `http://localhost:3000/api/students/${testStudent.id}/mastery-profile?limit=300`
      );

      const response = await GET(req, {
        params: Promise.resolve({ studentId: testStudent.id }),
      });

      expect(response.status).toBe(400);
    });
  });

  describe('Filtering', () => {
    it('should filter by strand', async () => {
      const sessionToken = await createSession(testStudent.id);
      mockCookies.get.mockReturnValue({ value: sessionToken });

      const req = new NextRequest(
        `http://localhost:3000/api/students/${testStudent.id}/mastery-profile?strand=Sc1`
      );

      const response = await GET(req, {
        params: Promise.resolve({ studentId: testStudent.id }),
      });

      expect(response.status).toBe(200);
      const body = await response.json();

      // Should only have Sc1 strand
      expect(body.strands).toHaveLength(1);
      expect(body.strands[0].code).toBe('Sc1');
      expect(body.strands[0].standards).toHaveLength(2);
    });

    it('should return empty strands for non-existent strand', async () => {
      const sessionToken = await createSession(testStudent.id);
      mockCookies.get.mockReturnValue({ value: sessionToken });

      const req = new NextRequest(
        `http://localhost:3000/api/students/${testStudent.id}/mastery-profile?strand=Sc99`
      );

      const response = await GET(req, {
        params: Promise.resolve({ studentId: testStudent.id }),
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.strands).toHaveLength(0);
    });
  });

  describe('includeRecommendations parameter', () => {
    it('should include aiAnnotation when includeRecommendations=true', async () => {
      const sessionToken = await createSession(testStudent.id);
      mockCookies.get.mockReturnValue({ value: sessionToken });

      const req = new NextRequest(
        `http://localhost:3000/api/students/${testStudent.id}/mastery-profile?includeRecommendations=true`
      );

      const response = await GET(req, {
        params: Promise.resolve({ studentId: testStudent.id }),
      });

      expect(response.status).toBe(200);
      const body = await response.json();

      const firstStandard = body.strands[0]?.standards[0];
      expect(firstStandard).toHaveProperty('aiAnnotation');
      expect(firstStandard.aiAnnotation).toHaveProperty('recommended');
      expect(firstStandard.aiAnnotation).toHaveProperty('traceId');
    });

    it('should not include aiAnnotation when includeRecommendations=false', async () => {
      const sessionToken = await createSession(testStudent.id);
      mockCookies.get.mockReturnValue({ value: sessionToken });

      const req = new NextRequest(
        `http://localhost:3000/api/students/${testStudent.id}/mastery-profile`
      );

      const response = await GET(req, {
        params: Promise.resolve({ studentId: testStudent.id }),
      });

      expect(response.status).toBe(200);
      const body = await response.json();

      const firstStandard = body.strands[0]?.standards[0];
      expect(firstStandard).not.toHaveProperty('aiAnnotation');
    });
  });

  describe('Edge Cases', () => {
    it('should handle student with no mastery records', async () => {
      const sessionToken = await createSession(otherStudent.id);
      mockCookies.get.mockReturnValue({ value: sessionToken });

      const req = new NextRequest(
        `http://localhost:3000/api/students/${otherStudent.id}/mastery-profile`
      );

      const response = await GET(req, {
        params: Promise.resolve({ studentId: otherStudent.id }),
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.strands).toHaveLength(0);
      expect(body.nextCursor).toBeNull();
    });

    it('should return 404 for non-existent student', async () => {
      const sessionToken = await createSession(testStudent.id);
      mockCookies.get.mockReturnValue({ value: sessionToken });

      const req = new NextRequest(
        'http://localhost:3000/api/students/non-existent/mastery-profile'
      );

      const response = await GET(req, {
        params: Promise.resolve({ studentId: 'non-existent' }),
      });

      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.error).toBe('Student not found');
    });
  });
});
