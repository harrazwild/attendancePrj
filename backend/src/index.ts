import { createApplication } from "@specific-dev/framework";
import * as appSchema from './db/schema.js';
import * as authSchema from './db/auth-schema.js';
import { registerStudentRoutes } from './routes/student.js';
import { registerLecturerRoutes } from './routes/lecturer.js';

// Combine schemas for full database type support
const schema = { ...appSchema, ...authSchema };

// Create application with schema for full database type support
export const app = await createApplication(schema);

// Export App type for use in route files
export type App = typeof app;

// Enable authentication with Better Auth
app.withAuth();

// Register routes - add your route modules here
// IMPORTANT: Always use registration functions to avoid circular dependency issues
registerStudentRoutes(app);
registerLecturerRoutes(app);

await app.run();
app.logger.info('Application running');
