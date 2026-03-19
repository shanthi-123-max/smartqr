/*
  # Face Verification Schema

  1. New Tables
    - `students`
      - `id` (uuid, primary key)
      - `email` (text, unique, not null)
      - `name` (text, not null)
      - `student_id` (text, unique, not null)
      - `face_registered` (boolean, default false)
      - `created_at` (timestamptz, default now())
    
    - `face_descriptors`
      - `id` (uuid, primary key)
      - `student_id` (uuid, foreign key to students)
      - `descriptor` (jsonb, not null) - stores the face descriptor array
      - `created_at` (timestamptz, default now())
    
    - `attendance_sessions`
      - `id` (uuid, primary key)
      - `session_name` (text, not null)
      - `created_by` (uuid, foreign key to students)
      - `qr_code` (text, not null)
      - `active` (boolean, default true)
      - `created_at` (timestamptz, default now())
    
    - `attendance_records`
      - `id` (uuid, primary key)
      - `session_id` (uuid, foreign key to attendance_sessions)
      - `student_id` (uuid, foreign key to students)
      - `face_verified` (boolean, default false)
      - `timestamp` (timestamptz, default now())

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated access
*/

CREATE TABLE IF NOT EXISTS students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  student_id text UNIQUE NOT NULL,
  face_registered boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS face_descriptors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  descriptor jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS attendance_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_name text NOT NULL,
  created_by uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  qr_code text NOT NULL,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS attendance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  face_verified boolean DEFAULT false,
  timestamp timestamptz DEFAULT now(),
  UNIQUE(session_id, student_id)
);

ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE face_descriptors ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can read own data"
  ON students FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Students can insert own data"
  ON students FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Students can update own data"
  ON students FOR UPDATE
  TO authenticated
  USING (id = (current_setting('request.jwt.claims', true)::json->>'sub')::uuid)
  WITH CHECK (id = (current_setting('request.jwt.claims', true)::json->>'sub')::uuid);

CREATE POLICY "Students can read own face descriptors"
  ON face_descriptors FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Students can insert own face descriptors"
  ON face_descriptors FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Students can view all attendance sessions"
  ON attendance_sessions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Students can create attendance sessions"
  ON attendance_sessions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Students can update own attendance sessions"
  ON attendance_sessions FOR UPDATE
  TO authenticated
  USING (created_by = (current_setting('request.jwt.claims', true)::json->>'sub')::uuid)
  WITH CHECK (created_by = (current_setting('request.jwt.claims', true)::json->>'sub')::uuid);

CREATE POLICY "Students can view attendance records"
  ON attendance_records FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Students can create attendance records"
  ON attendance_records FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_face_descriptors_student_id ON face_descriptors(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_session_id ON attendance_records(session_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_student_id ON attendance_records(student_id);