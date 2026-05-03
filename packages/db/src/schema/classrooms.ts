import { pgTable, uuid, text, timestamp, boolean, unique } from "drizzle-orm/pg-core";
import { users, schools } from "./users";

// ─── Classrooms ───────────────────────────────────────────

export const classrooms = pgTable("classrooms", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  schoolId: uuid("school_id").references(() => schools.id),
  teacherId: text("teacher_id")
    .notNull()
    .references(() => users.id),
  archived: boolean("archived").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const classroomStudents = pgTable("classroom_students", {
  id: uuid("id").primaryKey().defaultRandom(),
  classroomId: uuid("classroom_id")
    .notNull()
    .references(() => classrooms.id, { onDelete: "cascade" }),
  studentId: text("student_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
}, (table) => [
  unique("classroom_students_unique").on(table.classroomId, table.studentId),
]);

export const classroomTeachers = pgTable("classroom_teachers", {
  id: uuid("id").primaryKey().defaultRandom(),
  classroomId: uuid("classroom_id")
    .notNull()
    .references(() => classrooms.id, { onDelete: "cascade" }),
  teacherId: text("teacher_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  role: text("role").default("member").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
