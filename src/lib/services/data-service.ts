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
  MultiStepRegisterTeamPayload,
  JoinTeamPayload,
  TeamCreationResult,
  JoinTeamResult,
  ReferenceAuthResult,
  LeaderLoginResult,
  TeamJoinRequest,
} from "@/types";
import fs from "fs";
import path from "path";
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
import { normalizeStudentId, formatStudentId } from "../utils";
import { createAdminSupabaseClient } from "../supabase/server";

const isServerless = !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const LOCAL_STORAGE_DIR = path.join(process.cwd(), "data");
const LOCAL_STORAGE_PATH = path.join(LOCAL_STORAGE_DIR, "pgms-storage.json");
const TMP_STORAGE_PATH = path.join("/tmp", "pgms-storage.json");
const STORAGE_PATH = isServerless ? TMP_STORAGE_PATH : LOCAL_STORAGE_PATH;

function isSupabaseConfigured(): boolean {
  let url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  let key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    try {
      const fs = require("fs");
      const path = require("path");
      const envPath = path.resolve(process.cwd(), ".env.local");
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, "utf8");
        content.split("\n").forEach((line: string) => {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith("#")) {
            const idx = trimmed.indexOf("=");
            if (idx !== -1) {
              const k = trimmed.slice(0, idx).trim();
              const v = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
              if (k === "NEXT_PUBLIC_SUPABASE_URL" && !url) url = v;
              if (k === "SUPABASE_SERVICE_ROLE_KEY" && !process.env.SUPABASE_SERVICE_ROLE_KEY) key = v;
              if (k === "NEXT_PUBLIC_SUPABASE_ANON_KEY" && !key) key = v;
            }
          }
        });
      }
    } catch {}
  }

  return !!(url && key && !url.includes("placeholder-project"));
}

// In-Memory store with local JSON disk persistence and Supabase Cloud synchronization
class InMemoryDB {
  semesters: Semester[] = [...initialSemesters];
  courses: Course[] = [...initialCourses];
  offerings: CourseOffering[] = [...initialOfferings];
  students: Student[] = [...initialStudents];
  teams: Team[] = [...initialTeams];
  memberships: TeamMembership[] = [...initialMemberships];
  credentials: RegistrationCredential[] = [...initialCredentials];
  joinRequests: TeamJoinRequest[] = [];
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

  private lastCloudSync = 0;
  private hasEverSyncedFromCloud = false;
  private cloudSyncPromise: Promise<void> | null = null;
  private cloudUploadPromise: Promise<void> | null = null;

  constructor() {
    this.loadFromDisk();
    if (isSupabaseConfigured()) {
      this.syncFromCloud(true).catch(() => { });
    }
  }

  loadFromDisk() {
    try {
      let targetPath = STORAGE_PATH;
      if (!fs.existsSync(targetPath) && fs.existsSync(LOCAL_STORAGE_PATH)) {
        targetPath = LOCAL_STORAGE_PATH;
      }
      if (fs.existsSync(targetPath)) {
        const raw = fs.readFileSync(targetPath, "utf-8");
        this.populateFromJSON(raw);
      }
    } catch (e) {
      console.warn("Failed to read storage from disk:", e);
    }
  }

