-- ====================================================================
-- PGMS Migration: Team Registration Platform Enhancements
-- Department of Software Engineering, Daffodil International University
-- ====================================================================

-- 1. Add presentation limits and topic controls to course_offerings
ALTER TABLE course_offerings 
ADD COLUMN IF NOT EXISTS max_teams_limit INT NOT NULL DEFAULT 20 CHECK (max_teams_limit >= 1),
ADD COLUMN IF NOT EXISTS topic_enabled BOOLEAN NOT NULL DEFAULT true;

-- 2. Add presentation slot, topic, and slides columns to teams
ALTER TABLE teams 
ADD COLUMN IF NOT EXISTS presentation_number INT,
ADD COLUMN IF NOT EXISTS topic TEXT,
ADD COLUMN IF NOT EXISTS slide_link TEXT,
ADD COLUMN IF NOT EXISTS slide_file_name TEXT,
ADD COLUMN IF NOT EXISTS slide_file_url TEXT;

-- Enforce unique presentation number per course offering
CREATE UNIQUE INDEX IF NOT EXISTS idx_uq_team_offering_presentation_number 
ON teams (course_offering_id, presentation_number) 
WHERE presentation_number IS NOT NULL;

-- 3. Team Join Requests Table
CREATE TABLE IF NOT EXISTS team_join_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    course_offering_id UUID NOT NULL REFERENCES course_offerings(id) ON DELETE CASCADE,
    student_name TEXT NOT NULL,
    student_id TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED')) DEFAULT 'PENDING',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Partial index: Only one pending request per student per course offering
CREATE UNIQUE INDEX IF NOT EXISTS idx_uq_pending_request_per_offering 
ON team_join_requests (course_offering_id, student_id) 
WHERE status = 'PENDING';

-- Enable Row Level Security (RLS)
ALTER TABLE team_join_requests ENABLE ROW LEVEL SECURITY;

-- Public can insert join requests
CREATE POLICY "Public students can submit join requests"
    ON team_join_requests FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- Public can read join requests
CREATE POLICY "Public students and leaders can read join requests"
    ON team_join_requests FOR SELECT
    TO anon, authenticated
    USING (true);

-- Service role and admin can manage all
CREATE POLICY "Superadmin full access to join requests"
    ON team_join_requests FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

