import { PrismaClient, ActivityType } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Student profile types for activity generation
 */
export enum StudentProfile {
  LAZY = "LAZY",
  AVERAGE = "AVERAGE",
  HARDWORKING = "HARDWORKING",
}

/**
 * Configuration for student profiles
 */
const PROFILE_CONFIG = {
  [StudentProfile.LAZY]: {
    activitiesPerDay: { min: 1, max: 3 },
    xpPerActivity: { min: 20, max: 40 },
    probability: 0.33, // 33% of students
  },
  [StudentProfile.AVERAGE]: {
    activitiesPerDay: { min: 3, max: 6 },
    xpPerActivity: { min: 40, max: 80 },
    probability: 0.5, // 50% of students
  },
  [StudentProfile.HARDWORKING]: {
    activitiesPerDay: { min: 6, max: 12 },
    xpPerActivity: { min: 80, max: 150 },
    probability: 0.17, // 17% of students
  },
};

/**
 * Activity type distribution (percentages)
 */
const ACTIVITY_DISTRIBUTION = {
  [ActivityType.ARTICLE_READ]: 0.4, // 40%
  [ActivityType.MC_QUESTION]: 0.25, // 25%
  [ActivityType.SA_QUESTION]: 0.15, // 15%
  [ActivityType.LA_QUESTION]: 0.1, // 10%
  [ActivityType.VOCABULARY_FLASHCARDS]: 0.1, // 10%
};

/**
 * Determine student profile based on index
 * First 33% are lazy, next 50% are average, last 17% are hardworking
 */
export function generateStudentProfile(
  studentIndex: number,
  totalStudents: number
): StudentProfile {
  const ratio = studentIndex / totalStudents;

  if (ratio < PROFILE_CONFIG[StudentProfile.LAZY].probability) {
    return StudentProfile.LAZY;
  } else if (
    ratio <
    PROFILE_CONFIG[StudentProfile.LAZY].probability +
      PROFILE_CONFIG[StudentProfile.AVERAGE].probability
  ) {
    return StudentProfile.AVERAGE;
  } else {
    return StudentProfile.HARDWORKING;
  }
}

/**
 * Get random number between min and max (inclusive)
 */
function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Select activity type based on distribution
 */
function selectActivityType(): ActivityType {
  const rand = Math.random();
  let cumulative = 0;

  for (const [activityType, probability] of Object.entries(
    ACTIVITY_DISTRIBUTION
  )) {
    cumulative += probability;
    if (rand <= cumulative) {
      return activityType as ActivityType;
    }
  }

  return ActivityType.ARTICLE_READ; // Fallback
}

/**
 * Generate article read activity
 */
async function generateArticleReadActivity(
  userId: string,
  articleId: string,
  createdAt: Date,
  xpEarned: number
) {
  // Create user activity
  const activity = await prisma.userActivity.create({
    data: {
      userId,
      activityType: ActivityType.ARTICLE_READ,
      targetId: articleId,
      timer: randomBetween(60, 360), // 1-6 minutes
      completed: true,
      createdAt,
    },
  });

  // Create XP log
  await prisma.xPLog.create({
    data: {
      userId,
      xpEarned,
      activityType: ActivityType.ARTICLE_READ,
      activityId: articleId,
      createdAt,
    },
  });

  return activity;
}

/**
 * Generate question activity (MC/SA/LA) with realistic accuracy data
 */
async function generateQuestionActivity(
  userId: string,
  articleId: string,
  activityType: "MC_QUESTION" | "SA_QUESTION" | "LA_QUESTION",
  createdAt: Date,
  xpEarned: number,
  profile: "LAZY" | "AVERAGE" | "HARDWORKING"
) {
  // Profile-based accuracy
  const baseAccuracy =
    profile === "LAZY"
      ? randomBetween(50, 70) // 50-70%
      : profile === "AVERAGE"
        ? randomBetween(65, 85) // 65-85%
        : randomBetween(75, 95); // 75-95%

  // Number of questions based on type
  const totalQuestions =
    activityType === "MC_QUESTION"
      ? randomBetween(5, 10)
      : activityType === "SA_QUESTION"
        ? randomBetween(3, 5)
        : randomBetween(1, 3); // LA_QUESTION

  const correctAnswers = Math.floor((totalQuestions * baseAccuracy) / 100);
  const incorrectAnswers = totalQuestions - correctAnswers;
  const accuracy = Math.round((correctAnswers / totalQuestions) * 100);

  // Create user activity with detailed accuracy data
  const activity = await prisma.userActivity.create({
    data: {
      userId,
      activityType,
      targetId: articleId,
      timer: randomBetween(30, 180), // 30 seconds - 3 minutes
      completed: true,
      details: {
        score: accuracy,
        accuracy: accuracy,
        totalQuestions,
        correctAnswers,
        incorrectAnswers,
        questionsAnswered: totalQuestions,
      },
      createdAt,
    },
  });

  // Create XP log
  await prisma.xPLog.create({
    data: {
      userId,
      xpEarned,
      activityType,
      activityId: articleId,
      createdAt,
    },
  });

  return activity;
}

/**
 * Generate flashcard activity
 */
