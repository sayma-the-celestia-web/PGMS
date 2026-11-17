"use client";

import React, { useState } from "react";
import { Semester, Course, CourseOffering } from "@/types";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  FileSpreadsheet,
  Download,
  ShieldCheck,
  CheckCircle2,
  Table,
  Filter,
} from "lucide-react";

interface Props {
  semesters: Semester[];
  courses: Course[];
  offerings: CourseOffering[];
}

export function ExportsClient({ semesters, courses, offerings }: Props) {
  const [semesterId, setSemesterId] = useState("all");
  const [courseId, setCourseId] = useState("all");
  const [offeringId, setOfferingId] = useState("all");
  const [downloading, setDownloading] = useState(false);

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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-diu-navy font-heading">
          Excel (.xlsx) Report Generation
        </h1>
        <p className="text-xs text-diu-slate">
          Export formatted presentation group workbooks conforming to departmental reporting requirements.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Filters and trigger */}
        <div className="md:col-span-2 space-y-4">
          <Card className="border border-slate-200 shadow-sm bg-white">
            <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-diu-blue" />
                <CardTitle className="text-base text-diu-navy">
                  Export Scope &amp; Filters
                </CardTitle>
              </div>
              <CardDescription className="text-xs">
                Select specific course sections or generate an all-inclusive departmental export.
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
                  Security verified: Private tokens and hashes are excluded from the exported workbook.
                </span>
              </div>
            </CardContent>

            <CardFooter className="pt-2 border-t border-slate-100 flex justify-end">
              <Button
                onClick={handleDownload}
                disabled={downloading}
                size="lg"
                className="w-full sm:w-auto gap-2 font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Download className="w-4 h-4" />
                {downloading ? "Preparing Workbook..." : "Download Excel Workbook (.xlsx)"}
              </Button>
            </CardFooter>
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
                  Serial, Team Name, Course, Section, Leader, Capacity, Active Members, Available Slots, Status.
                </p>
              </div>

              <div className="p-2.5 rounded-md bg-slate-50 border border-slate-100 space-y-1">
                <strong className="text-diu-navy block">Sheet 2: Student Details</strong>
                <p className="text-[11px] text-slate-500">
                  Serial, Student Name, Student ID, Course Code, Name, Semester, Section, Team, Role, Registration Date.
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
              Formatted using ExcelJS with frozen header rows, styled headers (#0066B3), and auto-fit columns.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
