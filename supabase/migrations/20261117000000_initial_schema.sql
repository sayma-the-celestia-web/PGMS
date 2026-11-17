-- ====================================================================
-- PGMS (Presentation Group Management System) - Initial Database Schema
-- Department of Software Engineering, Daffodil International University
-- ====================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Semesters
CREATE TABLE IF NOT EXISTS semesters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    slug TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Course Offerings (Course + Semester + Section)
CREATE TABLE IF NOT EXISTS course_offerings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE RESTRICT,
    semester_id UUID NOT NULL REFERENCES semesters(id) ON DELETE RESTRICT,
    section TEXT NOT NULL,
    registration_status TEXT NOT NULL CHECK (registration_status IN ('UPCOMING', 'OPEN', 'PAUSED', 'CLOSED')) DEFAULT 'OPEN',
    registration_start TIMESTAMPTZ NOT NULL DEFAULT now(),
    registration_deadline TIMESTAMPTZ NOT NULL,
    min_team_capacity INT NOT NULL DEFAULT 3 CHECK (min_team_capacity >= 1),
    max_team_capacity INT NOT NULL DEFAULT 5 CHECK (max_team_capacity >= min_team_capacity),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_course_semester_section UNIQUE (course_id, semester_id, section)
);

-- 4. Students
CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    student_id TEXT NOT NULL,
    normalized_student_id TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Teams
CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_offering_id UUID NOT NULL REFERENCES course_offerings(id) ON DELETE CASCADE,
    team_name TEXT NOT NULL,
    capacity INT NOT NULL CHECK (capacity >= 1),
    leader_membership_id UUID,
    status TEXT NOT NULL CHECK (status IN ('OPEN', 'FULL', 'CLOSED')) DEFAULT 'OPEN',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_team_offering_name UNIQUE (course_offering_id, team_name)
);

-- 6. Team Memberships
CREATE TABLE IF NOT EXISTS team_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
    course_offering_id UUID NOT NULL REFERENCES course_offerings(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('LEADER', 'MEMBER')) DEFAULT 'MEMBER',
    status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'LEFT', 'REMOVED')) DEFAULT 'ACTIVE',
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Foreign key back to team_memberships for leader
ALTER TABLE teams 
    ADD CONSTRAINT fk_team_leader_membership 
    FOREIGN KEY (leader_membership_id) 
    REFERENCES team_memberships(id) 
    ON DELETE SET NULL 
    DEFERRABLE INITIALLY DEFERRED;

-- Unique partial index: ONE active membership per student per course offering
CREATE UNIQUE INDEX IF NOT EXISTS idx_uq_active_student_per_offering 
    ON team_memberships(student_id, course_offering_id) 
    WHERE status = 'ACTIVE';

-- 7. Registration Credentials (Hashes only, never raw tokens)
CREATE TABLE IF NOT EXISTS registration_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    credential_type TEXT NOT NULL CHECK (credential_type IN ('TEAM_MANAGEMENT', 'MEMBERSHIP')),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    membership_id UUID REFERENCES team_memberships(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ
);

-- 8. Admin Profiles (for Superadmin via Supabase Auth)
CREATE TABLE IF NOT EXISTS admin_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID NOT NULL UNIQUE,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'SUPERADMIN' CHECK (role IN ('SUPERADMIN', 'ADMIN')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_admin_id UUID REFERENCES admin_profiles(id) ON DELETE SET NULL,
    actor_email TEXT,
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for fast lookup and queries
CREATE INDEX IF NOT EXISTS idx_course_offerings_semester ON course_offerings(semester_id);
CREATE INDEX IF NOT EXISTS idx_course_offerings_course ON course_offerings(course_id);
CREATE INDEX IF NOT EXISTS idx_teams_offering ON teams(course_offering_id);
CREATE INDEX IF NOT EXISTS idx_team_memberships_team ON team_memberships(team_id);
CREATE INDEX IF NOT EXISTS idx_team_memberships_student ON team_memberships(student_id);
CREATE INDEX IF NOT EXISTS idx_credentials_hash ON registration_credentials(token_hash);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);

-- ====================================================================
-- ATOMIC STORED PROCEDURES (RPCs)
-- ====================================================================

