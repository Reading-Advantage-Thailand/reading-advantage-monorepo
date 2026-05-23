import { generateText } from "ai";
import { openai, openaiModel } from "@/utils/openai";
import { db, and, eq, gte, lt, desc } from "@reading-advantage/db";
import {
  users,
  licenses,
  licenseOnUsers,
  classrooms,
  classroomTeachers,
  classroomStudents,
  articles,
  assignments,
  studentAssignments,
  userActivity,
  xpLogs,
  lessonRecords,
  learningGoals,
  aiInsights,
} from "@reading-advantage/db/schema";
import {
  AIInsightType,
  AIInsightScope,
  AIInsightPriority,
} from "@/lib/enums";

/**
 * AI Insight Generation Service
 * Generates personalized insights for students, teachers, and admins using OpenAI
 */

interface InsightGenerationContext {
  scope: AIInsightScope;
  userId?: string;
  classroomId?: string;
  licenseId?: string;
  metrics: any;
}

interface GeneratedInsight {
  type: AIInsightType;
  priority: AIInsightPriority;
  title: string;
  description: string;
  confidence: number;
  data?: any;
  validUntil?: Date;
}

/**
 * Generate AI insights for a student
 */
export async function generateStudentInsights(
  userId: string
): Promise<GeneratedInsight[]> {
  try {
    // Fetch student core record
    const [studentRow] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!studentRow) {
      throw new Error("Student not found");
    }

    // Fetch related data in parallel (mirrors Prisma `include` shape)
    const [
      lessonRecordRows,
      userActivityRows,
      studentAssignmentRows,
      xpLogRows,
      learningGoalRows,
    ] = await Promise.all([
      db
        .select({
          id: lessonRecords.id,
          userId: lessonRecords.userId,
          articleId: lessonRecords.articleId,
          createdAt: lessonRecords.createdAt,
          updatedAt: lessonRecords.updatedAt,
          article: {
            cefrLevel: articles.cefrLevel,
            genre: articles.genre,
            raLevel: articles.raLevel,
          },
        })
        .from(lessonRecords)
        .leftJoin(articles, eq(lessonRecords.articleId, articles.id))
        .where(eq(lessonRecords.userId, userId))
        .orderBy(desc(lessonRecords.createdAt))
        .limit(50),
      db
        .select()
        .from(userActivity)
        .where(eq(userActivity.userId, userId))
        .orderBy(desc(userActivity.createdAt))
        .limit(100),
      db
        .select({
          id: studentAssignments.id,
          assignmentId: studentAssignments.assignmentId,
          studentId: studentAssignments.studentId,
          completed: studentAssignments.completed,
          status: studentAssignments.status,
          score: studentAssignments.score,
          startedAt: studentAssignments.startedAt,
          completedAt: studentAssignments.completedAt,
          createdAt: studentAssignments.createdAt,
          updatedAt: studentAssignments.updatedAt,
          assignment: assignments,
        })
        .from(studentAssignments)
        .leftJoin(assignments, eq(studentAssignments.assignmentId, assignments.id))
        .where(eq(studentAssignments.studentId, userId))
        .orderBy(desc(studentAssignments.updatedAt))
        .limit(20),
      db
        .select()
        .from(xpLogs)
        .where(eq(xpLogs.userId, userId))
        .orderBy(desc(xpLogs.createdAt))
        .limit(100),
      db
        .select()
        .from(learningGoals)
        .where(
          and(eq(learningGoals.userId, userId), eq(learningGoals.status, "ACTIVE"))
        ),
    ]);

    const student = {
      ...studentRow,
      lessonRecords: lessonRecordRows,
      userActivities: userActivityRows,
      studentAssignments: studentAssignmentRows,
      xpLogs: xpLogRows,
      learningGoals: learningGoalRows,
    };

    // Calculate metrics
    const metrics = calculateStudentMetrics(student);

    // Generate insights using AI
    const prompt = buildStudentInsightPrompt(student, metrics);

    const { text } = await generateText({
      model: openai(openaiModel),
      prompt,
      temperature: 0.7,
      maxTokens: 1500,
    });

    // Parse AI response
    const insights = parseAIResponse(text, "STUDENT", userId);

    return insights;
  } catch (error) {
    console.error("Error generating student insights:", error);
    return generateFallbackStudentInsights(userId);
  }
}

/**
 * Generate AI insights for a teacher
 */
