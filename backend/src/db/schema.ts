import {
  pgTable,
  text,
  timestamp,
  date,
  time,
  integer,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { user as authUser } from './auth-schema.js';
import { relations } from 'drizzle-orm';

/**
 * Courses table
 * Stores course information with lecturer assignment
 */
export const courses = pgTable(
  'courses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    code: text('code').notNull(),
    lecturerId: text('lecturer_id').notNull().references(() => authUser.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('courses_code_idx').on(table.code),
  ]
);

/**
 * Attendance sessions table
 * Stores attendance sessions for each course
 * Status: 'active' (ongoing) or 'completed' (finished)
 */
export const attendanceSessions = pgTable(
  'attendance_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    courseId: uuid('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
    lecturerId: text('lecturer_id').notNull().references(() => authUser.id, { onDelete: 'cascade' }),
    week: integer('week').notNull(),
    date: date('date', { mode: 'string' }).notNull(),
    time: time('time').notNull(),
    status: text('status', { enum: ['active', 'completed'] }).notNull().default('active'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('attendance_sessions_unique_idx').on(table.courseId, table.week, table.date),
  ]
);

/**
 * Attendance records table
 * Stores individual student attendance for each session
 * Status: 'present' (scanned) or 'absent' (not scanned)
 */
export const attendanceRecords = pgTable(
  'attendance_records',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id').notNull().references(() => attendanceSessions.id, { onDelete: 'cascade' }),
    studentId: text('student_id').notNull().references(() => authUser.id, { onDelete: 'cascade' }),
    status: text('status', { enum: ['present', 'absent'] }).notNull(),
    scanTime: timestamp('scan_time'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('attendance_records_unique_idx').on(table.sessionId, table.studentId),
  ]
);

/**
 * Relations for better query APIs
 */
export const coursesRelations = relations(courses, ({ one, many }) => ({
  lecturer: one(authUser, {
    fields: [courses.lecturerId],
    references: [authUser.id],
  }),
  sessions: many(attendanceSessions),
}));

export const attendanceSessionsRelations = relations(attendanceSessions, ({ one, many }) => ({
  course: one(courses, {
    fields: [attendanceSessions.courseId],
    references: [courses.id],
  }),
  lecturer: one(authUser, {
    fields: [attendanceSessions.lecturerId],
    references: [authUser.id],
  }),
  records: many(attendanceRecords),
}));

export const attendanceRecordsRelations = relations(attendanceRecords, ({ one }) => ({
  session: one(attendanceSessions, {
    fields: [attendanceRecords.sessionId],
    references: [attendanceSessions.id],
  }),
  student: one(authUser, {
    fields: [attendanceRecords.studentId],
    references: [authUser.id],
  }),
}));
