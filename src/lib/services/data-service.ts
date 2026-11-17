import {
  Semester,
  Course,
  CourseOffering,
  Team,
  TeamMembership,
  Student,
  RegistrationCredential,
  AuditLog,
  CreateTeamPayload,
  JoinTeamPayload,
  TeamCreationResult,
  JoinTeamResult,
  ReferenceAuthResult,
} from "@/types";
import {
  initialSemesters,
  initialCourses,
  initialOfferings,
  initialStudents,
  initialTeams,
  initialMemberships,
  initialCredentials,
} from "./seed-data";
import { generateToken, hashToken, timingSafeMatch } from "../utils/crypto";
import { normalizeStudentId } from "../utils";
import { createAdminSupabaseClient } from "../supabase/server";

// In-Memory store (persists across hot-reloads within node process)
class InMemoryDB {
  semesters: Semester[] = [...initialSemesters];
  courses: Course[] = [...initialCourses];
  offerings: CourseOffering[] = [...initialOfferings];
  students: Student[] = [...initialStudents];
  teams: Team[] = [...initialTeams];
  memberships: TeamMembership[] = [...initialMemberships];
  credentials: RegistrationCredential[] = [...initialCredentials];
  auditLogs: AuditLog[] = [
    {
      id: "log-1",
      actor_admin_id: null,
      actor_email: "superadmin@daffodilvarsity.edu.bd",
      action: "INITIALIZE_SYSTEM",
      target_type: "SYSTEM",
      target_id: "root",
      details: { message: "PGMS Database and initial courses initialized" },
      created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
    },
  ];

  // Concurrency mutex lock for atomic operations
  private locks = new Map<string, Promise<void>>();

  async acquireLock(key: string): Promise<() => void> {
    while (this.locks.has(key)) {
      await this.locks.get(key);
    }
    let resolveLock: () => void = () => {};
    const lockPromise = new Promise<void>((resolve) => {
      resolveLock = resolve;
    });
    this.locks.set(key, lockPromise);
    return () => {
      this.locks.delete(key);
      resolveLock();
    };
  }
}

// Global singleton instance for in-memory persistence
const globalForDB = global as unknown as { pgmsDB?: InMemoryDB };
export const db = globalForDB.pgmsDB ?? new InMemoryDB();
if (process.env.NODE_ENV !== "production") globalForDB.pgmsDB = db;

export class DataService {
  private static isSupabaseConfigured(): boolean {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    return !!(url && key && !url.includes("placeholder-project"));
  }