export async function generateTeacherInsights(
  userId: string
): Promise<GeneratedInsight[]> {
  try {
    // Fetch teacher core record
    const [teacherRow] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!teacherRow) {
      throw new Error("Teacher not found");
    }

    // Fetch teacher's classrooms (via ClassroomTeacher junction)
    const teacherClassroomRows = await db
      .select({ classroom: classrooms })
      .from(classroomTeachers)
      .innerJoin(classrooms, eq(classroomTeachers.classroomId, classrooms.id))
      .where(eq(classroomTeachers.teacherId, userId));

    const classroomList = teacherClassroomRows.map((tc) => tc.classroom);
    const classroomIds = classroomList.map((c) => c.id);

    // Per-classroom: fetch students + assignments
    const classroomTree = await Promise.all(
      classroomList.map(async (classroom) => {
        // students in classroom
        const studentRows = await db
          .select({ student: users })
          .from(classroomStudents)
          .innerJoin(users, eq(classroomStudents.studentId, users.id))
          .where(eq(classroomStudents.classroomId, classroom.id));

        // For each student, fetch recent activities + assignments
        const studentsWithRelations = await Promise.all(
          studentRows.map(async ({ student }) => {
            const [activities, sAssignments] = await Promise.all([
              db
                .select()
                .from(userActivity)
                .where(eq(userActivity.userId, student.id))
                .orderBy(desc(userActivity.createdAt))
                .limit(10),
              db
                .select()
                .from(studentAssignments)
                .where(eq(studentAssignments.studentId, student.id))
                .orderBy(desc(studentAssignments.updatedAt))
                .limit(10),
            ]);
            return {
              student: {
                ...student,
                userActivities: activities,
                studentAssignments: sAssignments,
              },
            };
          })
        );

        // assignments for classroom with their studentAssignments
        const classroomAssignments = await db
          .select()
          .from(assignments)
          .where(eq(assignments.classroomId, classroom.id));

        const assignmentsWithSA = await Promise.all(
          classroomAssignments.map(async (a) => {
            const sas = await db
              .select()
              .from(studentAssignments)
              .where(eq(studentAssignments.assignmentId, a.id));
            return { ...a, studentAssignments: sas };
          })
        );

        return {
          classroom: {
            ...classroom,
            students: studentsWithRelations,
            assignments: assignmentsWithSA,
          },
        };
      })
    );

    const teacher = {
      ...teacherRow,
      teacherClassrooms: classroomTree,
    };
    void classroomIds;

    // Calculate metrics
    const metrics = calculateTeacherMetrics(teacher);

    // Generate insights using AI
    const prompt = buildTeacherInsightPrompt(teacher, metrics);

    const { text } = await generateText({
      model: openai(openaiModel),
      prompt,
      temperature: 0.7,
      maxTokens: 2000,
    });

    // Parse AI response
    const insights = parseAIResponse(text, "TEACHER", userId);

    return insights;
  } catch (error) {
    console.error("Error generating teacher insights:", error);
    return generateFallbackTeacherInsights(userId);
  }
}

/**
 * Generate AI insights for a classroom
 */
export async function generateClassroomInsights(
  classroomId: string
): Promise<GeneratedInsight[]> {
  try {
    const [classroomRow] = await db
      .select()
      .from(classrooms)
      .where(eq(classrooms.id, classroomId))
      .limit(1);

    if (!classroomRow) {
      throw new Error("Classroom not found");
    }

    // Students in this classroom (with related activities/assignments/lessons)
    const studentRows = await db
      .select({ student: users })
      .from(classroomStudents)
      .innerJoin(users, eq(classroomStudents.studentId, users.id))
      .where(eq(classroomStudents.classroomId, classroomId));

    const studentsWithRelations = await Promise.all(
      studentRows.map(async ({ student }) => {
        const [activities, sAssignments, lRecords] = await Promise.all([
          db
            .select()
            .from(userActivity)
            .where(eq(userActivity.userId, student.id))
            .orderBy(desc(userActivity.createdAt))
            .limit(20),
          db
            .select()
            .from(studentAssignments)
            .where(eq(studentAssignments.studentId, student.id))
            .orderBy(desc(studentAssignments.updatedAt))
            .limit(10),
          db
            .select()
            .from(lessonRecords)
            .where(eq(lessonRecords.userId, student.id))
            .orderBy(desc(lessonRecords.createdAt))
            .limit(20),
        ]);
        return {
          student: {
            ...student,
            userActivities: activities,
            studentAssignments: sAssignments,
            lessonRecords: lRecords,
          },
        };
      })
    );

    const classroomAssignments = await db
      .select()
      .from(assignments)
      .where(eq(assignments.classroomId, classroomId));

    const assignmentsWithSA = await Promise.all(
      classroomAssignments.map(async (a) => {
        const sas = await db
          .select()
          .from(studentAssignments)
          .where(eq(studentAssignments.assignmentId, a.id));
        return { ...a, studentAssignments: sas };
      })
    );

    const classroom = {
      ...classroomRow,
      // Preserve the legacy `classroomName` field used by the prompt builder
      classroomName: classroomRow.name,
      students: studentsWithRelations,
      assignments: assignmentsWithSA,
    };

    const metrics = calculateClassroomMetrics(classroom);
    const prompt = buildClassroomInsightPrompt(classroom, metrics);

    const { text } = await generateText({
      model: openai(openaiModel),
      prompt,
      temperature: 0.7,
      maxTokens: 2000,
    });

    const insights = parseAIResponse(text, "CLASSROOM", undefined, classroomId);

    return insights;
  } catch (error) {
    console.error("Error generating classroom insights:", error);
    return generateFallbackClassroomInsights(classroomId);
  }
}

