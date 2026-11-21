import {
  Semester,
  Course,
  CourseOffering,
  Team,
  TeamMembership,
  Student,
  RegistrationCredential,
} from "@/types";

// ─── Department Configuration ──────────────────────────────────────────────
// Daffodil International University — Department of Software Engineering
// Initial academic configuration: Batch 45, Section H, Course SE214
// Registration must be opened explicitly by the Superadmin.
// ───────────────────────────────────────────────────────────────────────────

export const DEPARTMENT_CONFIG = {
  batch: "45",
  section: "H",
  courseCode: "SE214",
  courseName: "Algorithm Design and Analysis",
  department: "Software Engineering",
  university: "Daffodil International University",
} as const;

// Initial active semester for immediate demonstration & operation
export const initialSemesters: Semester[] = [
  {
    id: "sem-spring-2026",
    name: "Spring 2026",
    academic_year: "2026",
    start_date: "2026-01-10",
    end_date: "2026-06-30",
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// One real course: SE214 — Algorithm Design and Analysis
export const initialCourses: Course[] = [
  {
    id: "crs-se214",
    code: "SE214",
    name: "Algorithm Design and Analysis",
    description:
      "Algorithm analysis, design paradigms, complexity theory, and practical algorithm implementation for Software Engineering students.",
    slug: "se214",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// Active course offering for SE214 Section H
export const initialOfferings: CourseOffering[] = [
  {
    id: "offering-se214-h",
    course_id: "crs-se214",
    semester_id: "sem-spring-2026",
    section: "H",
    registration_status: "OPEN",
    registration_start: "2026-01-01T00:00:00.000Z",
    registration_deadline: "2026-12-31T23:59:59.000Z",
    min_team_capacity: 2,
    max_team_capacity: 5,
    max_teams_limit: 20,
    topic_enabled: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// No demo students, teams, memberships or credentials.
export const initialStudents: Student[] = [];

export const initialTeams: Team[] = [];

export const initialMemberships: TeamMembership[] = [];

export const initialCredentials: RegistrationCredential[] = [];
