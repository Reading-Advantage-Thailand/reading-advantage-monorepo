import { randomUUID } from "crypto";
import {
  db,
  raCefrMappings,
  genreAdjacencies,
  schools,
  licenses,
  licenseOnUsers,
  users,
  classrooms,
  classroomStudents,
  articles,
  xpLogs,
  assignments,
  studentAssignments,
  userWordRecords,
  userSentenceRecords,
  eq,
} from "@reading-advantage/db";
import { Role, ActivityType, Status, LicenseType } from "@/lib/enums";

type SchoolRow = typeof schools.$inferSelect;
type LicenseRow = typeof licenses.$inferSelect;
type UserRow = typeof users.$inferSelect;
type ClassroomRow = typeof classrooms.$inferSelect;

// Dataset size configurations
type DatasetSize = 'small' | 'medium' | 'large';

const DATASET_CONFIG = {
  small: { users: 20, schools: 2, classroomsPerSchool: 2, studentsPerClass: 5 },
  medium: { users: 200, schools: 5, classroomsPerSchool: 5, studentsPerClass: 8 },
  large: { users: 2000, schools: 20, classroomsPerSchool: 10, studentsPerClass: 10 },
};

// Feature flags defaults for different license types
const DEFAULT_FEATURE_FLAGS: Record<LicenseType, Record<string, boolean>> = {
  BASIC: {
    dashboardEnabled: false,
    velocityMetrics: false,
    assignmentFunnel: false,
    srsHealth: false,
    genreRecommendations: false,
    activityHeatmap: false,
    cefrAlignment: false,
  },
  PREMIUM: {
    dashboardEnabled: true,
    velocityMetrics: true,
    assignmentFunnel: true,
    srsHealth: true,
    genreRecommendations: false,
    activityHeatmap: false,
    cefrAlignment: false,
  },
  ENTERPRISE: {
    dashboardEnabled: true,
    velocityMetrics: true,
    assignmentFunnel: true,
    srsHealth: true,
    genreRecommendations: true,
    activityHeatmap: true,
    cefrAlignment: true,
  },
};

// RA to CEFR Level Mapping
const RA_CEFR_MAPPINGS = [
  { raLevel: 1, cefrLevel: 'A1-' },
  { raLevel: 2, cefrLevel: 'A1' },
  { raLevel: 3, cefrLevel: 'A1+' },
  { raLevel: 4, cefrLevel: 'A2-' },
  { raLevel: 5, cefrLevel: 'A2' },
  { raLevel: 6, cefrLevel: 'A2+' },
  { raLevel: 7, cefrLevel: 'B1-' },
  { raLevel: 8, cefrLevel: 'B1' },
  { raLevel: 9, cefrLevel: 'B1+' },
  { raLevel: 10, cefrLevel: 'B2-' },
  { raLevel: 11, cefrLevel: 'B2' },
  { raLevel: 12, cefrLevel: 'B2+' },
  { raLevel: 13, cefrLevel: 'C1-' },
  { raLevel: 14, cefrLevel: 'C1' },
  { raLevel: 15, cefrLevel: 'C1+' },
  { raLevel: 16, cefrLevel: 'C2-' },
  { raLevel: 17, cefrLevel: 'C2' },
  { raLevel: 18, cefrLevel: 'C2+' },
];