/**
 * Generate AI insights for a license (admin/school level)
 */
export async function generateLicenseInsights(
  licenseId: string
): Promise<GeneratedInsight[]> {
  try {
    const [licenseRow] = await db
      .select()
      .from(licenses)
      .where(eq(licenses.id, licenseId))
      .limit(1);

    if (!licenseRow) {
      throw new Error("License not found");
    }

    // License users via licenseOnUsers junction
    const licenseUserRows = await db
      .select({ user: users })
      .from(licenseOnUsers)
      .innerJoin(users, eq(licenseOnUsers.userId, users.id))
      .where(eq(licenseOnUsers.licenseId, licenseId));

    const licenseUsersWithRelations = await Promise.all(
      licenseUserRows.map(async ({ user }) => {
        const [xpRows, activityRows] = await Promise.all([
          db
            .select()
            .from(xpLogs)
            .where(eq(xpLogs.userId, user.id))
            .orderBy(desc(xpLogs.createdAt))
            .limit(50),
          db
            .select()
            .from(userActivity)
            .where(eq(userActivity.userId, user.id))
            .orderBy(desc(userActivity.createdAt))
            .limit(50),
        ]);
        return {
          user: {
            ...user,
            xpLogs: xpRows,
            userActivities: activityRows,
          },
        };
      })
    );

    const license = {
      ...licenseRow,
      licenseUsers: licenseUsersWithRelations,
    };

    const metrics = calculateLicenseMetrics(license);
    const prompt = buildLicenseInsightPrompt(license, metrics);

    const { text } = await generateText({
      model: openai(openaiModel),
      prompt,
      temperature: 0.7,
      maxTokens: 2500,
    });

    const insights = parseAIResponse(
      text,
      "LICENSE",
      undefined,
      undefined,
      licenseId
    );

    return insights;
  } catch (error) {
    console.error("Error generating license insights:", error);
    return generateFallbackLicenseInsights(licenseId);
  }
}

/**
 * Calculate student metrics for AI analysis
 */
