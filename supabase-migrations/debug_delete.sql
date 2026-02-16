-- Try to delete a session and see if it fails
-- First, identifying a session to delete (one connected to the current user)
DO $$
DECLARE
    v_lecturer_id text;
    v_session_id uuid;
BEGIN
    -- get the first lecturer found in users
    SELECT id INTO v_lecturer_id FROM public.user WHERE role = 'lecturer' LIMIT 1;
    
    RAISE NOTICE 'Testing with Lecturer ID: %', v_lecturer_id;

    -- Create a dummy course
    INSERT INTO public.courses (id, name, code, lecturer_id)
    VALUES ('00000000-0000-0000-0000-000000000000', 'Deletable Course', 'DEL101', v_lecturer_id)
    ON CONFLICT DO NOTHING;

    -- Create a dummy session
    INSERT INTO public.attendance_sessions (id, course_id, lecturer_id, week, date, time)
    VALUES ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', v_lecturer_id, 1, '2023-01-01', '10:00:00')
    ON CONFLICT DO NOTHING;

    -- Create a dummy attendance record
    INSERT INTO public.attendance_records (session_id, student_id, status)
    SELECT '00000000-0000-0000-0000-000000000001', id, 'present'
    FROM public.user WHERE role = 'student' LIMIT 1
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE 'Created dummy data. Attempting delete...';

    -- Attempt delete
    DELETE FROM public.attendance_sessions WHERE id = '00000000-0000-0000-0000-000000000001';
    
    IF FOUND THEN
        RAISE NOTICE 'Delete successful!';
    ELSE
        RAISE NOTICE 'Delete failed (row not found or RLS prevented it)';
    END IF;

    -- Cleanup course
    DELETE FROM public.courses WHERE id = '00000000-0000-0000-0000-000000000000';
    
END $$;