// Genre Adjacency Configuration (similar genres for recommendations)
const GENRE_ADJACENCIES = [
  { primaryGenre: 'Fiction', adjacentGenre: 'Fantasy', weight: 0.8 },
  { primaryGenre: 'Fiction', adjacentGenre: 'Mystery', weight: 0.7 },
  { primaryGenre: 'Fiction', adjacentGenre: 'Adventure', weight: 0.75 },
  { primaryGenre: 'Fiction', adjacentGenre: 'Romance', weight: 0.65 },
  { primaryGenre: 'Fiction', adjacentGenre: 'Drama', weight: 0.8 },

  { primaryGenre: 'Fantasy', adjacentGenre: 'Fiction', weight: 0.8 },
  { primaryGenre: 'Fantasy', adjacentGenre: 'Adventure', weight: 0.85 },
  { primaryGenre: 'Fantasy', adjacentGenre: 'Science Fiction', weight: 0.6 },

  { primaryGenre: 'Science Fiction', adjacentGenre: 'Fantasy', weight: 0.6 },
  { primaryGenre: 'Science Fiction', adjacentGenre: 'Adventure', weight: 0.7 },
  { primaryGenre: 'Science Fiction', adjacentGenre: 'Technology', weight: 0.8 },
  { primaryGenre: 'Science Fiction', adjacentGenre: 'Thriller', weight: 0.65 },

  { primaryGenre: 'Mystery', adjacentGenre: 'Fiction', weight: 0.7 },
  { primaryGenre: 'Mystery', adjacentGenre: 'Thriller', weight: 0.9 },
  { primaryGenre: 'Mystery', adjacentGenre: 'Adventure', weight: 0.6 },
  { primaryGenre: 'Thriller', adjacentGenre: 'Mystery', weight: 0.9 },
  { primaryGenre: 'Thriller', adjacentGenre: 'Adventure', weight: 0.7 },
  { primaryGenre: 'Thriller', adjacentGenre: 'Horror', weight: 0.75 },

  { primaryGenre: 'Non-Fiction', adjacentGenre: 'Biography', weight: 0.8 },
  { primaryGenre: 'Non-Fiction', adjacentGenre: 'History', weight: 0.75 },
  { primaryGenre: 'Non-Fiction', adjacentGenre: 'Health', weight: 0.7 },
  { primaryGenre: 'Non-Fiction', adjacentGenre: 'Technology', weight: 0.65 },
  { primaryGenre: 'Non-Fiction', adjacentGenre: 'Travel', weight: 0.6 },

  { primaryGenre: 'Biography', adjacentGenre: 'Non-Fiction', weight: 0.8 },
  { primaryGenre: 'Biography', adjacentGenre: 'History', weight: 0.7 },
  { primaryGenre: 'Biography', adjacentGenre: 'Sports', weight: 0.5 },

  { primaryGenre: 'History', adjacentGenre: 'Non-Fiction', weight: 0.75 },
  { primaryGenre: 'History', adjacentGenre: 'Biography', weight: 0.7 },
  { primaryGenre: 'History', adjacentGenre: 'Travel', weight: 0.55 },

  { primaryGenre: 'Adventure', adjacentGenre: 'Fiction', weight: 0.75 },
  { primaryGenre: 'Adventure', adjacentGenre: 'Fantasy', weight: 0.85 },
  { primaryGenre: 'Adventure', adjacentGenre: 'Travel', weight: 0.65 },
  { primaryGenre: 'Adventure', adjacentGenre: 'Sports', weight: 0.6 },

  { primaryGenre: 'Romance', adjacentGenre: 'Fiction', weight: 0.65 },
  { primaryGenre: 'Romance', adjacentGenre: 'Drama', weight: 0.8 },
  { primaryGenre: 'Drama', adjacentGenre: 'Fiction', weight: 0.8 },
  { primaryGenre: 'Drama', adjacentGenre: 'Romance', weight: 0.8 },

  { primaryGenre: 'Horror', adjacentGenre: 'Thriller', weight: 0.75 },
  { primaryGenre: 'Horror', adjacentGenre: 'Fantasy', weight: 0.5 },

  { primaryGenre: 'Art', adjacentGenre: 'History', weight: 0.6 },
  { primaryGenre: 'Art', adjacentGenre: 'Biography', weight: 0.55 },
  { primaryGenre: 'Music', adjacentGenre: 'Art', weight: 0.7 },
  { primaryGenre: 'Music', adjacentGenre: 'Biography', weight: 0.6 },
  { primaryGenre: 'Poetry', adjacentGenre: 'Art', weight: 0.65 },

  { primaryGenre: 'Health', adjacentGenre: 'Non-Fiction', weight: 0.7 },
  { primaryGenre: 'Health', adjacentGenre: 'Biography', weight: 0.5 },
  { primaryGenre: 'Technology', adjacentGenre: 'Non-Fiction', weight: 0.65 },
  { primaryGenre: 'Technology', adjacentGenre: 'Science Fiction', weight: 0.8 },

  { primaryGenre: 'Sports', adjacentGenre: 'Biography', weight: 0.5 },
  { primaryGenre: 'Sports', adjacentGenre: 'Adventure', weight: 0.6 },
  { primaryGenre: 'Sports', adjacentGenre: 'Health', weight: 0.55 },

  { primaryGenre: 'Travel', adjacentGenre: 'Non-Fiction', weight: 0.6 },
  { primaryGenre: 'Travel', adjacentGenre: 'Adventure', weight: 0.65 },
  { primaryGenre: 'Travel', adjacentGenre: 'History', weight: 0.55 },

  { primaryGenre: 'Comedy', adjacentGenre: 'Fiction', weight: 0.6 },
  { primaryGenre: 'Comedy', adjacentGenre: 'Drama', weight: 0.5 },
];

