"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { CourseOffering, Semester } from "@/types";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RegistrationStatusBadge } from "@/components/ui/status-badge";
import { formatDate } from "@/lib/utils";
import { Search, Filter, BookOpen, Users, Clock, ArrowRight, Layers } from "lucide-react";

interface Props {
  initialOfferings: CourseOffering[];
  semesters: Semester[];
}

export function CourseDirectoryClient({ initialOfferings, semesters }: Props) {
  const [search, setSearch] = useState("");
  const [selectedSemester, setSelectedSemester] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedSection, setSelectedSection] = useState("all");

  // Extract unique sections
  const sections = useMemo(() => {
    const set = new Set<string>();
    initialOfferings.forEach((o) => set.add(o.section));
    return Array.from(set).sort();
  }, [initialOfferings]);

  // Filtered offerings
  const filteredOfferings = useMemo(() => {
    return initialOfferings.filter((offering) => {
      // Semester filter
      if (selectedSemester !== "all" && offering.semester_id !== selectedSemester) {
        return false;
      }
      // Status filter
      if (selectedStatus !== "all" && offering.registration_status !== selectedStatus) {
        return false;
      }
      // Section filter
      if (selectedSection !== "all" && offering.section !== selectedSection) {
        return false;
      }
      // Search
      if (search.trim()) {
        const q = search.toLowerCase();
        const code = offering.course?.code?.toLowerCase() || "";
        const name = offering.course?.name?.toLowerCase() || "";
        const sec = offering.section.toLowerCase();
        if (!code.includes(q) && !name.includes(q) && !sec.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [initialOfferings, search, selectedSemester, selectedStatus, selectedSection]);

  return (
    <div className="space-y-8">
      {/* Search and Filters Bar */}
      <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search box */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <Input
              type="text"
              placeholder="Search by code or title (e.g. SWE 411)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-sm"
            />
          </div>

          {/* Semester select */}
          <div>
            <select
              aria-label="Filter by Semester"
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              className="w-full h-10 px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-diu-blue"
            >
              <option value="all">All Semesters</option>
              {semesters.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.academic_year})
                </option>
              ))}
            </select>
          </div>

          {/* Section filter */}
          <div>
            <select
              aria-label="Filter by Section"
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="w-full h-10 px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-diu-blue"
            >
              <option value="all">All Sections</option>
              {sections.map((sec) => (
                <option key={sec} value={sec}>
                  Section: {sec}
                </option>
              ))}
            </select>
          </div>

          {/* Status filter */}
          <div>
            <select
              aria-label="Filter by Status"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full h-10 px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-diu-blue"
            >
              <option value="all">All Registration Statuses</option>
              <option value="OPEN">Open</option>
              <option value="PAUSED">Paused</option>
              <option value="UPCOMING">Upcoming</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>
        </div>

        {/* Filter stats count */}
        <div className="flex justify-between items-center text-xs text-slate-500 pt-2 border-t border-slate-100">
          <span>
            Showing <strong className="text-diu-navy">{filteredOfferings.length}</strong> of{" "}
            {initialOfferings.length} course offerings
          </span>
          {(search || selectedSemester !== "all" || selectedStatus !== "all" || selectedSection !== "all") && (
            <button
              onClick={() => {
                setSearch("");
                setSelectedSemester("all");
                setSelectedStatus("all");
                setSelectedSection("all");
              }}
              className="text-diu-blue hover:underline font-medium"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Offerings Grid */}
      {filteredOfferings.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200/80 p-8 space-y-3">
          <Layers className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-lg font-semibold text-diu-navy">No course offerings match your search</h3>
          <p className="text-sm text-diu-slate max-w-sm mx-auto">
            Try adjusting your search criteria, selecting all semesters, or clearing your filters.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOfferings.map((offering) => {
            const courseSlug = offering.course?.slug || offering.id;
            return (
              <Card
                key={offering.id}
                className="flex flex-col h-full hover:border-diu-blue/60 hover:shadow-md transition-all group"
              >
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-diu-navy text-white">
                      {offering.course?.code}
                    </span>
                    <RegistrationStatusBadge status={offering.registration_status} />
                  </div>
                  <CardTitle className="text-lg group-hover:text-diu-blue transition-colors line-clamp-1 mt-2">
                    {offering.course?.name}
                  </CardTitle>
                  <CardDescription className="line-clamp-2 text-xs">
                    {offering.course?.description || "Course presentation group formation"}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-3 flex-1 pb-4 text-xs">
                  <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <div>
                      <span className="text-slate-500 block">Semester</span>
                      <span className="font-semibold text-diu-navy">
                        {offering.semester?.name || "Active"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Section</span>
                      <span className="font-semibold text-diu-blue">
                        {offering.section}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                    <span className="text-slate-500 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      Registered Teams:
                    </span>
                    <span className="font-semibold text-slate-700">
                      {offering.teams_count} teams ({offering.students_count} students)
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      Registration Deadline:
                    </span>
                    <span className="font-medium text-slate-700">
                      {formatDate(offering.registration_deadline)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Team Size Constraint:</span>
                    <span className="font-medium text-slate-700">
                      {offering.min_team_capacity} – {offering.max_team_capacity} members
                    </span>
                  </div>
                </CardContent>

                <CardFooter className="pt-3">
                  <Link
                    href={`/courses/${courseSlug}?section=${encodeURIComponent(offering.section)}`}
                    className="w-full"
                  >
                    <Button
                      variant={offering.registration_status === "OPEN" ? "default" : "secondary"}
                      className="w-full text-xs font-semibold gap-1.5"
                    >
                      View Teams &amp; Register
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
