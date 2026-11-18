import { z } from "zod";

export const studentIdSchema = z
  .string()
  .trim()
  .regex(
    /^\d{3}-\d{2}-\d{3}$/,
    "Student ID must match pattern 252-35-242 (e.g. 252-35-242)"
  );

export const createTeamSchema = z.object({
  courseOfferingId: z.string().min(1, "Invalid course offering selected"),
  teamName: z
    .string()
    .trim()
    .min(2, "Team name must be at least 2 characters")
    .max(50, "Team name must not exceed 50 characters"),
  capacity: z
    .number({ invalid_type_error: "Capacity must be a number" })
    .int("Capacity must be an integer")
  .min(1, "Capacity must be at least 1")
  .max(20, "Capacity cannot exceed 20"),
  leaderName: z
    .string()
    .trim()
    .min(2, "Leader name must be at least 2 characters")
    .max(100, "Leader name must not exceed 100 characters"),
  leaderStudentId: studentIdSchema,
});

export const multiStepRegisterTeamSchema = z.object({
  courseOfferingId: z.string().min(1, "Invalid course offering selected"),
  teamName: z.string().trim().max(60, "Team name must not exceed 60 characters").optional().default(""),
  capacity: z.coerce.number().int().min(1, "Team size must be at least 1").max(20, "Max team size is 20"),
  topic: z.string().trim().max(150, "Topic must not exceed 150 characters").optional().default(""),
  presentation_number: z.coerce.number().int().min(1, "Presentation team number must be at least 1"),
  leaderName: z.string().trim().min(2, "Leader name must be at least 2 characters"),
  leaderStudentId: studentIdSchema,
  members: z.array(
    z.object({
      name: z.string().trim().min(2, "Member name must be at least 2 characters"),
      studentId: studentIdSchema,
    })
  ).default([]),
});

export const leaderLoginSchema = z.object({
  leaderName: z.string().trim().min(2, "Leader name must be at least 2 characters"),
  leaderStudentId: studentIdSchema,
});

export const joinTeamSchema = z.object({
  teamId: z.string().min(1, "Invalid team selected"),
  fullName: z
    .string()
    .trim()
    .min(2, "Full name must be at least 2 characters")
    .max(100, "Full name must not exceed 100 characters"),
  studentId: studentIdSchema,
});

export const tokenQuerySchema = z.object({
  token: z
    .string()
    .trim()
    .min(10, "Invalid reference token format")
    .max(100, "Invalid reference token format"),
});

export const updateTeamSettingsSchema = z.object({
  teamName: z
    .string()
    .trim()
    .min(2, "Team name must be at least 2 characters")
    .max(50, "Team name must not exceed 50 characters")
    .optional(),
  capacity: z
    .number()
    .int()
    .min(1, "Capacity must be at least 1")
    .max(20, "Capacity cannot exceed 20")
    .optional(),
  status: z.enum(["OPEN", "CLOSED"]).optional(),
});

export const updateTeamSlideSchema = z.object({
  slideLink: z.string().trim().optional(),
  slideFileName: z.string().trim().optional(),
  slideFileUrl: z.string().trim().optional(),
});

export const transferLeadershipSchema = z.object({
  newLeaderMembershipId: z.string().min(1, "Invalid target member selected"),
});

export const updateMemberProfileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Full name must be at least 2 characters")
    .max(100, "Full name must not exceed 100 characters"),
});

export const semesterFormSchema = z.object({
  name: z.string().trim().min(2, "Semester name is required"),
  academic_year: z.string().trim().min(4, "Academic year is required (e.g. 2026-2027)"),
  start_date: z.string().min(10, "Valid start date is required"),
  end_date: z.string().min(10, "Valid end date is required"),
  is_active: z.boolean().default(true),
});

export const courseFormSchema = z.object({
  code: z.string().trim().min(2, "Course code is required (e.g. SWE 411)"),
  name: z.string().trim().min(3, "Course name is required"),
  description: z.string().trim().optional(),
  slug: z.string().trim().min(2, "Slug is required (e.g. swe-411)"),
});

export const courseOfferingBaseSchema = z.object({
  course_id: z.string().min(1, "Please select a course"),
  semester_id: z.string().min(1, "Please select a semester"),
  section: z.string().trim().min(1, "Section is required (e.g. A, B, 61_A)"),
  registration_status: z.enum(["UPCOMING", "OPEN", "PAUSED", "CLOSED"]),
  registration_start: z.string().min(10, "Registration start date/time is required"),
  registration_deadline: z.string().min(10, "Registration deadline is required"),
  min_team_capacity: z.coerce.number().int().min(1, "Min capacity must be at least 1"),
  max_team_capacity: z.coerce.number().int().min(1, "Max capacity must be at least 1"),
  max_teams_limit: z.coerce.number().int().min(1, "Max teams limit must be at least 1").default(20),
  topic_enabled: z.boolean().default(true),
});

export const courseOfferingFormSchema = courseOfferingBaseSchema.refine(
  (data) => data.max_team_capacity >= data.min_team_capacity,
  {
    message: "Max capacity must be greater than or equal to min capacity",
    path: ["max_team_capacity"],
  }
);

export const superadminLoginSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});