// Enhanced genre list for article generation
const GENRES = [
  'Fiction', 'Non-Fiction', 'Fantasy', 'Science Fiction', 'Mystery', 'Adventure',
  'Biography', 'History', 'Romance', 'Thriller', 'Horror', 'Drama', 'Comedy',
  'Travel', 'Health', 'Technology', 'Sports', 'Art', 'Music', 'Poetry',
];
const SUB_GENRES = ['Short Story', 'Essay', 'Novel Excerpt', 'Article', 'Report'];

function makeUserHandle(base: string, suffix: number): { username: string; displayUsername: string } {
  const display = `${base}-${suffix}`;
  return { username: display.toLowerCase(), displayUsername: display };
}

async function seedRACEFRMappings() {
  console.log('🗺️  Seeding RA to CEFR mappings...');

  for (const mapping of RA_CEFR_MAPPINGS) {
    await db
      .insert(raCefrMappings)
      .values(mapping)
      .onConflictDoUpdate({
        target: raCefrMappings.raLevel,
        set: { cefrLevel: mapping.cefrLevel },
      });
  }

  console.log(`✅ Created ${RA_CEFR_MAPPINGS.length} RA-CEFR mappings`);
}

async function seedGenreAdjacencies() {
  console.log('🎭 Seeding genre adjacencies...');

  for (const adjacency of GENRE_ADJACENCIES) {
    await db
      .insert(genreAdjacencies)
      .values(adjacency)
      .onConflictDoUpdate({
        target: [genreAdjacencies.primaryGenre, genreAdjacencies.adjacentGenre],
        set: { weight: adjacency.weight },
      });
  }

  console.log(`✅ Created ${GENRE_ADJACENCIES.length} genre adjacencies`);
}

async function seedSchools(size: DatasetSize): Promise<SchoolRow[]> {
  const config = DATASET_CONFIG[size];
  console.log(`🏫 Seeding ${config.schools} schools for ${size} dataset...`);

  const created: SchoolRow[] = [];
  const provinces = ['Bangkok', 'Chiang Mai', 'Phuket', 'Khon Kaen', 'Nakhon Ratchasima'];

  for (let i = 1; i <= config.schools; i++) {
    const [school] = await db
      .insert(schools)
      .values({
        name: `School ${i} - ${size.toUpperCase()}`,
        district: `District ${(i % 5) + 1}`,
        province: provinces[i % provinces.length],
        country: 'Thailand',
      })
      .returning();
    created.push(school);
  }

  console.log(`✅ Created ${created.length} schools`);
  return created;
}