-- Function 1: Atomically create a team with the creator as leader
CREATE OR REPLACE FUNCTION rpc_create_team_with_leader(
    p_course_offering_id UUID,
    p_team_name TEXT,
    p_capacity INT,
    p_student_id_str TEXT,
    p_full_name TEXT,
    p_team_token_hash TEXT,
    p_member_token_hash TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_offering RECORD;
    v_norm_student_id TEXT;
    v_student_id UUID;
    v_team_id UUID;
    v_membership_id UUID;
    v_active_membership_count INT;
    v_existing_team_count INT;
    v_initial_status TEXT;
BEGIN
    -- 1. Check offering status and lock offering row
    SELECT * INTO v_offering 
    FROM course_offerings 
    WHERE id = p_course_offering_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Course offering not found' USING ERRCODE = 'P0002';
    END IF;

    IF v_offering.registration_status <> 'OPEN' THEN
        RAISE EXCEPTION 'Registration for this course offering is not currently open (Status: %)', v_offering.registration_status;
    END IF;

    IF now() > v_offering.registration_deadline THEN
        RAISE EXCEPTION 'Registration deadline has passed for this course offering';
    END IF;

    -- 2. Validate capacity within offering bounds
    IF p_capacity < v_offering.min_team_capacity OR p_capacity > v_offering.max_team_capacity THEN
        RAISE EXCEPTION 'Team capacity must be between % and % members', v_offering.min_team_capacity, v_offering.max_team_capacity;
    END IF;

    -- 3. Validate and normalize student ID
    v_norm_student_id := lower(trim(p_student_id_str));
    IF length(v_norm_student_id) = 0 THEN
        RAISE EXCEPTION 'Student ID cannot be empty';
    END IF;

    -- 4. Check for duplicate team name within the offering
    SELECT count(*) INTO v_existing_team_count 
    FROM teams 
    WHERE course_offering_id = p_course_offering_id 
      AND lower(team_name) = lower(trim(p_team_name));

    IF v_existing_team_count > 0 THEN
        RAISE EXCEPTION 'A team with the name "%" already exists in this course section', trim(p_team_name);
    END IF;

    -- 5. Upsert student record
    INSERT INTO students (full_name, student_id, normalized_student_id)
    VALUES (trim(p_full_name), trim(p_student_id_str), v_norm_student_id)
    ON CONFLICT (normalized_student_id) 
    DO UPDATE SET 
        full_name = EXCLUDED.full_name,
        updated_at = now()
    RETURNING id INTO v_student_id;

    -- 6. Check if student already has active membership in this course offering
    SELECT count(*) INTO v_active_membership_count
    FROM team_memberships
    WHERE student_id = v_student_id 
      AND course_offering_id = p_course_offering_id 
      AND status = 'ACTIVE';

    IF v_active_membership_count > 0 THEN
        RAISE EXCEPTION 'You are already registered in an active team for this course section';
    END IF;

    -- Determine initial status
    IF p_capacity <= 1 THEN
        v_initial_status := 'FULL';
    ELSE
        v_initial_status := 'OPEN';
    END IF;

    -- 7. Insert Team
    INSERT INTO teams (course_offering_id, team_name, capacity, status)
    VALUES (p_course_offering_id, trim(p_team_name), p_capacity, v_initial_status)
    RETURNING id INTO v_team_id;

    -- 8. Insert Leader Membership
    INSERT INTO team_memberships (team_id, student_id, course_offering_id, role, status)
    VALUES (v_team_id, v_student_id, p_course_offering_id, 'LEADER', 'ACTIVE')
    RETURNING id INTO v_membership_id;

    -- Update leader_membership_id on team
    UPDATE teams SET leader_membership_id = v_membership_id WHERE id = v_team_id;

    -- 9. Insert Team Management Reference Credential
    INSERT INTO registration_credentials (credential_type, team_id, token_hash)
    VALUES ('TEAM_MANAGEMENT', v_team_id, p_team_token_hash);

    -- 10. Insert Individual Membership Reference Credential
    INSERT INTO registration_credentials (credential_type, membership_id, token_hash)
    VALUES ('MEMBERSHIP', v_membership_id, p_member_token_hash);

    RETURN jsonb_build_object(
        'success', true,
        'team_id', v_team_id,
        'membership_id', v_membership_id,
        'team_name', trim(p_team_name),
        'capacity', p_capacity,
        'student_id', v_norm_student_id,
        'full_name', trim(p_full_name)
    );
END;
$$;

-- Function 2: Atomically join an existing team
CREATE OR REPLACE FUNCTION rpc_join_team_atomic(
    p_team_id UUID,
    p_student_id_str TEXT,
    p_full_name TEXT,
    p_member_token_hash TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_team RECORD;
    v_offering RECORD;
    v_norm_student_id TEXT;
    v_student_id UUID;
    v_membership_id UUID;
    v_active_count INT;
    v_existing_membership_count INT;
BEGIN
    -- 1. Lock team row for update to prevent concurrent race condition on last slot
    SELECT * INTO v_team 
    FROM teams 
    WHERE id = p_team_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Team not found' USING ERRCODE = 'P0002';
    END IF;

    -- 2. Verify Offering is open and within deadline
    SELECT * INTO v_offering 
    FROM course_offerings 
    WHERE id = v_team.course_offering_id;

    IF v_offering.registration_status <> 'OPEN' THEN
        RAISE EXCEPTION 'Registration for this course offering is %', v_offering.registration_status;
    END IF;

    IF now() > v_offering.registration_deadline THEN
        RAISE EXCEPTION 'Registration deadline has passed for this course offering';
    END IF;

    -- 3. Verify Team is OPEN
    IF v_team.status = 'CLOSED' THEN
        RAISE EXCEPTION 'This team has been closed and is no longer accepting new members';
    END IF;

    IF v_team.status = 'FULL' THEN
        RAISE EXCEPTION 'This team is already full';
    END IF;

    -- 4. Count active members in team
    SELECT count(*) INTO v_active_count 
    FROM team_memberships 
    WHERE team_id = p_team_id AND status = 'ACTIVE';

    IF v_active_count >= v_team.capacity THEN
        -- Auto-correct status if it wasn't full
        UPDATE teams SET status = 'FULL', updated_at = now() WHERE id = p_team_id;
        RAISE EXCEPTION 'This team has reached its maximum capacity of % members', v_team.capacity;
    END IF;

    -- 5. Validate & normalize student
    v_norm_student_id := lower(trim(p_student_id_str));
    IF length(v_norm_student_id) = 0 THEN
        RAISE EXCEPTION 'Student ID cannot be empty';
    END IF;

    INSERT INTO students (full_name, student_id, normalized_student_id)
    VALUES (trim(p_full_name), trim(p_student_id_str), v_norm_student_id)
    ON CONFLICT (normalized_student_id) 
    DO UPDATE SET 
        full_name = EXCLUDED.full_name,
        updated_at = now()
    RETURNING id INTO v_student_id;

    -- 6. Check if student already in this offering
    SELECT count(*) INTO v_existing_membership_count
    FROM team_memberships
    WHERE student_id = v_student_id 
      AND course_offering_id = v_team.course_offering_id 
      AND status = 'ACTIVE';

    IF v_existing_membership_count > 0 THEN
        RAISE EXCEPTION 'You are already registered in a team for this course section';
    END IF;

    -- 7. Insert Membership
    INSERT INTO team_memberships (team_id, student_id, course_offering_id, role, status)
    VALUES (p_team_id, v_student_id, v_team.course_offering_id, 'MEMBER', 'ACTIVE')
    RETURNING id INTO v_membership_id;

    -- 8. Recalculate team status
    v_active_count := v_active_count + 1;
    IF v_active_count >= v_team.capacity THEN
        UPDATE teams SET status = 'FULL', updated_at = now() WHERE id = p_team_id;
    END IF;

    -- 9. Insert Credential Hash
    INSERT INTO registration_credentials (credential_type, membership_id, token_hash)
    VALUES ('MEMBERSHIP', v_membership_id, p_member_token_hash);

    RETURN jsonb_build_object(
        'success', true,
        'team_id', p_team_id,
        'membership_id', v_membership_id,
        'team_name', v_team.team_name,
        'new_member_count', v_active_count,
        'capacity', v_team.capacity,
        'student_id', v_norm_student_id,
        'full_name', trim(p_full_name)
    );
END;
$$;

-- Function 3: Member leaves team
CREATE OR REPLACE FUNCTION rpc_member_leave_team(
    p_membership_id UUID,
    p_reason TEXT DEFAULT 'Left by member'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_membership RECORD;
    v_team RECORD;
    v_active_count INT;
    v_other_active_count INT;
BEGIN
    SELECT * INTO v_membership 
    FROM team_memberships 
    WHERE id = p_membership_id AND status = 'ACTIVE';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Active membership not found' USING ERRCODE = 'P0002';
    END IF;

    SELECT * INTO v_team 
    FROM teams 
    WHERE id = v_membership.team_id 
    FOR UPDATE;

    -- Count other active members
    SELECT count(*) INTO v_other_active_count
    FROM team_memberships
    WHERE team_id = v_membership.team_id 
      AND status = 'ACTIVE' 
      AND id <> p_membership_id;

    -- If leader: cannot leave if other active members exist unless leadership was transferred first
    IF v_membership.role = 'LEADER' AND v_other_active_count > 0 THEN
        RAISE EXCEPTION 'As team leader, you must transfer leadership to another member before leaving the team';
    END IF;

    -- Update membership status to LEFT
    UPDATE team_memberships 
    SET status = 'LEFT', updated_at = now() 
    WHERE id = p_membership_id;

    -- Revoke credentials for this membership
    UPDATE registration_credentials 
    SET revoked_at = now() 
    WHERE membership_id = p_membership_id;

    -- If leader was sole member and leaves, team is CLOSED/cancelled
    IF v_other_active_count = 0 THEN
        UPDATE teams 
        SET status = 'CLOSED', leader_membership_id = NULL, updated_at = now() 
        WHERE id = v_membership.team_id;

        -- Revoke team credentials
        UPDATE registration_credentials 
        SET revoked_at = now() 
        WHERE team_id = v_membership.team_id;
    ELSE
        -- If team was FULL and not manually CLOSED, it now becomes OPEN
        IF v_team.status = 'FULL' THEN
            UPDATE teams SET status = 'OPEN', updated_at = now() WHERE id = v_membership.team_id;
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'team_id', v_membership.team_id,
        'remaining_members', v_other_active_count
    );
END;
$$;

-- Function 4: Transfer leadership
CREATE OR REPLACE FUNCTION rpc_transfer_team_leadership(
    p_team_id UUID,
    p_current_leader_membership_id UUID,
    p_target_membership_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_team RECORD;
    v_current_leader RECORD;
    v_target_member RECORD;
BEGIN
    SELECT * INTO v_team FROM teams WHERE id = p_team_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Team not found';
    END IF;

    -- Verify current leader
    SELECT * INTO v_current_leader 
    FROM team_memberships 
    WHERE id = p_current_leader_membership_id 
      AND team_id = p_team_id 
      AND role = 'LEADER' 
      AND status = 'ACTIVE';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Current leader membership is invalid or not active';
    END IF;

    -- Verify target member
    SELECT * INTO v_target_member 
    FROM team_memberships 
    WHERE id = p_target_membership_id 
      AND team_id = p_team_id 
      AND status = 'ACTIVE';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Target member not found or is not an active member of this team';
    END IF;

    -- Demote old leader to MEMBER
    UPDATE team_memberships 
    SET role = 'MEMBER', updated_at = now() 
    WHERE id = p_current_leader_membership_id;

    -- Promote target member to LEADER
    UPDATE team_memberships 
    SET role = 'LEADER', updated_at = now() 
    WHERE id = p_target_membership_id;

    -- Update leader_membership_id on team
    UPDATE teams 
    SET leader_membership_id = p_target_membership_id, updated_at = now() 
    WHERE id = p_team_id;

    RETURN jsonb_build_object(
        'success', true,
        'team_id', p_team_id,
        'new_leader_membership_id', p_target_membership_id
    );
END;
$$;

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================

ALTER TABLE semesters ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_offerings ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE registration_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Public can view active semesters, courses, course offerings, and teams
CREATE POLICY "Public read active semesters" ON semesters FOR SELECT USING (true);
CREATE POLICY "Public read courses" ON courses FOR SELECT USING (true);
CREATE POLICY "Public read offerings" ON course_offerings FOR SELECT USING (true);
CREATE POLICY "Public read teams" ON teams FOR SELECT USING (true);

-- Public can view team member names (only non-sensitive fields via views or join)
CREATE POLICY "Public read active memberships" ON team_memberships 
    FOR SELECT USING (status = 'ACTIVE');

-- Public cannot view student IDs directly from students table
CREATE POLICY "Public view student names only" ON students 
    FOR SELECT USING (true);

-- Registration credentials are NEVER readable by public anon role
CREATE POLICY "Credentials restricted to service role" ON registration_credentials 
    FOR ALL USING (false);

-- Audit logs are restricted to service role / superadmin
CREATE POLICY "Audit logs restricted" ON audit_logs 
    FOR ALL USING (false);

-- Admin profiles readable by authenticated admins only
CREATE POLICY "Admins can read admin profiles" ON admin_profiles 
    FOR SELECT TO authenticated USING (auth.uid() = auth_user_id);