async function generateFlashcardActivity(
  userId: string,
  articleId: string,
  createdAt: Date,
  xpEarned: number
) {
  // Create user activity
  const activity = await prisma.userActivity.create({
    data: {
      userId,
      activityType: ActivityType.VOCABULARY_FLASHCARDS,
      targetId: articleId,
      timer: randomBetween(120, 300), // 2-5 minutes
      completed: true,
      details: {
        cardsReviewed: randomBetween(5, 20),
        correctAnswers: randomBetween(3, 18),
      },
      createdAt,
    },
  });

  // Create XP log
  await prisma.xPLog.create({
    data: {
      userId,
      xpEarned,
      activityType: ActivityType.VOCABULARY_FLASHCARDS,
      activityId: articleId,
      createdAt,
    },
  });

  return activity;
}

/**
 * Create activity based on type
 */
async function createActivity(
  userId: string,
  articleId: string,
  activityType: ActivityType,
  createdAt: Date,
  xpEarned: number,
  profile: "LAZY" | "AVERAGE" | "HARDWORKING"
) {
  switch (activityType) {
    case ActivityType.ARTICLE_READ:
      return generateArticleReadActivity(
        userId,
        articleId,
        createdAt,
        xpEarned
      );

    case ActivityType.MC_QUESTION:
    case ActivityType.SA_QUESTION:
    case ActivityType.LA_QUESTION:
      return generateQuestionActivity(
        userId,
        articleId,
        activityType,
        createdAt,
        xpEarned,
        profile
      );

    case ActivityType.VOCABULARY_FLASHCARDS:
      return generateFlashcardActivity(userId, articleId, createdAt, xpEarned);

    default:
      return generateArticleReadActivity(
        userId,
        articleId,
        createdAt,
        xpEarned
      );
  }
}

/**
 * Generate daily activities for a single student
 */
export async function generateStudentDailyActivities(
  student: { id: string; email: string },
  studentIndex: number,
  totalStudents: number,
  date: Date,
  articles: any[]
): Promise<{ activitiesCreated: number; xpEarned: number }> {
  if (articles.length === 0) {
    return { activitiesCreated: 0, xpEarned: 0 };
  }

  // Determine student profile
  const profile = generateStudentProfile(studentIndex, totalStudents);
  const config = PROFILE_CONFIG[profile];

  // Determine number of activities for this day
  const activitiesCount = randomBetween(
    config.activitiesPerDay.min,
    config.activitiesPerDay.max
  );

  let totalXP = 0;

  // Generate activities spread throughout the day
  for (let i = 0; i < activitiesCount; i++) {
    // Random article
    const article = articles[Math.floor(Math.random() * articles.length)];

    // Select activity type
    const activityType = selectActivityType();

    // Calculate XP for this activity
    const xpEarned = randomBetween(
      config.xpPerActivity.min,
      config.xpPerActivity.max
    );
    totalXP += xpEarned;

    // Calculate activity time (spread throughout the day, 8 AM - 8 PM)
    const activityTime = new Date(date);
    const hourOffset = 8 + Math.floor((i / activitiesCount) * 12); // Spread across 12 hours
    const minuteOffset = Math.floor(Math.random() * 60);
    activityTime.setHours(hourOffset, minuteOffset, 0, 0);

    // Generate the activity
    await createActivity(
      student.id,
      article.id,
      activityType,
      activityTime,
      xpEarned,
      profile
    );
  }

  return { activitiesCreated: activitiesCount, xpEarned: totalXP };
}

/**
 * Generate daily activities for all demo students
 */
export async function generateDailyActivities(
  demoLicenseId: string,
  demoSchoolId: string,
  date: Date = new Date()
): Promise<{ totalActivities: number; totalXP: number }> {
  console.log(
    `📊 Generating activities for ${date.toISOString().split("T")[0]}...`
  );

  // Get all demo students
  const students = await prisma.user.findMany({
    where: {
      licenseId: demoLicenseId,
      schoolId: demoSchoolId,
      role: "STUDENT",
    },
    orderBy: {
      email: "asc", // Consistent ordering for profile assignment
    },
  });

  if (students.length === 0) {
    console.log("⚠️  No demo students found");
    return { totalActivities: 0, totalXP: 0 };
  }

  // Get available articles
  const articles = await prisma.article.findMany({
    where: { isPublic: true },
    take: 50,
  });

  if (articles.length === 0) {
    console.log("⚠️  No public articles found");
    return { totalActivities: 0, totalXP: 0 };
  }

  let totalActivities = 0;
  let totalXP = 0;

  // Generate activities for each student
  for (let i = 0; i < students.length; i++) {
    const student = students[i];
    const profile = generateStudentProfile(i, students.length);

    const result = await generateStudentDailyActivities(
      student,
      i,
      students.length,
      date,
      articles
    );

    totalActivities += result.activitiesCreated;
    totalXP += result.xpEarned;

    console.log(
      `  ✓ ${student.email} (${profile}): ${result.activitiesCreated} activities, ${result.xpEarned} XP`
    );
  }

  console.log(
    `✅ Generated ${totalActivities} activities, ${totalXP} total XP`
  );

  return { totalActivities, totalXP };
}

/**
 * Generate activities for multiple days
 */
export async function generateMultiDayActivities(
  demoLicenseId: string,
  demoSchoolId: string,
  days: number = 7
): Promise<void> {
  console.log(`\n📅 Generating activities for the past ${days} days...\n`);

  for (let dayOffset = days - 1; dayOffset >= 0; dayOffset--) {
    const date = new Date();
    date.setDate(date.getDate() - dayOffset);
    date.setHours(0, 0, 0, 0);

    await generateDailyActivities(demoLicenseId, demoSchoolId, date);
  }

  console.log("\n✅ Multi-day activity generation completed\n");
}