async function seedLicenses(schoolsList: SchoolRow[], size: DatasetSize): Promise<LicenseRow[]> {
  console.log('📜 Seeding licenses...');

  const created: LicenseRow[] = [];
  const licenseTypes: LicenseType[] = ['BASIC', 'PREMIUM', 'ENTERPRISE'];

  for (const school of schoolsList) {
    const licenseType = licenseTypes[Math.floor(Math.random() * licenseTypes.length)];
    const maxUsers = size === 'small' ? 50 : size === 'medium' ? 500 : 5000;

    const [license] = await db
      .insert(licenses)
      .values({
        key: `LIC-${school.name.replace(/\s+/g, '-').toUpperCase()}-${Date.now()}`,
        schoolName: school.name,
        schoolId: school.id,
        licenseType,
        maxUsers,
        usedLicenses: 0,
        featureFlags: DEFAULT_FEATURE_FLAGS[licenseType],
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      })
      .returning();
    created.push(license);
  }

  console.log(`✅ Created ${created.length} licenses`);
  return created;
}

async function seedUsers(
  schoolsList: SchoolRow[],
  licensesList: LicenseRow[],
  size: DatasetSize
): Promise<UserRow[]> {
  const config = DATASET_CONFIG[size];
  console.log(`👥 Seeding ${config.users} users...`);

  const created: UserRow[] = [];
  const cefrLevels = ['A1-', 'A1', 'A1+', 'A2-', 'A2', 'A2+', 'B1-', 'B1', 'B1+', 'B2-', 'B2'];

  // Create admin user
  const adminHandle = makeUserHandle(`admin-${size}`, 0);
  const [admin] = await db
    .insert(users)
    .values({
      id: randomUUID(),
      username: adminHandle.username,
      displayUsername: adminHandle.displayUsername,
      email: `admin-${size}@example.com`,
      name: `Admin ${size.toUpperCase()}`,
      role: Role.ADMIN,
      xp: 0,
      level: 1,
    })
    .returning();
  created.push(admin);

  // Create teachers (1 per school)
  for (let i = 0; i < schoolsList.length; i++) {
    const handle = makeUserHandle(`teacher${i + 1}-${size}`, i);
    const [teacher] = await db
      .insert(users)
      .values({
        id: randomUUID(),
        username: handle.username,
        displayUsername: handle.displayUsername,
        email: `teacher${i + 1}-${size}@example.com`,
        name: `Teacher ${i + 1}`,
        role: Role.TEACHER,
        schoolId: schoolsList[i].id,
        xp: 0,
        level: 1,
      })
      .returning();
    created.push(teacher);

    // Associate teacher with license
    await db.insert(licenseOnUsers).values({
      userId: teacher.id,
      licenseId: licensesList[i].id,
    });
  }

  // Create students
  const studentsNeeded = config.users - created.length;
  for (let i = 0; i < studentsNeeded; i++) {
    const school = schoolsList[i % schoolsList.length];
    const license = licensesList[i % licensesList.length];

    const handle = makeUserHandle(`student${i + 1}-${size}`, i);
    const [student] = await db
      .insert(users)
      .values({
        id: randomUUID(),
        username: handle.username,
        displayUsername: handle.displayUsername,
        email: `student${i + 1}-${size}@example.com`,
        name: `Student ${i + 1}`,
        role: Role.STUDENT,
        schoolId: school.id,
        xp: Math.floor(Math.random() * 5000),
        level: Math.floor(Math.random() * 10) + 1,
        cefrLevel: cefrLevels[Math.floor(Math.random() * cefrLevels.length)],
      })
      .returning();
    created.push(student);

    // Associate student with license
    await db.insert(licenseOnUsers).values({
      userId: student.id,
      licenseId: license.id,
    });
  }

  console.log(`✅ Created ${created.length} users`);
  return created;
}

