-- UNDO DUMMY DATA SCRIPT
-- This script deletes attendance sessions and records created in the last 1 hour.
-- USE WITH CAUTION: This will delete ANY session created recently, not just dummy ones.

BEGIN;

-- 1. Delete Attendance Records created recently
DELETE FROM public.attendance_records
WHERE created_at > (now() - interval '1 hour');

-- 2. Delete Attendance Sessions created recently
DELETE FROM public.attendance_sessions
WHERE created_at > (now() - interval '1 hour');

-- 3. (Optional) Delete the dummy course if created recently
-- Only if you are sure it was created by the script (e.g. check ID or code)
-- DELETE FROM public.courses WHERE code = 'CS101';

COMMIT;