function calculateStudentMetrics(student: any) {
  const now = new Date();
  const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const recentActivities = student.userActivities.filter(
    (a: any) => new Date(a.createdAt) > last7Days
  );

  const recentLessons = student.lessonRecords.filter(
    (l: any) => new Date(l.createdAt) > last7Days
  );

  const recentXP = student.xpLogs
    .filter((x: any) => new Date(x.createdAt) > last7Days)
    .reduce((sum: number, x: any) => sum + x.xpEarned, 0);

  const totalXP = student.xp;
  const currentLevel = student.level;
  const cefrLevel = student.cefrLevel;

  // Calculate reading velocity (articles per week)
  const articlesLast7Days = recentLessons.length;
  const articlesLast30Days = student.lessonRecords.filter(
    (l: any) => new Date(l.createdAt) > last30Days
  ).length;

  // Calculate genre diversity
  const genres = new Set(
    student.lessonRecords
      .map((l: any) => l.article?.genre)
      .filter((g: any) => g)
  );

  // Assignment completion rate
  const totalAssignments = student.studentAssignments.length;
  const completedAssignments = student.studentAssignments.filter(
    (a: any) => a.status === "COMPLETED"
  ).length;
  const completionRate =
    totalAssignments > 0 ? completedAssignments / totalAssignments : 0;

  // Days since last activity
  const lastActivity = student.userActivities[0];
  const daysSinceLastActivity = lastActivity
    ? Math.floor(
        (now.getTime() - new Date(lastActivity.createdAt).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : 999;

  void recentActivities;

  return {
    totalXP,
    currentLevel,
    cefrLevel,
    recentXP,
    articlesLast7Days,
    articlesLast30Days,
    readingVelocity: articlesLast7Days / 7,
    genreDiversity: genres.size,
    totalGenresRead: genres.size,
    completionRate,
    totalAssignments,
    completedAssignments,
    pendingAssignments: totalAssignments - completedAssignments,
    daysSinceLastActivity,
    activeGoalsCount: student.learningGoals.length,
  };
}

/**
 * Calculate teacher metrics for AI analysis
 */
function calculateTeacherMetrics(teacher: any) {
  const now = new Date();
  const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const classroomsList = teacher.teacherClassrooms.map((tc: any) => tc.classroom);
  const totalStudents = classroomsList.reduce(
    (sum: number, c: any) => sum + c.students.length,
    0
  );

  const activeStudents = classroomsList.reduce((sum: number, c: any) => {
    return (
      sum +
      c.students.filter((s: any) => {
        const lastActivity = s.student.userActivities[0];
        return (
          lastActivity && new Date(lastActivity.createdAt) > last7Days
        );
      }).length
    );
  }, 0);

  const inactiveStudents = classroomsList.reduce((sum: number, c: any) => {
    return (
      sum +
      c.students.filter((s: any) => {
        const lastActivity = s.student.userActivities[0];
        if (!lastActivity) return true;
        const daysSince = Math.floor(
          (now.getTime() - new Date(lastActivity.createdAt).getTime()) /
            (1000 * 60 * 60 * 24)
        );
        return daysSince > 7;
      }).length
    );
  }, 0);

  const totalAssignments = classroomsList.reduce(
    (sum: number, c: any) => sum + c.assignments.length,
    0
  );

  const pendingAssignments = classroomsList.reduce((sum: number, c: any) => {
    return (
      sum +
      c.assignments.filter((a: any) => {
        const pending = a.studentAssignments.filter(
          (sa: any) => sa.status !== "COMPLETED"
        );
        return pending.length > 0;
      }).length
    );
  }, 0);

  return {
    totalClasses: classroomsList.length,
    totalStudents,
    activeStudents,
    inactiveStudents,
    engagementRate: totalStudents > 0 ? activeStudents / totalStudents : 0,
    totalAssignments,
    pendingAssignments,
  };
}

/**
 * Calculate classroom metrics for AI analysis
 */
function calculateClassroomMetrics(classroom: any) {
  const now = new Date();
  const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const students = classroom.students.map((s: any) => s.student);
  const totalStudents = students.length;

  const activeStudents = students.filter((s: any) => {
    const lastActivity = s.userActivities[0];
    return lastActivity && new Date(lastActivity.createdAt) > last7Days;
  }).length;

  const averageLevel =
    students.reduce((sum: number, s: any) => sum + s.level, 0) / totalStudents ||
    0;

  const totalXP = students.reduce((sum: number, s: any) => sum + s.xp, 0);

  const strugglingStudents = students.filter((s: any) => {
    const assignmentsArr = s.studentAssignments;
    if (assignmentsArr.length < 3) return false;
    const recentAssignments = assignmentsArr.slice(0, 3);
    const avgScore =
      recentAssignments.reduce((sum: number, a: any) => sum + (a.score || 0), 0) /
      recentAssignments.length;
    return avgScore < 0.6;
  }).length;

  return {
    totalStudents,
    activeStudents,
    engagementRate: totalStudents > 0 ? activeStudents / totalStudents : 0,
    averageLevel,
    totalXP,
    strugglingStudents,
    totalAssignments: classroom.assignments.length,
  };
}

/**
 * Calculate license metrics for AI analysis
 */
function calculateLicenseMetrics(license: any) {
  const now = new Date();
  const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const usersList = license.licenseUsers.map((lu: any) => lu.user);
  const totalUsers = usersList.length;

  const activeUsers = usersList.filter((u: any) => {
    const lastActivity = u.userActivities[0];
    return lastActivity && new Date(lastActivity.createdAt) > last30Days;
  }).length;

  const totalXP = usersList.reduce((sum: number, u: any) => sum + u.xp, 0);

  const recentXP = usersList.reduce((sum: number, u: any) => {
    const xp = u.xpLogs
      .filter((x: any) => new Date(x.createdAt) > last30Days)
      .reduce((s: number, x: any) => s + x.xpEarned, 0);
    return sum + xp;
  }, 0);

  return {
    totalUsers,
    activeUsers,
    maxUsers: license.maxUsers,
    utilizationRate: license.maxUsers > 0 ? totalUsers / license.maxUsers : 0,
    engagementRate: totalUsers > 0 ? activeUsers / totalUsers : 0,
    totalXP,
    recentXP,
    expiresAt: license.expiresAt,
  };
}

/**
 * Build prompt for student insights
 */
function buildStudentInsightPrompt(student: any, metrics: any): string {
  return `You are an AI learning coach analyzing a student's reading progress. Based on the data below, generate 3-5 personalized insights as a JSON array.

Student Profile:
- Name: ${student.name || "Student"}
- Current Level: ${metrics.currentLevel}
- CEFR Level: ${metrics.cefrLevel}
- Total XP: ${metrics.totalXP}
- Recent XP (7 days): ${metrics.recentXP}

Activity Metrics:
- Articles read (7 days): ${metrics.articlesLast7Days}
- Articles read (30 days): ${metrics.articlesLast30Days}
- Reading velocity: ${metrics.readingVelocity.toFixed(1)} articles/day
- Genre diversity: ${metrics.totalGenresRead} different genres
- Days since last activity: ${metrics.daysSinceLastActivity}

Assignment Performance:
- Total assignments: ${metrics.totalAssignments}
- Completed: ${metrics.completedAssignments}
- Completion rate: ${(metrics.completionRate * 100).toFixed(0)}%
- Pending: ${metrics.pendingAssignments}

Active Goals: ${metrics.activeGoalsCount}

Generate insights in this JSON format:
[
  {
    "type": "TREND|ALERT|RECOMMENDATION|ACHIEVEMENT|WARNING",
    "priority": "LOW|MEDIUM|HIGH|CRITICAL",
    "title": "Brief title (max 60 chars)",
    "description": "Detailed insight with specific numbers and actionable advice (100-200 chars)",
    "confidence": 0.85,
    "data": {"key": "value"}
  }
]

Focus on:
1. Progress trends (positive or negative)
2. Engagement patterns
3. Learning opportunities
4. Areas needing attention
5. Achievements and milestones

Return ONLY the JSON array, no other text.`;
}

/**
 * Build prompt for teacher insights
 */
function buildTeacherInsightPrompt(teacher: any, metrics: any): string {
  return `You are an AI assistant for teachers analyzing classroom performance. Based on the data below, generate 4-6 actionable insights as a JSON array.

Teacher Profile:
- Name: ${teacher.name || "Teacher"}
- Total Classes: ${metrics.totalClasses}
- Total Students: ${metrics.totalStudents}

Engagement Metrics:
- Active students (7 days): ${metrics.activeStudents}
- Inactive students: ${metrics.inactiveStudents}
- Engagement rate: ${(metrics.engagementRate * 100).toFixed(0)}%

Assignment Metrics:
- Total assignments: ${metrics.totalAssignments}
- Pending assignments: ${metrics.pendingAssignments}

Generate insights in this JSON format:
[
  {
    "type": "TREND|ALERT|RECOMMENDATION|ACHIEVEMENT|WARNING",
    "priority": "LOW|MEDIUM|HIGH|CRITICAL",
    "title": "Brief title (max 60 chars)",
    "description": "Specific, actionable insight with data (100-200 chars)",
    "confidence": 0.90,
    "data": {"studentCount": 5}
  }
]

Focus on:
1. Student engagement patterns
2. At-risk students requiring intervention
3. Assignment completion trends
4. Class performance comparisons
5. Recommended actions

Return ONLY the JSON array, no other text.`;
}

/**
 * Build prompt for classroom insights
 */
function buildClassroomInsightPrompt(classroom: any, metrics: any): string {
  return `You are an AI assistant analyzing a specific classroom. Generate 3-5 insights as a JSON array.

Classroom: ${classroom.classroomName}
- Total Students: ${metrics.totalStudents}
- Active Students: ${metrics.activeStudents}
- Engagement Rate: ${(metrics.engagementRate * 100).toFixed(0)}%
- Average Level: ${metrics.averageLevel.toFixed(1)}
- Total XP: ${metrics.totalXP}
- Struggling Students: ${metrics.strugglingStudents}
- Total Assignments: ${metrics.totalAssignments}

Generate insights in this JSON format:
[
  {
    "type": "TREND|ALERT|RECOMMENDATION|ACHIEVEMENT|WARNING",
    "priority": "LOW|MEDIUM|HIGH|CRITICAL",
    "title": "Brief title (max 60 chars)",
    "description": "Specific insight with data (100-200 chars)",
    "confidence": 0.88,
    "data": {}
  }
]

Focus on classroom-specific patterns and actionable recommendations.
Return ONLY the JSON array.`;
}

/**
 * Build prompt for license insights
 */
function buildLicenseInsightPrompt(license: any, metrics: any): string {
  return `You are an AI assistant for school administrators analyzing your school's reading platform usage and performance metrics.

Your School: ${license.schoolName || "School"}
- Total Users: ${metrics.totalUsers}
- Max Users: ${metrics.maxUsers}
- License Utilization: ${(metrics.utilizationRate * 100).toFixed(0)}%
- Active Users (30 days): ${metrics.activeUsers}
- Engagement Rate: ${(metrics.engagementRate * 100).toFixed(0)}%
- Total XP Earned: ${metrics.totalXP}
- Recent XP (30 days): ${metrics.recentXP}
- Expires At: ${metrics.expiresAt}

Generate 4-6 strategic insights as a JSON array focused ONLY on this school's performance:
[
  {
    "type": "TREND|ALERT|RECOMMENDATION|ACHIEVEMENT|WARNING",
    "priority": "LOW|MEDIUM|HIGH|CRITICAL",
    "title": "Brief title (max 60 chars)",
    "description": "Strategic insight with specific metrics for this school (100-200 chars)",
    "confidence": 0.92,
    "data": {}
  }
]

Focus on:
1. This school's license utilization and efficiency
2. This school's engagement trends
3. ROI and effectiveness for this school
4. Actionable recommendations for this school's administrators
5. Areas where this school can improve

IMPORTANT: Do NOT mention or compare to other schools. Focus only on this school's data and performance.

Return ONLY the JSON array.`;
}

/**
 * Parse AI response into structured insights
 */
function parseAIResponse(
  response: string,
  scope: AIInsightScope,
  userId?: string,
  classroomId?: string,
  licenseId?: string
): GeneratedInsight[] {
  void scope;
  void userId;
  void classroomId;
  void licenseId;
  try {
    // Extract JSON from response (in case AI added extra text)
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error("No JSON array found in AI response");
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Map AI types to valid AIInsightType enum values
    const normalizeType = (type: string): string => {
      const typeMap: Record<string, string> = {
        'TREND': 'TREND',
        'ALERT': 'ALERT',
        'RECOMMENDATION': 'RECOMMENDATION',
        'ACHIEVEMENT': 'ACHIEVEMENT',
        'WARNING': 'WARNING',
        // Map invalid types to valid ones
        'ENGAGEMENT': 'TREND',
        'LEARNING OPPORTUNITY': 'RECOMMENDATION',
        'OPPORTUNITY': 'RECOMMENDATION',
        'RISK': 'WARNING',
        'SUCCESS': 'ACHIEVEMENT',
      };

      const normalized = typeMap[type?.toUpperCase()] || 'RECOMMENDATION';
      return normalized;
    };

    // Map AI priorities to valid AIInsightPriority enum values
    const normalizePriority = (priority: string): string => {
      const priorityMap: Record<string, string> = {
        'LOW': 'LOW',
        'MEDIUM': 'MEDIUM',
        'HIGH': 'HIGH',
        'CRITICAL': 'CRITICAL',
      };

      return priorityMap[priority?.toUpperCase()] || 'MEDIUM';
    };

    // Validate and transform
    const insights: GeneratedInsight[] = parsed
      .filter((item: any) => item.title && item.description)
      .map((item: any) => ({
        type: normalizeType(item.type) as AIInsightType,
        priority: normalizePriority(item.priority) as AIInsightPriority,
        title: item.title.substring(0, 100),
        description: item.description.substring(0, 500),
        confidence: Math.min(Math.max(item.confidence || 0.7, 0), 1),
        data: item.data || {},
        validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Valid for 7 days
      }));

    return insights;
  } catch (error) {
    console.error("Error parsing AI response:", error);
    return [];
  }
}

/**
 * Fallback insights when AI is unavailable
 */
function generateFallbackStudentInsights(userId: string): GeneratedInsight[] {
  void userId;
  return [
    {
      type: "RECOMMENDATION",
      priority: "MEDIUM",
      title: "Keep Reading Daily",
      description:
        "Continue your reading streak to improve comprehension and vocabulary.",
      confidence: 0.8,
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  ];
}

function generateFallbackTeacherInsights(userId: string): GeneratedInsight[] {
  void userId;
  return [
    {
      type: "RECOMMENDATION",
      priority: "MEDIUM",
      title: "Monitor Student Engagement",
      description:
        "Check in with students who haven't been active recently to provide support.",
      confidence: 0.75,
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  ];
}

function generateFallbackClassroomInsights(
  classroomId: string
): GeneratedInsight[] {
  void classroomId;
  return [
    {
      type: "RECOMMENDATION",
      priority: "MEDIUM",
      title: "Review Class Progress",
      description:
        "Analyze student performance to identify areas for improvement.",
      confidence: 0.75,
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  ];
}

function generateFallbackLicenseInsights(licenseId: string): GeneratedInsight[] {
  void licenseId;
  return [
    {
      type: "RECOMMENDATION",
      priority: "MEDIUM",
      title: "Monitor License Usage",
      description:
        "Track license utilization and engagement across your organization.",
      confidence: 0.75,
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  ];
}

/**
 * Generate AI insights for system-wide (all schools)
 */
export async function generateSystemInsights(): Promise<GeneratedInsight[]> {
  try {
    // Fetch all licenses and aggregate data
    const licenseRows = await db.select().from(licenses);

    const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const licensesWithUsers = await Promise.all(
      licenseRows.map(async (lic) => {
        const luRows = await db
          .select({ user: users })
          .from(licenseOnUsers)
          .innerJoin(users, eq(licenseOnUsers.userId, users.id))
          .where(eq(licenseOnUsers.licenseId, lic.id));

        const licenseUsers = await Promise.all(
          luRows.map(async ({ user }) => {
            const [xpRows, activityRows] = await Promise.all([
              db
                .select()
                .from(xpLogs)
                .where(
                  and(
                    eq(xpLogs.userId, user.id),
                    gte(xpLogs.createdAt, last30Days)
                  )
                ),
              db
                .select()
                .from(userActivity)
                .where(
                  and(
                    eq(userActivity.userId, user.id),
                    gte(userActivity.createdAt, last30Days)
                  )
                ),
            ]);
            return {
              user: {
                ...user,
                xpLogs: xpRows,
                userActivities: activityRows,
              },
            };
          })
        );

        return {
          ...lic,
          licenseUsers,
        };
      })
    );

    if (licensesWithUsers.length === 0) {
      return generateFallbackSystemInsights();
    }

    // Calculate system-wide metrics
    const totalLicenses = licensesWithUsers.length;
    const totalUsers = licensesWithUsers.reduce(
      (sum, l) => sum + l.licenseUsers.length,
      0
    );
    const totalCapacity = licensesWithUsers.reduce(
      (sum, l) => sum + l.maxUsers,
      0
    );

    const activeUsers = licensesWithUsers.reduce((sum, l) => {
      return (
        sum +
        l.licenseUsers.filter((lu) => lu.user.userActivities.length > 0).length
      );
    }, 0);

    const totalXP = licensesWithUsers.reduce((sum, l) => {
      return (
        sum +
        l.licenseUsers.reduce((s, lu) => {
          return (
            s +
            lu.user.xpLogs.reduce((x, log) => x + log.xpEarned, 0)
          );
        }, 0)
      );
    }, 0);

    const utilizationRate = totalCapacity > 0 ? totalUsers / totalCapacity : 0;
    const engagementRate = totalUsers > 0 ? activeUsers / totalUsers : 0;

    // Build prompt for system-level insights
    const prompt = `You are an AI assistant for app administrators analyzing system-wide metrics across all schools.

System Overview:
- Total Schools: ${totalLicenses}
- Total Users: ${totalUsers}
- Total Capacity: ${totalCapacity}
- Utilization Rate: ${(utilizationRate * 100).toFixed(1)}%
- Active Users (30 days): ${activeUsers}
- Engagement Rate: ${(engagementRate * 100).toFixed(1)}%
- Total XP (30 days): ${totalXP}

Top Schools by Activity:
${licensesWithUsers
  .sort((a, b) => {
    const aXP = a.licenseUsers.reduce(
      (s, lu) => s + lu.user.xpLogs.reduce((x, log) => x + log.xpEarned, 0),
      0
    );
    const bXP = b.licenseUsers.reduce(
      (s, lu) => s + lu.user.xpLogs.reduce((x, log) => x + log.xpEarned, 0),
      0
    );
    return bXP - aXP;
  })
  .slice(0, 5)
  .map(
    (l, i) =>
      `${i + 1}. ${l.schoolName}: ${l.licenseUsers.length} users, ${l.licenseUsers.reduce((s, lu) => s + lu.user.xpLogs.reduce((x, log) => x + log.xpEarned, 0), 0)} XP`
  )
  .join("\n")}

Generate 5-7 strategic system-wide insights as a JSON array:
[
  {
    "type": "TREND|ALERT|RECOMMENDATION|ACHIEVEMENT|WARNING",
    "priority": "LOW|MEDIUM|HIGH|CRITICAL",
    "title": "Brief title (max 60 chars)",
    "description": "Strategic insight for app administrators (100-200 chars)",
    "confidence": 0.90,
    "data": {}
  }
]

Focus on:
1. Overall platform health and growth
2. Schools needing support or attention
3. System-wide engagement trends
4. Capacity planning recommendations
5. Platform expansion opportunities

Return ONLY the JSON array.`;

    const { text } = await generateText({
      model: openai(openaiModel),
      prompt,
      temperature: 0.7,
      maxTokens: 2000,
    });

    const insights = parseAIResponse(text, "SYSTEM");

    return insights;
  } catch (error) {
    console.error("Error generating system insights:", error);
    return generateFallbackSystemInsights();
  }
}

function generateFallbackSystemInsights(): GeneratedInsight[] {
  return [
    {
      type: "RECOMMENDATION",
      priority: "MEDIUM",
      title: "Monitor Platform Health",
      description:
        "Track system-wide engagement and performance across all schools.",
      confidence: 0.75,
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  ];
}

/**
 * Save generated insights to database
 */
export async function saveInsights(
  insights: GeneratedInsight[],
  scope: AIInsightScope,
  userId?: string,
  classroomId?: string,
  licenseId?: string
): Promise<void> {
  try {
    // Delete old insights for this context (older than 7 days).
    // Mirrors Prisma's behavior of omitting `undefined` fields from the where clause.
    const conditions = [
      eq(aiInsights.scope, scope),
      lt(aiInsights.createdAt, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)),
    ];
    if (userId !== undefined) conditions.push(eq(aiInsights.userId, userId));
    if (classroomId !== undefined)
      conditions.push(eq(aiInsights.classroomId, classroomId));
    if (licenseId !== undefined)
      conditions.push(eq(aiInsights.licenseId, licenseId));

    await db.delete(aiInsights).where(and(...conditions));

    // Create new insights
    if (insights.length === 0) return;

    await db.insert(aiInsights).values(
      insights.map((insight) => ({
        type: insight.type,
        scope,
        priority: insight.priority,
        title: insight.title,
        description: insight.description,
        confidence: insight.confidence,
        data: insight.data || {},
        userId,
        classroomId,
        licenseId,
        generatedBy: "ai",
        modelVersion: openaiModel,
        validUntil: insight.validUntil,
      }))
    );
  } catch (error) {
    console.error("Error saving insights:", error);
    throw error;
  }
}

/**
 * Get cached insights
 */
export async function getCachedInsights(
  scope: AIInsightScope,
  userId?: string,
  classroomId?: string,
  licenseId?: string
): Promise<any[]> {
  try {
    const conditions = [
      eq(aiInsights.scope, scope),
      eq(aiInsights.dismissed, false),
      gte(aiInsights.validUntil, new Date()),
    ];
    if (userId !== undefined) conditions.push(eq(aiInsights.userId, userId));
    if (classroomId !== undefined)
      conditions.push(eq(aiInsights.classroomId, classroomId));
    if (licenseId !== undefined)
      conditions.push(eq(aiInsights.licenseId, licenseId));

    const insights = await db
      .select()
      .from(aiInsights)
      .where(and(...conditions))
      .orderBy(desc(aiInsights.priority), desc(aiInsights.createdAt));

    return insights;
  } catch (error) {
    console.error("Error fetching cached insights:", error);
    return [];
  }
}
