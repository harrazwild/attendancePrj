import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import * as schema from '../db/schema.js';

export function registerStudentRoutes(app: App) {
  const requireAuth = app.requireAuth();

  /**
   * GET /api/student/qr
   * Returns QR code data for student attendance scanning
   * QR data contains: { studentId, name, timestamp }
   * Timestamp is current time for time-based validation (30 second window)
   */
  app.fastify.get('/api/student/qr', async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<{ studentId: string; name: string; timestamp: string; qrData: string } | void> => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const userId = session.user.id;
    const userName = session.user.name;

    app.logger.info({ userId }, 'Fetching QR code for student');

    try {
      // Verify user is a student
      if (session.user.role !== 'student') {
        app.logger.warn({ userId, role: session.user.role }, 'Non-student user attempted to access student QR endpoint');
        return reply.status(403).send({ error: 'Access denied. Only students can access this endpoint.' });
      }

      const timestamp = new Date().toISOString();

      // Create QR data JSON
      const qrDataObject = {
        studentId: userId,
        name: userName,
        timestamp,
      };

      const qrData = JSON.stringify(qrDataObject);

      app.logger.info({ userId, timestamp }, 'QR code generated successfully');

      return {
        studentId: userId,
        name: userName,
        timestamp,
        qrData,
      };
    } catch (error) {
      app.logger.error({ err: error, userId }, 'Failed to generate QR code');
      throw error;
    }
  });
}