async function seedClassrooms(
  schoolsList: SchoolRow[],
  usersList: UserRow[],
  size: DatasetSize
): Promise<ClassroomRow[]> {
  const config = DATASET_CONFIG[size];
  console.log(`🎓 Seeding classrooms...`);

  const created: ClassroomRow[] = [];
  const teachers = usersList.filter((u) => u.role === Role.TEACHER);
  const students = usersList.filter((u) => u.role === Role.STUDENT);

  let studentIndex = 0;

  for (const school of schoolsList) {
    const schoolTeachers = teachers.filter((t) => t.schoolId === school.id);

    for (let i = 0; i < config.classroomsPerSchool; i++) {
      const teacher = schoolTeachers[i % schoolTeachers.length] || teachers[0];

      const [classroom] = await db
        .insert(classrooms)
        .values({
          name: `Class ${i + 1} - ${school.name}`,
          teacherId: teacher.id,
          schoolId: school.id,
          createdBy: teacher.id,
          grade: Math.floor(Math.random() * 6) + 7, // Grade 7-12
          classCode: `CLASS-${school.id.substring(0, 4)}-${i}-${Date.now()}`,
        })
        .returning();
      created.push(classroom);

      // Add students to classroom
      for (let j = 0; j < config.studentsPerClass && studentIndex < students.length; j++, studentIndex++) {
        await db.insert(classroomStudents).values({
          classroomId: classroom.id,
          studentId: students[studentIndex].id,
        });
      }
    }
  }

  console.log(`✅ Created ${created.length} classrooms`);
  return created;
}

async function seedArticlesAndActivities(
  usersList: UserRow[],
  classroomsList: ClassroomRow[],
  size: DatasetSize
) {
  console.log('📚 Seeding articles and activities...');

  const students = usersList.filter((u) => u.role === Role.STUDENT);
  const articlesPerUser = size === 'small' ? 5 : size === 'medium' ? 10 : 20;

  let totalArticles = 0;
  let totalXPLogs = 0;
  let totalAssignments = 0;

  // Create sample articles
  for (let i = 0; i < Math.min(50, articlesPerUser * 5); i++) {
    const raLevel = Math.floor(Math.random() * 18) + 1;
    const cefrMapping = RA_CEFR_MAPPINGS.find((m) => m.raLevel === raLevel);

    await db.insert(articles).values({
      title: `Article ${i + 1}: ${GENRES[i % GENRES.length]} Sample`,
      content: `Lorem ipsum dolor sit amet, consectetur adipiscing elit. This is test content for article ${i + 1}.`,
      summary: `This is a sample article for testing purposes.`,
      passage: `Lorem ipsum dolor sit amet, consectetur adipiscing elit. This is test content for article ${i + 1}.`,
      genre: GENRES[i % GENRES.length],
      subGenre: SUB_GENRES[i % SUB_GENRES.length],
      raLevel,
      cefrLevel: cefrMapping?.cefrLevel || 'A2',
      rating: Math.random() * 5,
      isPublic: true,
    });
    totalArticles++;
  }

  const articleList = await db.select().from(articles).limit(50);

  // Create XP logs for students
  for (const student of students.slice(0, Math.min(students.length, size === 'small' ? 20 : 100))) {
    const logsCount = Math.floor(Math.random() * 20) + 10;

    for (let i = 0; i < logsCount; i++) {
      const daysAgo = Math.floor(Math.random() * 30);
      const article = articleList[Math.floor(Math.random() * articleList.length)];

      await db.insert(xpLogs).values({
        userId: student.id,
        xpEarned: Math.floor(Math.random() * 50) + 10,
        activityType: ActivityType.ARTICLE_READ,
        activityId: String(article.id),
        createdAt: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
      });
      totalXPLogs++;
    }
  }

  // Create assignments for classrooms
  for (const classroom of classroomsList.slice(0, Math.min(classroomsList.length, 20))) {
    for (let i = 0; i < 3; i++) {
      const article = articleList[Math.floor(Math.random() * articleList.length)];
      const daysUntilDue = Math.floor(Math.random() * 14) + 1;

      const [assignment] = await db
        .insert(assignments)
        .values({
          classroomId: classroom.id,
          articleId: article.id,
          title: `Assignment ${i + 1} for ${classroom.name}`,
          description: `Read and complete the article`,
          dueDate: new Date(Date.now() + daysUntilDue * 24 * 60 * 60 * 1000),
        })
        .returning();
      totalAssignments++;

      // Create student assignments
      const csList = await db
        .select()
        .from(classroomStudents)
        .where(eq(classroomStudents.classroomId, classroom.id));

      for (const cs of csList) {
        const statuses: Status[] = [
          Status.NOT_STARTED,
          Status.IN_PROGRESS,
          Status.COMPLETED,
        ];
        const status = statuses[Math.floor(Math.random() * statuses.length)];

        await db.insert(studentAssignments).values({
          assignmentId: assignment.id,
          studentId: cs.studentId,
          status,
          score: status === Status.COMPLETED ? Math.floor(Math.random() * 100) : null,
          startedAt:
            status !== Status.NOT_STARTED
              ? new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000)
              : null,
          completedAt: status === Status.COMPLETED ? new Date() : null,
        });
      }
    }
  }

  console.log(`✅ Created ${totalArticles} articles, ${totalXPLogs} XP logs, ${totalAssignments} assignments`);
}

