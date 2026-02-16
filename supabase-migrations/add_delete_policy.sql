-- Add DELETE policy for attendance_sessions
-- Lecturers should be able to delete their own sessions

create policy "Lecturers can delete their own sessions"
on public.attendance_sessions for delete
to authenticated
using ( auth.uid()::text = lecturer_id );
