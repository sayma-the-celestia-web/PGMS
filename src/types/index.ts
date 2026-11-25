export type RegistrationStatus = "UPCOMING" | "OPEN" | "PAUSED" | "CLOSED";
export type TeamStatus = "OPEN" | "FULL" | "CLOSED";
export type MembershipRole = "LEADER" | "MEMBER";
export type MembershipStatus = "ACTIVE" | "LEFT" | "REMOVED";
export type CredentialType = "TEAM_MANAGEMENT" | "MEMBERSHIP";
export type AdminRole = "SUPERADMIN" | "ADMIN";
export type JoinRequestStatus = "PENDING" | "ACCEPTED" | "REJECTED";

export interface Semester {
  id: string;
  name: string;
  academic_year: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Course {
  id: string;
  code: string;
  name: string;
  description: string | null;
  slug: string;
  created_at: string;
  updated_at: string;
}

export interface CourseOffering {
  id: string;
  course_id: string;
  semester_id: string;
  section: string;
  registration_status: RegistrationStatus;
  registration_start: string;
  registration_deadline: string;
  min_team_capacity: number;
  max_team_capacity: number;
  max_teams_limit: number; // Maximum presentation teams allowed (e.g. 20)
  topic_enabled: boolean;  // Whether topic input is required/enabled by superadmin
  created_at: string;
  updated_at: string;
  // Joined relation fields
  course?: Course;
  semester?: Semester;
  teams_count?: number;
  students_count?: number;
  available_slots?: number;
}

export interface Student {
  id: string;
  full_name: string;
  student_id: string;
  normalized_student_id: string;
  created_at: string;
  updated_at: string;
}

export interface TeamMembership {
  id: string;
  team_id: string;
  student_id: string;
  course_offering_id: string;
  role: MembershipRole;
  status: MembershipStatus;
  joined_at: string;
  updated_at: string;
  student?: Student;
}

export interface TeamJoinRequest {
  id: string;
  team_id: string;
  course_offering_id: string;
  student_name: string;
  student_id: string;
  status: JoinRequestStatus;
  created_at: string;
  updated_at: string;
}

export interface Team {
  id: string;
  course_offering_id: string;
  presentation_number: number;
  team_name: string;
  capacity: number;
  topic?: string | null;
  slide_link?: string | null;
  slide_file_name?: string | null;
  slide_file_url?: string | null;
  leader_membership_id: string | null;
  status: TeamStatus;
  created_at: string;
  updated_at: string;
  // Joined fields
  course_offering?: CourseOffering;
  memberships?: TeamMembership[];
  leader?: TeamMembership;
  registered_count?: number;
  available_slots?: number;
  join_requests?: TeamJoinRequest[];
}

export interface RegistrationCredential {
  id: string;
  credential_type: CredentialType;
  team_id: string | null;
  membership_id: string | null;
  token_hash: string;
  created_at: string;
  expires_at: string | null;
  revoked_at: string | null;
  last_used_at: string | null;
}

export interface AdminProfile {
  id: string;
  auth_user_id: string;
  email: string;
  full_name: string;
  role: AdminRole;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  actor_admin_id: string | null;
  actor_email?: string | null;
  action: string;
  target_type: string;
  target_id: string | null;
  details: Record<string, any>;
  created_at: string;
}

export interface CreateTeamPayload {
  courseOfferingId: string;
  teamName: string;
  capacity: number;
  leaderName: string;
  leaderStudentId: string;
}

export interface MultiStepMemberItem {
  name: string;
  studentId: string;
}

export interface MultiStepRegisterTeamPayload {
  courseOfferingId: string;
  teamName?: string;
  capacity: number;
  topic?: string;
  presentation_number: number;
  leaderName: string;
  leaderStudentId: string;
  members: MultiStepMemberItem[];
  isOpenForMembers?: boolean;
  slide_file_name?: string | null;
  slide_file_url?: string | null;
  slide_link?: string | null;
}

export interface JoinTeamPayload {
  teamId: string;
  fullName: string;
  studentId: string;
}

export interface TeamCreationResult {
  success: boolean;
  teamId: string;
  teamName: string;
  presentationNumber: number;
  membershipId: string;
  teamManagementToken?: string;
  membershipToken?: string;
  offeringSlug?: string;
  message?: string;
}

export interface JoinTeamResult {
  success: boolean;
  teamId: string;
  membershipId?: string;
  membershipToken?: string;
  teamName: string;
  message?: string;
}

export interface ReferenceAuthResult {
  valid: boolean;
  credentialType?: CredentialType;
  team?: Team;
  membership?: TeamMembership;
  error?: string;
}

export interface LeaderLoginResult {
  success: boolean;
  team?: Team;
  leaderStudent?: Student;
  leaderMembership?: TeamMembership;
  error?: string;
}