  // -------------------------------------------------------------
  // SEMESTERS
  // -------------------------------------------------------------
  static async getSemesters(): Promise<Semester[]> {
    if (this.isSupabaseConfigured()) {
      const client = createAdminSupabaseClient();
      if (client) {
        const { data, error } = await client
          .from("semesters")
          .select("*")
          .order("start_date", { ascending: false });
        if (!error && data) return data;
      }
    }
    return [...db.semesters].sort(
      (a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
    );
  }

  static async createSemester(
    input: Omit<Semester, "id" | "created_at" | "updated_at">
  ): Promise<Semester> {
    const newSem: Semester = {
      id: `sem-${Date.now()}`,
      ...input,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (this.isSupabaseConfigured()) {
      const client = createAdminSupabaseClient();
      if (client) {
        const { data } = await client.from("semesters").insert(newSem).select().single();
        if (data) return data;
      }
    }

    db.semesters.push(newSem);
    await this.logAuditEvent({
      action: "CREATE_SEMESTER",
      targetType: "SEMESTER",
      targetId: newSem.id,
      details: { name: newSem.name, academic_year: newSem.academic_year },
    });
    return newSem;
  }

  static async updateSemester(
    id: string,
    updates: Partial<Omit<Semester, "id" | "created_at" | "updated_at">>
  ): Promise<Semester | null> {
    const sem = db.semesters.find((s) => s.id === id);
    if (!sem) return null;
    Object.assign(sem, updates, { updated_at: new Date().toISOString() });

    await this.logAuditEvent({
      action: "UPDATE_SEMESTER",
      targetType: "SEMESTER",
      targetId: id,
      details: updates,
    });
    return sem;
  }

  // -------------------------------------------------------------
  // COURSES
  // -------------------------------------------------------------
  static async getCourses(): Promise<Course[]> {
    if (this.isSupabaseConfigured()) {
      const client = createAdminSupabaseClient();
      if (client) {
        const { data, error } = await client.from("courses").select("*").order("code");
        if (!error && data) return data;
      }
    }
    return [...db.courses].sort((a, b) => a.code.localeCompare(b.code));
  }

  static async getCourseBySlug(slug: string): Promise<Course | null> {
    return db.courses.find((c) => c.slug.toLowerCase() === slug.toLowerCase()) || null;
  }

  static async createCourse(
    input: Omit<Course, "id" | "created_at" | "updated_at">
  ): Promise<Course> {
    const newCourse: Course = {
      id: `crs-${Date.now()}`,
      ...input,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    db.courses.push(newCourse);
    await this.logAuditEvent({
      action: "CREATE_COURSE",
      targetType: "COURSE",
      targetId: newCourse.id,
      details: { code: newCourse.code, name: newCourse.name },
    });
    return newCourse;
  }

  static async updateCourse(
    id: string,
    updates: Partial<Omit<Course, "id" | "created_at" | "updated_at">>
  ): Promise<Course | null> {
    const course = db.courses.find((c) => c.id === id);
    if (!course) return null;
    Object.assign(course, updates, { updated_at: new Date().toISOString() });
    await this.logAuditEvent({
      action: "UPDATE_COURSE",
      targetType: "COURSE",
      targetId: id,
      details: updates,
    });
    return course;
  }

  // -------------------------------------------------------------
  // COURSE OFFERINGS
  // -------------------------------------------------------------
  static async getCourseOfferings(filters?: {
    semesterId?: string;
    courseId?: string;
    section?: string;
    status?: string;
    search?: string;
  }): Promise<CourseOffering[]> {
    let list = db.offerings.map((offering) => {
      const course = db.courses.find((c) => c.id === offering.course_id);
      const semester = db.semesters.find((s) => s.id === offering.semester_id);
      const teams = db.teams.filter((t) => t.course_offering_id === offering.id);
      const teamIds = new Set(teams.map((t) => t.id));
      const activeMemberships = db.memberships.filter(
        (m) => teamIds.has(m.team_id) && m.status === "ACTIVE"
      );

      const totalCapacity = teams.reduce((acc, t) => acc + t.capacity, 0);
      const available_slots = Math.max(0, totalCapacity - activeMemberships.length);

      return {
        ...offering,
        course,
        semester,
        teams_count: teams.length,
        students_count: activeMemberships.length,
        available_slots,
      };
    });

    if (filters) {
      if (filters.semesterId && filters.semesterId !== "all") {
        list = list.filter((o) => o.semester_id === filters.semesterId);
      }
      if (filters.section && filters.section !== "all") {
        list = list.filter(
          (o) => o.section.toLowerCase() === filters.section?.toLowerCase()
        );
      }
      if (filters.status && filters.status !== "all") {
        list = list.filter((o) => o.registration_status === filters.status);
      }
      if (filters.search) {
        const query = filters.search.toLowerCase();
        list = list.filter(
          (o) =>
            o.course?.name.toLowerCase().includes(query) ||
            o.course?.code.toLowerCase().includes(query) ||
            o.section.toLowerCase().includes(query)
        );
      }
    }

    return list;
  }

  static async getCourseOfferingById(id: string): Promise<CourseOffering | null> {
    const offerings = await this.getCourseOfferings();
    return offerings.find((o) => o.id === id) || null;
  }

  static async getCourseOfferingBySlug(
    slug: string,
    section?: string
  ): Promise<CourseOffering | null> {
    const offerings = await this.getCourseOfferings();
    return (
      offerings.find((o) => {
        const matchSlug = o.course?.slug.toLowerCase() === slug.toLowerCase();
        if (!matchSlug) return false;
        if (section) return o.section.toLowerCase() === section.toLowerCase();
        return true;
      }) || null
    );
  }

  static async createCourseOffering(
    input: Omit<CourseOffering, "id" | "created_at" | "updated_at">
  ): Promise<CourseOffering> {
    // Check uniqueness (course_id + semester_id + section)
    const exists = db.offerings.some(
      (o) =>
        o.course_id === input.course_id &&
        o.semester_id === input.semester_id &&
        o.section.toLowerCase() === input.section.toLowerCase()
    );
    if (exists) {
      throw new Error(`A registration offering for this course, semester and section already exists.`);
    }

    const newOffering: CourseOffering = {
      id: `off-${Date.now()}`,
      ...input,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    db.offerings.push(newOffering);
    await this.logAuditEvent({
      action: "CREATE_COURSE_OFFERING",
      targetType: "COURSE_OFFERING",
      targetId: newOffering.id,
      details: {
        course_id: input.course_id,
        semester_id: input.semester_id,
        section: input.section,
      },
    });
    return (await this.getCourseOfferingById(newOffering.id))!;
  }

  static async updateCourseOffering(
    id: string,
    updates: Partial<Omit<CourseOffering, "id" | "created_at" | "updated_at">>
  ): Promise<CourseOffering | null> {
    const offering = db.offerings.find((o) => o.id === id);
    if (!offering) return null;
    Object.assign(offering, updates, { updated_at: new Date().toISOString() });
    await this.logAuditEvent({
      action: "UPDATE_COURSE_OFFERING",
      targetType: "COURSE_OFFERING",
      targetId: id,
      details: updates,
    });
    return this.getCourseOfferingById(id);
  }

  // -------------------------------------------------------------
  // TEAMS & PUBLIC DIRECTORY
  // -------------------------------------------------------------
  static async getTeamsByOffering(offeringId: string): Promise<Team[]> {
    const teams = db.teams.filter((t) => t.course_offering_id === offeringId);
    return teams.map((team) => {
      const activeMemberships = db.memberships
        .filter((m) => m.team_id === team.id && m.status === "ACTIVE")
        .map((m) => {
          const student = db.students.find((s) => s.id === m.student_id);
          // Privacy protection: Return only full_name, NEVER student_id in public views!
          return {
            ...m,
            student: student
              ? {
                  id: student.id,
                  full_name: student.full_name,
                  student_id: "[PROTECTED]",
                  normalized_student_id: "[PROTECTED]",
                  created_at: student.created_at,
                  updated_at: student.updated_at,
                }
              : undefined,
          };
        });

      const leader = activeMemberships.find((m) => m.role === "LEADER");
      const registered_count = activeMemberships.length;
      const available_slots = Math.max(0, team.capacity - registered_count);

      return {
        ...team,
        memberships: activeMemberships,
        leader,
        registered_count,
        available_slots,
      };
    });
  }

  static async getTeamById(id: string, includePrivate = false): Promise<Team | null> {
    const team = db.teams.find((t) => t.id === id);
    if (!team) return null;

    const offering = await this.getCourseOfferingById(team.course_offering_id);
    const activeMemberships = db.memberships
      .filter((m) => m.team_id === team.id && m.status === "ACTIVE")
      .map((m) => {
        const student = db.students.find((s) => s.id === m.student_id);
        return {
          ...m,
          student: student
            ? {
                ...student,
                student_id: includePrivate ? student.student_id : "[PROTECTED]",
                normalized_student_id: includePrivate
                  ? student.normalized_student_id
                  : "[PROTECTED]",
              }
            : undefined,
        };
      });

    const leader = activeMemberships.find((m) => m.role === "LEADER");
    const registered_count = activeMemberships.length;
    const available_slots = Math.max(0, team.capacity - registered_count);

    return {
      ...team,
      course_offering: offering || undefined,
      memberships: activeMemberships,
      leader,
      registered_count,
      available_slots,
    };
  }

  // -------------------------------------------------------------
  // ATOMIC TEAM CREATION
  // -------------------------------------------------------------
  static async createTeamWithLeader(payload: CreateTeamPayload): Promise<TeamCreationResult> {
    const releaseLock = await db.acquireLock(`offering:${payload.courseOfferingId}`);
    try {
      const offering = db.offerings.find((o) => o.id === payload.courseOfferingId);
      if (!offering) {
        throw new Error("Course offering not found");
      }

      if (offering.registration_status !== "OPEN") {
        throw new Error(
          `Registration for this course offering is ${offering.registration_status}. New teams cannot be created.`
        );
      }

      if (new Date() > new Date(offering.registration_deadline)) {
        throw new Error("Registration deadline has passed for this course offering.");
      }

      if (
        payload.capacity < offering.min_team_capacity ||
        payload.capacity > offering.max_team_capacity
      ) {
        throw new Error(
          `Team capacity must be between ${offering.min_team_capacity} and ${offering.max_team_capacity} members.`
        );
      }

      const normStudentId = normalizeStudentId(payload.leaderStudentId);
      if (!normStudentId) {
        throw new Error("Student ID is required.");
      }

      // Check duplicate team name within this offering
      const duplicateTeamName = db.teams.some(
        (t) =>
          t.course_offering_id === payload.courseOfferingId &&
          t.team_name.trim().toLowerCase() === payload.teamName.trim().toLowerCase()
      );
      if (duplicateTeamName) {
        throw new Error(
          `A team named "${payload.teamName.trim()}" already exists in this course section. Please choose a different name.`
        );
      }

      // Upsert student
      let student = db.students.find((s) => s.normalized_student_id === normStudentId);
      if (!student) {
        student = {
          id: `stu-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          full_name: payload.leaderName.trim(),
          student_id: payload.leaderStudentId.trim(),
          normalized_student_id: normStudentId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        db.students.push(student);
      } else {
        student.full_name = payload.leaderName.trim();
        student.updated_at = new Date().toISOString();
      }

      // Check if student already has active membership in this course offering
      const alreadyRegistered = db.memberships.some(
        (m) =>
          m.student_id === student!.id &&
          m.course_offering_id === payload.courseOfferingId &&
          m.status === "ACTIVE"
      );
      if (alreadyRegistered) {
        throw new Error("You are already registered in an active team for this course offering.");
      }

      // Create Team
      const teamId = `team-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const membershipId = `mem-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const initialStatus = payload.capacity <= 1 ? "FULL" : "OPEN";

      const newTeam: Team = {
        id: teamId,
        course_offering_id: payload.courseOfferingId,
        team_name: payload.teamName.trim(),
        capacity: payload.capacity,
        leader_membership_id: membershipId,
        status: initialStatus,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      db.teams.push(newTeam);

      // Create Leader Membership
      const newMembership: TeamMembership = {
        id: membershipId,
        team_id: teamId,
        student_id: student.id,
        course_offering_id: payload.courseOfferingId,
        role: "LEADER",
        status: "ACTIVE",
        joined_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      db.memberships.push(newMembership);

      // Generate Cryptographically Secure Tokens
      const teamManagementToken = generateToken("pgms_tm_");
      const membershipToken = generateToken("pgms_mem_");

      // Store ONLY the hashes
      db.credentials.push({
        id: `cred-tm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        credential_type: "TEAM_MANAGEMENT",
        team_id: teamId,
        membership_id: null,
        token_hash: hashToken(teamManagementToken),
        created_at: new Date().toISOString(),
        expires_at: null,
        revoked_at: null,
        last_used_at: null,
      });

      db.credentials.push({
        id: `cred-mem-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        credential_type: "MEMBERSHIP",
        team_id: null,
        membership_id: membershipId,
        token_hash: hashToken(membershipToken),
        created_at: new Date().toISOString(),
        expires_at: null,
        revoked_at: null,
        last_used_at: null,
      });

      const course = db.courses.find((c) => c.id === offering.course_id);

      return {
        success: true,
        teamId,
        teamName: newTeam.team_name,
        membershipId,
        teamManagementToken,
        membershipToken,
        offeringSlug: course?.slug,
      };
    } finally {
      releaseLock();
    }
  }

  // -------------------------------------------------------------
  // ATOMIC JOIN TEAM
  // -------------------------------------------------------------
  static async joinTeam(payload: JoinTeamPayload): Promise<JoinTeamResult> {
    const releaseLock = await db.acquireLock(`team:${payload.teamId}`);
    try {
      const team = db.teams.find((t) => t.id === payload.teamId);
      if (!team) {
        throw new Error("Team not found");
      }

      const offering = db.offerings.find((o) => o.id === team.course_offering_id);
      if (!offering) {
        throw new Error("Course offering not found");
      }

      if (offering.registration_status !== "OPEN") {
        throw new Error(`Course registration is currently ${offering.registration_status}.`);
      }

      if (new Date() > new Date(offering.registration_deadline)) {
        throw new Error("Registration deadline has passed for this course offering.");
      }

      if (team.status === "CLOSED") {
        throw new Error("This team has been closed and is not accepting new members.");
      }

      const currentActiveCount = db.memberships.filter(
        (m) => m.team_id === team.id && m.status === "ACTIVE"
      ).length;

      if (currentActiveCount >= team.capacity || team.status === "FULL") {
        team.status = "FULL";
        throw new Error("This team is already full. No available slots remain.");
      }

      const normStudentId = normalizeStudentId(payload.studentId);
      if (!normStudentId) {
        throw new Error("Student ID is required.");
      }

      // Upsert student
      let student = db.students.find((s) => s.normalized_student_id === normStudentId);
      if (!student) {
        student = {
          id: `stu-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          full_name: payload.fullName.trim(),
          student_id: payload.studentId.trim(),
          normalized_student_id: normStudentId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        db.students.push(student);
      } else {
        student.full_name = payload.fullName.trim();
        student.updated_at = new Date().toISOString();
      }

      // Check if student already has active membership in this course offering
      const alreadyRegistered = db.memberships.some(
        (m) =>
          m.student_id === student!.id &&
          m.course_offering_id === team.course_offering_id &&
          m.status === "ACTIVE"
      );
      if (alreadyRegistered) {
        throw new Error("You are already registered in a team for this course section.");
      }

      // Create membership
      const membershipId = `mem-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const newMembership: TeamMembership = {
        id: membershipId,
        team_id: team.id,
        student_id: student.id,
        course_offering_id: team.course_offering_id,
        role: "MEMBER",
        status: "ACTIVE",
        joined_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      db.memberships.push(newMembership);

      // Recalculate status
      const updatedCount = currentActiveCount + 1;
      if (updatedCount >= team.capacity) {
        team.status = "FULL";
      }
      team.updated_at = new Date().toISOString();

      // Generate membership reference token
      const membershipToken = generateToken("pgms_mem_");
      db.credentials.push({
        id: `cred-mem-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        credential_type: "MEMBERSHIP",
        team_id: null,
        membership_id: membershipId,
        token_hash: hashToken(membershipToken),
        created_at: new Date().toISOString(),
        expires_at: null,
        revoked_at: null,
        last_used_at: null,
      });

      return {
        success: true,
        teamId: team.id,
        membershipId,
        membershipToken,
        teamName: team.team_name,
      };
    } finally {
      releaseLock();
    }
  }

  // -------------------------------------------------------------
  // REFERENCE TOKEN VERIFICATION
  // -------------------------------------------------------------
  static async verifyReferenceToken(token: string): Promise<ReferenceAuthResult> {
    const trimmed = token.trim();
    if (!trimmed) {
      return { valid: false, error: "Token cannot be empty" };
    }

    const hashed = hashToken(trimmed);
    const credential = db.credentials.find(
      (c) => c.token_hash === hashed && !c.revoked_at
    );

    if (!credential) {
      return { valid: false, error: "Invalid, expired or revoked reference credential." };
    }

    credential.last_used_at = new Date().toISOString();

    if (credential.credential_type === "TEAM_MANAGEMENT") {
      if (!credential.team_id) {
        return { valid: false, error: "Corrupted team reference credential." };
      }
      const team = await this.getTeamById(credential.team_id, true);
      if (!team) {
        return { valid: false, error: "Team not found." };
      }
      return {
        valid: true,
        credentialType: "TEAM_MANAGEMENT",
        team,
      };
    }

    if (credential.credential_type === "MEMBERSHIP") {
      if (!credential.membership_id) {
        return { valid: false, error: "Corrupted membership reference credential." };
      }
      const membership = db.memberships.find(
        (m) => m.id === credential.membership_id && m.status === "ACTIVE"
      );
      if (!membership) {
        return { valid: false, error: "Active membership not found or you have left the team." };
      }
      const team = await this.getTeamById(membership.team_id, true);
      const student = db.students.find((s) => s.id === membership.student_id);

      return {
        valid: true,
        credentialType: "MEMBERSHIP",
        team: team || undefined,
        membership: {
          ...membership,
          student,
        },
      };
    }

    return { valid: false, error: "Unknown credential type." };
  }

  // -------------------------------------------------------------
  // TEAM MANAGEMENT ACTIONS (VIA TOKEN)
  // -------------------------------------------------------------
  static async updateTeamSettings(
    token: string,
    updates: { teamName?: string; capacity?: number; status?: "OPEN" | "CLOSED" }
  ): Promise<Team> {
    const auth = await this.verifyReferenceToken(token);
    if (!auth.valid || auth.credentialType !== "TEAM_MANAGEMENT" || !auth.team) {
      throw new Error("Unauthorized: Valid Team Management Reference required.");
    }

    const team = db.teams.find((t) => t.id === auth.team?.id);
    if (!team) throw new Error("Team not found");

    const offering = db.offerings.find((o) => o.id === team.course_offering_id);
    if (!offering) throw new Error("Course offering not found");

    const activeCount = db.memberships.filter(
      (m) => m.team_id === team.id && m.status === "ACTIVE"
    ).length;

    if (updates.teamName && updates.teamName.trim()) {
      const newName = updates.teamName.trim();
      const duplicate = db.teams.some(
        (t) =>
          t.id !== team.id &&
          t.course_offering_id === team.course_offering_id &&
          t.team_name.toLowerCase() === newName.toLowerCase()
      );
      if (duplicate) {
        throw new Error(`Another team with the name "${newName}" already exists in this section.`);
      }
      team.team_name = newName;
    }

    if (updates.capacity !== undefined) {
      if (
        updates.capacity < offering.min_team_capacity ||
        updates.capacity > offering.max_team_capacity
      ) {
        throw new Error(
          `Capacity must be between ${offering.min_team_capacity} and ${offering.max_team_capacity}.`
        );
      }
      if (updates.capacity < activeCount) {
        throw new Error(
          `Cannot reduce capacity to ${updates.capacity} because there are already ${activeCount} active members.`
        );
      }
      team.capacity = updates.capacity;
    }

    if (updates.status) {
      team.status = updates.status;
    } else {
      // Recalculate status if not manually closed
      if (team.status !== "CLOSED") {
        team.status = activeCount >= team.capacity ? "FULL" : "OPEN";
      }
    }

    team.updated_at = new Date().toISOString();
    return (await this.getTeamById(team.id, true))!;
  }

  static async transferLeadership(
    token: string,
    targetMembershipId: string
  ): Promise<{ success: boolean; message: string }> {
    const auth = await this.verifyReferenceToken(token);
    if (!auth.valid || auth.credentialType !== "TEAM_MANAGEMENT" || !auth.team) {
      throw new Error("Unauthorized: Valid Team Management Reference required.");
    }

    const team = db.teams.find((t) => t.id === auth.team?.id);
    if (!team) throw new Error("Team not found");

    const currentLeader = db.memberships.find(
      (m) => m.team_id === team.id && m.role === "LEADER" && m.status === "ACTIVE"
    );
    const targetMember = db.memberships.find(
      (m) => m.id === targetMembershipId && m.team_id === team.id && m.status === "ACTIVE"
    );

    if (!targetMember) {
      throw new Error("Target member is not an active member of this team.");
    }

    if (currentLeader) {
      currentLeader.role = "MEMBER";
      currentLeader.updated_at = new Date().toISOString();
    }

    targetMember.role = "LEADER";
    targetMember.updated_at = new Date().toISOString();
    team.leader_membership_id = targetMember.id;
    team.updated_at = new Date().toISOString();

    return { success: true, message: "Leadership transferred successfully." };
  }

  // -------------------------------------------------------------
  // MEMBER ACTIONS (VIA MEMBERSHIP TOKEN)
  // -------------------------------------------------------------
  static async updateMemberProfile(
    token: string,
    updates: { fullName: string }
  ): Promise<Student> {
    const auth = await this.verifyReferenceToken(token);
    if (!auth.valid || auth.credentialType !== "MEMBERSHIP" || !auth.membership) {
      throw new Error("Unauthorized: Valid Membership Reference required.");
    }

    const student = db.students.find((s) => s.id === auth.membership?.student_id);
    if (!student) throw new Error("Student not found");

    student.full_name = updates.fullName.trim();
    student.updated_at = new Date().toISOString();
    return student;
  }

  static async memberLeaveTeam(
    token: string
  ): Promise<{ success: boolean; message: string }> {
    const auth = await this.verifyReferenceToken(token);
    if (!auth.valid || auth.credentialType !== "MEMBERSHIP" || !auth.membership) {
      throw new Error("Unauthorized: Valid Membership Reference required.");
    }

    const membership = db.memberships.find((m) => m.id === auth.membership?.id);
    if (!membership || membership.status !== "ACTIVE") {
      throw new Error("Active membership not found.");
    }

    const team = db.teams.find((t) => t.id === membership.team_id);
    if (!team) throw new Error("Team not found");

    const otherActiveMembers = db.memberships.filter(
      (m) => m.team_id === team.id && m.status === "ACTIVE" && m.id !== membership.id
    );

    if (membership.role === "LEADER" && otherActiveMembers.length > 0) {
      throw new Error(
        "As the team leader, you must transfer leadership to another member before leaving the team."
      );
    }

    membership.status = "LEFT";
    membership.updated_at = new Date().toISOString();

    // Revoke this member's credential
    const hashed = hashToken(token.trim());
    const cred = db.credentials.find((c) => c.token_hash === hashed);
    if (cred) cred.revoked_at = new Date().toISOString();

    // If sole member left, close the team
    if (otherActiveMembers.length === 0) {
      team.status = "CLOSED";
      team.leader_membership_id = null;
      team.updated_at = new Date().toISOString();

      // Revoke team credential as well
      const teamCred = db.credentials.find(
        (c) => c.team_id === team.id && c.credential_type === "TEAM_MANAGEMENT"
      );
      if (teamCred) teamCred.revoked_at = new Date().toISOString();
    } else {
      // If team was FULL, now has a slot open
      if (team.status === "FULL") {
        team.status = "OPEN";
        team.updated_at = new Date().toISOString();
      }
    }

    return {
      success: true,
      message:
        otherActiveMembers.length === 0
          ? "You left the team. Because you were the only member, the team has been closed."
          : "You have successfully left the team.",
    };
  }

  // -------------------------------------------------------------
  // SUPERADMIN OVERSIGHT & ACTIONS
  // -------------------------------------------------------------
  static async getAllTeams(filters?: {
    semesterId?: string;
    courseId?: string;
    offeringId?: string;
    status?: string;
    search?: string;
  }): Promise<Team[]> {
    let teams = await Promise.all(db.teams.map((t) => this.getTeamById(t.id, true)));
    let list = teams.filter((t): t is Team => t !== null);

    if (filters) {
      if (filters.offeringId && filters.offeringId !== "all") {
        list = list.filter((t) => t.course_offering_id === filters.offeringId);
      }
      if (filters.semesterId && filters.semesterId !== "all") {
        list = list.filter(
          (t) => t.course_offering?.semester_id === filters.semesterId
        );
      }
      if (filters.status && filters.status !== "all") {
        list = list.filter((t) => t.status === filters.status);
      }
      if (filters.search) {
        const query = filters.search.toLowerCase();
        list = list.filter(
          (t) =>
            t.team_name.toLowerCase().includes(query) ||
            t.course_offering?.course?.code.toLowerCase().includes(query) ||
            t.course_offering?.section.toLowerCase().includes(query) ||
            t.leader?.student?.full_name.toLowerCase().includes(query)
        );
      }
    }

    return list;
  }

  static async adminUpdateTeam(
    teamId: string,
    updates: {
      team_name?: string;
      capacity?: number;
      status?: "OPEN" | "FULL" | "CLOSED";
      leader_membership_id?: string;
    }
  ): Promise<Team> {
    const team = db.teams.find((t) => t.id === teamId);
    if (!team) throw new Error("Team not found");

    if (updates.team_name) team.team_name = updates.team_name.trim();
    if (updates.capacity) team.capacity = updates.capacity;
    if (updates.status) team.status = updates.status;

    if (updates.leader_membership_id) {
      const oldLeader = db.memberships.find(
        (m) => m.team_id === team.id && m.role === "LEADER" && m.status === "ACTIVE"
      );
      const newLeader = db.memberships.find(
        (m) => m.id === updates.leader_membership_id && m.status === "ACTIVE"
      );
      if (newLeader) {
        if (oldLeader) oldLeader.role = "MEMBER";
        newLeader.role = "LEADER";
        team.leader_membership_id = newLeader.id;
      }
    }

    team.updated_at = new Date().toISOString();

    await this.logAuditEvent({
      action: "ADMIN_UPDATE_TEAM",
      targetType: "TEAM",
      targetId: teamId,
      details: updates,
    });

    return (await this.getTeamById(team.id, true))!;
  }

  static async adminRemoveMember(
    membershipId: string,
    reason = "Removed by Superadmin"
  ): Promise<{ success: boolean }> {
    const membership = db.memberships.find((m) => m.id === membershipId);
    if (!membership) throw new Error("Membership not found");

    const team = db.teams.find((t) => t.id === membership.team_id);
    membership.status = "REMOVED";
    membership.updated_at = new Date().toISOString();

    if (team) {
      const remaining = db.memberships.filter(
        (m) => m.team_id === team.id && m.status === "ACTIVE"
      );
      if (membership.role === "LEADER" && remaining.length > 0) {
        remaining[0].role = "LEADER";
        team.leader_membership_id = remaining[0].id;
      } else if (remaining.length === 0) {
        team.status = "CLOSED";
        team.leader_membership_id = null;
      } else if (team.status === "FULL") {
        team.status = "OPEN";
      }
      team.updated_at = new Date().toISOString();
    }

    await this.logAuditEvent({
      action: "ADMIN_REMOVE_MEMBER",
      targetType: "MEMBERSHIP",
      targetId: membershipId,
      details: { reason, team_id: team?.id },
    });

    return { success: true };
  }

  static async getAllStudents(search?: string): Promise<
    (Student & {
      active_teams_count: number;
      memberships: (TeamMembership & { team?: Team })[];
    })[]
  > {
    let students = [...db.students];
    if (search) {
      const query = search.toLowerCase();
      students = students.filter(
        (s) =>
          s.full_name.toLowerCase().includes(query) ||
          s.student_id.toLowerCase().includes(query)
      );
    }

    return students.map((s) => {
      const mList = db.memberships
        .filter((m) => m.student_id === s.id && m.status === "ACTIVE")
        .map((m) => {
          const team = db.teams.find((t) => t.id === m.team_id);
          return {
            ...m,
            team,
          };
        });

      return {
        ...s,
        active_teams_count: mList.length,
        memberships: mList,
      };
    });
  }

  static async adminUpdateStudent(
    studentId: string,
    updates: { full_name?: string; student_id?: string }
  ): Promise<Student> {
    const student = db.students.find((s) => s.id === studentId);
    if (!student) throw new Error("Student not found");

    if (updates.full_name) student.full_name = updates.full_name.trim();
    if (updates.student_id) {
      student.student_id = updates.student_id.trim();
      student.normalized_student_id = normalizeStudentId(updates.student_id);
    }
    student.updated_at = new Date().toISOString();

    await this.logAuditEvent({
      action: "ADMIN_UPDATE_STUDENT",
      targetType: "STUDENT",
      targetId: studentId,
      details: updates,
    });

    return student;
  }

  // -------------------------------------------------------------
  // AUDIT LOGS & DASHBOARD STATS
  // -------------------------------------------------------------
  static async logAuditEvent(event: {
    action: string;
    targetType: string;
    targetId: string | null;
    details?: Record<string, any>;
    actorEmail?: string;
  }): Promise<void> {
    const log: AuditLog = {
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      actor_admin_id: null,
      actor_email: event.actorEmail || "superadmin@daffodilvarsity.edu.bd",
      action: event.action,
      target_type: event.targetType,
      target_id: event.targetId,
      details: event.details || {},
      created_at: new Date().toISOString(),
    };
    db.auditLogs.unshift(log);
  }

  static async getAuditLogs(limit = 50): Promise<AuditLog[]> {
    return db.auditLogs.slice(0, limit);
  }

  static async getDashboardStats() {
    const offerings = await this.getCourseOfferings();
    const activeOfferings = offerings.filter((o) => o.registration_status === "OPEN");
    const allTeams = await this.getAllTeams();
    const openTeams = allTeams.filter((t) => t.status === "OPEN");
    const fullTeams = allTeams.filter((t) => t.status === "FULL");
    const activeMembers = db.memberships.filter((m) => m.status === "ACTIVE");

    const totalCapacity = allTeams.reduce((sum, t) => sum + t.capacity, 0);
    const availableSlots = Math.max(0, totalCapacity - activeMembers.length);

    return {
      totalSemesters: db.semesters.length,
      totalCourses: db.courses.length,
      activeOfferings: activeOfferings.length,
      totalOfferings: db.offerings.length,
      totalTeams: allTeams.length,
      totalStudents: activeMembers.length,
      openTeams: openTeams.length,
      fullTeams: fullTeams.length,
      availableSlots,
    };
  }
}
