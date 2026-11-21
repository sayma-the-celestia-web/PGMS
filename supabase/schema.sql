-- ====================================================================
-- PGMS (Presentation Group Management System) - Consolidated Database Schema
-- Department of Software Engineering, Daffodil International University
-- Run this in your Supabase Project -> SQL Editor to initialize all tables
-- ====================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Semesters
CREATE TABLE IF NOT EXISTS semesters (
    id TEXT PRIMARY KEY DEFAULT ('sem-' || floor(extract(epoch from now()) * 1000)::text),
    name TEXT NOT NULL,
    academic_year TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Courses
CREATE TABLE IF NOT EXISTS courses (
    id TEXT PRIMARY KEY DEFAULT ('crs-' || floor(extract(epoch from now()) * 1000)::text),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    slug TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Course Offerings (Course + Semester + Section)
CREATE TABLE IF NOT EXISTS course_offerings (
    id TEXT PRIMARY KEY DEFAULT ('off-' || floor(extract(epoch from now()) * 1000)::text),
    course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    semester_id TEXT NOT NULL REFERENCES semesters(id) ON DELETE CASCADE,
    section TEXT NOT NULL,
    registration_status TEXT NOT NULL CHECK (registration_status IN ('UPCOMING', 'OPEN', 'PAUSED', 'CLOSED')) DEFAULT 'OPEN',
    registration_start TIMESTAMPTZ NOT NULL DEFAULT now(),
    registration_deadline TIMESTAMPTZ NOT NULL,
    min_team_capacity INT NOT NULL DEFAULT 2 CHECK (min_team_capacity >= 1),
    max_team_capacity INT NOT NULL DEFAULT 5 CHECK (max_team_capacity >= min_team_capacity),
    max_teams_limit INT NOT NULL DEFAULT 20 CHECK (max_teams_limit >= 1),
    topic_enabled BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_course_semester_section UNIQUE (course_id, semester_id, section)
);

-- 4. Students
CREATE TABLE IF NOT EXISTS students (
    id TEXT PRIMARY KEY DEFAULT ('stu-' || floor(extract(epoch from now()) * 1000)::text),
    full_name TEXT NOT NULL,
    student_id TEXT NOT NULL,
    normalized_student_id TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Teams
CREATE TABLE IF NOT EXISTS teams (
    id TEXT PRIMARY KEY DEFAULT ('team-' || floor(extract(epoch from now()) * 1000)::text),
    course_offering_id TEXT NOT NULL REFERENCES course_offerings(id) ON DELETE CASCADE,
    presentation_number INT,
    team_name TEXT NOT NULL,
    capacity INT NOT NULL CHECK (capacity >= 1),
    topic TEXT,
    leader_membership_id TEXT,
    status TEXT NOT NULL CHECK (status IN ('OPEN', 'FULL', 'CLOSED')) DEFAULT 'OPEN',
    slide_link TEXT,
    slide_file_name TEXT,
    slide_file_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_team_offering_name UNIQUE (course_offering_id, team_name)
);

-- 6. Team Memberships
CREATE TABLE IF NOT EXISTS team_memberships (
    id TEXT PRIMARY KEY DEFAULT ('mem-' || floor(extract(epoch from now()) * 1000)::text),
    team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    course_offering_id TEXT NOT NULL REFERENCES course_offerings(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('LEADER', 'MEMBER')) DEFAULT 'MEMBER',
    status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'LEFT', 'REMOVED')) DEFAULT 'ACTIVE',
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Foreign key back to team_memberships for leader
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_team_leader_membership'
    ) THEN
        ALTER TABLE teams 
            ADD CONSTRAINT fk_team_leader_membership 
            FOREIGN KEY (leader_membership_id) 
            REFERENCES team_memberships(id) 
            ON DELETE SET NULL 
            DEFERRABLE INITIALLY DEFERRED;
    END IF;
END $$;

-- 7. Registration Credentials (Hashes only, never raw tokens)
CREATE TABLE IF NOT EXISTS registration_credentials (
    id TEXT PRIMARY KEY DEFAULT ('cred-' || floor(extract(epoch from now()) * 1000)::text),
    credential_type TEXT NOT NULL CHECK (credential_type IN ('TEAM_MANAGEMENT', 'MEMBERSHIP')),
    team_id TEXT REFERENCES teams(id) ON DELETE CASCADE,
    membership_id TEXT REFERENCES team_memberships(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ
);

-- 8. Team Join Requests Table
CREATE TABLE IF NOT EXISTS team_join_requests (
    id TEXT PRIMARY KEY DEFAULT ('req-' || floor(extract(epoch from now()) * 1000)::text),
    team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    course_offering_id TEXT NOT NULL REFERENCES course_offerings(id) ON DELETE CASCADE,
    student_name TEXT NOT NULL,
    student_id TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED')) DEFAULT 'PENDING',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY DEFAULT ('log-' || floor(extract(epoch from now()) * 1000)::text),
    actor_admin_id TEXT,
    actor_email TEXT,
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_course_offerings_semester ON course_offerings(semester_id);
CREATE INDEX IF NOT EXISTS idx_course_offerings_course ON course_offerings(course_id);
CREATE INDEX IF NOT EXISTS idx_teams_offering ON teams(course_offering_id);
CREATE INDEX IF NOT EXISTS idx_teams_presentation ON teams(course_offering_id, presentation_number);
CREATE INDEX IF NOT EXISTS idx_team_memberships_team ON team_memberships(team_id);
CREATE INDEX IF NOT EXISTS idx_team_memberships_student ON team_memberships(student_id);
CREATE INDEX IF NOT EXISTS idx_credentials_hash ON registration_credentials(token_hash);
CREATE INDEX IF NOT EXISTS idx_join_requests_team ON team_join_requests(team_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE semesters ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_offerings ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE registration_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_join_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Default Permissive Policies for Service Role & Application
CREATE POLICY "Public Read Access" ON semesters FOR SELECT USING (true);
CREATE POLICY "Service Role Full Access" ON semesters FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Public Read Access" ON courses FOR SELECT USING (true);
CREATE POLICY "Service Role Full Access" ON courses FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Public Read Access" ON course_offerings FOR SELECT USING (true);
CREATE POLICY "Service Role Full Access" ON course_offerings FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Public Read Access" ON students FOR SELECT USING (true);
CREATE POLICY "Service Role Full Access" ON students FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Public Read Access" ON teams FOR SELECT USING (true);
CREATE POLICY "Service Role Full Access" ON teams FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Public Read Access" ON team_memberships FOR SELECT USING (true);
CREATE POLICY "Service Role Full Access" ON team_memberships FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service Role Full Access" ON registration_credentials FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Public Read Access" ON team_join_requests FOR SELECT USING (true);
CREATE POLICY "Public Insert Access" ON team_join_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Service Role Full Access" ON team_join_requests FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service Role Full Access" ON audit_logs FOR ALL TO service_role USING (true) WITH CHECK (true);
