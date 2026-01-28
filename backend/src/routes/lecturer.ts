import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, count, inArray, isNull } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import * as authSchema from '../db/auth-schema.js';

export function registerLecturerRoutes(app: App) {
  const requireAuth = app.requireAuth();

  /**
   * GET /api/lecturer/dashboard
   * Returns dashboard summary: ongoing sessions, today's scans, lecturer name
   */
  app.fastify.get('/api/lecturer/dashboard', async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<{ ongoingSessions: number; todayScans: number; lecturerName: string } | void> => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const lecturerId = session.user.id;
    const lecturerName = session.user.name;

    app.logger.info({ lecturerId }, 'Fetching lecturer dashboard');

    try {
      // Verify user is a lecturer
      if (session.user.role !== 'lecturer') {
        app.logger.warn({ lecturerId, role: session.user.role }, 'Non-lecturer user attempted to access lecturer dashboard');
        return reply.status(403).send({ error: 'Access denied. Only lecturers can access this endpoint.' });
      }

      // Get ongoing sessions count
      const ongoingSessionsResult = await app.db
        .select({ count: count() })
        .from(schema.attendanceSessions)
        .where(
          and(
            eq(schema.attendanceSessions.lecturerId, lecturerId),
            eq(schema.attendanceSessions.status, 'active')
          )
        );

      const ongoingSessions = ongoingSessionsResult[0]?.count || 0;

      // Get today's scans count
      const today = new Date().toISOString().split('T')[0];
      const todayScansResult = await app.db
        .select({ count: count() })
        .from(schema.attendanceRecords)
        .innerJoin(
          schema.attendanceSessions,
          eq(schema.attendanceRecords.sessionId, schema.attendanceSessions.id)
        )
        .where(
          and(
            eq(schema.attendanceSessions.lecturerId, lecturerId),
            eq(schema.attendanceSessions.date, today),
            eq(schema.attendanceRecords.status, 'present')
          )
        );

      const todayScans = todayScansResult[0]?.count || 0;

      app.logger.info(
        { lecturerId, ongoingSessions, todayScans },
        'Dashboard data retrieved successfully'
      );

      return {
        ongoingSessions,
        todayScans,
        lecturerName,
      };
    } catch (error) {
      app.logger.error({ err: error, lecturerId }, 'Failed to fetch dashboard');
      throw error;
    }
  });

  /**
   * GET /api/lecturer/courses
   * Returns all courses taught by the lecturer
   */
  app.fastify.get('/api/lecturer/courses', async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<Array<{ id: string; name: string; code: string }> | void> => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const lecturerId = session.user.id;

    app.logger.info({ lecturerId }, 'Fetching lecturer courses');

    try {
      // Verify user is a lecturer
      if (session.user.role !== 'lecturer') {
        app.logger.warn({ lecturerId, role: session.user.role }, 'Non-lecturer user attempted to access courses');
        return reply.status(403).send({ error: 'Access denied. Only lecturers can access this endpoint.' });
      }

      const courses = await app.db.query.courses.findMany({
        where: eq(schema.courses.lecturerId, lecturerId),
        columns: {
          id: true,
          name: true,
          code: true,
        },
      });

      app.logger.info({ lecturerId, courseCount: courses.length }, 'Courses retrieved successfully');

      return courses;
    } catch (error) {
      app.logger.error({ err: error, lecturerId }, 'Failed to fetch courses');
      throw error;
    }
  });

  /**
   * POST /api/lecturer/courses
   * Creates a new course with the authenticated lecturer as the owner
   */
  app.fastify.post(
    '/api/lecturer/courses',
    async (
      request: FastifyRequest<{
        Body: { name: string; code: string };
      }>,
      reply: FastifyReply
    ): Promise<{ id: string; name: string; code: string; lecturerId: string } | void> => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const lecturerId = session.user.id;
      const { name, code } = request.body;

      app.logger.info({ lecturerId, name, code }, 'Creating new course');

      try {
        // Verify user is a lecturer
        if (session.user.role !== 'lecturer') {
          app.logger.warn({ lecturerId, role: session.user.role }, 'Non-lecturer user attempted to create course');
          return reply.status(403).send({ error: 'Access denied. Only lecturers can create courses.' });
        }

        // Validate input
        if (!name || !code) {
          return reply.status(400).send({ error: 'Name and code are required.' });
        }

        const [createdCourse] = await app.db
          .insert(schema.courses)
          .values({
            name,
            code,
            lecturerId,
          })
          .returning();

        app.logger.info(
          { lecturerId, courseId: createdCourse.id, name, code },
          'Course created successfully'
        );

        return {
          id: createdCourse.id,
          name: createdCourse.name,
          code: createdCourse.code,
          lecturerId: createdCourse.lecturerId,
        };
      } catch (error) {
        app.logger.error({ err: error, lecturerId, name, code }, 'Failed to create course');
        throw error;
      }
    }
  );

  /**
   * POST /api/lecturer/sessions
   * Creates a new attendance session for a course
   * Only the course lecturer can create sessions
   */
  app.fastify.post(
    '/api/lecturer/sessions',
    async (
      request: FastifyRequest<{
        Body: { courseId: string; week: number; date: string; time: string };
      }>,
      reply: FastifyReply
    ): Promise<{
      id: string;
      courseId: string;
      lecturerId: string;
      week: number;
      date: string;
      time: string;
      status: string;
    } | void> => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const lecturerId = session.user.id;
      const { courseId, week, date, time } = request.body;

      app.logger.info({ lecturerId, courseId, week, date, time }, 'Creating attendance session');

      try {
        // Verify user is a lecturer
        if (session.user.role !== 'lecturer') {
          app.logger.warn({ lecturerId, role: session.user.role }, 'Non-lecturer user attempted to create session');
          return reply.status(403).send({ error: 'Access denied. Only lecturers can create sessions.' });
        }

        // Validate input
        if (!courseId || !week || !date || !time) {
          return reply.status(400).send({ error: 'courseId, week, date, and time are required.' });
        }

        // Verify lecturer owns the course
        const course = await app.db.query.courses.findFirst({
          where: eq(schema.courses.id, courseId),
        });

        if (!course) {
          app.logger.warn({ lecturerId, courseId }, 'Course not found');
          return reply.status(404).send({ error: 'Course not found.' });
        }

        if (course.lecturerId !== lecturerId) {
          app.logger.warn(
            { lecturerId, courseId, courseOwnerId: course.lecturerId },
            'Lecturer attempted to create session for course they do not own'
          );
          return reply.status(403).send({ error: 'Access denied. You can only create sessions for your courses.' });
        }

        const [createdSession] = await app.db
          .insert(schema.attendanceSessions)
          .values({
            courseId,
            lecturerId,
            week,
            date,
            time,
            status: 'active',
          })
          .returning();

        app.logger.info(
          { lecturerId, sessionId: createdSession.id, courseId, week },
          'Attendance session created successfully'
        );

        return {
          id: createdSession.id,
          courseId: createdSession.courseId,
          lecturerId: createdSession.lecturerId,
          week: createdSession.week,
          date: createdSession.date,
          time: createdSession.time,
          status: createdSession.status,
        };
      } catch (error) {
        app.logger.error({ err: error, lecturerId, courseId }, 'Failed to create attendance session');
        throw error;
      }
    }
  );

  /**
   * GET /api/lecturer/sessions/:id
   * Returns session details with student list
   */
  app.fastify.get(
    '/api/lecturer/sessions/:id',
    async (
      request: FastifyRequest<{
        Params: { id: string };
      }>,
      reply: FastifyReply
    ): Promise<{
      id: string;
      courseId: string;
      lecturerId: string;
      week: number;
      date: string;
      time: string;
      status: string;
      students: Array<{ id: string; name: string; status: string }>;
    } | void> => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const lecturerId = session.user.id;
      const { id: sessionId } = request.params;

      app.logger.info({ lecturerId, sessionId }, 'Fetching session details');

      try {
        // Verify user is a lecturer
        if (session.user.role !== 'lecturer') {
          app.logger.warn({ lecturerId, role: session.user.role }, 'Non-lecturer user attempted to access session details');
          return reply.status(403).send({ error: 'Access denied. Only lecturers can access this endpoint.' });
        }

        // Get session with verification that lecturer owns it
        const attendanceSession = await app.db.query.attendanceSessions.findFirst({
          where: eq(schema.attendanceSessions.id, sessionId),
          with: {
            records: {
              with: {
                student: {
                  columns: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        });

        if (!attendanceSession) {
          app.logger.warn({ lecturerId, sessionId }, 'Session not found');
          return reply.status(404).send({ error: 'Session not found.' });
        }

        if (attendanceSession.lecturerId !== lecturerId) {
          app.logger.warn(
            { lecturerId, sessionId, sessionOwnerId: attendanceSession.lecturerId },
            'Lecturer attempted to access session they do not own'
          );
          return reply.status(403).send({ error: 'Access denied. You can only view your own sessions.' });
        }

        const students = attendanceSession.records.map((record) => ({
          id: record.student.id,
          name: record.student.name,
          status: record.status,
        }));

        app.logger.info(
          { lecturerId, sessionId, studentCount: students.length },
          'Session details retrieved successfully'
        );

        return {
          id: attendanceSession.id,
          courseId: attendanceSession.courseId,
          lecturerId: attendanceSession.lecturerId,
          week: attendanceSession.week,
          date: attendanceSession.date,
          time: attendanceSession.time,
          status: attendanceSession.status,
          students,
        };
      } catch (error) {
        app.logger.error({ err: error, lecturerId, sessionId }, 'Failed to fetch session details');
        throw error;
      }
    }
  );

  /**
   * POST /api/lecturer/sessions/:id/scan
   * Validates QR code and records attendance
   * Validates timestamp is within last 30 seconds
   * Prevents duplicate scans per student per session
   */
  app.fastify.post(
    '/api/lecturer/sessions/:id/scan',
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: { qrData: string };
      }>,
      reply: FastifyReply
    ): Promise<{ success: boolean; studentName: string } | void> => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const lecturerId = session.user.id;
      const { id: sessionId } = request.params;
      const { qrData } = request.body;

      app.logger.info({ lecturerId, sessionId }, 'Scanning QR code for attendance');

      try {
        // Verify user is a lecturer
        if (session.user.role !== 'lecturer') {
          app.logger.warn({ lecturerId, role: session.user.role }, 'Non-lecturer user attempted to scan QR code');
          return reply.status(403).send({ error: 'Access denied. Only lecturers can scan QR codes.' });
        }

        // Validate input
        if (!qrData) {
          return reply.status(400).send({ error: 'qrData is required.' });
        }

        // Parse QR data
        let qrDataObject: { studentId: string; name: string; timestamp: string };
        try {
          qrDataObject = JSON.parse(qrData);
        } catch (error) {
          app.logger.warn({ lecturerId, sessionId }, 'Invalid QR data format');
          return reply.status(400).send({ error: 'Invalid QR data format.' });
        }

        const { studentId, name: studentName, timestamp: qrTimestamp } = qrDataObject;

        // Validate timestamp is within 30 seconds
        const qrTime = new Date(qrTimestamp).getTime();
        const currentTime = new Date().getTime();
        const timeDifference = (currentTime - qrTime) / 1000; // in seconds

        if (timeDifference < 0 || timeDifference > 30) {
          app.logger.warn(
            { lecturerId, sessionId, studentId, timeDifference },
            'QR code timestamp outside valid window'
          );
          return reply.status(400).send({ error: 'QR code is invalid or expired. Must be scanned within 30 seconds.' });
        }

        // Verify session exists and lecturer owns it
        const attendanceSession = await app.db.query.attendanceSessions.findFirst({
          where: eq(schema.attendanceSessions.id, sessionId),
        });

        if (!attendanceSession) {
          app.logger.warn({ lecturerId, sessionId }, 'Session not found');
          return reply.status(404).send({ error: 'Session not found.' });
        }

        if (attendanceSession.lecturerId !== lecturerId) {
          app.logger.warn(
            { lecturerId, sessionId, sessionOwnerId: attendanceSession.lecturerId },
            'Lecturer attempted to scan for session they do not own'
          );
          return reply.status(403).send({ error: 'Access denied. You can only scan for your own sessions.' });
        }

        // Verify session is active
        if (attendanceSession.status !== 'active') {
          app.logger.warn({ lecturerId, sessionId, status: attendanceSession.status }, 'Attempted to scan for inactive session');
          return reply.status(400).send({ error: 'Session is not active.' });
        }

        // Check if student exists
        const student = await app.db.query.user.findFirst({
          where: eq(authSchema.user.id, studentId),
        });

        if (!student) {
          app.logger.warn({ lecturerId, sessionId, studentId }, 'Student not found');
          return reply.status(404).send({ error: 'Student not found.' });
        }

        // Check if student already has attendance record for this session
        const existingRecord = await app.db.query.attendanceRecords.findFirst({
          where: and(
            eq(schema.attendanceRecords.sessionId, sessionId),
            eq(schema.attendanceRecords.studentId, studentId)
          ),
        });

        if (existingRecord) {
          app.logger.warn(
            { lecturerId, sessionId, studentId },
            'Student already has attendance record for this session'
          );
          return reply.status(400).send({ error: 'Student already scanned for this session.' });
        }

        // Create attendance record
        const [createdRecord] = await app.db
          .insert(schema.attendanceRecords)
          .values({
            sessionId,
            studentId,
            status: 'present',
            scanTime: new Date(),
          })
          .returning();

        app.logger.info(
          { lecturerId, sessionId, studentId, recordId: createdRecord.id },
          'Attendance recorded successfully'
        );

        return {
          success: true,
          studentName: student.name,
        };
      } catch (error) {
        app.logger.error({ err: error, lecturerId, sessionId }, 'Failed to scan QR code');
        throw error;
      }
    }
  );

  /**
   * PUT /api/lecturer/sessions/:id/complete
   * Marks session as completed
   * Creates attendance records with status='absent' for students who weren't scanned
   * Only the lecturer who owns the session can complete it
   */
  app.fastify.put(
    '/api/lecturer/sessions/:id/complete',
    async (
      request: FastifyRequest<{
        Params: { id: string };
      }>,
      reply: FastifyReply
    ): Promise<{ success: boolean; absentCount: number } | void> => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const lecturerId = session.user.id;
      const { id: sessionId } = request.params;

      app.logger.info({ lecturerId, sessionId }, 'Completing attendance session');

      try {
        // Verify user is a lecturer
        if (session.user.role !== 'lecturer') {
          app.logger.warn({ lecturerId, role: session.user.role }, 'Non-lecturer user attempted to complete session');
          return reply.status(403).send({ error: 'Access denied. Only lecturers can complete sessions.' });
        }

        // Get session with verification that lecturer owns it
        const attendanceSession = await app.db.query.attendanceSessions.findFirst({
          where: eq(schema.attendanceSessions.id, sessionId),
          with: {
            course: true,
            records: {
              columns: {
                studentId: true,
              },
            },
          },
        });

        if (!attendanceSession) {
          app.logger.warn({ lecturerId, sessionId }, 'Session not found');
          return reply.status(404).send({ error: 'Session not found.' });
        }

        if (attendanceSession.lecturerId !== lecturerId) {
          app.logger.warn(
            { lecturerId, sessionId, sessionOwnerId: attendanceSession.lecturerId },
            'Lecturer attempted to complete session they do not own'
          );
          return reply.status(403).send({ error: 'Access denied. You can only complete your own sessions.' });
        }

        // Get all students in the course
        const courseStudents = await app.db
          .selectDistinct()
          .from(authSchema.user)
          .innerJoin(
            schema.attendanceRecords,
            eq(authSchema.user.id, schema.attendanceRecords.studentId)
          )
          .innerJoin(
            schema.attendanceSessions,
            eq(schema.attendanceRecords.sessionId, schema.attendanceSessions.id)
          )
          .where(
            and(
              eq(schema.attendanceSessions.courseId, attendanceSession.courseId),
              eq(authSchema.user.role, 'student')
            )
          );

        // Also get students who have never attended this course
        const allStudents = await app.db.query.user.findMany({
          where: eq(authSchema.user.role, 'student'),
        });

        // Get already scanned student IDs
        const scannedStudentIds = new Set(attendanceSession.records.map((r) => r.studentId));

        // Find students who weren't scanned
        const unscannedStudents = allStudents.filter((student) => !scannedStudentIds.has(student.id));

        // Create absent records for unscanned students
        if (unscannedStudents.length > 0) {
          await app.db.insert(schema.attendanceRecords).values(
            unscannedStudents.map((student) => ({
              sessionId,
              studentId: student.id,
              status: 'absent' as const,
              scanTime: null,
            }))
          );
        }

        // Update session status to completed
        await app.db
          .update(schema.attendanceSessions)
          .set({ status: 'completed' })
          .where(eq(schema.attendanceSessions.id, sessionId));

        app.logger.info(
          { lecturerId, sessionId, absentCount: unscannedStudents.length },
          'Attendance session completed successfully'
        );

        return {
          success: true,
          absentCount: unscannedStudents.length,
        };
      } catch (error) {
        app.logger.error({ err: error, lecturerId, sessionId }, 'Failed to complete session');
        throw error;
      }
    }
  );

  /**
   * GET /api/lecturer/statistics
   * Returns attendance statistics
   * Query params: courseId (optional), week (optional)
   */
  app.fastify.get(
    '/api/lecturer/statistics',
    async (
      request: FastifyRequest<{
        Querystring: { courseId?: string; week?: string };
      }>,
      reply: FastifyReply
    ): Promise<{
      totalStudents: number;
      presentCount: number;
      absentCount: number;
      percentage: number;
      presentList: Array<{ studentId: string; name: string }>;
      absentList: Array<{ studentId: string; name: string }>;
    } | void> => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const lecturerId = session.user.id;
      const { courseId, week } = request.query;

      app.logger.info({ lecturerId, courseId, week }, 'Fetching attendance statistics');

      try {
        // Verify user is a lecturer
        if (session.user.role !== 'lecturer') {
          app.logger.warn({ lecturerId, role: session.user.role }, 'Non-lecturer user attempted to access statistics');
          return reply.status(403).send({ error: 'Access denied. Only lecturers can access this endpoint.' });
        }

        // Build conditions
        const conditions = [eq(schema.attendanceSessions.lecturerId, lecturerId)];
        if (courseId) {
          conditions.push(eq(schema.attendanceSessions.courseId, courseId));
        }
        if (week) {
          conditions.push(eq(schema.attendanceSessions.week, parseInt(week)));
        }

        // Get all records matching filters
        const records = await app.db
          .select({
            studentId: schema.attendanceRecords.studentId,
            studentName: authSchema.user.name,
            status: schema.attendanceRecords.status,
          })
          .from(schema.attendanceRecords)
          .innerJoin(schema.attendanceSessions, eq(schema.attendanceRecords.sessionId, schema.attendanceSessions.id))
          .innerJoin(authSchema.user, eq(schema.attendanceRecords.studentId, authSchema.user.id))
          .where(and(...conditions));

        const presentList = records
          .filter((r) => r.status === 'present')
          .map((r) => ({ studentId: r.studentId, name: r.studentName }));

        const absentList = records
          .filter((r) => r.status === 'absent')
          .map((r) => ({ studentId: r.studentId, name: r.studentName }));

        const totalStudents = new Set([...presentList, ...absentList].map((s) => s.studentId)).size;
        const presentCount = presentList.length;
        const absentCount = absentList.length;
        const percentage = totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0;

        app.logger.info(
          { lecturerId, totalStudents, presentCount, absentCount, percentage },
          'Statistics calculated successfully'
        );

        return {
          totalStudents,
          presentCount,
          absentCount,
          percentage,
          presentList: Array.from(new Map(presentList.map((p) => [p.studentId, p])).values()),
          absentList: Array.from(new Map(absentList.map((a) => [a.studentId, a])).values()),
        };
      } catch (error) {
        app.logger.error({ err: error, lecturerId }, 'Failed to fetch statistics');
        throw error;
      }
    }
  );

  /**
   * GET /api/lecturer/export
   * Exports attendance data in CSV or XLSX format
   * Query params: courseId (required), weekStart (optional), weekEnd (optional), format (required: 'csv' or 'xlsx')
   */
  app.fastify.get(
    '/api/lecturer/export',
    async (
      request: FastifyRequest<{
        Querystring: { courseId: string; weekStart?: string; weekEnd?: string; format: string };
      }>,
      reply: FastifyReply
    ): Promise<any> => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const lecturerId = session.user.id;
      const { courseId, weekStart, weekEnd, format } = request.query;

      app.logger.info({ lecturerId, courseId, weekStart, weekEnd, format }, 'Exporting attendance data');

      try {
        // Verify user is a lecturer
        if (session.user.role !== 'lecturer') {
          app.logger.warn({ lecturerId, role: session.user.role }, 'Non-lecturer user attempted to export data');
          return reply.status(403).send({ error: 'Access denied. Only lecturers can export data.' });
        }

        // Validate input
        if (!courseId || !format) {
          return reply.status(400).send({ error: 'courseId and format are required.' });
        }

        if (!['csv', 'xlsx'].includes(format)) {
          return reply.status(400).send({ error: 'format must be either "csv" or "xlsx".' });
        }

        // Verify lecturer owns the course
        const course = await app.db.query.courses.findFirst({
          where: eq(schema.courses.id, courseId),
        });

        if (!course) {
          app.logger.warn({ lecturerId, courseId }, 'Course not found');
          return reply.status(404).send({ error: 'Course not found.' });
        }

        if (course.lecturerId !== lecturerId) {
          app.logger.warn(
            { lecturerId, courseId, courseOwnerId: course.lecturerId },
            'Lecturer attempted to export data for course they do not own'
          );
          return reply.status(403).send({ error: 'Access denied. You can only export data for your courses.' });
        }

        // Build conditions
        const conditions = [eq(schema.attendanceSessions.courseId, courseId)];
        if (weekStart) {
          conditions.push(eq(schema.attendanceSessions.week, parseInt(weekStart)));
        }
        if (weekEnd) {
          // For now, filter by week range
          // In a production system, we'd use a more sophisticated range query
        }

        // Get data for export
        const records = await app.db
          .select({
            week: schema.attendanceSessions.week,
            date: schema.attendanceSessions.date,
            time: schema.attendanceSessions.time,
            studentId: authSchema.user.id,
            studentName: authSchema.user.name,
            status: schema.attendanceRecords.status,
          })
          .from(schema.attendanceRecords)
          .innerJoin(schema.attendanceSessions, eq(schema.attendanceRecords.sessionId, schema.attendanceSessions.id))
          .innerJoin(authSchema.user, eq(schema.attendanceRecords.studentId, authSchema.user.id))
          .where(and(...conditions));

        app.logger.info(
          { lecturerId, courseId, recordCount: records.length, format },
          'Export data retrieved successfully'
        );

        // Return structured data
        // Format as CSV or XLSX would typically be handled by a library
        // For now, return JSON that can be converted to CSV/XLSX on the client
        if (format === 'csv') {
          // Create CSV format
          const headers = ['Week', 'Date', 'Time', 'Student ID', 'Student Name', 'Status'];
          const rows = records.map((r) => [
            r.week,
            r.date,
            r.time,
            r.studentId,
            r.studentName,
            r.status,
          ]);

          const csvContent = [
            headers.join(','),
            ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
          ].join('\n');

          reply.header('Content-Type', 'text/csv');
          reply.header('Content-Disposition', `attachment; filename="attendance-${courseId}.csv"`);
          return csvContent;
        } else {
          // Return as JSON for XLSX conversion on client
          return {
            course: {
              id: course.id,
              name: course.name,
              code: course.code,
            },
            records,
          };
        }
      } catch (error) {
        app.logger.error({ err: error, lecturerId, courseId }, 'Failed to export data');
        throw error;
      }
    }
  );
}
