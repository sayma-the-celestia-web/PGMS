"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { CourseOffering, Semester, Team } from "@/types";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RegistrationStatusBadge, TeamStatusBadge } from "@/components/ui/status-badge";
import { formatDate } from "@/lib/utils";
import {
  Search,
  Filter,
  BookOpen,
  Users,
  Clock,
  ArrowRight,
  Layers,
  UserPlus,
  Crown,
  Sparkles,
  ExternalLink,
  Presentation,
  CheckCircle,
} from "lucide-react";

interface Props {
  initialOfferings: CourseOffering[];
  semesters: Semester[];
  initialTeams?: Team[];
}

export function CourseDirectoryClient({
  initialOfferings,
  semesters,
  initialTeams = [],
}: Props) {
  const [activeTab, setActiveTab] = useState<"courses" | "allTeams" | "openTeams">("courses");

  // Offerings search & filters
  const [search, setSearch] = useState("");
  const [selectedSemester, setSelectedSemester] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedSection, setSelectedSection] = useState("all");

  // All teams search & filters
  const [allTeamsSearch, setAllTeamsSearch] = useState("");
  const [allTeamsOfferingFilter, setAllTeamsOfferingFilter] = useState("all");
  const [allTeamsStatusFilter, setAllTeamsStatusFilter] = useState("all");

  // Open teams search & filters
  const [teamSearch, setTeamSearch] = useState("");
  const [teamCourseFilter, setTeamCourseFilter] = useState("all");

  // Extract unique sections
  const sections = useMemo(() => {
    const set = new Set<string>();
    initialOfferings.forEach((o) => set.add(o.section));
    return Array.from(set).sort();
  }, [initialOfferings]);

  // Filtered offerings
  const filteredOfferings = useMemo(() => {
    return initialOfferings.filter((offering) => {
      if (selectedSemester !== "all" && offering.semester_id !== selectedSemester) {
        return false;
      }
      if (selectedStatus !== "all" && offering.registration_status !== selectedStatus) {
        return false;
      }
      if (selectedSection !== "all" && offering.section !== selectedSection) {
        return false;
      }
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

  // Filtered All Registered Teams
  const filteredAllTeams = useMemo(() => {
    return initialTeams.filter((t) => {
      if (allTeamsOfferingFilter !== "all" && t.course_offering_id !== allTeamsOfferingFilter) {
        return false;
      }
      if (allTeamsStatusFilter !== "all" && t.status !== allTeamsStatusFilter) {
        return false;
      }
      if (allTeamsSearch.trim()) {
        const q = allTeamsSearch.toLowerCase();
        const matchesName = t.team_name.toLowerCase().includes(q);
        const matchesTopic = t.topic?.toLowerCase().includes(q) || false;
        const matchesCourse = t.course_offering?.course?.code?.toLowerCase().includes(q) || false;
        const matchesSec = t.course_offering?.section?.toLowerCase().includes(q) || false;
        const matchesLeader = t.leader?.student?.full_name?.toLowerCase().includes(q) || false;
        const matchesMember = t.memberships?.some((m) =>
          m.student?.full_name?.toLowerCase().includes(q)
        ) || false;
        const matchesSlot = String(t.presentation_number || "").includes(q);
        if (
          !matchesName &&
          !matchesTopic &&
          !matchesCourse &&
          !matchesSec &&
          !matchesLeader &&
          !matchesMember &&
          !matchesSlot
        ) {
          return false;
        }
      }
      return true;
    });
  }, [initialTeams, allTeamsSearch, allTeamsOfferingFilter, allTeamsStatusFilter]);

  // Open / Joinable Teams (status === "OPEN" and has vacancies)
  const openTeams = useMemo(() => {
    return initialTeams.filter((team) => {
      const activeCount = team.memberships?.length || 0;
      const hasSlot = team.capacity > activeCount;
      const isOpen = team.status === "OPEN";
      return isOpen && hasSlot;
    });
  }, [initialTeams]);

  // Filtered Open Teams
  const filteredOpenTeams = useMemo(() => {
    return openTeams.filter((t) => {
      if (teamCourseFilter !== "all" && t.course_offering_id !== teamCourseFilter) {
        return false;
      }
      if (teamSearch.trim()) {
        const q = teamSearch.toLowerCase();
        const matchesName = t.team_name.toLowerCase().includes(q);
        const matchesTopic = t.topic?.toLowerCase().includes(q) || false;
        const matchesCourse = t.course_offering?.course?.code.toLowerCase().includes(q);
        const matchesLeader = t.leader?.student?.full_name?.toLowerCase().includes(q) || false;
        if (!matchesName && !matchesTopic && !matchesCourse && !matchesLeader) {
          return false;
        }
      }
      return true;
    });
  }, [openTeams, teamSearch, teamCourseFilter]);

  return (
    <div className="space-y-6">
      {/* Top Tab Navigator: Courses vs All Teams vs Find & Join Open Teams */}
      <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex bg-slate-100 p-1 rounded-xl text-xs sm:text-sm font-semibold w-full lg:max-w-2xl overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("courses")}
            className={`flex-1 py-2 sm:py-2.5 px-3 rounded-lg text-center transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
              activeTab === "courses"
                ? "bg-white text-diu-navy shadow-sm font-bold"
                : "text-slate-600 hover:text-diu-blue"
            }`}
          >
            <BookOpen className="w-4 h-4 text-diu-blue" />
            <span>Course Sections</span>
            <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-700">
              {filteredOfferings.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("allTeams")}
            className={`flex-1 py-2 sm:py-2.5 px-3 rounded-lg text-center transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
              activeTab === "allTeams"
                ? "bg-white text-diu-navy shadow-sm font-bold"
                : "text-slate-600 hover:text-diu-blue"
            }`}
          >
            <Users className="w-4 h-4 text-diu-blue" />
            <span>All Registered Teams</span>
            <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-blue-100 text-diu-navy font-bold">
              {initialTeams.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("openTeams")}
            className={`flex-1 py-2 sm:py-2.5 px-3 rounded-lg text-center transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
              activeTab === "openTeams"
                ? "bg-white text-diu-navy shadow-sm font-bold"
                : "text-slate-600 hover:text-diu-blue"
            }`}
          >
            <UserPlus className="w-4 h-4 text-emerald-600" />
            <span>Find &amp; Join Teams</span>
            <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
              {openTeams.length} Open
            </span>
          </button>
        </div>

        <Link href="/register-team" className="shrink-0">
          <Button size="sm" className="w-full lg:w-auto text-xs font-semibold gap-1.5 bg-diu-blue hover:bg-diu-navy">
            <UserPlus className="w-4 h-4" />
            Register New Team
          </Button>
        </Link>
      </div>

      {/* TAB 1: COURSES DIRECTORY */}
      {activeTab === "courses" && (
        <div className="space-y-6">
          {/* Search and Filters Bar */}
          <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/90 shadow-sm space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {/* Search box */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Search code or title (e.g. SE214)..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 text-xs sm:text-sm"
                />
              </div>

              {/* Semester select */}
              <div>
                <select
                  aria-label="Filter by Semester"
                  value={selectedSemester}
                  onChange={(e) => setSelectedSemester(e.target.value)}
                  className="w-full h-10 px-3 bg-white border border-slate-300 rounded-md text-xs sm:text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-diu-blue"
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
                  className="w-full h-10 px-3 bg-white border border-slate-300 rounded-md text-xs sm:text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-diu-blue"
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
                  className="w-full h-10 px-3 bg-white border border-slate-300 rounded-md text-xs sm:text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-diu-blue"
                >
                  <option value="all">All Statuses</option>
                  <option value="OPEN">Registration Open</option>
                  <option value="UPCOMING">Upcoming</option>
                  <option value="PAUSED">Paused</option>
                  <option value="CLOSED">Closed</option>
                </select>
              </div>
            </div>

            <div className="flex justify-between items-center text-xs text-slate-500 pt-2 border-t border-slate-100">
              <span>
                Showing <strong className="text-diu-navy">{filteredOfferings.length}</strong> course sections
              </span>
              {(search || selectedSemester !== "all" || selectedStatus !== "all" || selectedSection !== "all") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setSelectedSemester("all");
                    setSelectedStatus("all");
                    setSelectedSection("all");
                  }}
                  className="text-diu-blue hover:underline font-medium text-xs"
                >
                  Reset Filters
                </button>
              )}
            </div>
          </div>

          {/* Offerings Grid */}
          {filteredOfferings.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-slate-200/80 p-8 space-y-3">
              <BookOpen className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-lg font-semibold text-diu-navy">No Course Offerings Found</h3>
              <p className="text-xs sm:text-sm text-diu-slate max-w-md mx-auto">
                No active or scheduled course offerings match your filter criteria.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredOfferings.map((offering) => {
                const courseSlug = offering.course?.slug || "course";
                const offeringTeams = initialTeams.filter((t) => t.course_offering_id === offering.id);

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
                      <CardTitle className="text-base sm:text-lg group-hover:text-diu-blue transition-colors line-clamp-1 mt-2">
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
                          <span className="font-semibold text-diu-blue">{offering.section}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                        <span className="text-slate-500 flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          Registered:
                        </span>
                        <span className="font-semibold text-slate-700">
                          {offeringTeams.length} teams ({offering.students_count} students)
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          Deadline:
                        </span>
                        <span className="font-medium text-slate-700">
                          {formatDate(offering.registration_deadline)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">Team Size:</span>
                        <span className="font-medium text-slate-700">
                          {offering.min_team_capacity} – {offering.max_team_capacity} members
                        </span>
                      </div>

                      {/* Preview of Registered Teams in this Section */}
                      {offeringTeams.length > 0 && (
                        <div className="space-y-1.5 pt-2 border-t border-slate-100">
                          <div className="flex justify-between items-center text-[11px] font-semibold text-slate-700">
                            <span>Registered Teams ({offeringTeams.length})</span>
                            <button
                              type="button"
                              onClick={() => {
                                setAllTeamsOfferingFilter(offering.id);
                                setActiveTab("allTeams");
                              }}
                              className="text-diu-blue hover:underline text-[10px]"
                            >
                              View all &rarr;
                            </button>
                          </div>
                          <div className="space-y-1">
                            {offeringTeams.slice(0, 3).map((t) => (
                              <Link
                                key={t.id}
                                href={`/teams/${t.id}`}
                                className="flex items-center justify-between p-1.5 rounded bg-slate-50 hover:bg-blue-50 text-[11px] border border-slate-100 transition-colors"
                              >
                                <div className="flex items-center gap-1.5 truncate">
                                  <span className="font-bold text-diu-blue">#{t.presentation_number}</span>
                                  <span className="font-medium text-slate-800 truncate">{t.team_name}</span>
                                </div>
                                <span className="text-[10px] text-slate-500 shrink-0">
                                  {t.memberships?.length || 0}/{t.capacity}
                                </span>
                              </Link>
                            ))}
                            {offeringTeams.length > 3 && (
                              <p className="text-[10px] text-slate-400 text-center">
                                +{offeringTeams.length - 3} more teams registered
                              </p>
                            )}
                          </div>
                        </div>
                      )}
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
      )}

      {/* TAB 2: ALL REGISTERED TEAMS */}
      {activeTab === "allTeams" && (
        <div className="space-y-6">
          {/* Teams search & filters */}
          <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/90 shadow-sm space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Search team name, leader, topic, or slot #..."
                  value={allTeamsSearch}
                  onChange={(e) => setAllTeamsSearch(e.target.value)}
                  className="pl-9 text-xs sm:text-sm"
                />
              </div>

              <div>
                <select
                  aria-label="Filter by Course Section"
                  value={allTeamsOfferingFilter}
                  onChange={(e) => setAllTeamsOfferingFilter(e.target.value)}
                  className="w-full h-10 px-3 bg-white border border-slate-300 rounded-md text-xs sm:text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-diu-blue"
                >
                  <option value="all">All Course Sections</option>
                  {initialOfferings.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.course?.code} — Sec {o.section} ({o.semester?.name})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  aria-label="Filter by Team Status"
                  value={allTeamsStatusFilter}
                  onChange={(e) => setAllTeamsStatusFilter(e.target.value)}
                  className="w-full h-10 px-3 bg-white border border-slate-300 rounded-md text-xs sm:text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-diu-blue"
                >
                  <option value="all">All Statuses (Open, Full, Closed)</option>
                  <option value="OPEN">Open (Accepting Members)</option>
                  <option value="FULL">Full Teams</option>
                  <option value="CLOSED">Closed Teams</option>
                </select>
              </div>
            </div>

            <div className="flex justify-between items-center text-xs text-slate-500 pt-2 border-t border-slate-100">
              <span>
                Showing <strong className="text-diu-navy">{filteredAllTeams.length}</strong> of {initialTeams.length} total registered teams
              </span>
              {(allTeamsSearch || allTeamsOfferingFilter !== "all" || allTeamsStatusFilter !== "all") && (
                <button
                  type="button"
                  onClick={() => {
                    setAllTeamsSearch("");
                    setAllTeamsOfferingFilter("all");
                    setAllTeamsStatusFilter("all");
                  }}
                  className="text-diu-blue hover:underline font-medium text-xs"
                >
                  Reset Filters
                </button>
              )}
            </div>
          </div>

          {/* All Teams Grid */}
          {filteredAllTeams.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-slate-200/80 p-8 space-y-3">
              <Users className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-lg font-semibold text-diu-navy">No Registered Teams Found</h3>
              <p className="text-xs sm:text-sm text-diu-slate max-w-md mx-auto">
                {initialTeams.length === 0
                  ? "No teams have been registered yet for any course offering. Be the first to register!"
                  : "No teams matched your filter or search query."}
              </p>
              <div className="pt-2">
                <Link href="/register-team">
                  <Button size="sm" className="gap-1.5 text-xs font-semibold bg-diu-blue hover:bg-diu-navy">
                    <UserPlus className="w-4 h-4" />
                    Register Your Team
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAllTeams.map((team) => {
                const activeCount = team.memberships?.length || 0;
                const availableSlots = Math.max(0, team.capacity - activeCount);
                const offering = team.course_offering;
                const isJoinable = team.status === "OPEN" && availableSlots > 0;

                return (
                  <Card
                    key={team.id}
                    className="flex flex-col border border-slate-200/90 shadow-sm hover:shadow-md transition-shadow bg-white"
                  >
                    <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/60">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          {team.presentation_number && (
                            <span className="inline-block px-2 py-0.5 rounded bg-blue-100 text-diu-blue text-[10px] font-bold uppercase tracking-wider mb-1">
                              Slot #{team.presentation_number}
                            </span>
                          )}
                          <CardTitle className="text-base text-diu-navy font-bold line-clamp-1">
                            {team.team_name}
                          </CardTitle>
                          <p className="text-xs text-diu-slate font-medium mt-0.5">
                            {offering?.course?.code} Sec {offering?.section} • {offering?.semester?.name}
                          </p>
                        </div>
                        <TeamStatusBadge status={team.status} />
                      </div>
                    </CardHeader>

                    <CardContent className="pt-4 flex-1 space-y-3 text-xs">
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span>
                          Leader: <strong>{team.leader?.student?.full_name || "Assigned Leader"}</strong>
                        </span>
                      </div>

                      {team.topic ? (
                        <p className="text-slate-600 bg-slate-50 p-2 rounded border border-slate-100 text-[11px] line-clamp-2 italic">
                          Topic: {team.topic}
                        </p>
                      ) : (
                        <span className="text-slate-400 italic text-[11px] block">No topic specified</span>
                      )}

                      {/* Vacancy Progress */}
                      <div>
                        <div className="flex justify-between items-center text-[11px] text-slate-500 mb-1">
                          <span>Capacity</span>
                          <span>{activeCount} / {team.capacity} Members ({availableSlots} slot{availableSlots !== 1 ? "s" : ""} left)</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-1.5 rounded-full ${
                              availableSlots === 0
                                ? "bg-amber-500"
                                : "bg-emerald-500"
                            }`}
                            style={{ width: `${(activeCount / team.capacity) * 100}%` }}
                          />
                        </div>
                      </div>
                    </CardContent>

                    <CardFooter className="pt-2 pb-4 border-t border-slate-100 bg-slate-50/40 flex items-center gap-2">
                      <Link href={`/teams/${team.id}`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full text-xs font-medium">
                          View Roster
                        </Button>
                      </Link>

                      {isJoinable && (
                        <Link href={`/teams/${team.id}/join`} className="flex-1">
                          <Button variant="success" size="sm" className="w-full text-xs font-semibold gap-1">
                            <UserPlus className="w-3.5 h-3.5" />
                            Request Join
                          </Button>
                        </Link>
                      )}
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: FIND & JOIN OPEN TEAMS */}
      {activeTab === "openTeams" && (
        <div className="space-y-6">
          {/* Teams search & filters */}
          <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/90 shadow-sm space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Search open teams by team name, topic, or leader..."
                  value={teamSearch}
                  onChange={(e) => setTeamSearch(e.target.value)}
                  className="pl-9 text-xs sm:text-sm"
                />
              </div>

              <div>
                <select
                  aria-label="Filter by Course Section"
                  value={teamCourseFilter}
                  onChange={(e) => setTeamCourseFilter(e.target.value)}
                  className="w-full h-10 px-3 bg-white border border-slate-300 rounded-md text-xs sm:text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-diu-blue"
                >
                  <option value="all">All Course Sections</option>
                  {initialOfferings.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.course?.code} — Sec {o.section} ({o.semester?.name})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-between items-center text-xs text-slate-500 pt-2 border-t border-slate-100">
              <span>
                Showing <strong className="text-diu-navy">{filteredOpenTeams.length}</strong> open teams accepting members
              </span>
              {(teamSearch || teamCourseFilter !== "all") && (
                <button
                  type="button"
                  onClick={() => {
                    setTeamSearch("");
                    setTeamCourseFilter("all");
                  }}
                  className="text-diu-blue hover:underline font-medium text-xs"
                >
                  Reset Filters
                </button>
              )}
            </div>
          </div>

          {/* Open Teams Grid */}
          {filteredOpenTeams.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-slate-200/80 p-8 space-y-3">
              <Users className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-lg font-semibold text-diu-navy">No Open Teams Found</h3>
              <p className="text-xs sm:text-sm text-diu-slate max-w-md mx-auto">
                {openTeams.length === 0
                  ? "There are currently no open teams seeking members. Be the first to create one!"
                  : "No open teams matched your search criteria."}
              </p>
              <div className="pt-2">
                <Link href="/register-team">
                  <Button size="sm" className="gap-1.5 text-xs font-semibold bg-diu-blue hover:bg-diu-navy">
                    <UserPlus className="w-4 h-4" />
                    Register a New Team
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredOpenTeams.map((team) => {
                const activeCount = team.memberships?.length || 0;
                const availableSlots = Math.max(0, team.capacity - activeCount);
                const offering = team.course_offering;

                return (
                  <Card
                    key={team.id}
                    className="flex flex-col border border-slate-200/90 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/60">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          {team.presentation_number && (
                            <span className="inline-block px-2 py-0.5 rounded bg-blue-100 text-diu-blue text-[10px] font-bold uppercase tracking-wider mb-1">
                              Slot #{team.presentation_number}
                            </span>
                          )}
                          <CardTitle className="text-base text-diu-navy font-bold line-clamp-1">
                            {team.team_name}
                          </CardTitle>
                          <p className="text-xs text-diu-slate font-medium mt-0.5">
                            {offering?.course?.code} Sec {offering?.section}
                          </p>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200 shrink-0">
                          {availableSlots} slot{availableSlots > 1 ? "s" : ""} left
                        </span>
                      </div>
                    </CardHeader>

                    <CardContent className="pt-4 flex-1 space-y-3 text-xs">
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span>
                          Leader: <strong>{team.leader?.student?.full_name || "Assigned Leader"}</strong>
                        </span>
                      </div>

                      {team.topic && (
                        <p className="text-slate-600 bg-slate-50 p-2 rounded border border-slate-100 text-[11px] line-clamp-2 italic">
                          Topic: {team.topic}
                        </p>
                      )}

                      {/* Vacancy Progress */}
                      <div>
                        <div className="flex justify-between items-center text-[11px] text-slate-500 mb-1">
                          <span>Capacity</span>
                          <span>{activeCount} / {team.capacity} Members</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-emerald-500 h-1.5 rounded-full"
                            style={{ width: `${(activeCount / team.capacity) * 100}%` }}
                          />
                        </div>
                      </div>
                    </CardContent>

                    <CardFooter className="pt-2 pb-4 border-t border-slate-100 bg-slate-50/40">
                      <Link href={`/teams/${team.id}/join`} className="w-full">
                        <Button
                          variant="success"
                          size="sm"
                          className="w-full text-xs font-semibold gap-1.5 shadow-sm"
                        >
                          <UserPlus className="w-4 h-4" />
                          Request to Join Team
                        </Button>
                      </Link>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