async function seedUserRecords(usersList: UserRow[], size: DatasetSize) {
  console.log('💾 Seeding SRS user records...');

  const students = usersList.filter((u) => u.role === Role.STUDENT);
  const articleList = await db.select().from(articles).limit(20);

  let totalWordRecords = 0;
  let totalSentenceRecords = 0;

  for (const student of students.slice(0, Math.min(students.length, size === 'small' ? 10 : 50))) {
    for (let i = 0; i < 5; i++) {
      const article = articleList[Math.floor(Math.random() * articleList.length)];

      // Word records
      await db.insert(userWordRecords).values({
        userId: student.id,
        articleId: article.id,
        word: { text: `word${i}`, definition: 'Sample definition' },
        saveToFlashcard: true,
        difficulty: Math.random() * 10,
        stability: Math.random() * 100,
        reps: Math.floor(Math.random() * 10),
        state: Math.floor(Math.random() * 3),
      });
      totalWordRecords++;

      // Sentence records
      await db.insert(userSentenceRecords).values({
        userId: student.id,
        articleId: article.id,
        sentence: `This is sample sentence ${i} for testing.`,
        translation: { th: `ประโยคตัวอย่าง ${i}` },
        sn: i,
        timepoint: i * 1.5,
        endTimepoint: (i + 1) * 1.5,
        saveToFlashcard: true,
        difficulty: Math.random() * 10,
        stability: Math.random() * 100,
        reps: Math.floor(Math.random() * 10),
        state: Math.floor(Math.random() * 3),
      });
      totalSentenceRecords++;
    }
  }

  console.log(`✅ Created ${totalWordRecords} word records, ${totalSentenceRecords} sentence records`);
}

async function main() {
  const size: DatasetSize = (process.env.SEED_SIZE as DatasetSize) || 'small';

  console.log(`\n🌱 Starting seed process for ${size.toUpperCase()} dataset...\n`);

  try {
    // Seed lookup tables (always run these)
    await seedRACEFRMappings();
    await seedGenreAdjacencies();

    // Seed main data
    const schoolsList = await seedSchools(size);
    const licensesList = await seedLicenses(schoolsList, size);
    const usersList = await seedUsers(schoolsList, licensesList, size);
    const classroomsList = await seedClassrooms(schoolsList, usersList, size);
    await seedArticlesAndActivities(usersList, classroomsList, size);
    await seedUserRecords(usersList, size);

    console.log(`\n✅ Seed completed successfully for ${size.toUpperCase()} dataset!\n`);
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
