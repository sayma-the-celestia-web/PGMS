"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { Course, CourseOffering, Team } from "@/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Presentation,
  Download,
  Eye,
  Search,
  ExternalLink,
  FileCheck2,
  Users,
  Crown,
  X,
  Maximize2,
  Clock,
  BookOpen,
} from "lucide-react";

interface Props {
  courses: Course[];
  offerings: CourseOffering[];
  teams: Team[];
  initialCourse?: string;
  initialSection?: string;
}

export function SlidesAllClient({
  courses,
  offerings,
  teams,
  initialCourse = "all",
  initialSection = "all",
}: Props) {
  const [selectedCourse, setSelectedCourse] = useState<string>(initialCourse);
  const [selectedSection, setSelectedSection] = useState<string>(initialSection);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "uploaded" | "pdf" | "pptx" | "pending">("all");
  const [previewTeam, setPreviewTeam] = useState<Team | null>(null);

  // Available sections for currently selected course
  const availableSections = useMemo(() => {
    if (selectedCourse === "all") return [];
    const courseObj = courses.find(
      (c) =>
        c.slug.toLowerCase() === selectedCourse.toLowerCase() ||
        c.code.toLowerCase() === selectedCourse.toLowerCase()
    );
    if (!courseObj) return [];
    return offerings
      .filter((o) => o.course_id === courseObj.id)
      .map((o) => o.section);
  }, [courses, offerings, selectedCourse]);

  // Compute slides stats per course
  const courseCounts = useMemo(() => {
    const map = new Map<string, { totalTeams: number; slidesCount: number }>();
    courses.forEach((c) => {
      map.set(c.id, { totalTeams: 0, slidesCount: 0 });
    });

    teams.forEach((t) => {
      const courseId = t.course_offering?.course_id || t.course_offering?.course?.id;
      if (courseId && map.has(courseId)) {
        const item = map.get(courseId)!;
        item.totalTeams++;
        if (t.slide_file_url || t.slide_link) item.slidesCount++;
      }
    });

    return map;
  }, [courses, teams]);

  // Filtered teams list based on selected course, section, search, and type
  const filteredTeams = useMemo(() => {
    return teams.filter((t) => {
      const courseObj = t.course_offering?.course;
      const cSlug = courseObj?.slug?.toLowerCase() || "";
      const cCode = courseObj?.code?.toLowerCase() || "";
      const tSection = t.course_offering?.section?.toLowerCase() || "";

      // Course filter
      if (selectedCourse !== "all") {
        const matchCourse =
          cSlug === selectedCourse.toLowerCase() ||
          cCode === selectedCourse.toLowerCase();
        if (!matchCourse) return false;
      }

      // Section filter
      if (selectedSection !== "all") {
        if (tSection !== selectedSection.toLowerCase()) return false;
      }

      // Slide type filter
      const hasFile = Boolean(t.slide_file_url);
      const hasAny = Boolean(t.slide_file_url || t.slide_link);
      const fileName = (t.slide_file_name || "").toLowerCase();
      const isPdf = fileName.endsWith(".pdf") || t.slide_file_url?.toLowerCase().includes(".pdf");
      const isPptx =
        fileName.endsWith(".pptx") ||
        fileName.endsWith(".ppt") ||
        t.slide_file_url?.toLowerCase().includes(".pptx");

      if (filterType === "uploaded" && !hasAny) return false;
      if (filterType === "pdf" && !isPdf) return false;
      if (filterType === "pptx" && !isPptx) return false;
      if (filterType === "pending" && hasAny) return false;

      // Text Search
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchTeam = t.team_name.toLowerCase().includes(q);
        const matchTopic = (t.topic || "").toLowerCase().includes(q);
        const matchFile = (t.slide_file_name || "").toLowerCase().includes(q);
        const matchPresNum = String(t.presentation_number || "").includes(q);
        const matchCourseName = (courseObj?.name || "").toLowerCase().includes(q);
        const matchCourseCode = cCode.includes(q);
        const matchLeader = (t.leader?.student?.full_name || "").toLowerCase().includes(q);
        const matchMember = t.memberships?.some(
          (m) =>
            m.student?.full_name?.toLowerCase().includes(q) ||
            m.student?.student_id?.toLowerCase().includes(q)
        );

        if (
          !matchTeam &&
          !matchTopic &&
          !matchFile &&
          !matchPresNum &&
          !matchCourseName &&
          !matchCourseCode &&
          !matchLeader &&
          !matchMember
        ) {
          return false;
        }
      }

      return true;
    });
  }, [teams, selectedCourse, selectedSection, filterType, search]);

  // Overall KPI metrics for the currently filtered set of teams
  const stats = useMemo(() => {
    let uploadedCount = 0;
    let pdfCount = 0;
    let pptxCount = 0;
    let pendingCount = 0;

    // Filter by course & section only (without text search or file-type filter) to give accurate pool counts
    const courseTeams = teams.filter((t) => {
      const courseObj = t.course_offering?.course;
      const cSlug = courseObj?.slug?.toLowerCase() || "";
      const cCode = courseObj?.code?.toLowerCase() || "";
      const tSection = t.course_offering?.section?.toLowerCase() || "";

      if (selectedCourse !== "all") {
        if (cSlug !== selectedCourse.toLowerCase() && cCode !== selectedCourse.toLowerCase()) {
          return false;
        }
      }
      if (selectedSection !== "all" && tSection !== selectedSection.toLowerCase()) {
        return false;
      }
      return true;
    });

    courseTeams.forEach((t) => {
      if (t.slide_file_url || t.slide_link) {
        uploadedCount++;
        const name = (t.slide_file_name || "").toLowerCase();
        if (name.endsWith(".pdf") || t.slide_file_url?.toLowerCase().includes(".pdf")) {
          pdfCount++;
        } else if (
          name.endsWith(".pptx") ||
          name.endsWith(".ppt") ||
          t.slide_file_url?.toLowerCase().includes(".pptx")
        ) {
          pptxCount++;
        }
      } else {
        pendingCount++;
      }
    });

    const total = courseTeams.length;
    const percent = total > 0 ? Math.round((uploadedCount / total) * 100) : 0;

    return { total, uploadedCount, pdfCount, pptxCount, pendingCount, percent };
  }, [teams, selectedCourse, selectedSection]);

  // Helper for slide viewer URL
  const getViewerUrl = (team: Team) => {
    if (!team.slide_file_url) return team.slide_link || "";
    const isPptx =
      team.slide_file_name?.toLowerCase().endsWith(".pptx") ||
      team.slide_file_name?.toLowerCase().endsWith(".ppt") ||
      team.slide_file_url.toLowerCase().includes(".pptx");

    if (isPptx) {
      return `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(team.slide_file_url)}`;
    }
    return team.slide_file_url;
  };

  const selectedCourseObj = courses.find(
    (c) =>
      c.slug.toLowerCase() === selectedCourse.toLowerCase() ||
      c.code.toLowerCase() === selectedCourse.toLowerCase()
  );

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-diu-navy via-slate-900 to-diu-blue p-6 sm:p-8 text-white relative">
          <div className="flex flex-wrap justify-between items-start gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-3 py-1 rounded bg-white/20 text-white backdrop-blur-sm">
                  {selectedCourseObj ? selectedCourseObj.code : "All Courses"}
                </span>
                {selectedCourseObj && (
                  <span className="text-xs text-blue-200">
                    {selectedSection !== "all" ? `Section ${selectedSection.toUpperCase()}` : "All Sections"}
                  </span>
                )}
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
                  Cloudinary CDN
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold font-heading text-white flex items-center gap-3">
                <Presentation className="w-8 h-8 text-diu-gold shrink-0" />
                <span>Presentation Slides Repository</span>
              </h1>

              <p className="text-sm text-blue-100 max-w-2xl leading-relaxed">
                {selectedCourseObj ? (
                  <>
                    Showing presentation slides and slide decks for{" "}
                    <strong>{selectedCourseObj.name} ({selectedCourseObj.code})</strong>.
                  </>
                ) : (
                  <>
                    Central repository of student presentation slides, PDFs, and PowerPoint decks across all Department courses.
                  </>
                )}
              </p>
            </div>

            <div className="flex flex-col sm:items-end items-start gap-2">
              <Link
                href="/manage"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-white border border-white/20 transition-colors"
              >
                <span>Upload as Team Leader</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* COURSE FILTER TABS (Clicking SE216 shows only SE216 slides) */}
          <div className="mt-6 pt-4 border-t border-white/15 space-y-3">
            <div className="flex items-center gap-2">
              <BookOpen className="w-3.5 h-3.5 text-blue-200" />
              <span className="text-xs font-bold uppercase tracking-wider text-blue-200">
                Filter by Course:
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* All Courses Tab */}
              <button
                type="button"
                onClick={() => {
                  setSelectedCourse("all");
                  setSelectedSection("all");
                }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs ${
                  selectedCourse === "all"
                    ? "bg-white text-diu-navy shadow-sm"
                    : "bg-white/10 text-white hover:bg-white/20"
                }`}
              >
                All Courses ({teams.length} teams)
              </button>

              {/* Individual Course Tabs (e.g. SE214, SE216) */}
              {courses.map((c) => {
                const isSelected =
                  selectedCourse.toLowerCase() === c.slug.toLowerCase() ||
                  selectedCourse.toLowerCase() === c.code.toLowerCase();
                const count = courseCounts.get(c.id);

                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setSelectedCourse(c.slug || c.code.toLowerCase());
                      setSelectedSection("all");
                    }}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs ${
                      isSelected
                        ? "bg-diu-blue text-white ring-2 ring-white/50"
                        : "bg-white/10 text-white hover:bg-white/20"
                    }`}
                  >
                    <span>{c.code}</span>
                    <span className="text-[10px] opacity-80 font-normal">
                      ({count?.slidesCount || 0} slides)
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Section Sub-tabs if specific course selected */}
            {availableSections.length > 0 && (
              <div className="pt-2 flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-[11px] text-blue-200 font-semibold mr-1">Section:</span>
                <button
                  type="button"
                  onClick={() => setSelectedSection("all")}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                    selectedSection === "all"
                      ? "bg-white/30 text-white font-bold"
                      : "text-blue-100 hover:bg-white/10"
                  }`}
                >
                  All Sections
                </button>
                {availableSections.map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => setSelectedSection(sec.toLowerCase())}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                      selectedSection.toLowerCase() === sec.toLowerCase()
                        ? "bg-white text-diu-navy font-bold shadow-xs"
                        : "text-blue-100 hover:bg-white/10"
                    }`}
                  >
                    Section {sec}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* KPI Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-slate-100 bg-slate-50 border-t border-slate-200">
          <div className="p-4 sm:p-5 text-center">
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block">
              Total Teams
            </span>
            <span className="text-2xl font-bold text-diu-navy font-heading mt-1 block">
              {stats.total}
            </span>
            <span className="text-[11px] text-slate-500">
              {selectedCourseObj ? selectedCourseObj.code : "All Courses"}
            </span>
          </div>

          <div className="p-4 sm:p-5 text-center">
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block">
              Slides Uploaded
            </span>
            <div className="flex items-center justify-center gap-1.5 mt-1">
              <span className="text-2xl font-bold text-emerald-600 font-heading">
                {stats.uploadedCount}
              </span>
              <span className="text-xs font-semibold text-slate-400">/ {stats.total}</span>
            </div>
            <span className="text-[11px] text-emerald-600 font-medium">
              {stats.percent}% uploaded
            </span>
          </div>

          <div className="p-4 sm:p-5 text-center">
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block">
              PDF Documents
            </span>
            <span className="text-2xl font-bold text-rose-600 font-heading mt-1 block">
              {stats.pdfCount}
            </span>
            <span className="text-[11px] text-slate-500">Portable Document Format</span>
          </div>

          <div className="p-4 sm:p-5 text-center">
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block">
              PowerPoint (.pptx)
            </span>
            <span className="text-2xl font-bold text-amber-600 font-heading mt-1 block">
              {stats.pptxCount}
            </span>
            <span className="text-[11px] text-slate-500">Cloudinary Slide Decks</span>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search by team, topic, member, course..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs sm:text-sm bg-slate-50 border-slate-200"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-slate-500 font-medium text-[11px] mr-1 hidden sm:inline">Filter:</span>
            {[
              { id: "all", label: `All (${filteredTeams.length})` },
              { id: "uploaded", label: `Uploaded (${stats.uploadedCount})` },
              { id: "pdf", label: `PDF (${stats.pdfCount})` },
              { id: "pptx", label: `PPTX (${stats.pptxCount})` },
              { id: "pending", label: `Pending (${stats.pendingCount})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterType(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition-all ${
                  filterType === tab.id
                    ? "bg-diu-blue text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Teams Grid */}
      {filteredTeams.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
            <Presentation className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-700">No presentation slides found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {selectedCourse !== "all"
              ? `No teams or slides match your current filter for ${selectedCourse.toUpperCase()}.`
              : "No presentation teams or slides match your search criteria."}
          </p>
          {(search || filterType !== "all" || selectedCourse !== "all") && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearch("");
                setFilterType("all");
                setSelectedCourse("all");
                setSelectedSection("all");
              }}
              className="text-xs"
            >
              Reset All Filters
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredTeams.map((t) => {
            const courseObj = t.course_offering?.course;
            const hasFile = Boolean(t.slide_file_url);
            const hasLink = Boolean(t.slide_link);
            const fileName = t.slide_file_name || "";
            const isPdf =
              fileName.toLowerCase().endsWith(".pdf") ||
              t.slide_file_url?.toLowerCase().includes(".pdf");
            const isPptx =
              fileName.toLowerCase().endsWith(".pptx") ||
              fileName.toLowerCase().endsWith(".ppt") ||
              t.slide_file_url?.toLowerCase().includes(".pptx");
            const viewerUrl = getViewerUrl(t);

            return (
              <Card
                key={t.id}
                className={`border shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden ${
                  hasFile ? "border-slate-200 bg-white" : "border-slate-200/80 bg-slate-50/50"
                }`}
              >
                <div>
                  {/* Card Header with Course & Section Badge */}
                  <CardHeader className="p-4 pb-3 border-b border-slate-100 bg-slate-50/60">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                          <span className="font-bold text-[10px] px-2 py-0.5 rounded bg-diu-navy text-white">
                            {courseObj?.code || "Course"} (Sec {t.course_offering?.section || "—"})
                          </span>
                          <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-diu-blue">
                            Group #{t.presentation_number || "—"}
                          </span>
                          {hasFile ? (
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                                isPdf
                                  ? "bg-rose-100 text-rose-700 border border-rose-200"
                                  : isPptx
                                  ? "bg-amber-100 text-amber-800 border border-amber-200"
                                  : "bg-blue-100 text-diu-blue border border-blue-200"
                              }`}
                            >
                              {isPdf ? "PDF" : isPptx ? "PPTX" : "Slides"}
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-200 text-slate-600">
                              Pending
                            </span>
                          )}
                        </div>
                        <CardTitle className="text-base text-diu-navy font-bold truncate">
                          {t.team_name}
                        </CardTitle>
                      </div>
                    </div>

                    {t.topic && (
                      <p className="text-xs text-slate-600 mt-1 line-clamp-1 italic">
                        Topic: &ldquo;{t.topic}&rdquo;
                      </p>
                    )}
                  </CardHeader>

                  {/* Team Members & Details */}
                  <CardContent className="p-4 space-y-3 text-xs">
                    <div className="flex items-center gap-2 text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <div className="min-w-0 text-[11px]">
                        <span className="font-semibold block truncate">
                          Leader: {t.leader?.student?.full_name || "Team Leader"}
                        </span>
                        <span className="text-slate-500 font-mono text-[10px]">
                          {t.leader?.student?.student_id || ""}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3 text-slate-400" />
                        <span>{t.memberships?.length || 0} members</span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {t.status}
                      </span>
                    </div>

                    {/* Slides File Box */}
                    {hasFile ? (
                      <div className="mt-2 p-3 rounded-lg bg-blue-50/60 border border-blue-200/80 space-y-2">
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <FileCheck2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span className="font-semibold text-slate-800 text-xs truncate">
                              {fileName || "Presentation File"}
                            </span>
                          </div>
                          <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded shrink-0">
                            Cloudinary
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="default"
                            onClick={() => setPreviewTeam(t)}
                            className="w-full text-xs font-semibold gap-1.5 bg-diu-blue hover:bg-diu-navy text-white h-8"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View Slides</span>
                          </Button>

                          <a
                            href={t.slide_file_url!}
                            download={fileName || "slides"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-md h-8 transition-colors shadow-xs"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download</span>
                          </a>
                        </div>
                      </div>
                    ) : hasLink ? (
                      <div className="mt-2 p-3 rounded-lg bg-amber-50/70 border border-amber-200 space-y-2">
                        <div className="flex items-center gap-1.5 text-amber-800 text-xs">
                          <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                          <span className="font-medium truncate">Web Slide Link</span>
                        </div>
                        <a
                          href={t.slide_link!}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center w-full gap-1.5 text-xs font-semibold text-diu-blue hover:text-white hover:bg-diu-blue bg-white border border-blue-200 rounded-md h-8 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Open Presentation</span>
                        </a>
                      </div>
                    ) : (
                      <div className="mt-2 p-3 rounded-lg bg-slate-100/80 border border-dashed border-slate-300 text-center text-slate-500 space-y-1">
                        <Clock className="w-4 h-4 mx-auto text-slate-400" />
                        <p className="text-[11px] font-medium">No slides uploaded yet</p>
                        <p className="text-[10px] text-slate-400">Team leader can upload via /manage</p>
                      </div>
                    )}
                  </CardContent>
                </div>

                {/* Footer link to team page */}
                <div className="px-4 py-2.5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <Link
                    href={`/teams/${t.id}`}
                    className="text-slate-500 hover:text-diu-blue transition-colors font-medium flex items-center gap-1"
                  >
                    <span>View Team Page</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>

                  {hasFile && (
                    <a
                      href={viewerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-diu-blue hover:underline font-semibold flex items-center gap-1"
                    >
                      <span>New Tab</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Instant In-Browser Slide Viewer Modal */}
      {previewTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl h-[88vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <Presentation className="w-5 h-5 text-diu-gold shrink-0" />
                <div className="min-w-0">
                  <h3 className="font-bold text-sm sm:text-base text-white truncate">
                    {previewTeam.team_name} — {previewTeam.slide_file_name || "Presentation Slides"}
                  </h3>
                  <p className="text-xs text-slate-300 truncate">
                    {previewTeam.course_offering?.course?.code || "Course"} • Group #{previewTeam.presentation_number || "—"} • Topic: {previewTeam.topic || "Presentation"}
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 shrink-0">
                {previewTeam.slide_file_url && (
                  <a
                    href={previewTeam.slide_file_url}
                    download={previewTeam.slide_file_name || "slides"}
                    className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Download</span>
                  </a>
                )}

                <a
                  href={getViewerUrl(previewTeam)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-diu-blue hover:bg-blue-600 text-white transition-colors"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Full Tab</span>
                </a>

                <button
                  type="button"
                  onClick={() => setPreviewTeam(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors ml-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Iframe Body */}
            <div className="flex-1 bg-slate-100 relative">
              {previewTeam.slide_file_url ? (
                <iframe
                  src={getViewerUrl(previewTeam)}
                  title={previewTeam.slide_file_name || "Presentation Slides"}
                  className="w-full h-full border-0 bg-white"
                />
              ) : previewTeam.slide_link ? (
                <iframe
                  src={previewTeam.slide_link}
                  title={previewTeam.team_name}
                  className="w-full h-full border-0 bg-white"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-slate-500 text-sm">
                  No preview available
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
