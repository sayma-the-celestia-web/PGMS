"use client";

import React, { useState } from "react";
import { Semester, Course, CourseOffering } from "@/types";
import { importTeamsExcelAction } from "@/lib/actions";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  FileSpreadsheet,
  Download,
  ShieldCheck,
  CheckCircle2,
  Table,
  Filter,
  UploadCloud,
  AlertCircle,
} from "lucide-react";

interface Props {
  semesters: Semester[];
  courses: Course[];
  offerings: CourseOffering[];
}

export function ExportsClient({ semesters, courses, offerings }: Props) {
  // Export filters
  const [semesterId, setSemesterId] = useState("all");
  const [courseId, setCourseId] = useState("all");
  const [offeringId, setOfferingId] = useState("all");
  const [downloading, setDownloading] = useState(false);

  // Import states
  const [importOfferingId, setImportOfferingId] = useState(offerings[0]?.id || "");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const handleDownload = () => {
    setDownloading(true);
    const params = new URLSearchParams();
    if (semesterId !== "all") params.set("semesterId", semesterId);
    if (courseId !== "all") params.set("courseId", courseId);
    if (offeringId !== "all") params.set("offeringId", offeringId);

    const url = `/api/export?${params.toString()}`;
    window.location.href = url;
    setTimeout(() => setDownloading(false), 2000);
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) {
      setImportError("Please select an Excel (.xlsx) file to upload.");
      return;
    }

    setImporting(true);
    setImportError(null);
    setImportMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", importFile);
      formData.append("offeringId", importOfferingId);

      const res = await importTeamsExcelAction(formData);
      if (res.success && "message" in res) {
        setImportMessage((res as any).message || "Excel workbook imported successfully!");
        setImportFile(null);
        // Reset file input
        const fileInput = document.getElementById("importFileInput") as HTMLInputElement;
        if (fileInput) fileInput.value = "";
      } else {
        setImportError(res.error || "Failed to import Excel workbook.");
      }
    } catch (err: any) {
      setImportError(err?.message || "An unexpected error occurred during import.");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-diu-navy font-heading">
          Excel (.xlsx) Reports &amp; Data Management
        </h1>
        <p className="text-xs text-diu-slate">
          Export institutional presentation group workbooks and import team/student rosters from Excel (.xlsx).
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* EXPORT WORKBOOK */}
        <div className="md:col-span-2 space-y-6">
          <Card className="border border-slate-200 shadow-sm bg-white">
            <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <Download className="w-4 h-4 text-diu-blue" />
                <CardTitle className="text-base text-diu-navy">
                  Export Teams to Excel (.xlsx)
                </CardTitle>
              </div>
              <CardDescription className="text-xs">
                Generate formatted presentation workbooks with Presentation Team Numbers, Topics, and Members.
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-6 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Semester</Label>
                <select
                  value={semesterId}
                  onChange={(e) => setSemesterId(e.target.value)}
                  className="w-full h-10 px-3 bg-white border border-slate-300 rounded-md text-xs text-slate-700"
                >
                  <option value="all">All Semesters</option>
                  {semesters.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.academic_year})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Course</Label>
                <select
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                  className="w-full h-10 px-3 bg-white border border-slate-300 rounded-md text-xs text-slate-700"
                >
                  <option value="all">All Courses</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} — {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Section Offering</Label>
                <select
                  value={offeringId}
                  onChange={(e) => setOfferingId(e.target.value)}
                  className="w-full h-10 px-3 bg-white border border-slate-300 rounded-md text-xs text-slate-700"
                >
                  <option value="all">All Sections</option>
                  {offerings.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.course?.code} Sec {o.section} ({o.semester?.name})
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Institutional format: Includes Presentation Team Slots, Leader details, and full team roster.
                </span>
              </div>
            </CardContent>

            <CardFooter className="pt-2 border-t border-slate-100 flex justify-end">
              <Button
                onClick={handleDownload}
                disabled={downloading}
                size="lg"
                className="w-full sm:w-auto gap-2 font-semibold bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
              >
                <Download className="w-4 h-4" />
                {downloading ? "Preparing Workbook..." : "Download Excel Workbook (.xlsx)"}
              </Button>
            </CardFooter>
          </Card>

          {/* IMPORT EXCEL WORKBOOK */}
          <Card className="border border-slate-200 shadow-sm bg-white">
            <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <UploadCloud className="w-4 h-4 text-diu-blue" />
                <CardTitle className="text-base text-diu-navy">
                  Import Teams from Excel (.xlsx)
                </CardTitle>
              </div>
              <CardDescription className="text-xs">
                Upload an Excel workbook to batch register teams and student members.
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleImport}>
              <CardContent className="pt-6 space-y-4">
                {importMessage && (
                  <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{importMessage}</span>
                  </div>
                )}

                {importError && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>{importError}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Target Section Offering</Label>
                  <select
                    value={importOfferingId}
                    onChange={(e) => setImportOfferingId(e.target.value)}
                    className="w-full h-10 px-3 bg-white border border-slate-300 rounded-md text-xs text-slate-700"
                    required
                  >
                    {offerings.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.course?.code} — Sec {o.section} ({o.semester?.name})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="importFileInput" className="text-xs font-semibold">
                    Select .xlsx File
                  </Label>
                  <input
                    id="importFileInput"
                    type="file"
                    accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                    className="block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-diu-blue hover:file:bg-blue-100 cursor-pointer border border-slate-200 rounded-md p-1"
                    required
                  />
                  <p className="text-[11px] text-slate-400">
                    Supports sheets exported from PGMS with columns: Student Name, Student ID (252-35-242), Team Name, Role.
                  </p>
                </div>
              </CardContent>

              <CardFooter className="pt-2 border-t border-slate-100 flex justify-end">
                <Button
                  type="submit"
                  disabled={importing || !importFile}
                  size="sm"
                  className="w-full sm:w-auto gap-2 font-semibold bg-diu-blue hover:bg-diu-navy text-white text-xs"
                >
                  <UploadCloud className="w-4 h-4" />
                  {importing ? "Importing Teams..." : "Upload &amp; Import Teams"}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>

        {/* Workbook structure preview */}
        <div className="space-y-4">
          <Card className="border border-slate-200 shadow-sm bg-white p-5 space-y-4">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
              <h3 className="font-heading font-semibold text-sm text-diu-navy">
                Workbook Specifications
              </h3>
            </div>

            <div className="space-y-3 text-xs text-slate-600">
              <div className="p-2.5 rounded-md bg-slate-50 border border-slate-100 space-y-1">
                <strong className="text-diu-navy block">Sheet 1: Team Summary</strong>
                <p className="text-[11px] text-slate-500">
                  Serial, Team Slot / No., Team Name, Topic, Course Code, Batch, Section, Leader, Capacity, Active Members, Available Slots, Slides Link / File, Status.
                </p>
              </div>

              <div className="p-2.5 rounded-md bg-slate-50 border border-slate-100 space-y-1">
                <strong className="text-diu-navy block">Sheet 2: Student Details</strong>
                <p className="text-[11px] text-slate-500">
                  Serial, Student Name, Student ID (252-35-242), Course Code, Course Name, Semester, Section, Team, Role, Registration Date.
                </p>
              </div>

              <div className="p-2.5 rounded-md bg-slate-50 border border-slate-100 space-y-1">
                <strong className="text-diu-navy block">Sheet 3: Registration Overview</strong>
                <p className="text-[11px] text-slate-500">
                  Semester, Course, Section, Status, Total Teams, Students, Open/Full Teams, Available Slots, Export Date.
                </p>
              </div>
            </div>

            <p className="text-[11px] text-slate-400">
              Conforms strictly to DIU Department of Software Engineering brand colors and ExcelJS multi-sheet format.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
