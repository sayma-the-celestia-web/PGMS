import ExcelJS from "exceljs";
import { DataService, db } from "./data-service";
import { formatDate } from "../utils";

export interface ExcelExportFilter {
  semesterId?: string;
  courseId?: string;
  offeringId?: string;
}

export async function generateTeamsExcelWorkbook(
  filters: ExcelExportFilter = {}
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "PGMS - Daffodil International University";
  workbook.created = new Date();

  // Load relevant data
  const offerings = await DataService.getCourseOfferings(filters);
  const offeringIds = new Set(offerings.map((o) => o.id));

  const allTeams = await DataService.getAllTeams({
    semesterId: filters.semesterId,
    courseId: filters.courseId,
    offeringId: filters.offeringId,
  });

  const relevantTeams = allTeams.filter((t) => offeringIds.has(t.course_offering_id));
  const teamIds = new Set(relevantTeams.map((t) => t.id));

  // Style constants
  const primaryHeaderFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF0066B3" }, // DIU Blue
  };
  const headerFont: Partial<ExcelJS.Font> = {
    name: "Calibri",
    size: 11,
    bold: true,
    color: { argb: "FFFFFFFF" },
  };
  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: "thin", color: { argb: "FFD0D7DE" } },
    left: { style: "thin", color: { argb: "FFD0D7DE" } },
    bottom: { style: "thin", color: { argb: "FFD0D7DE" } },
    right: { style: "thin", color: { argb: "FFD0D7DE" } },
  };

  // ====================================================================
  // SHEET 1: Team Summary
  // ====================================================================
  const sheet1 = workbook.addWorksheet("Team Summary", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  sheet1.columns = [
    { header: "Serial", key: "serial", width: 10 },
    { header: "Team Name", key: "team_name", width: 28 },
    { header: "Course Code", key: "course_code", width: 14 },
    { header: "Section", key: "section", width: 12 },
    { header: "Team Leader", key: "leader_name", width: 26 },
    { header: "Capacity", key: "capacity", width: 12 },
    { header: "Registered Members", key: "registered_members", width: 20 },
    { header: "Available Slots", key: "available_slots", width: 16 },
    { header: "Status", key: "status", width: 14 },
  ];

  sheet1.getRow(1).eachCell((cell) => {
    cell.fill = primaryHeaderFill;
    cell.font = headerFont;
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = thinBorder;
  });
  sheet1.getRow(1).height = 26;

  relevantTeams.forEach((team, idx) => {
    const row = sheet1.addRow({
      serial: idx + 1,
      team_name: team.team_name,
      course_code: team.course_offering?.course?.code || "N/A",
      section: team.course_offering?.section || "N/A",
      leader_name: team.leader?.student?.full_name || "Unassigned",
      capacity: team.capacity,
      registered_members: team.registered_count || 0,
      available_slots: team.available_slots || 0,
      status: team.status,
    });

    row.eachCell((cell) => {
      cell.border = thinBorder;
      cell.alignment = { vertical: "middle" };
    });
  });

  sheet1.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: relevantTeams.length + 1, column: 9 },
  };

  // ====================================================================
  // SHEET 2: Student Details
  // ====================================================================
  const sheet2 = workbook.addWorksheet("Student Details", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  sheet2.columns = [
    { header: "Serial", key: "serial", width: 10 },
    { header: "Student Name", key: "student_name", width: 26 },
    { header: "Student ID", key: "student_id", width: 18 },
    { header: "Course Code", key: "course_code", width: 14 },
    { header: "Course Name", key: "course_name", width: 34 },
    { header: "Semester", key: "semester", width: 16 },
    { header: "Section", key: "section", width: 12 },
    { header: "Team Name", key: "team_name", width: 26 },
    { header: "Role", key: "role", width: 14 },
    { header: "Registration Date", key: "reg_date", width: 22 },
  ];

  sheet2.getRow(1).eachCell((cell) => {
    cell.fill = primaryHeaderFill;
    cell.font = headerFont;
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = thinBorder;
  });
  sheet2.getRow(1).height = 26;

  const relevantMemberships = db.memberships.filter(
    (m) => teamIds.has(m.team_id) && m.status === "ACTIVE"
  );

  relevantMemberships.forEach((m, idx) => {
    const student = db.students.find((s) => s.id === m.student_id);
    const team = relevantTeams.find((t) => t.id === m.team_id);
    const offering = team?.course_offering;

    const row = sheet2.addRow({
      serial: idx + 1,
      student_name: student?.full_name || "Unknown",
      student_id: student?.student_id || "Unknown",
      course_code: offering?.course?.code || "N/A",
      course_name: offering?.course?.name || "N/A",
      semester: offering?.semester?.name || "N/A",
      section: offering?.section || "N/A",
      team_name: team?.team_name || "N/A",
      role: m.role,
      reg_date: formatDate(m.joined_at),
    });

    row.eachCell((cell) => {
      cell.border = thinBorder;
      cell.alignment = { vertical: "middle" };
    });
  });

  sheet2.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: relevantMemberships.length + 1, column: 10 },
  };

  // ====================================================================
  // SHEET 3: Registration Overview
  // ====================================================================
  const sheet3 = workbook.addWorksheet("Registration Overview", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  sheet3.columns = [
    { header: "Semester", key: "semester", width: 18 },
    { header: "Course Code", key: "course_code", width: 14 },
    { header: "Course Name", key: "course_name", width: 34 },
    { header: "Section", key: "section", width: 12 },
    { header: "Registration Status", key: "status", width: 20 },
    { header: "Total Teams", key: "total_teams", width: 14 },
    { header: "Total Students", key: "total_students", width: 16 },
    { header: "Open Teams", key: "open_teams", width: 14 },
    { header: "Full Teams", key: "full_teams", width: 14 },
    { header: "Available Slots", key: "available_slots", width: 16 },
    { header: "Export Date", key: "export_date", width: 22 },
  ];

  sheet3.getRow(1).eachCell((cell) => {
    cell.fill = primaryHeaderFill;
    cell.font = headerFont;
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = thinBorder;
  });
  sheet3.getRow(1).height = 26;

  offerings.forEach((offering) => {
    const offeringTeams = relevantTeams.filter((t) => t.course_offering_id === offering.id);
    const openCount = offeringTeams.filter((t) => t.status === "OPEN").length;
    const fullCount = offeringTeams.filter((t) => t.status === "FULL").length;

    const row = sheet3.addRow({
      semester: offering.semester?.name || "N/A",
      course_code: offering.course?.code || "N/A",
      course_name: offering.course?.name || "N/A",
      section: offering.section,
      status: offering.registration_status,
      total_teams: offeringTeams.length,
      total_students: offering.students_count || 0,
      open_teams: openCount,
      full_teams: fullCount,
      available_slots: offering.available_slots || 0,
      export_date: formatDate(new Date()),
    });

    row.eachCell((cell) => {
      cell.border = thinBorder;
      cell.alignment = { vertical: "middle" };
    });
  });

  sheet3.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: offerings.length + 1, column: 11 },
  };

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