  populateFromJSON(raw: string) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed) {
        if (Array.isArray(parsed.semesters) && parsed.semesters.length > 0) this.semesters = parsed.semesters;
        if (Array.isArray(parsed.courses) && parsed.courses.length > 0) this.courses = parsed.courses;
        if (Array.isArray(parsed.offerings) && parsed.offerings.length > 0) this.offerings = parsed.offerings;
        if (Array.isArray(parsed.students)) this.students = parsed.students;
        if (Array.isArray(parsed.teams)) this.teams = parsed.teams;
        if (Array.isArray(parsed.memberships)) this.memberships = parsed.memberships;
        if (Array.isArray(parsed.credentials)) this.credentials = parsed.credentials;
        if (Array.isArray(parsed.joinRequests)) this.joinRequests = parsed.joinRequests;
        if (Array.isArray(parsed.auditLogs)) this.auditLogs = parsed.auditLogs;
      }
    } catch (e) {
      console.warn("Error parsing storage JSON:", e);
    }
  }

  toJSONString(): string {
    return JSON.stringify(
      {
        semesters: this.semesters,
        courses: this.courses,
        offerings: this.offerings,
        students: this.students,
        teams: this.teams,
        memberships: this.memberships,
        credentials: this.credentials,
        joinRequests: this.joinRequests,
        auditLogs: this.auditLogs,
      },
      null,
      2
    );
  }

  saveToDisk() {
    const raw = this.toJSONString();
    try {
      const dir = path.dirname(STORAGE_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(STORAGE_PATH, raw, "utf-8");
    } catch (e) {
      try {
        fs.writeFileSync(TMP_STORAGE_PATH, raw, "utf-8");
      } catch (err) {
        console.warn("Could not write to local or tmp disk:", err);
      }
    }

    if (STORAGE_PATH !== LOCAL_STORAGE_PATH) {
      try {
        if (fs.existsSync(LOCAL_STORAGE_DIR)) {
          fs.writeFileSync(LOCAL_STORAGE_PATH, raw, "utf-8");
        }
      } catch { }
    }

    // Automatically synchronize state to Supabase cloud storage
    this.syncToCloud().catch((err) => {
      console.warn("Background cloud sync error:", err);
    });
  }

  async syncToCloud(): Promise<void> {
    if (!isSupabaseConfigured()) return;

    // Safety: If cloud sync is currently in progress, wait for it
    if (this.cloudSyncPromise) {
      await this.cloudSyncPromise;
    }

    if (this.cloudUploadPromise) {
      await this.cloudUploadPromise;
      return;
    }

    this.cloudUploadPromise = (async () => {
      try {
        if (!this.hasEverSyncedFromCloud) {
          await this.syncFromCloud(true);
        }

        const client = createAdminSupabaseClient();
        if (!client) return;

        const raw = this.toJSONString();
        await client.storage
          .from("pgms-state")
          .upload("pgms-storage.json", raw, {
            upsert: true,
            contentType: "application/json",
          });
        this.lastCloudSync = Date.now();
        this.hasEverSyncedFromCloud = true;
      } catch (e) {
        console.warn("Failed to sync storage to Supabase:", e);
      } finally {
        this.cloudUploadPromise = null;
      }
    })();

    await this.cloudUploadPromise;
  }

  async syncFromCloud(force = false): Promise<void> {
    if (!isSupabaseConfigured()) return;

    // If an active sync is already in flight, await it!
    if (this.cloudSyncPromise) {
      await this.cloudSyncPromise;
      if (!force) return;
    }

    const now = Date.now();
    if (!force && this.hasEverSyncedFromCloud && now - this.lastCloudSync < 2000) {
      return;
    }

    this.cloudSyncPromise = (async () => {
      try {
        const client = createAdminSupabaseClient();
        if (!client) return;

        let storageDownloaded = false;
        try {
          const { data, error } = await client.storage
            .from("pgms-state")
            .download("pgms-storage.json");

          if (!error && data) {
            const text = await data.text();
            this.populateFromJSON(text);
            this.lastCloudSync = Date.now();
            this.hasEverSyncedFromCloud = true;
            storageDownloaded = true;
            try {
              const dir = path.dirname(STORAGE_PATH);
              if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
              }
              fs.writeFileSync(STORAGE_PATH, text, "utf-8");
            } catch { }
            if (STORAGE_PATH !== LOCAL_STORAGE_PATH) {
              try {
                if (fs.existsSync(LOCAL_STORAGE_DIR)) {
                  fs.writeFileSync(LOCAL_STORAGE_PATH, text, "utf-8");
                }
              } catch { }
            }
          }
        } catch (storageErr) {
          console.warn("Supabase storage download warning:", storageErr);
        }

        // Always merge DBMS data to ensure the in-memory state has the latest records
        // (storage JSON may be stale relative to direct DB writes)
        try {
          const [stuRes, teamRes, memRes] = await Promise.all([
            client.from("students").select("*"),
            client.from("teams").select("*"),
            client.from("team_memberships").select("*"),
          ]);

          if (stuRes.data && stuRes.data.length > 0) {
            // Merge: add any DB records not already in memory
            const stuMap = new Map(this.students.map((s) => [s.id, s]));
            for (const s of stuRes.data as Student[]) {
              stuMap.set(s.id, s); // DB record wins (freshest)
            }
            this.students = Array.from(stuMap.values());
          }

          if (teamRes.data && teamRes.data.length > 0) {
            const teamMap = new Map(this.teams.map((t) => [t.id, t]));
            for (const t of teamRes.data as Team[]) {
              teamMap.set(t.id, t);
            }
            this.teams = Array.from(teamMap.values());
          }

          if (memRes.data && memRes.data.length > 0) {
            const memMap = new Map(this.memberships.map((m) => [m.id, m]));
            for (const m of memRes.data as TeamMembership[]) {
              memMap.set(m.id, m);
            }
            this.memberships = Array.from(memMap.values());
          }

          // If storage also failed, fetch the remaining tables
          if (!storageDownloaded || this.semesters.length === 0 || this.courses.length === 0) {
            const [semRes, crsRes, offRes, reqRes] = await Promise.all([
              client.from("semesters").select("*").order("start_date", { ascending: false }),
              client.from("courses").select("*").order("code"),
              client.from("course_offerings").select("*"),
              client.from("team_join_requests").select("*"),
            ]);
            if (semRes.data && semRes.data.length > 0) this.semesters = semRes.data as Semester[];
            if (crsRes.data && crsRes.data.length > 0) this.courses = crsRes.data as Course[];
            if (offRes.data && offRes.data.length > 0) this.offerings = offRes.data as CourseOffering[];
            if (reqRes.data && reqRes.data.length > 0) this.joinRequests = reqRes.data as TeamJoinRequest[];
          }

          this.hasEverSyncedFromCloud = true;
          this.lastCloudSync = Date.now();
        } catch (dbErr) {
          console.warn("Supabase DBMS table sync warning:", dbErr);
        }
      } catch (e) {
        console.warn("Failed to pull from Supabase storage:", e);
      } finally {
        this.cloudSyncPromise = null;
      }
    })();

    await this.cloudSyncPromise;
  }

  // Concurrency mutex lock for atomic operations
  private locks = new Map<string, Promise<void>>();

  async acquireLock(key: string): Promise<() => void> {
    while (this.locks.has(key)) {
      await this.locks.get(key);
    }
    let resolveLock: () => void = () => { };
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
if (!globalForDB.pgmsDB || typeof (globalForDB.pgmsDB as any).syncFromCloud !== "function") {
  globalForDB.pgmsDB = new InMemoryDB();
} else {
  // Ensure prototype is always updated across Next.js Turbopack / Webpack HMR
  Object.setPrototypeOf(globalForDB.pgmsDB, InMemoryDB.prototype);
}

// Fallback safety guards in case an existing global object lacks the methods
if (typeof (globalForDB.pgmsDB as any).syncFromCloud !== "function") {
  (globalForDB.pgmsDB as any).syncFromCloud = async function (force = false) {
    return InMemoryDB.prototype.syncFromCloud.call(this, force);
  };
}
if (typeof (globalForDB.pgmsDB as any).syncToCloud !== "function") {
  (globalForDB.pgmsDB as any).syncToCloud = async function () {
    return InMemoryDB.prototype.syncToCloud.call(this);
  };
}

export const db = globalForDB.pgmsDB;

export class DataService {
  static isSupabaseConfigured(): boolean {
    return isSupabaseConfigured();
  }

  static async syncFromCloud(force = false): Promise<void> {
    if (typeof db?.syncFromCloud === "function") {
      await db.syncFromCloud(force);
    }
  }

  static async syncToCloud(): Promise<void> {
    if (typeof db?.syncToCloud === "function") {
      await db.syncToCloud();
    }
  }

  // -------------------------------------------------------------
  // SEMESTERS
  // -------------------------------------------------------------
  static async getSemesters(): Promise<Semester[]> {
    await this.syncFromCloud();
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
    await this.syncFromCloud();
    const newSem: Semester = {
      id: `sem-${Date.now()}`,
      ...input,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (this.isSupabaseConfigured()) {
      try {
        const client = createAdminSupabaseClient();
        if (client) {
          await client.from("semesters").insert(newSem);
        }
      } catch (e) {
        console.warn("Supabase DBMS create semester fallback:", e);
      }
    }

    db.semesters.push(newSem);
    db.saveToDisk();
    await this.syncToCloud();

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
    await this.syncFromCloud();
    const sem = db.semesters.find((s) => s.id === id);
    if (!sem) return null;
    Object.assign(sem, updates, { updated_at: new Date().toISOString() });

    if (this.isSupabaseConfigured()) {
      try {
        const client = createAdminSupabaseClient();
        if (client) {
          await client.from("semesters").update(updates).eq("id", id);
        }
      } catch (e) {
        console.warn("Supabase DBMS update semester fallback:", e);
      }
    }

    db.saveToDisk();
    await this.syncToCloud();

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
    await this.syncFromCloud();
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
    await this.syncFromCloud();
    const newCourse: Course = {
      id: `crs-${Date.now()}`,
      ...input,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (this.isSupabaseConfigured()) {
      try {
        const client = createAdminSupabaseClient();
        if (client) {
          await client.from("courses").insert(newCourse);
        }
      } catch (e) {
        console.warn("Supabase DBMS create course fallback:", e);
      }
    }

    db.courses.push(newCourse);
    db.saveToDisk();
    await this.syncToCloud();

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
    await this.syncFromCloud();
    const course = db.courses.find((c) => c.id === id);
    if (!course) return null;
    Object.assign(course, updates, { updated_at: new Date().toISOString() });

    if (this.isSupabaseConfigured()) {
      try {
        const client = createAdminSupabaseClient();
        if (client) {
          await client.from("courses").update(updates).eq("id", id);
        }
      } catch (e) {
        console.warn("Supabase DBMS update course fallback:", e);
      }
    }

    db.saveToDisk();
    await this.syncToCloud();

    await this.logAuditEvent({
      action: "UPDATE_COURSE",
      targetType: "COURSE",
      targetId: id,
      details: updates,
    });
    return course;
  }

  static async deleteCourse(id: string): Promise<boolean> {
    await this.syncFromCloud();
    const courseIdx = db.courses.findIndex((c) => c.id === id);
    if (courseIdx === -1) throw new Error("Course not found");

    const course = db.courses[courseIdx];

    if (this.isSupabaseConfigured()) {
      try {
        const client = createAdminSupabaseClient();
        if (client) {
          await client.from("courses").delete().eq("id", id);
        }
      } catch (e) {
        console.warn("Supabase DBMS delete course fallback:", e);
      }
    }

    const offeringIds = db.offerings.filter((o) => o.course_id === id).map((o) => o.id);
    const teamIds = db.teams.filter((t) => offeringIds.includes(t.course_offering_id)).map((t) => t.id);

    db.memberships = db.memberships.filter((m) => !teamIds.includes(m.team_id));
    db.credentials = (db.credentials || []).filter((c) => !teamIds.includes(c.team_id || ""));
    db.joinRequests = (db.joinRequests || []).filter((r) => !teamIds.includes(r.team_id));
    db.teams = db.teams.filter((t) => !offeringIds.includes(t.course_offering_id));
    db.offerings = db.offerings.filter((o) => o.course_id !== id);
    db.courses.splice(courseIdx, 1);

    db.saveToDisk();
    await this.syncToCloud();

    await this.logAuditEvent({
      action: "DELETE_COURSE",
      targetType: "COURSE",
      targetId: id,
      details: { courseId: id, code: course.code },
    });
    return true;
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
    await this.syncFromCloud();
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
      max_teams_limit: input.max_teams_limit ?? 20,
      topic_enabled: input.topic_enabled ?? false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    db.offerings.push(newOffering);
    db.saveToDisk();
    await this.syncToCloud();
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

    if (updates.section) {
      const trimmedSec = updates.section.trim();
      const duplicate = db.offerings.some(
        (o) =>
          o.id !== id &&
          o.course_id === offering.course_id &&
          o.semester_id === offering.semester_id &&
          o.section.toLowerCase() === trimmedSec.toLowerCase()
      );
      if (duplicate) {
        throw new Error(
          `Section "${trimmedSec}" already exists for this course and semester.`
        );
      }
      updates.section = trimmedSec;
    }

    // Updating offering configuration strictly applies to future registrations.
    // Existing registered teams, active memberships, and presentation slots remain fully preserved.
    Object.assign(offering, updates, { updated_at: new Date().toISOString() });

    if (this.isSupabaseConfigured()) {
      try {
        const client = createAdminSupabaseClient();
        if (client) {
          await client.from("course_offerings").update(updates).eq("id", id);
        }
      } catch (e) {
        console.warn("Supabase DBMS update offering fallback:", e);
      }
    }

    db.saveToDisk();
    await this.syncToCloud();
    await this.logAuditEvent({
      action: "UPDATE_COURSE_OFFERING",
      targetType: "COURSE_OFFERING",
      targetId: id,
      details: updates,
    });
    return this.getCourseOfferingById(id);
  }

  static async deleteCourseOffering(id: string): Promise<boolean> {
    await this.syncFromCloud();
    const offeringIdx = db.offerings.findIndex((o) => o.id === id);
    if (offeringIdx === -1) throw new Error("Course offering not found");

    const teamIds = db.teams.filter((t) => t.course_offering_id === id).map((t) => t.id);

    if (this.isSupabaseConfigured()) {
      try {
        const client = createAdminSupabaseClient();
        if (client) {
          await client.from("course_offerings").delete().eq("id", id);
        }
      } catch (e) {
        console.warn("Supabase DBMS delete offering fallback:", e);
      }
    }

    db.memberships = db.memberships.filter((m) => !teamIds.includes(m.team_id));
    db.credentials = (db.credentials || []).filter((c) => !teamIds.includes(c.team_id || ""));
    db.joinRequests = (db.joinRequests || []).filter((r) => r.course_offering_id !== id);
    db.teams = db.teams.filter((t) => t.course_offering_id !== id);
    db.offerings.splice(offeringIdx, 1);

    db.saveToDisk();
    await this.syncToCloud();

    await this.logAuditEvent({
      action: "DELETE_COURSE_OFFERING",
      targetType: "COURSE_OFFERING",
      targetId: id,
      details: { offeringId: id },
    });
    return true;
  }

  // -------------------------------------------------------------
  // TEAMS & PUBLIC DIRECTORY
  // -------------------------------------------------------------
  static async getTeamsByOffering(offeringId: string): Promise<Team[]> {
    await this.syncFromCloud();
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
    await this.syncFromCloud();
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
    const join_requests = db.joinRequests
      ? db.joinRequests.filter((r) => r.team_id === team.id && r.status === "PENDING")
      : [];

    return {
      ...team,
      course_offering: offering || undefined,
      memberships: activeMemberships,
      leader,
      registered_count,
      available_slots,
      join_requests,
    };
  }

  // -------------------------------------------------------------
  // PRESENTATION NUMBERS AVAILABILITY
  // -------------------------------------------------------------
  static async getAvailablePresentationNumbers(offeringId: string): Promise<{
    number: number;
    label: string;
    isTaken: boolean;
    takenByTeam?: string;
  }[]> {
    await this.syncFromCloud();
    const offering = db.offerings.find((o) => o.id === offeringId);
    const configuredLimit = Number(offering?.max_teams_limit) > 0 ? Number(offering?.max_teams_limit) : 20;
    const existingTeams = db.teams.filter((t) => t.course_offering_id === offeringId);
    // Ensure limit is at least as large as the highest presentation number of existing registered teams
    // so editing an offering's slot limit never cuts off or orphans already registered teams
    const maxExistingSlot = existingTeams.reduce(
      (max, t) => Math.max(max, t.presentation_number || 0),
      0
    );
    const limit = Math.max(configuredLimit, maxExistingSlot);

    const result = [];
    for (let i = 1; i <= limit; i++) {
      const takenTeam = existingTeams.find((t) => t.presentation_number === i);
      const suffix =
        i === 1 ? "1st" : i === 2 ? "2nd" : i === 3 ? "3rd" : `${i}th`;
      result.push({
        number: i,
        label: `${suffix} Team (Slot ${i})`,
        isTaken: !!takenTeam,
        takenByTeam: takenTeam?.team_name,
      });
    }
    return result;
  }

  // -------------------------------------------------------------
  // MULTI-STEP ATOMIC TEAM REGISTRATION
  // -------------------------------------------------------------
  static async registerTeamMultiStep(
    payload: MultiStepRegisterTeamPayload
  ): Promise<TeamCreationResult> {
    const releaseLock = await db.acquireLock(`offering:${payload.courseOfferingId}`);
    try {
      const offering = db.offerings.find((o) => o.id === payload.courseOfferingId);
      if (!offering) throw new Error("Course offering not found");

      if (offering.registration_status !== "OPEN") {
        throw new Error(
          `Registration for this course is ${offering.registration_status}. Team creation is unavailable.`
        );
      }

      if (new Date() > new Date(offering.registration_deadline)) {
        throw new Error("Registration deadline has passed for this subject.");
      }

      const minCap = offering.min_team_capacity || 2;
      const maxCap = offering.max_team_capacity || 5;
      if (payload.capacity < minCap || payload.capacity > maxCap) {
        throw new Error(`Team size must be between ${minCap} and ${maxCap} members.`);
      }

      const maxTeamsLimit = Number(offering.max_teams_limit) > 0 ? Number(offering.max_teams_limit) : 20;
      if (payload.presentation_number < 1 || payload.presentation_number > maxTeamsLimit) {
        throw new Error(`Presentation team number must be between 1 and ${maxTeamsLimit}.`);
      }

      // Check presentation number collision
      const existingTeamWithNumber = db.teams.find(
        (t) =>
          t.course_offering_id === payload.courseOfferingId &&
          t.presentation_number === payload.presentation_number
      );
      if (existingTeamWithNumber) {
        throw new Error(
          `Presentation Team #${payload.presentation_number} is already taken by "${existingTeamWithNumber.team_name}". Please choose another available team number.`
        );
      }

      // Validate leader ID format
      const leaderNormId = normalizeStudentId(payload.leaderStudentId);
      if (!leaderNormId) throw new Error("Team Leader Student ID is required.");

      // Check leader isn't already in an active team for this offering
      let leaderStudent = db.students.find((s) => s.normalized_student_id === leaderNormId);
      if (leaderStudent) {
        const alreadyRegistered = db.memberships.some(
          (m) =>
            m.student_id === leaderStudent!.id &&
            m.course_offering_id === payload.courseOfferingId &&
            m.status === "ACTIVE"
        );
        if (alreadyRegistered) {
          throw new Error(
            `Team Leader (${payload.leaderStudentId}) is already registered in an active team for this course.`
          );
        }
        leaderStudent.full_name = payload.leaderName.trim();
        leaderStudent.updated_at = new Date().toISOString();
      } else {
        leaderStudent = {
          id: `stu-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          full_name: payload.leaderName.trim(),
          student_id: payload.leaderStudentId.trim(),
          normalized_student_id: leaderNormId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        db.students.push(leaderStudent);
      }

      // Validate member students
      const allStudentIds = [leaderNormId];
      const memberStudents: Student[] = [];

      for (const mem of payload.members) {
        if (!mem.name?.trim() || !mem.studentId?.trim()) continue;
        const memNormId = normalizeStudentId(mem.studentId);
        if (allStudentIds.includes(memNormId)) {
          throw new Error(
            `Duplicate student ID (${mem.studentId}) found in registration list. Each student can only be listed once.`
          );
        }
        allStudentIds.push(memNormId);

        let memStudent = db.students.find((s) => s.normalized_student_id === memNormId);
        if (memStudent) {
          const alreadyRegistered = db.memberships.some(
            (m) =>
              m.student_id === memStudent!.id &&
              m.course_offering_id === payload.courseOfferingId &&
              m.status === "ACTIVE"
          );
          if (alreadyRegistered) {
            throw new Error(
              `Student ${mem.name} (${mem.studentId}) is already registered in another team for this course.`
            );
          }
          memStudent.full_name = mem.name.trim();
          memStudent.updated_at = new Date().toISOString();
        } else {
          memStudent = {
            id: `stu-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            full_name: mem.name.trim(),
            student_id: mem.studentId.trim(),
            normalized_student_id: memNormId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          db.students.push(memStudent);
        }
        memberStudents.push(memStudent);
      }

      const totalInitialCount = 1 + memberStudents.length;
      if (totalInitialCount > payload.capacity) {
        throw new Error(
          `Total registered members (${totalInitialCount}) exceeds chosen team size (${payload.capacity}).`
        );
      }

      // Team Name resolution: optional, fallback to "Team {presentation_number}"
      const finalTeamName =
        payload.teamName?.trim() || `Team ${payload.presentation_number}`;

      // Duplicate team name check in this offering
      const duplicateName = db.teams.some(
        (t) =>
          t.course_offering_id === payload.courseOfferingId &&
          t.team_name.toLowerCase() === finalTeamName.toLowerCase()
      );
      if (duplicateName) {
        throw new Error(
          `A team named "${finalTeamName}" already exists in this section. Please select another name.`
        );
      }

      const teamId = `team-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const leaderMembershipId = `mem-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

      // If all slots are already filled, team is FULL.
      // If there are open slots (e.g. capacity is 5, registered with 2, 3, or 4 members):
      // Respect payload.isOpenForMembers toggle! If true -> "OPEN", if false -> "CLOSED".
      let initialStatus: "OPEN" | "FULL" | "CLOSED" = "FULL";
      if (totalInitialCount >= payload.capacity) {
        initialStatus = "FULL";
      } else {
        initialStatus = payload.isOpenForMembers === true ? "OPEN" : "CLOSED";
      }

      const newTeam: Team = {
        id: teamId,
        course_offering_id: payload.courseOfferingId,
        presentation_number: payload.presentation_number,
        team_name: finalTeamName,
        capacity: payload.capacity,
        topic: payload.topic?.trim() || null,
        leader_membership_id: leaderMembershipId,
        status: initialStatus,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      db.teams.push(newTeam);

      // Create Leader Membership
      db.memberships.push({
        id: leaderMembershipId,
        team_id: teamId,
        student_id: leaderStudent.id,
        course_offering_id: payload.courseOfferingId,
        role: "LEADER",
        status: "ACTIVE",
        joined_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      // Create Member Memberships
      for (const memStudent of memberStudents) {
        db.memberships.push({
          id: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          team_id: teamId,
          student_id: memStudent.id,
          course_offering_id: payload.courseOfferingId,
          role: "MEMBER",
          status: "ACTIVE",
          joined_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }

      // Generate credentials for compatibility
      const teamManagementToken = generateToken("pgms_tm_");
      db.credentials.push({
        id: `cred-tm-${Date.now()}`,
        credential_type: "TEAM_MANAGEMENT",
        team_id: teamId,
        membership_id: null,
        token_hash: hashToken(teamManagementToken),
        created_at: new Date().toISOString(),
        expires_at: null,
        revoked_at: null,
        last_used_at: null,
      });

      // Persist to disk immediately so server restarts never lose registered teams
      db.saveToDisk();

      // Mirror to Supabase PostgreSQL DBMS
      if (this.isSupabaseConfigured()) {
        try {
          const client = createAdminSupabaseClient();
          if (client) {
            // Upsert leader student
            const { data: exLeader } = await client
              .from("students")
              .select("id")
              .eq("normalized_student_id", leaderStudent.normalized_student_id)
              .maybeSingle();
            if (exLeader) {
              leaderStudent.id = exLeader.id;
              await client.from("students").update({
                full_name: leaderStudent.full_name,
                student_id: leaderStudent.student_id,
                updated_at: leaderStudent.updated_at,
              }).eq("id", exLeader.id);
            } else {
              await client.from("students").insert({
                id: leaderStudent.id,
                full_name: leaderStudent.full_name,
                student_id: leaderStudent.student_id,
                normalized_student_id: leaderStudent.normalized_student_id,
                created_at: leaderStudent.created_at,
                updated_at: leaderStudent.updated_at,
              });
            }

            // Upsert member students
            for (const memStudent of memberStudents) {
              const { data: exMem } = await client
                .from("students")
                .select("id")
                .eq("normalized_student_id", memStudent.normalized_student_id)
                .maybeSingle();
              if (exMem) {
                memStudent.id = exMem.id;
                await client.from("students").update({
                  full_name: memStudent.full_name,
                  student_id: memStudent.student_id,
                  updated_at: memStudent.updated_at,
                }).eq("id", exMem.id);
              } else {
                await client.from("students").insert({
                  id: memStudent.id,
                  full_name: memStudent.full_name,
                  student_id: memStudent.student_id,
                  normalized_student_id: memStudent.normalized_student_id,
                  created_at: memStudent.created_at,
                  updated_at: memStudent.updated_at,
                });
              }
            }

            // Insert team (pass 1: leader_membership_id null to avoid FK cycle)
            await client.from("teams").upsert({
              id: newTeam.id,
              course_offering_id: newTeam.course_offering_id,
              presentation_number: newTeam.presentation_number,
              team_name: newTeam.team_name,
              capacity: newTeam.capacity,
              topic: newTeam.topic,
              leader_membership_id: null,
              status: newTeam.status,
              created_at: newTeam.created_at,
              updated_at: newTeam.updated_at,
            }, { onConflict: "id" });

            // Insert leader membership
            await client.from("team_memberships").upsert({
              id: leaderMembershipId,
              team_id: teamId,
              student_id: leaderStudent.id,
              course_offering_id: payload.courseOfferingId,
              role: "LEADER",
              status: "ACTIVE",
              joined_at: newTeam.created_at,
              updated_at: newTeam.updated_at,
            }, { onConflict: "id" });

            // Insert member memberships
            for (const memStudent of memberStudents) {
              const memObj = db.memberships.find(m => m.team_id === teamId && m.student_id === memStudent.id);
              if (memObj) {
                await client.from("team_memberships").upsert({
                  id: memObj.id,
                  team_id: teamId,
                  student_id: memStudent.id,
                  course_offering_id: payload.courseOfferingId,
                  role: "MEMBER",
                  status: "ACTIVE",
                  joined_at: memObj.joined_at,
                  updated_at: memObj.updated_at,
                }, { onConflict: "id" });
              }
            }

            // Pass 2: update leader_membership_id on team
            await client.from("teams").update({
              leader_membership_id: leaderMembershipId,
            }).eq("id", teamId);
          }
        } catch (e) {
          console.warn("Supabase DBMS team registration sync fallback:", e);
        }
      }

      await this.syncToCloud();

      const course = db.courses.find((c) => c.id === offering.course_id);

      return {
        success: true,
        teamId,
        teamName: newTeam.team_name,
        presentationNumber: newTeam.presentation_number,
        membershipId: leaderMembershipId,
        teamManagementToken,
        offeringSlug: course?.slug,
        message: `Team "${newTeam.team_name}" registered successfully as Presentation Team #${newTeam.presentation_number}!`,
      };
    } finally {
      releaseLock();
    }
  }

  // -------------------------------------------------------------
  // TEAM LEADER LOGIN
  // -------------------------------------------------------------
  static async leaderLogin(
    leaderName: string,
    leaderStudentId: string
  ): Promise<LeaderLoginResult> {
    await this.syncFromCloud(true);
    const normId = normalizeStudentId(leaderStudentId);
    if (!normId) {
      return { success: false, error: "Please provide a valid Student ID." };
    }

    const cleanInputName = leaderName.trim().toLowerCase().replace(/\s+/g, " ");
    const rawIdDigits = leaderStudentId.replace(/\D/g, "");

    // 1. Find student record with resilient matching (normalized ID, raw ID, or pure digits)
    let student = db.students.find((s) => {
      const sNorm = s.normalized_student_id || normalizeStudentId(s.student_id);
      return (
        sNorm === normId ||
        s.student_id.trim() === leaderStudentId.trim() ||
        (rawIdDigits.length >= 6 && s.student_id.replace(/\D/g, "") === rawIdDigits)
      );
    });

    // 2. Direct Supabase DBMS lookup fallback if not in memory
    if (!student && this.isSupabaseConfigured()) {
      try {
        const client = createAdminSupabaseClient();
        if (client) {
          const { data: dbStudents } = await client
            .from("students")
            .select("*")
            .or(`normalized_student_id.eq.${normId},student_id.eq.${leaderStudentId.trim()}`);
          if (dbStudents && dbStudents.length > 0) {
            const foundStudent = dbStudents[0];
            student = foundStudent;
            if (!db.students.some((s) => s.id === foundStudent.id)) {
              db.students.push(foundStudent);
            }
          }
        }
      } catch (err) {
        console.warn("Supabase DBMS student lookup fallback error:", err);
      }
    }

    if (!student) {
      return {
        success: false,
        error: `No student record found with ID "${leaderStudentId}". Please verify your ID.`,
      };
    }

    const cleanDbName = student.full_name.trim().toLowerCase().replace(/\s+/g, " ");
    const nameMatches =
      cleanDbName === cleanInputName ||
      cleanDbName.includes(cleanInputName) ||
      cleanInputName.includes(cleanDbName);

    if (!nameMatches) {
      return {
        success: false,
        error: `The name "${leaderName}" does not match the registered leader name for ID "${leaderStudentId}".`,
      };
    }

    // Find active leader membership first
    let leaderMem = db.memberships.find(
      (m) => m.student_id === student.id && m.role === "LEADER" && m.status === "ACTIVE"
    );

    // If not marked LEADER explicitly, check if student is any active member of an active team
    if (!leaderMem) {
      leaderMem = db.memberships.find(
        (m) => m.student_id === student.id && m.status === "ACTIVE"
      );
    }

    // Direct Supabase DBMS membership lookup fallback
    if (!leaderMem && this.isSupabaseConfigured()) {
      try {
        const client = createAdminSupabaseClient();
        if (client) {
          const { data: dbMems } = await client
            .from("team_memberships")
            .select("*")
            .eq("student_id", student.id)
            .eq("status", "ACTIVE");
          if (dbMems && dbMems.length > 0) {
            const memsList = dbMems as TeamMembership[];
            leaderMem = memsList.find((m: TeamMembership) => m.role === "LEADER") || memsList[0];
            for (const m of memsList) {
              if (!db.memberships.some((existing) => existing.id === m.id)) {
                db.memberships.push(m);
              }
            }
          }
        }
      } catch (err) {
        console.warn("Supabase DBMS membership lookup fallback error:", err);
      }
    }

    if (!leaderMem) {
      return {
        success: false,
        error: `Student "${student.full_name}" is not registered in any active presentation team.`,
      };
    }

    let team = await this.getTeamById(leaderMem.team_id, true);
    if (!team && this.isSupabaseConfigured()) {
      try {
        const client = createAdminSupabaseClient();
        if (client) {
          const { data: dbTeam } = await client
            .from("teams")
            .select("*")
            .eq("id", leaderMem.team_id)
            .maybeSingle();
          if (dbTeam) {
            if (!db.teams.some((t) => t.id === dbTeam.id)) {
              db.teams.push(dbTeam);
            }
            team = await this.getTeamById(dbTeam.id, true);
          }
        }
      } catch (err) {
        console.warn("Supabase DBMS team lookup fallback error:", err);
      }
    }

    if (!team) {
      return { success: false, error: "Associated team could not be loaded." };
    }

    return {
      success: true,
      team,
      leaderStudent: student,
      leaderMembership: leaderMem,
    };
  }

  // -------------------------------------------------------------
  // TEAM SLIDES & FILE UPLOAD
  // -------------------------------------------------------------
  static async updateTeamSlides(
    teamId: string,
    data: { slide_link?: string; slide_file_name?: string; slide_file_url?: string }
  ): Promise<Team> {
    const team = db.teams.find((t) => t.id === teamId);
    if (!team) throw new Error("Team not found");

    if (data.slide_link !== undefined) team.slide_link = data.slide_link.trim() || null;
    if (data.slide_file_name !== undefined) team.slide_file_name = data.slide_file_name || null;
    if (data.slide_file_url !== undefined) team.slide_file_url = data.slide_file_url || null;
    team.updated_at = new Date().toISOString();
    db.saveToDisk();

    return (await this.getTeamById(teamId, true))!;
  }

  static async updateTeamName(teamId: string, newName: string): Promise<Team> {
    const team = db.teams.find((t) => t.id === teamId);
    if (!team) throw new Error("Team not found");

    const trimmed = newName.trim();
    if (!trimmed) throw new Error("Team name cannot be empty");

    const duplicate = db.teams.some(
      (t) =>
        t.id !== teamId &&
        t.course_offering_id === team.course_offering_id &&
        t.team_name.toLowerCase() === trimmed.toLowerCase()
    );
    if (duplicate) {
      throw new Error(`Another team named "${trimmed}" already exists in this section.`);
    }

    team.team_name = trimmed;
    team.updated_at = new Date().toISOString();
    db.saveToDisk();
    return (await this.getTeamById(teamId, true))!;
  }

  static async toggleTeamStatus(teamId: string, newStatus: "OPEN" | "CLOSED"): Promise<Team> {
    const team = db.teams.find((t) => t.id === teamId);
    if (!team) throw new Error("Team not found");

    const activeMembers = db.memberships.filter(
      (m) => m.team_id === team.id && m.status === "ACTIVE"
    );

    if (newStatus === "OPEN" && activeMembers.length >= team.capacity) {
      throw new Error("Cannot open registration: team is already at full capacity.");
    }

    team.status = newStatus;
    team.updated_at = new Date().toISOString();
    db.saveToDisk();
    return (await this.getTeamById(teamId, true))!;
  }

  // -------------------------------------------------------------
  // JOIN REQUESTS WORKFLOW
  // -------------------------------------------------------------
  static async requestJoinTeam(payload: {
    teamId: string;
    studentName: string;
    studentId: string;
  }): Promise<JoinTeamResult> {
    const team = db.teams.find((t) => t.id === payload.teamId);
    if (!team) throw new Error("Team not found");

    const offering = db.offerings.find((o) => o.id === team.course_offering_id);
    if (!offering || offering.registration_status !== "OPEN") {
      throw new Error("Registration for this course is currently closed.");
    }

    if (team.status === "CLOSED") {
      throw new Error("This team is currently closed for new member requests.");
    }

    const activeMembers = db.memberships.filter(
      (m) => m.team_id === team.id && m.status === "ACTIVE"
    );
    if (activeMembers.length >= team.capacity) {
      throw new Error("This team is already at full capacity.");
    }

    const normId = normalizeStudentId(payload.studentId);
    if (!normId) throw new Error("A valid Student ID is required.");

    // Check if student already registered in an ACTIVE team in this offering
    const student = db.students.find((s) => s.normalized_student_id === normId);
    if (student) {
      const alreadyRegistered = db.memberships.some(
        (m) =>
          m.student_id === student.id &&
          m.course_offering_id === team.course_offering_id &&
          m.status === "ACTIVE"
      );
      if (alreadyRegistered) {
        throw new Error(
          `Student with ID ${payload.studentId} is already registered in a team for this course.`
        );
      }
    }

    // Check if already has a pending join request for this course offering
    const existingReq = db.joinRequests.find(
      (r) =>
        r.student_id === payload.studentId.trim() &&
        r.course_offering_id === team.course_offering_id &&
        r.status === "PENDING"
    );
    if (existingReq) {
      throw new Error(
        `You already have a pending join request for this course. Please wait for the leader to respond.`
      );
    }

    const reqId = `req-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const joinReq: TeamJoinRequest = {
      id: reqId,
      team_id: team.id,
      course_offering_id: team.course_offering_id,
      student_name: payload.studentName.trim(),
      student_id: payload.studentId.trim(),
      status: "PENDING",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    db.joinRequests.push(joinReq);
    db.saveToDisk();

    return {
      success: true,
      teamId: team.id,
      teamName: team.team_name,
      message: `Join request submitted! The team leader (${team.team_name}) can now review and accept your request.`,
    };
  }

  static async handleJoinRequest(
    requestId: string,
    action: "ACCEPT" | "REJECT"
  ): Promise<{ success: boolean; message: string }> {
    await this.syncFromCloud();
    const req = db.joinRequests.find((r) => r.id === requestId);
    if (!req) throw new Error("Join request not found");
    if (req.status !== "PENDING") {
      throw new Error(`Request has already been ${req.status.toLowerCase()}.`);
    }

    const team = db.teams.find((t) => t.id === req.team_id);
    if (!team) throw new Error("Associated team not found");

    if (action === "REJECT") {
      req.status = "REJECTED";
      req.updated_at = new Date().toISOString();
      if (this.isSupabaseConfigured()) {
        try {
          const client = createAdminSupabaseClient();
          if (client) {
            await client.from("team_join_requests").update({
              status: "REJECTED",
              updated_at: req.updated_at,
            }).eq("id", req.id);
          }
        } catch (e) {
          console.warn("Supabase DBMS reject join request fallback:", e);
        }
      }
      db.saveToDisk();
      await this.syncToCloud();
      return { success: true, message: `Request from ${req.student_name} was rejected.` };
    }

    // Action is ACCEPT:
    const activeMembers = db.memberships.filter(
      (m) => m.team_id === team.id && m.status === "ACTIVE"
    );
    if (activeMembers.length >= team.capacity) {
      throw new Error("Cannot accept: Team is already at full capacity.");
    }

    const normId = normalizeStudentId(req.student_id);
    let student = db.students.find((s) => s.normalized_student_id === normId);
    if (!student) {
      student = {
        id: `stu-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        full_name: req.student_name,
        student_id: req.student_id,
        normalized_student_id: normId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      db.students.push(student);
    }

    // Check not already active in another team for this offering
    const alreadyRegistered = db.memberships.some(
      (m) =>
        m.student_id === student!.id &&
        m.course_offering_id === req.course_offering_id &&
        m.status === "ACTIVE"
    );
    if (alreadyRegistered) {
      req.status = "REJECTED";
      req.updated_at = new Date().toISOString();
      if (this.isSupabaseConfigured()) {
        try {
          const client = createAdminSupabaseClient();
          if (client) {
            await client.from("team_join_requests").update({
              status: "REJECTED",
              updated_at: req.updated_at,
            }).eq("id", req.id);
          }
        } catch { }
      }
      db.saveToDisk();
      await this.syncToCloud();
      throw new Error(
        `Student ${req.student_name} (${req.student_id}) is already registered in another team for this course.`
      );
    }

    // Create active membership
    const memId = `mem-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const newMembership: TeamMembership = {
      id: memId,
      team_id: team.id,
      student_id: student.id,
      course_offering_id: req.course_offering_id,
      role: "MEMBER",
      status: "ACTIVE",
      joined_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    db.memberships.push(newMembership);

    req.status = "ACCEPTED";
    req.updated_at = new Date().toISOString();

    // Check if team is now full
    const newActiveCount = activeMembers.length + 1;
    if (newActiveCount >= team.capacity) {
      team.status = "FULL";
    }
    team.updated_at = new Date().toISOString();

    if (this.isSupabaseConfigured()) {
      try {
        const client = createAdminSupabaseClient();
        if (client) {
          const { data: existingDbStudent } = await client
            .from("students")
            .select("id")
            .eq("normalized_student_id", normId)
            .maybeSingle();

          if (existingDbStudent) {
            student.id = existingDbStudent.id;
            newMembership.student_id = existingDbStudent.id;
            await client.from("students").update({
              full_name: student.full_name,
              student_id: student.student_id,
              updated_at: student.updated_at,
            }).eq("id", existingDbStudent.id);
          } else {
            await client.from("students").insert({
              id: student.id,
              full_name: student.full_name,
              student_id: student.student_id,
              normalized_student_id: student.normalized_student_id,
              created_at: student.created_at,
              updated_at: student.updated_at,
            });
          }

          await client.from("team_memberships").upsert({
            id: newMembership.id,
            team_id: newMembership.team_id,
            student_id: newMembership.student_id,
            course_offering_id: newMembership.course_offering_id,
            role: newMembership.role,
            status: newMembership.status,
            joined_at: newMembership.joined_at,
            updated_at: newMembership.updated_at,
          });

          await client.from("teams").update({
            status: team.status,
            updated_at: team.updated_at,
          }).eq("id", team.id);

          await client.from("team_join_requests").update({
            status: "ACCEPTED",
            updated_at: req.updated_at,
          }).eq("id", req.id);
        }
      } catch (e) {
        console.warn("Supabase DBMS handle join request fallback:", e);
      }
    }

    db.saveToDisk();
    await this.syncToCloud();

    return {
      success: true,
      message: `${req.student_name} (${req.student_id}) has been accepted into ${team.team_name}!`,
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

      const takenNums = new Set(
        db.teams
          .filter((t) => t.course_offering_id === payload.courseOfferingId)
          .map((t) => t.presentation_number)
      );
      let nextNum = 1;
      while (takenNums.has(nextNum)) nextNum++;

      const newTeam: Team = {
        id: teamId,
        course_offering_id: payload.courseOfferingId,
        presentation_number: nextNum,
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
        presentationNumber: nextNum,
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

    if (updates.capacity !== undefined && updates.capacity !== team.capacity) {
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
    await this.syncFromCloud();
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
      presentation_number?: number;
      topic?: string | null;
      slide_link?: string | null;
    }
  ): Promise<Team> {
    await this.syncFromCloud();
    const team = db.teams.find((t) => t.id === teamId);
    if (!team) throw new Error("Team not found");

    if (updates.team_name) team.team_name = updates.team_name.trim();
    if (updates.capacity) team.capacity = updates.capacity;
    if (updates.status) team.status = updates.status;

    if (updates.presentation_number !== undefined) {
      const slotNum = Number(updates.presentation_number);
      if (slotNum > 0) {
        const collision = db.teams.find(
          (t) =>
            t.id !== teamId &&
            t.course_offering_id === team.course_offering_id &&
            t.presentation_number === slotNum
        );
        if (collision) {
          throw new Error(
            `Presentation Slot #${slotNum} is already assigned to "${collision.team_name}".`
          );
        }
        team.presentation_number = slotNum;
      }
    }

    if (updates.topic !== undefined) {
      team.topic = updates.topic ? updates.topic.trim() : null;
    }

    if (updates.slide_link !== undefined) {
      team.slide_link = updates.slide_link ? updates.slide_link.trim() : null;
    }

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

    if (this.isSupabaseConfigured()) {
      try {
        const client = createAdminSupabaseClient();
        if (client) {
          await client
            .from("teams")
            .update({
              team_name: team.team_name,
              capacity: team.capacity,
              status: team.status,
              leader_membership_id: team.leader_membership_id,
              presentation_number: team.presentation_number,
              topic: team.topic,
              slide_link: team.slide_link,
              updated_at: team.updated_at,
            })
            .eq("id", teamId);
        }
      } catch (e) {
        console.warn("Supabase DBMS team update fallback:", e);
      }
    }

    await this.logAuditEvent({
      action: "ADMIN_UPDATE_TEAM",
      targetType: "TEAM",
      targetId: teamId,
      details: updates,
    });
    db.saveToDisk();
    await this.syncToCloud();

    return (await this.getTeamById(team.id, true))!;
  }

  static async adminAddMember(payload: {
    teamId: string;
    studentName: string;
    studentId: string;
  }): Promise<Team> {
    await this.syncFromCloud();
    let team = db.teams.find((t) => t.id === payload.teamId);
    if (!team && this.isSupabaseConfigured()) {
      try {
        const client = createAdminSupabaseClient();
        if (client) {
          const { data: dbTeam } = await client
            .from("teams")
            .select("*")
            .eq("id", payload.teamId)
            .maybeSingle();
          if (dbTeam) {
            team = dbTeam as Team;
            if (!db.teams.some((t) => t.id === dbTeam.id)) {
              db.teams.push(dbTeam as Team);
            }
          }
        }
      } catch (e) { }
    }
    if (!team) throw new Error("Team not found");

    const cleanStudentId = formatStudentId(payload.studentId) || payload.studentId.trim();
    const normId = normalizeStudentId(cleanStudentId);
    if (!normId) throw new Error("Please provide a valid Student ID");

    // Check if student already registered in this course offering
    const activeMembersInOffering = db.memberships.filter(
      (m) => m.course_offering_id === team.course_offering_id && m.status === "ACTIVE"
    );
    const existingStudentIds = new Set(
      db.students
        .filter((s) => s.normalized_student_id === normId || normalizeStudentId(s.student_id) === normId)
        .map((s) => s.id)
    );
    const isAlreadyRegistered = activeMembersInOffering.some((m) =>
      existingStudentIds.has(m.student_id)
    );
    if (isAlreadyRegistered) {
      throw new Error(`Student with ID ${payload.studentId} is already registered in a team for this course.`);
    }

    // Look up student in memory or directly in Supabase DBMS
    let student = db.students.find(
      (s) => s.normalized_student_id === normId || normalizeStudentId(s.student_id) === normId
    );
    if (!student && this.isSupabaseConfigured()) {
      try {
        const client = createAdminSupabaseClient();
        if (client) {
          let { data: dbStu } = await client
            .from("students")
            .select("*")
            .eq("normalized_student_id", normId)
            .maybeSingle();
          if (!dbStu) {
            const { data: dbStuRaw } = await client
              .from("students")
              .select("*")
              .eq("student_id", cleanStudentId)
              .maybeSingle();
            dbStu = dbStuRaw;
          }
          if (dbStu) {
            student = dbStu as Student;
            const existingIdx = db.students.findIndex((s) => s.id === dbStu!.id);
            if (existingIdx !== -1) {
              db.students[existingIdx] = student;
            } else {
              db.students.push(student);
            }
          }
        }
      } catch (err) {
        console.warn("Supabase student lookup warning:", err);
      }
    }

    if (student) {
      student.full_name = payload.studentName.trim();
      student.student_id = cleanStudentId;
      student.normalized_student_id = normId;
      student.updated_at = new Date().toISOString();
    } else {
      student = {
        id: `stu-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        full_name: payload.studentName.trim(),
        student_id: cleanStudentId,
        normalized_student_id: normId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      db.students.push(student);
    }

    const memId = `mem-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const newMembership: TeamMembership = {
      id: memId,
      team_id: team.id,
      student_id: student.id,
      course_offering_id: team.course_offering_id,
      role: team.leader_membership_id ? "MEMBER" : "LEADER",
      status: "ACTIVE",
      joined_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    db.memberships.push(newMembership);
    if (!team.leader_membership_id) {
      team.leader_membership_id = memId;
    }

    const activeCount = db.memberships.filter(
      (m) => m.team_id === team.id && m.status === "ACTIVE"
    ).length;
    if (activeCount >= team.capacity) {
      team.status = "FULL";
    }

    team.updated_at = new Date().toISOString();

    if (this.isSupabaseConfigured()) {
      try {
        const client = createAdminSupabaseClient();
        if (client) {
          const { error: stuErr } = await client.from("students").upsert({
            id: student.id,
            full_name: student.full_name,
            student_id: student.student_id,
            normalized_student_id: student.normalized_student_id,
            created_at: student.created_at,
            updated_at: student.updated_at,
          }, { onConflict: "normalized_student_id" });
          if (stuErr) console.error("Supabase student upsert error:", stuErr);

          const { error: memErr } = await client.from("team_memberships").upsert({
            id: newMembership.id,
            team_id: newMembership.team_id,
            student_id: student.id,
            course_offering_id: newMembership.course_offering_id,
            role: newMembership.role,
            status: newMembership.status,
            joined_at: newMembership.joined_at,
            updated_at: newMembership.updated_at,
          }, { onConflict: "id" });
          if (memErr) console.error("Supabase membership upsert error:", memErr);

          const { error: teamErr } = await client.from("teams").update({
            status: team.status,
            leader_membership_id: team.leader_membership_id,
            updated_at: team.updated_at,
          }).eq("id", team.id);
          if (teamErr) console.error("Supabase team update error:", teamErr);
        }
      } catch (e) {
        console.warn("Supabase DBMS add member fallback:", e);
      }
    }

    await this.logAuditEvent({
      action: "ADMIN_ADD_MEMBER",
      targetType: "TEAM",
      targetId: team.id,
      details: {
        team_id: team.id,
        student_id: student.student_id,
        full_name: student.full_name,
        role: newMembership.role,
      },
    });

    db.saveToDisk();
    await this.syncToCloud();

    return (await this.getTeamById(team.id, true))!;
  }

  static async adminRemoveMember(
    membershipId: string,
    reason = "Removed by Superadmin"
  ): Promise<{ success: boolean }> {
    await this.syncFromCloud();
    let membership = db.memberships.find((m) => m.id === membershipId);
    if (!membership && this.isSupabaseConfigured()) {
      try {
        const client = createAdminSupabaseClient();
        if (client) {
          const { data: dbMem } = await client
            .from("team_memberships")
            .select("*")
            .eq("id", membershipId)
            .maybeSingle();
          if (dbMem) {
            membership = dbMem as TeamMembership;
            if (!db.memberships.some((m) => m.id === dbMem.id)) {
              db.memberships.push(dbMem as TeamMembership);
            }
          }
        }
      } catch (e) { }
    }
    if (!membership) throw new Error("Membership not found");

    let team = db.teams.find((t) => t.id === membership.team_id);
    if (!team && this.isSupabaseConfigured()) {
      try {
        const client = createAdminSupabaseClient();
        if (client) {
          const { data: dbTeam } = await client
            .from("teams")
            .select("*")
            .eq("id", membership.team_id)
            .maybeSingle();
          if (dbTeam) {
            team = dbTeam as Team;
            if (!db.teams.some((t) => t.id === dbTeam.id)) {
              db.teams.push(dbTeam as Team);
            }
          }
        }
      } catch (e) { }
    }

    const studentId = membership.student_id;

    if (team) {
      const remaining = db.memberships.filter(
        (m) => m.team_id === team.id && m.id !== membershipId && m.status === "ACTIVE"
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

    // Physically DELETE from Supabase DBMS
    if (this.isSupabaseConfigured()) {
      try {
        const client = createAdminSupabaseClient();
        if (client) {
          // Update team status and leader_membership_id in Supabase FIRST to prevent FK constraint violation
          if (team) {
            await client
              .from("teams")
              .update({
                status: team.status,
                leader_membership_id: team.leader_membership_id,
                updated_at: team.updated_at,
              })
              .eq("id", team.id);
          }

          // Delete registration credentials referencing this membership
          await client
            .from("registration_credentials")
            .delete()
            .eq("membership_id", membershipId);

          // Delete the membership completely from team_memberships
          await client
            .from("team_memberships")
            .delete()
            .eq("id", membershipId);
        }
      } catch (e) {
        console.warn("Supabase DBMS remove member fallback:", e);
      }
    }

    // Physically remove from in-memory and disk memberships
    db.memberships = db.memberships.filter((m) => m.id !== membershipId);
    if (db.credentials) {
      db.credentials = db.credentials.filter((c) => c.membership_id !== membershipId);
    }

    await this.logAuditEvent({
      action: "ADMIN_REMOVE_MEMBER",
      targetType: "MEMBERSHIP",
      targetId: membershipId,
      details: { reason, team_id: team?.id, student_id: studentId },
    });
    db.saveToDisk();
    await this.syncToCloud();

    return { success: true };
  }

  static async deleteTeam(teamId: string): Promise<boolean> {
    await this.syncFromCloud();
    const teamIdx = db.teams.findIndex((t) => t.id === teamId);
    if (teamIdx === -1) throw new Error("Team not found");

    const team = db.teams[teamIdx];

    if (this.isSupabaseConfigured()) {
      try {
        const client = createAdminSupabaseClient();
        if (client) {
          await client.from("teams").delete().eq("id", teamId);
        }
      } catch (e) {
        console.warn("Supabase DBMS delete team fallback:", e);
      }
    }

    db.memberships = db.memberships.filter((m) => m.team_id !== teamId);
    db.joinRequests = (db.joinRequests || []).filter((r) => r.team_id !== teamId);
    db.credentials = (db.credentials || []).filter((c) => c.team_id !== teamId);
    db.teams.splice(teamIdx, 1);

    await this.logAuditEvent({
      action: "DELETE_TEAM",
      targetType: "TEAM",
      targetId: teamId,
      details: {
        teamId,
        teamName: team.team_name,
        courseOfferingId: team.course_offering_id,
        presentationNumber: team.presentation_number,
      },
    });
    db.saveToDisk();
    await this.syncToCloud();

    return true;
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
    await this.syncFromCloud();
    const student = db.students.find((s) => s.id === studentId);
    if (!student) throw new Error("Student not found");

    if (updates.full_name) student.full_name = updates.full_name.trim();
    if (updates.student_id) {
      const normId = normalizeStudentId(updates.student_id);
      if (!normId) throw new Error("Invalid student ID format");
      const collision = db.students.find(
        (s) => s.id !== studentId && (s.normalized_student_id === normId || normalizeStudentId(s.student_id) === normId)
      );
      if (collision) {
        throw new Error(`Student ID "${updates.student_id}" is already assigned to ${collision.full_name}.`);
      }
      student.student_id = updates.student_id.trim();
      student.normalized_student_id = normId;
    }
    student.updated_at = new Date().toISOString();

    if (this.isSupabaseConfigured()) {
      try {
        const client = createAdminSupabaseClient();
        if (client) {
          await client
            .from("students")
            .update({
              full_name: student.full_name,
              student_id: student.student_id,
              normalized_student_id: student.normalized_student_id,
              updated_at: student.updated_at,
            })
            .eq("id", studentId);
        }
      } catch (e) {
        console.warn("Supabase DBMS update student fallback:", e);
      }
    }

    await this.logAuditEvent({
      action: "ADMIN_UPDATE_STUDENT",
      targetType: "STUDENT",
      targetId: studentId,
      details: updates,
    });

    db.saveToDisk();
    await this.syncToCloud();

    return student;
  }

  static async leaderUpdateMember(payload: {
    teamId: string;
    membershipId: string;
    fullName: string;
    studentId: string;
  }): Promise<{ success: boolean; team: Team }> {
    await this.syncFromCloud();
    const team = db.teams.find((t) => t.id === payload.teamId);
    if (!team) throw new Error("Team not found.");

    const membership = db.memberships.find((m) => m.id === payload.membershipId);
    if (!membership) throw new Error("Membership not found.");
    if (membership.team_id !== payload.teamId) {
      throw new Error("Membership does not belong to this team.");
    }

    const student = db.students.find((s) => s.id === membership.student_id);
    if (!student) throw new Error("Student record not found.");

    const newNormId = normalizeStudentId(payload.studentId);
    if (!newNormId) {
      throw new Error("Student ID must follow DIU pattern: XXX-XX-XXX (e.g. 252-35-242).");
    }

    // Check collision with another student active in the same offering
    const collision = db.students.find(
      (s) => s.id !== student.id && (s.normalized_student_id === newNormId || normalizeStudentId(s.student_id) === newNormId)
    );
    if (collision) {
      const activeInOffering = db.memberships.some(
        (m) =>
          m.student_id === collision.id &&
          m.course_offering_id === team.course_offering_id &&
          m.status === "ACTIVE" &&
          m.id !== membership.id
      );
      if (activeInOffering) {
        throw new Error(
          `Student ID "${payload.studentId}" is already registered in another team in this section (${collision.full_name}).`
        );
      }
    }

    student.full_name = payload.fullName.trim();
    student.student_id = payload.studentId.trim();
    student.normalized_student_id = newNormId;
    student.updated_at = new Date().toISOString();

    if (this.isSupabaseConfigured()) {
      try {
        const client = createAdminSupabaseClient();
        if (client) {
          await client
            .from("students")
            .update({
              full_name: student.full_name,
              student_id: student.student_id,
              normalized_student_id: student.normalized_student_id,
              updated_at: student.updated_at,
            })
            .eq("id", student.id);
        }
      } catch (e) {
        console.warn("Supabase DBMS update student fallback:", e);
      }
    }

    await this.logAuditEvent({
      action: "LEADER_UPDATE_MEMBER",
      targetType: "STUDENT",
      targetId: student.id,
      details: {
        team_id: team.id,
        membership_id: membership.id,
        full_name: student.full_name,
        student_id: student.student_id,
      },
    });

    db.saveToDisk();
    await this.syncToCloud();

    const updatedTeam = await this.getTeamById(team.id, true);
    if (!updatedTeam) throw new Error("Team not found after update.");
    return { success: true, team: updatedTeam };
  }

  static async leaderRemoveMember(
    teamId: string,
    membershipId: string
  ): Promise<{ success: boolean; team: Team }> {
    await this.syncFromCloud();
    let team = db.teams.find((t) => t.id === teamId);
    if (!team && this.isSupabaseConfigured()) {
      try {
        const client = createAdminSupabaseClient();
        if (client) {
          const { data: dbTeam } = await client
            .from("teams")
            .select("*")
            .eq("id", teamId)
            .maybeSingle();
          if (dbTeam) {
            team = dbTeam as Team;
            if (!db.teams.some((t) => t.id === dbTeam.id)) {
              db.teams.push(dbTeam as Team);
            }
          }
        }
      } catch (e) { }
    }
    if (!team) throw new Error("Team not found.");

    let membership = db.memberships.find((m) => m.id === membershipId);
    if (!membership && this.isSupabaseConfigured()) {
      try {
        const client = createAdminSupabaseClient();
        if (client) {
          const { data: dbMem } = await client
            .from("team_memberships")
            .select("*")
            .eq("id", membershipId)
            .maybeSingle();
          if (dbMem) {
            membership = dbMem as TeamMembership;
            if (!db.memberships.some((m) => m.id === dbMem.id)) {
              db.memberships.push(dbMem as TeamMembership);
            }
          }
        }
      } catch (e) { }
    }
    if (!membership) throw new Error("Membership not found.");
    if (membership.team_id !== teamId) {
      throw new Error("Membership does not belong to this team.");
    }

    await this.adminRemoveMember(membershipId, "Removed by Team Leader");

    const updatedTeam = await this.getTeamById(teamId, true);
    if (!updatedTeam) throw new Error("Team not found after update.");
    return { success: true, team: updatedTeam };
  }

  static async leaderAddMember(payload: {
    teamId: string;
    studentName: string;
    studentId: string;
  }): Promise<{ success: boolean; team: Team }> {
    await this.syncFromCloud();
    const team = db.teams.find((t) => t.id === payload.teamId);
    if (!team) throw new Error("Team not found.");

    const activeMembers = db.memberships.filter(
      (m) => m.team_id === payload.teamId && m.status === "ACTIVE"
    );
    if (activeMembers.length >= team.capacity) {
      throw new Error(`Team has reached maximum capacity (${team.capacity} members).`);
    }

    const updatedTeam = await this.adminAddMember(payload);
    return { success: true, team: updatedTeam };
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
