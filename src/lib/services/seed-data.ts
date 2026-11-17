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

// No pre-configured semesters — Superadmin must create a semester first.
export const initialSemesters: Semester[] = [];

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

// No pre-configured offering — requires a semester to be created by the Superadmin first.
// Superadmin must configure: semester, registration dates, team capacity, then open registration.
export const initialOfferings: CourseOffering[] = [];

// No demo students, teams, memberships or credentials.
export const initialStudents: Student[] = [];

export const initialTeams: Team[] = [];

export const initialMemberships: TeamMembership[] = [];

export const initialCredentials: RegistrationCredential[] = [];
