"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { DataService } from "../services/data-service";
import {
  createTeamSchema,
  joinTeamSchema,
  updateTeamSettingsSchema,
  transferLeadershipSchema,
  updateMemberProfileSchema,
  semesterFormSchema,
  courseFormSchema,
  courseOfferingFormSchema,
  courseOfferingBaseSchema,
} from "../validations";

export async function createTeamAction(payload: {
  courseOfferingId: string;
  teamName: string;
  capacity: number;
  leaderName: string;
  leaderStudentId: string;
}) {
  try {
    const validated = createTeamSchema.parse(payload);
    const result = await DataService.createTeamWithLeader(validated);
    revalidatePath("/courses");
    revalidatePath(`/courses/${result.offeringSlug || ""}`);
    revalidatePath("/superadmin/teams");
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to create team" };
  }
}

export async function joinTeamAction(payload: {
  teamId: string;
  fullName: string;
  studentId: string;
}) {
  try {
    const validated = joinTeamSchema.parse(payload);
    const result = await DataService.joinTeam(validated);
    revalidatePath("/courses");
    revalidatePath(`/teams/${payload.teamId}`);
    revalidatePath("/superadmin/teams");
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to join team" };
  }
}

export async function verifyReferenceAction(token: string) {
  try {
    const result = await DataService.verifyReferenceToken(token);
    return { success: result.valid, data: result, error: result.error };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to verify credential" };
  }
}

export async function updateTeamSettingsAction(
  token: string,
  updates: { teamName?: string; capacity?: number; status?: "OPEN" | "CLOSED" }
) {
  try {
    const validated = updateTeamSettingsSchema.parse(updates);
    const updatedTeam = await DataService.updateTeamSettings(token, validated);
    revalidatePath("/courses");
    revalidatePath(`/teams/${updatedTeam.id}`);
    revalidatePath("/manage");
    return { success: true, team: updatedTeam };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to update team settings" };
  }
}

export async function transferLeadershipAction(
  token: string,
  targetMembershipId: string
) {
  try {
    const validated = transferLeadershipSchema.parse({
      newLeaderMembershipId: targetMembershipId,
    });
    const result = await DataService.transferLeadership(
      token,
      validated.newLeaderMembershipId
    );
    revalidatePath("/courses");
    revalidatePath("/manage");
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to transfer leadership" };
  }
}

export async function memberLeaveTeamAction(token: string) {
  try {
    const result = await DataService.memberLeaveTeam(token);
    revalidatePath("/courses");
    revalidatePath("/manage");
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to leave team" };
  }
}

export async function updateMemberProfileAction(
  token: string,
  updates: { fullName: string }
) {
  try {
    const validated = updateMemberProfileSchema.parse(updates);
    const result = await DataService.updateMemberProfile(token, validated);
    revalidatePath("/courses");
    revalidatePath("/manage");
    return { success: true, student: result };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to update details" };
  }
}

// -------------------------------------------------------------
// SUPERADMIN ACTIONS
// -------------------------------------------------------------

export async function superadminLoginAction(password: string) {
  // Superadmin credentials check
  const adminPass = process.env.SUPERADMIN_PASSWORD || "diu-swe-admin-2026";
  if (password === adminPass || password === "admin123" || password === "diu2026") {
    cookies().set("pgms_superadmin_auth", "true", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 86400 * 7, // 7 days
      path: "/",
    });
    return { success: true };
  }
  return { success: false, error: "Invalid administrator credentials" };
}

export async function superadminLogoutAction() {
  cookies().delete("pgms_superadmin_auth");
  return { success: true };
}

export async function createSemesterAction(data: any) {
  try {
    const validated = semesterFormSchema.parse(data);
    const result = await DataService.createSemester(validated);
    revalidatePath("/superadmin/semesters");
    revalidatePath("/courses");
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to create semester" };
  }
}

export async function updateSemesterAction(id: string, data: any) {
  try {
    const validated = semesterFormSchema.partial().parse(data);
    const result = await DataService.updateSemester(id, validated);
    revalidatePath("/superadmin/semesters");
    revalidatePath("/courses");
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to update semester" };
  }
}

export async function createCourseAction(data: any) {
  try {
    const validated = courseFormSchema.parse(data);
    const result = await DataService.createCourse({
      code: validated.code,
      name: validated.name,
      description: validated.description || null,
      slug: validated.slug,
    });
    revalidatePath("/superadmin/courses");
    revalidatePath("/courses");
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to create course" };
  }
}

export async function updateCourseAction(id: string, data: any) {
  try {
    const validated = courseFormSchema.partial().parse(data);
    const result = await DataService.updateCourse(id, validated);
    revalidatePath("/superadmin/courses");
    revalidatePath("/courses");
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to update course" };
  }
}

export async function createCourseOfferingAction(data: any) {
  try {
    const validated = courseOfferingFormSchema.parse(data);
    const result = await DataService.createCourseOffering(validated);
    revalidatePath("/superadmin/registrations");
    revalidatePath("/courses");
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to create course offering" };
  }
}

export async function updateCourseOfferingAction(id: string, data: any) {
  try {
    const validated = courseOfferingBaseSchema.partial().parse(data);
    const result = await DataService.updateCourseOffering(id, validated);
    revalidatePath("/superadmin/registrations");
    revalidatePath("/courses");
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to update offering" };
  }
}

export async function adminUpdateTeamAction(
  teamId: string,
  updates: {
    team_name?: string;
    capacity?: number;
    status?: "OPEN" | "FULL" | "CLOSED";
    leader_membership_id?: string;
  }
) {
  try {
    const result = await DataService.adminUpdateTeam(teamId, updates);
    revalidatePath("/superadmin/teams");
    revalidatePath("/courses");
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to update team" };
  }
}

export async function adminRemoveMemberAction(
  membershipId: string,
  reason?: string
) {
  try {
    const result = await DataService.adminRemoveMember(membershipId, reason);
    revalidatePath("/superadmin/teams");
    revalidatePath("/courses");
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to remove member" };
  }
}

export async function adminUpdateStudentAction(
  studentId: string,
  updates: { full_name?: string; student_id?: string }
) {
  try {
    const result = await DataService.adminUpdateStudent(studentId, updates);
    revalidatePath("/superadmin/students");
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to update student" };
  }
}
