import { DataService, db } from "../src/lib/services/data-service";
import { normalizeStudentId } from "../src/lib/utils";

async function runCrudTests() {
  console.log("====================================================");
  console.log("TESTING FULL CRUD OPERATIONS (TEAMS, COURSES, OFFERINGS)");
  console.log("====================================================");

  // ----------------------------------------------------------------
  // 1. COURSE CRUD TESTS
  // ----------------------------------------------------------------
  console.log("\n[TEST 1] Course CRUD (Create, Read, Update, Delete)...");
  const newCourse = await DataService.createCourse({
    code: "TEST101",
    name: "Software Architecture & Testing",
    slug: "test101",
    description: "Temporary testing course",
  });
  console.log(`✓ Created Course: ${newCourse.code} (${newCourse.id})`);

  // Read
  const allCourses = await DataService.getCourses();
  const foundCourse = allCourses.find((c) => c.id === newCourse.id);
  if (!foundCourse) throw new Error("Course read failed: not found!");
  console.log(`✓ Read Course verified in catalog: ${foundCourse.name}`);

  // Update
  const updatedCourse = await DataService.updateCourse(newCourse.id, {
    name: "Advanced Software Architecture & Testing",
    description: "Updated description",
  });
  if (updatedCourse?.name !== "Advanced Software Architecture & Testing") {
    throw new Error("Course update failed!");
  }
  console.log(`✓ Updated Course: ${updatedCourse.name}`);

  // ----------------------------------------------------------------
  // 2. OFFERING CRUD TESTS
  // ----------------------------------------------------------------
  console.log("\n[TEST 2] Course Offering CRUD (Create, Update, Delete)...");
  const semesters = await DataService.getSemesters();
  const testSem = semesters[0];

  const newOffering = await DataService.createCourseOffering({
    course_id: newCourse.id,
    semester_id: testSem.id,
    section: "TEST-Z",
    registration_status: "OPEN",
    registration_start: new Date().toISOString(),
    registration_deadline: new Date(Date.now() + 86400000 * 7).toISOString(),
    min_team_capacity: 2,
    max_team_capacity: 5,
    max_teams_limit: 10,
    topic_enabled: true,
  });
  console.log(`✓ Created Offering: ${newOffering.course?.code} Sec ${newOffering.section} (${newOffering.id})`);

  // Update Offering
  const updatedOffering = await DataService.updateCourseOffering(newOffering.id, {
    max_team_capacity: 4,
    topic_enabled: false,
  });
  if (updatedOffering?.max_team_capacity !== 4 || updatedOffering?.topic_enabled !== false) {
    throw new Error("Offering update failed!");
  }
  console.log(`✓ Updated Offering: Max Capacity ${updatedOffering.max_team_capacity}, Topic Enabled: ${updatedOffering.topic_enabled}`);

  // ----------------------------------------------------------------
  // 3. TEAM CRUD TESTS
  // ----------------------------------------------------------------
  console.log("\n[TEST 3] Team CRUD (Create, Read, Update, Delete)...");
  const regResult = await DataService.registerTeamMultiStep({
    courseOfferingId: newOffering.id,
    teamName: "CRUD Pioneers",
    capacity: 4,
    presentation_number: 1,
    topic: "Initial Topic",
    leaderName: "Shahriar Ahmed",
    leaderStudentId: "252-35-901",
    members: [{ name: "Farhana Akter", studentId: "252-35-902" }],
  });
  if (!regResult.success || !regResult.teamId) throw new Error("Team create failed!");
  console.log(`✓ Created Team: "${regResult.teamName}" at Slot #${regResult.presentationNumber}`);

  // Read Team
  const team = await DataService.getTeamById(regResult.teamId, true);
  if (!team) throw new Error("Team read failed!");
  console.log(`✓ Read Team: ${team.team_name}, Members count: ${team.memberships?.length}`);

  // Update Team (Name, Slot, Topic, Slide Link)
  const updatedTeam = await DataService.adminUpdateTeam(team.id, {
    team_name: "CRUD Titans",
    presentation_number: 2,
    topic: "Modern Distributed Systems",
    slide_link: "https://docs.google.com/presentation/d/test123",
  });
  if (
    updatedTeam.team_name !== "CRUD Titans" ||
    updatedTeam.presentation_number !== 2 ||
    updatedTeam.topic !== "Modern Distributed Systems"
  ) {
    throw new Error("Team admin update failed!");
  }
  console.log(`✓ Updated Team: Name "${updatedTeam.team_name}", Slot #${updatedTeam.presentation_number}, Topic: "${updatedTeam.topic}"`);

  // Add Member to Team directly
  console.log("\n[TEST 4] Admin adding member to team...");
  const teamWithNewMem = await DataService.adminAddMember({
    teamId: team.id,
    studentName: "Rakib Khan",
    studentId: "252-35-903",
  });
  const hasRakib = teamWithNewMem.memberships?.some(
    (m) => m.student?.student_id === "252-35-903"
  );
  if (!hasRakib) throw new Error("Admin add member failed!");
  console.log(`✓ Admin added member: Rakib Khan (Active count: ${teamWithNewMem.memberships?.length}/${teamWithNewMem.capacity})`);

  // Remove Member from Team
  console.log("\n[TEST 5] Admin removing member from team...");
  const memToRemove = teamWithNewMem.memberships?.find(
    (m) => m.student?.student_id === "252-35-903"
  );
  if (!memToRemove) throw new Error("Member to remove not found!");
  const removeRes = await DataService.adminRemoveMember(memToRemove.id, "Test removal");
  if (!removeRes.success) throw new Error("Admin remove member failed!");
  console.log(`✓ Admin removed member successfully.`);

  // ----------------------------------------------------------------
  // 4. TEAM DELETION
  // ----------------------------------------------------------------
  console.log("\n[TEST 6] Team Deletion...");
  const delTeamRes = await DataService.deleteTeam(team.id);
  if (!delTeamRes) throw new Error("Team delete returned false!");
  const postDeleteTeam = await DataService.getTeamById(team.id);
  if (postDeleteTeam) throw new Error("Team should not exist after deletion!");
  console.log(`✓ Team permanently deleted and slot released.`);

  // ----------------------------------------------------------------
  // 5. OFFERING & COURSE DELETION (CASCADE)
  // ----------------------------------------------------------------
  console.log("\n[TEST 7] Course Offering Deletion...");
  const delOffRes = await DataService.deleteCourseOffering(newOffering.id);
  if (!delOffRes) throw new Error("Offering delete returned false!");
  const postDeleteOff = await DataService.getCourseOfferingById(newOffering.id);
  if (postDeleteOff) throw new Error("Offering should not exist after deletion!");
  console.log(`✓ Offering permanently deleted.`);

  console.log("\n[TEST 8] Course Deletion...");
  const delCourseRes = await DataService.deleteCourse(newCourse.id);
  if (!delCourseRes) throw new Error("Course delete returned false!");
  const postDeleteCourse = await DataService.getCourseBySlug(newCourse.slug);
  if (postDeleteCourse) throw new Error("Course should not exist after deletion!");
  console.log(`✓ Course permanently deleted.`);

  console.log("\n====================================================");
  console.log("ALL CRUD OPERATIONS PASSED VERIFICATION CLEANLY! ✓");
  console.log("====================================================");
}

runCrudTests().catch((e) => {
  console.error("CRUD TEST FAILED:", e);
  process.exit(1);
});
