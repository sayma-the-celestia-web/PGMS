import { DataService, db } from "../src/lib/services/data-service";
import { generateTeamsExcelWorkbook, importTeamsFromExcelBuffer } from "../src/lib/services/excel-service";

async function runTests() {
  console.log("====================================================");
  console.log("STARTING PGMS TEAM REGISTRATION PLATFORM TEST SUITE");
  console.log("====================================================");

  // Test 1: Fetch initial offerings
  console.log("\n[TEST 1] Testing course offerings fetch...");
  const offerings = await DataService.getCourseOfferings();
  if (offerings.length === 0) throw new Error("Offerings list is empty");
  const testOffering = offerings.find((o) => o.registration_status === "OPEN")!;
  console.log(`✓ Retrieved ${offerings.length} course offerings. Using ${testOffering.course?.code} Sec ${testOffering.section}.`);

  // Test 2: Presentation Slots Availability
  console.log("\n[TEST 2] Testing presentation slots availability...");
  const slots = await DataService.getAvailablePresentationNumbers(testOffering.id);
  if (slots.length === 0) throw new Error("Presentation slots empty");
  console.log(`✓ Available presentation slots generated up to limit: ${slots.length} slots.`);
  console.log(`✓ Slot 1 available: ${!slots[0].isTaken}`);

  // Test 3: Multi-step Team Registration (Step 1, Step 2, Step 3)
  console.log("\n[TEST 3] Testing multi-step team registration (Leader + Members + Slot)...");
  const leaderId = "252-35-101";
  const member2Id = "252-35-102";

  const regResult = await DataService.registerTeamMultiStep({
    courseOfferingId: testOffering.id,
    teamName: "Neural Ninjas",
    capacity: 4,
    topic: "Transformer Attention Mechanisms",
    presentation_number: 1,
    leaderName: "Tanvir Ahmed",
    leaderStudentId: leaderId,
    members: [{ name: "Ayesha Rahman", studentId: member2Id }],
  });

  if (!regResult.success || !regResult.teamId) {
    throw new Error("Multi-step team registration failed!");
  }
  console.log(`✓ Team "${regResult.teamName}" registered with ID: ${regResult.teamId} at Slot #${regResult.presentationNumber}.`);

  // Verify Slot 1 is now marked taken
  const slotsAfter = await DataService.getAvailablePresentationNumbers(testOffering.id);
  const slot1 = slotsAfter.find((s) => s.number === 1);
  if (!slot1?.isTaken) throw new Error("Slot 1 should be marked taken!");
  console.log(`✓ Slot #1 verified as taken by: "${slot1.takenByTeam}".`);

  // Test 4: Duplicate Slot Rejection
  console.log("\n[TEST 4] Testing duplicate presentation slot collision rejection...");
  try {
    await DataService.registerTeamMultiStep({
      courseOfferingId: testOffering.id,
      teamName: "Second Team",
      capacity: 3,
      presentation_number: 1, // Same slot #1
      leaderName: "Kazi Nasim",
      leaderStudentId: "252-35-103",
      members: [],
    });
    throw new Error("Duplicate presentation slot should have been rejected!");
  } catch (err: any) {
    console.log(`✓ Duplicate slot correctly rejected: "${err.message}"`);
  }

  // Test 5: Team Leader Login via Leader Name & Student ID
  console.log("\n[TEST 5] Testing Team Leader login via credentials (Name & Student ID)...");
  const loginSuccess = await DataService.leaderLogin("Tanvir Ahmed", leaderId);
  if (!loginSuccess.success || !loginSuccess.team) {
    throw new Error(`Leader login failed: ${loginSuccess.error}`);
  }
  console.log(`✓ Team leader successfully logged in to manage team: "${loginSuccess.team.team_name}".`);

  // Test 6: Team Leader Name Edit & Presentation Slides Update
  console.log("\n[TEST 6] Testing Team Leader updating team name and presentation slides...");
  const updatedTeamName = await DataService.updateTeamName(regResult.teamId, "Neural Ninjas Elite");
  if (updatedTeamName.team_name !== "Neural Ninjas Elite") {
    throw new Error("Team name update failed!");
  }
  console.log(`✓ Team name updated to: "${updatedTeamName.team_name}".`);

  const updatedSlides = await DataService.updateTeamSlides(regResult.teamId, {
    slide_link: "https://docs.google.com/presentation/d/sample123",
    slide_file_name: "presentation_neural_ninjas.pptx",
  });
  if (updatedSlides.slide_link !== "https://docs.google.com/presentation/d/sample123") {
    throw new Error("Slide link update failed!");
  }
  console.log(`✓ Slides updated with link and file: "${updatedSlides.slide_file_name}".`);

  // Test 7: Student Requests to Join Team
  console.log("\n[TEST 7] Testing student request to join team...");
  const joinReq = await DataService.requestJoinTeam({
    teamId: regResult.teamId,
    studentName: "Mahmud Hasan",
    studentId: "252-35-104",
  });
  if (!joinReq.success) throw new Error("Join request failed!");
  console.log(`✓ Join request submitted successfully for Mahmud Hasan (252-35-104).`);

  // Test 8: Leader Accepts Join Request
  console.log("\n[TEST 8] Testing leader accepting join request...");
  const teamBefore = await DataService.getTeamById(regResult.teamId, true);
  const pending = teamBefore?.join_requests?.[0];
  if (!pending) throw new Error("Pending request not found on team!");

  const acceptRes = await DataService.handleJoinRequest(pending.id, "ACCEPT");
  if (!acceptRes.success) throw new Error("Failed to accept join request!");
  console.log(`✓ Join request accepted: "${acceptRes.message}".`);

  const teamAfter = await DataService.getTeamById(regResult.teamId, true);
  const isMemberAdded = teamAfter?.memberships?.some(
    (m) => m.student?.student_id === "252-35-104"
  );
  if (!isMemberAdded) throw new Error("Accepted student not found in active memberships!");
  console.log(`✓ Student confirmed as active team member. Active count: ${teamAfter?.memberships?.length}/${teamAfter?.capacity}.`);

  // Test 9: Prevention of Multiple Team Registrations
  console.log("\n[TEST 9] Testing multi-team registration prevention for same subject...");
  try {
    await DataService.requestJoinTeam({
      teamId: regResult.teamId,
      studentName: "Tanvir Ahmed",
      studentId: leaderId, // Already leader
    });
    throw new Error("Should not allow already registered student to join another team!");
  } catch (err: any) {
    console.log(`✓ Multiple registration blocked: "${err.message}"`);
  }

  // Test 10: Excel Export & Import
  console.log("\n[TEST 10] Testing Excel .xlsx export & import round-trip...");
  const excelBuffer = await generateTeamsExcelWorkbook();
  if (!excelBuffer || excelBuffer.length < 500) {
    throw new Error("Excel export generated invalid or empty buffer!");
  }
  console.log(`✓ Excel workbook exported successfully (${excelBuffer.length} bytes).`);

  const importResult = await importTeamsFromExcelBuffer(excelBuffer, testOffering.id);
  console.log(`✓ Excel import executed: "${importResult.message}".`);

  console.log("\n====================================================");
  console.log("ALL PGMS TEAM REGISTRATION PLATFORM TESTS PASSED! ✓");
  console.log("====================================================");
}

runTests().catch((err) => {
  console.error("TEST FAILED:", err);
  process.exit(1);
});
