import { DataService, db } from "../src/lib/services/data-service";
import { generateTeamsExcelWorkbook, importTeamsFromExcelBuffer } from "../src/lib/services/excel-service";
import ExcelJS from "exceljs";

async function runExcelTopicTests() {
  console.log("====================================================");
  console.log("TESTING EXCEL EXPORT & IMPORT FOR TOPIC VISIBILITY");
  console.log("====================================================");

  // 1. Get an offering and set topic_enabled = false
  const offerings = await DataService.getCourseOfferings();
  const testOffering = offerings[0];
  testOffering.topic_enabled = false;

  // Reset runtime db for deterministic testing
  db.teams = [];
  db.memberships = [];
  db.credentials = [];
  db.joinRequests = [];
  db.students = [];

  // Register team 1
  const reg1 = await DataService.registerTeamMultiStep({
    courseOfferingId: testOffering.id,
    teamName: "Team 1",
    capacity: 5,
    presentation_number: 1,
    leaderName: "Sayma Ferdousi Fariha",
    leaderStudentId: "252-35-103",
    members: [
      { name: "Golam Morshed Eashan", studentId: "252-35-242" },
      { name: "Mahtabul Al Nahian", studentId: "252-35-408" },
      { name: "Nosrat Jahan Tisha", studentId: "252-35-289" },
      { name: "Monjuarya Hasan Mou", studentId: "252-35-127" },
    ],
    topic: "Should Be Ignored When Disabled",
  });

  // Register team 10 (like the user screenshot!)
  const reg10 = await DataService.registerTeamMultiStep({
    courseOfferingId: testOffering.id,
    teamName: "Team 10",
    capacity: 5,
    presentation_number: 10,
    leaderName: "Rakibul",
    leaderStudentId: "252-35-195",
    members: [],
  });

  console.log("✓ Registered Team 1 and Team 10 (Rakibul)");

  // Generate Excel workbook
  const buffer = await generateTeamsExcelWorkbook({ offeringId: testOffering.id });
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as any);

  // Check Worksheet 1: Presentation Group List
  const presSheet = wb.getWorksheet("Presentation Group List");
  if (!presSheet) throw new Error("Missing 'Presentation Group List' worksheet");

  const title = presSheet.getCell("A1").value;
  console.log("✓ Title:", title);
  if (title !== "Presentation Group List") throw new Error("Incorrect title: " + title);

  const headers = [
    presSheet.getCell("A2").value,
    presSheet.getCell("B2").value,
    presSheet.getCell("C2").value,
    presSheet.getCell("D2").value,
  ];
  console.log("✓ Column Headers:", headers.join(" | "));
  if (
    headers[0] !== "Group Serial" ||
    headers[1] !== "Student name" ||
    headers[2] !== "Student ID" ||
    headers[3] !== "Topic name"
  ) {
    throw new Error("Headers do not match Presentation Group List format");
  }

  // Row 3 to 7: Group 1 (5 members)
  const group1Serial = presSheet.getCell("A3").value;
  const group1Student1Name = presSheet.getCell("B3").value;
  const group1Student1Id = presSheet.getCell("C3").value;
  const group1Topic = presSheet.getCell("D3").value;

  console.log("✓ Group 1 Serial:", group1Serial);
  console.log("✓ Group 1 Member 1:", group1Student1Name, group1Student1Id);
  console.log("✓ Group 1 Topic (Topic Disabled):", JSON.stringify(group1Topic));

  if (group1Topic !== "") {
    throw new Error("Expected topic to be empty string when disabled, got: " + group1Topic);
  }

  // Verify Group 10 (Slot 10)
  // Rows: each group has 5 rows.
  // Group 1: 3-7
  // Group 2: 8-12
  // Group 3: 13-17
  // Group 4: 18-22
  // Group 5: 23-27
  // Group 6: 28-32
  // Group 7: 33-37
  // Group 8: 38-42
  // Group 9: 43-47
  // Group 10: 48-52
  const group10Serial = presSheet.getCell("A48").value;
  const group10Leader = presSheet.getCell("B48").value;
  const group10LeaderId = presSheet.getCell("C48").value;
  const group10Topic = presSheet.getCell("D48").value;

  console.log("✓ Group 10 Serial:", group10Serial);
  console.log("✓ Group 10 Leader:", group10Leader, group10LeaderId);
  console.log("✓ Group 10 Topic:", JSON.stringify(group10Topic));

  if (group10Leader !== "Rakibul" || group10LeaderId !== "252-35-195") {
    throw new Error("Group 10 leader data mismatch!");
  }
  if (group10Topic !== "") {
    throw new Error("Expected Group 10 topic to be empty string, got: " + group10Topic);
  }

  // Verify Team Summary sheet also has empty topic
  const summarySheet = wb.getWorksheet("Team Summary");
  if (!summarySheet) throw new Error("Missing Team Summary sheet");
  const summaryTopicVal = summarySheet.getRow(2).getCell(4).value;
  console.log("✓ Team Summary Topic:", JSON.stringify(summaryTopicVal));
  if (summaryTopicVal !== "") {
    throw new Error("Expected Team Summary topic to be empty string when disabled, got: " + summaryTopicVal);
  }

  // Test round-trip import from "Presentation Group List"
  console.log("\nTesting import from 'Presentation Group List'...");
  db.teams = [];
  db.memberships = [];
  db.students = [];

  const importResult = await importTeamsFromExcelBuffer(buffer, testOffering.id);
  console.log("✓ Import Result:", importResult.message);

  const importedTeams = await DataService.getAllTeams({ offeringId: testOffering.id });
  console.log("✓ Imported teams count:", importedTeams.length);
  const importedTeam1 = importedTeams.find((t) => t.presentation_number === 1);
  const importedTeam10 = importedTeams.find((t) => t.presentation_number === 10);

  if (!importedTeam1 || !importedTeam10) {
    throw new Error("Failed to re-import teams from Presentation Group List!");
  }
  console.log("✓ Team 1 members count:", importedTeam1.registered_count);
  console.log("✓ Team 10 members count:", importedTeam10.registered_count);

  console.log("\n====================================================");
  console.log("ALL EXCEL TOPIC TESTS PASSED SUCCESSFULLY! ✓");
  console.log("====================================================");
}

runExcelTopicTests().catch((e) => {
  console.error("TEST FAILED:", e);
  process.exit(1);
});
