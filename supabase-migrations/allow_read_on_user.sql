-- Enable RLS on the user table if not already enabled
ALTER TABLE IF EXISTS "user" ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to select from the user table
-- This is needed for the dashboard to count students and for other user lookups
CREATE POLICY "Enable read access for all authenticated users" ON "user"
    FOR SELECT
    TO authenticated
    USING (true);
