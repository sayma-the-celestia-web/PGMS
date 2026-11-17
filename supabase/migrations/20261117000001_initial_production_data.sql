-- ============================================================================
-- PGMS Initial Production Data Migration
-- Daffodil International University — Department of Software Engineering
-- Batch 45 | Section H | Course: SE214 — Algorithm Design and Analysis
-- ============================================================================
-- This migration is IDEMPOTENT. Running it multiple times will not create
-- duplicate records (uses ON CONFLICT DO NOTHING).
-- ============================================================================

-- 1. Insert SE214 course (idempotent by code and slug)
INSERT INTO courses (id, code, name, description, slug)
VALUES (
  gen_random_uuid(),
  'SE214',
  'Algorithm Design and Analysis',
  'Algorithm analysis, design paradigms, complexity theory, and practical algorithm implementation for Software Engineering students.',
  'se214'
)
ON CONFLICT (code) DO NOTHING;

-- 2. NOTE: Semester and CourseOffering must be configured manually by the Superadmin.
--    Do not auto-create a semester or open registration here.
--    The Superadmin must:
--      a) Create a semester (e.g. "Fall 2026" or the current active semester).
--      b) Create a CourseOffering for SE214 with Batch 45, Section H.
--      c) Set registration_status to 'OPEN' when ready.
--
-- No auto-inserted offering is provided to prevent unintentional registration opening.

-- 3. Verification query (informational)
-- SELECT code, name, slug FROM courses WHERE code = 'SE214';
