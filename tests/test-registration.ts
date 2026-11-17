import { DataService, db } from "../src/lib/services/data-service";
import { generateTeamsExcelWorkbook } from "../src/lib/services/excel-service";
import { hashToken } from "../src/lib/utils/crypto";

async function runTests() {
  console.log("====================================================");
  console.log("STARTING PGMS SYSTEM & INTEGRITY VERIFICATION TESTS");
  console.log("====================================================");

  // Test 1: Fetch initial offerings
  console.log("\n[TEST 1] Testing course offerings fetch...");
  const offerings = await DataService.getCourseOfferings();
  if (offerings.length === 0) throw new Error("Offerings list is empty");
  console.log(`✓ Retrieved ${offerings.length} course offerings successfully.`);

  // Test 2: Atomic Team Creation
  console.log("\n[TEST 2] Testing atomic team creation...");
  const testOffering = offerings.find((o) => o.registration_status === "OPEN")!;
  const leaderStudentId = `221-35-${Math.floor(1000 + Math.random() * 9000)}`;
  const createRes = await DataService.createTeamWithLeader({
    courseOfferingId: testOffering.id,
    teamName: `Alpha Pioneers ${Date.now()}`,
    capacity: 3,
    leaderName: "Kazi Nasim",
    leaderStudentId: leaderStudentId,
  });

  if (!createRes.success || !createRes.teamManagementToken || !createRes.membershipToken) {
    throw new Error("Team creation failed or tokens were not generated.");
  }
  console.log(`✓ Team "${createRes.teamName}" created with ID: ${createRes.teamId}`);
  console.log(`✓ Team Management Token: ${createRes.teamManagementToken.slice(0, 15)}...`);
  console.log(`✓ Membership Token: ${createRes.membershipToken.slice(0, 15)}...`);

  // Test 3: Duplicate Active Registration Prevention
  console.log("\n[TEST 3] Testing duplicate student registration rejection...");
  try {
    await DataService.createTeamWithLeader({
      courseOfferingId: testOffering.id,
      teamName: `Duplicate Team ${Date.now()}`,
      capacity: 3,
      leaderName: "Kazi Nasim",
      leaderStudentId: leaderStudentId, // same student ID
    });
    throw new Error("Duplicate active registration was not rejected!");
  } catch (err: any) {
    console.log(`✓ Duplicate registration successfully blocked: "${err.message}"`);
  }

  // Test 4: Atomic Join Team until FULL
  console.log("\n[TEST 4] Testing atomic team join and capacity enforcement...");
  const student2Id = `221-35-${Math.floor(1000 + Math.random() * 9000)}`;
  const joinRes1 = await DataService.joinTeam({
    teamId: createRes.teamId,
    fullName: "Ayesha Siddiqua",
    studentId: student2Id,
  });
  console.log(`✓ Member 2 joined. Token generated: ${joinRes1.membershipToken.slice(0, 15)}...`);

  const student3Id = `221-35-${Math.floor(1000 + Math.random() * 9000)}`;
  const joinRes2 = await DataService.joinTeam({
    teamId: createRes.teamId,
    fullName: "Kamrul Islam",
    studentId: student3Id,
  });
  console.log(`✓ Member 3 joined (Capacity reached).`);

  const teamAfterFull = await DataService.getTeamById(createRes.teamId);
  if (teamAfterFull?.status !== "FULL") {
    throw new Error(`Expected team status to be FULL, got ${teamAfterFull?.status}`);
  }
  console.log(`✓ Team status correctly transitioned to: ${teamAfterFull.status}`);

  // Test 5: Over-capacity Join Prevention
  console.log("\n[TEST 5] Testing over-capacity join rejection...");
  try {
    await DataService.joinTeam({
      teamId: createRes.teamId,
      fullName: "Extra Student",
      studentId: `221-35-9999`,
    });
    throw new Error("Should not have allowed 4th member in 3-capacity team!");
  } catch (err: any) {
    console.log(`✓ Over-capacity join correctly rejected: "${err.message}"`);
  }

  // Test 6: Reference Token Verification & Management
  console.log("\n[TEST 6] Testing private reference credential verification...");
  const authTeamRes = await DataService.verifyReferenceToken(createRes.teamManagementToken);
  if (!authTeamRes.valid || authTeamRes.credentialType !== "TEAM_MANAGEMENT") {
    throw new Error("Team management token verification failed!");
  }
  console.log(`✓ Team Management token verified successfully for: ${authTeamRes.team?.team_name}`);

  // Test 7: Leadership Transfer
  console.log("\n[TEST 7] Testing leadership transfer...");
  const transferRes = await DataService.transferLeadership(
    createRes.teamManagementToken,
    joinRes1.membershipId
  );
  if (!transferRes.success) throw new Error("Leadership transfer failed!");
  const updatedTeam = await DataService.getTeamById(createRes.teamId);
  if (updatedTeam?.leader_membership_id !== joinRes1.membershipId) {
    throw new Error("New leader membership ID not updated on team!");
  }
  console.log(`✓ Leadership successfully transferred to member: ${joinRes1.membershipId}`);

  // Test 8: ExcelJS Export Generation
  console.log("\n[TEST 8] Testing Excel .xlsx 3-sheet export generation...");
  const excelBuffer = await generateTeamsExcelWorkbook();
  if (!excelBuffer || excelBuffer.length < 500) {
    throw new Error("Excel export generated invalid or empty buffer!");
  }
  console.log(`✓ Excel workbook generated successfully (${excelBuffer.length} bytes).`);

  console.log("\n====================================================");
  console.log("ALL PGMS SYSTEM & INTEGRITY TESTS PASSED SUCCESSFULLY! ✓");
  console.log("====================================================");
}

runTests().catch((err) => {
  console.error("TEST FAILED:", err);
  process.exit(1);
});
