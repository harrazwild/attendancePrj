-- COMPREHENSIVE DUMMY DATA SCRIPT
-- This script ensures you have data for the 'attendance_details' view.

-- NOTE: 'attendance_details' is a VIEW. It displays data from:
-- 1. public.courses
-- 2. public.attendance_sessions
-- 3. public.user (students)
-- 4. public.attendance_records

DO $$
DECLARE
  v_course_id uuid;
  v_session_id uuid;
  v_student_record record;
  v_week int;
  v_session_date date;
  v_student_count int;
  v_random_attend boolean;
  v_new_course_code text := 'CS101';
BEGIN

  -- 1. CHECK/CREATE COURSE
  SELECT id INTO v_course_id FROM public.courses LIMIT 1;
  
  IF v_course_id IS NULL THEN
    INSERT INTO public.courses (name, code, description)
    VALUES ('Intro to Computer Science', v_new_course_code, 'Basic programming concepts')
    RETURNING id INTO v_course_id;
    RAISE NOTICE 'Created Dummy Course: %', v_new_course_code;
  ELSE
    RAISE NOTICE 'Using existing Course ID: %', v_course_id;
  END IF;

  -- 2. CHECK STUDENTS
  SELECT count(*) INTO v_student_count FROM public."user" WHERE role = 'student';
  
  IF v_student_count = 0 THEN
    RAISE WARNING 'No students found in public."user". Attendance records cannot be created without students.';
    RAISE NOTICE 'Please sign up a few users in your app first to create student records.';
    -- We cannot easily create fake students because of the Foreign Key to auth.users
    RETURN;
  END IF;

  RAISE NOTICE 'Found % students. Generating attendance...', v_student_count;

  -- 3. GENERATE SESSIONS & ATTENDANCE (Weeks 1-14)
  FOR v_week IN 1..14 LOOP
    -- Date Logic: Week 14 is today, Week 1 is 13 weeks ago
    v_session_date := CURRENT_DATE - ((14 - v_week) * 7);


    -- Find or Create Session
    SELECT id INTO v_session_id 
    FROM public.attendance_sessions 
    WHERE course_id = v_course_id AND week = v_week;

    IF v_session_id IS NULL THEN
        -- We need a lecturer_id. Let's pick the first lecturer, or any user if not found.
        DECLARE 
          v_lecturer_id uuid;
        BEGIN
          SELECT id INTO v_lecturer_id FROM public."user" WHERE role = 'lecturer' LIMIT 1;
          
          -- Fallback: Use any user if no lecturer found (just to make script work)
          IF v_lecturer_id IS NULL THEN
             SELECT id INTO v_lecturer_id FROM public."user" LIMIT 1;
          END IF;
          
          IF v_lecturer_id IS NULL THEN
             RAISE EXCEPTION 'Cannot create session: No users found to assign as lecturer.';
          END IF;

          INSERT INTO public.attendance_sessions (course_id, week, date, time, lecturer_id, created_at)
          VALUES (v_course_id, v_week, v_session_date, '10:00:00', v_lecturer_id, now())
          RETURNING id INTO v_session_id;
        END;
    END IF;

    -- For each student, 80% chance to attend
    FOR v_student_record IN SELECT id FROM public."user" WHERE role = 'student' LOOP
      
      -- Random check (80% probability)
      IF (floor(random() * 10 + 1) <= 8) THEN
        -- Insert if not exists
        PERFORM 1 FROM public.attendance_records 
        WHERE session_id = v_session_id AND student_id = v_student_record.id;
        
        IF NOT FOUND THEN
            INSERT INTO public.attendance_records (session_id, student_id, status, scan_time, created_at)
            VALUES (
              v_session_id, 
              v_student_record.id, 
              'present', 
              -- Random time between 10:00 and 10:30
              (v_session_date + time '10:00:00' + (floor(random() * 30) || ' minutes')::interval),
              now()
            );
        END IF;
      END IF;
    END LOOP;

  END LOOP;

  RAISE NOTICE 'Success! Populated sessions and records for Weeks 1-14.';
  RAISE NOTICE 'Check the attendance_details view now.';

END $$;
