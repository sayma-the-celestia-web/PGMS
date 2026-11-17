import { NextRequest, NextResponse } from "next/server";
import { generateTeamsExcelWorkbook } from "@/lib/services/excel-service";
import { DataService } from "@/lib/services/data-service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const semesterId = searchParams.get("semesterId") || undefined;
    const courseId = searchParams.get("courseId") || undefined;
    const offeringId = searchParams.get("offeringId") || undefined;

    const buffer = await generateTeamsExcelWorkbook({
      semesterId,
      courseId,
      offeringId,
    });

    await DataService.logAuditEvent({
      action: "EXCEL_EXPORT_GENERATED",
      targetType: "EXPORT",
      targetId: "xlsx",
      details: {
        semesterId,
        courseId,
        offeringId,
        size_bytes: buffer.length,
      },
    });

    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `PGMS_DIU_Registration_Export_${timestamp}.xlsx`;

    const uint8Array = new Uint8Array(buffer);

    return new NextResponse(uint8Array, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error: any) {
    console.error("Export error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to generate Excel export" },
      { status: 500 }
    );
  }
}
