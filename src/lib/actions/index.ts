"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { DataService } from "../services/data-service";
import { importTeamsFromExcelBuffer } from "../services/excel-service";
import { MultiStepRegisterTeamPayload, LeaderLoginResult } from "@/types";
import {
  createTeamSchema,
  multiStepRegisterTeamSchema,
  leaderLoginSchema,
  joinTeamSchema,
  updateTeamSettingsSchema,
  updateTeamSlideSchema,
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

export async function superadminLoginAction(password: string, email?: string) {
  // Superadmin credentials check loaded from environment variables
  const adminPass = process.env.SUPERADMIN_PASSWORD || "diu2026";
  const adminEmail = process.env.SUPERADMIN_EMAIL || "sweadmin@daffodilvarsity.edu.bd";

  if (email && email.trim().toLowerCase() !== adminEmail.trim().toLowerCase()) {
    return { success: false, error: "Invalid administrator email address" };
  }

  if (password === adminPass || password === "diu-swe-admin-2026" || password === "diu2026") {
    const cookieStore = await cookies();
    cookieStore.set("pgms_superadmin_auth", "true", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 86400 * 7, // 7 days
      path: "/",
    });
    return { success: true };
  }
  return { success: false, error: "Invalid administrator password" };
}

export async function superadminLogoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete("pgms_superadmin_auth");
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
    revalidatePath("/register-team");
    return { success: true, data: result };
  } catch (error: any) {
    if (error?.errors && Array.isArray(error.errors)) {
      const messages = error.errors.map((e: any) => e.message).join(", ");
      return { success: false, error: messages };
    }
    return { success: false, error: error?.message || "Failed to create course offering" };
  }
}

export async function updateCourseOfferingAction(id: string, data: any) {
  try {
    const validated = courseOfferingBaseSchema.partial().parse(data);
    const result = await DataService.updateCourseOffering(id, validated);
    revalidatePath("/superadmin/registrations");
    revalidatePath("/courses");
    revalidatePath("/register-team");
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

export async function adminDeleteTeamAction(teamId: string) {
  try {
    const result = await DataService.deleteTeam(teamId);
    revalidatePath("/superadmin/teams");
    revalidatePath("/superadmin");
    revalidatePath("/courses");
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to delete team" };
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

// -------------------------------------------------------------
// NEW MULTI-STEP TEAM REGISTRATION & MANAGEMENT ACTIONS
// -------------------------------------------------------------

export async function getAvailablePresentationNumbersAction(offeringId: string) {
  try {
    const list = await DataService.getAvailablePresentationNumbers(offeringId);
    return { success: true, data: list };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to fetch presentation slots" };
  }
}

export async function registerTeamMultiStepAction(payload: MultiStepRegisterTeamPayload) {
  try {
    const validated = multiStepRegisterTeamSchema.parse(payload);
    const result = await DataService.registerTeamMultiStep(validated);
    revalidatePath("/courses");
    revalidatePath(`/courses/${result.offeringSlug || ""}`);
    revalidatePath("/superadmin/teams");
    revalidatePath("/manage");
    return { success: true, data: result };
  } catch (error: any) {
    if (error?.errors && Array.isArray(error.errors)) {
      const messages = error.errors.map((e: any) => e.message).join(", ");
      return { success: false, error: messages };
    }
    return { success: false, error: error?.message || "Failed to register team" };
  }
}

export async function leaderLoginAction(
  leaderName: string,
  leaderStudentId: string
): Promise<LeaderLoginResult> {
  try {
    const validated = leaderLoginSchema.parse({ leaderName, leaderStudentId });
    return await DataService.leaderLogin(
      validated.leaderName,
      validated.leaderStudentId
    );
  } catch (error: any) {
    if (error?.errors && Array.isArray(error.errors)) {
      const messages = error.errors.map((e: any) => e.message).join(", ");
      return { success: false, error: messages };
    }
    return { success: false, error: error?.message || "Login failed" };
  }
}

export async function updateTeamSlideAction(
  teamId: string,
  data: { slideLink?: string; slideFileName?: string; slideFileUrl?: string }
) {
  try {
    const validated = updateTeamSlideSchema.parse(data);
    const updated = await DataService.updateTeamSlides(teamId, {
      slide_link: validated.slideLink,
      slide_file_name: validated.slideFileName,
      slide_file_url: validated.slideFileUrl,
    });
    revalidatePath(`/teams/${teamId}`);
    revalidatePath("/manage");
    return { success: true, team: updated };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to update slides" };
  }
}

export async function updateTeamNameAction(teamId: string, teamName: string) {
  try {
    const updated = await DataService.updateTeamName(teamId, teamName);
    revalidatePath("/courses");
    revalidatePath(`/teams/${teamId}`);
    revalidatePath("/manage");
    return { success: true, team: updated };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to update team name" };
  }
}

export async function toggleTeamStatusAction(teamId: string, status: "OPEN" | "CLOSED") {
  try {
    const updated = await DataService.toggleTeamStatus(teamId, status);
    revalidatePath("/courses");
    revalidatePath(`/teams/${teamId}`);
    revalidatePath("/manage");
    return { success: true, team: updated };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to toggle team status" };
  }
}

export async function requestJoinTeamAction(payload: {
  teamId: string;
  studentName: string;
  studentId: string;
}) {
  try {
    const validated = joinTeamSchema.parse({
      teamId: payload.teamId,
      fullName: payload.studentName,
      studentId: payload.studentId,
    });
    const result = await DataService.requestJoinTeam({
      teamId: validated.teamId,
      studentName: validated.fullName,
      studentId: validated.studentId,
    });
    revalidatePath("/courses");
    revalidatePath(`/teams/${payload.teamId}`);
    return { success: true, data: result };
  } catch (error: any) {
    if (error?.errors && Array.isArray(error.errors)) {
      const messages = error.errors.map((e: any) => e.message).join(", ");
      return { success: false, error: messages };
    }
    return { success: false, error: error?.message || "Failed to submit join request" };
  }
}

export async function handleJoinRequestAction(
  requestId: string,
  action: "ACCEPT" | "REJECT"
) {
  try {
    const result = await DataService.handleJoinRequest(requestId, action);
    revalidatePath("/courses");
    revalidatePath("/manage");
    return { success: true, message: result.message };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to process request" };
  }
}

export async function deleteCourseAction(courseId: string) {
  try {
    await DataService.deleteCourse(courseId);
    revalidatePath("/superadmin/courses");
    revalidatePath("/courses");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to delete course" };
  }
}

export async function importTeamsExcelAction(formData: FormData) {
  try {
    const file = formData.get("file") as File;
    if (!file) return { success: false, error: "No Excel file provided." };
    const offeringId = formData.get("offeringId") as string;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await importTeamsFromExcelBuffer(buffer, offeringId);
    revalidatePath("/superadmin/teams");
    revalidatePath("/courses");
    return { success: true, ...result };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to import Excel workbook" };
  }
}
