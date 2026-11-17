"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { CourseOffering, Team } from "@/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RegistrationStatusBadge, TeamStatusBadge } from "@/components/ui/status-badge";
import { formatDate } from "@/lib/utils";
import {
  Users,
  UserPlus,
  PlusCircle,
  Search,
  Crown,
  Calendar,
  Layers,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  Clock,
  ArrowRight,
} from "lucide-react";

interface Props {
  offeringsForCourse: CourseOffering[];
  currentOffering: CourseOffering;
  teams: Team[];
}

export function CourseDetailsClient({
  offeringsForCourse,
  currentOffering,
  teams,
}: Props) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const course = currentOffering.course;
  const semester = currentOffering.semester;
  const isOfferingOpen = currentOffering.registration_status === "OPEN";

  // Filtered teams
  const filteredTeams = useMemo(() => {
    return teams.filter((team) => {
      if (statusFilter !== "all" && team.status !== statusFilter) {
        return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesName = team.team_name.toLowerCase().includes(q);
        const matchesLeader = team.leader?.student?.full_name?.toLowerCase().includes(q);
        const matchesMember = team.memberships?.some((m) =>
          m.student?.full_name?.toLowerCase().includes(q)
        );
        if (!matchesName && !matchesLeader && !matchesMember) {
          return false;
        }
      }
      return true;
    });
  }, [teams, search, statusFilter]);

  const openTeamsCount = teams.filter((t) => t.status === "OPEN").length;
  const fullTeamsCount = teams.filter((t) => t.status === "FULL").length;

  return (
    <div className="space-y-8">
      {/* Top Banner & Offering Header */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-diu-navy to-diu-blue p-6 sm:p-8 text-white">
          <div className="flex flex-wrap justify-between items-start gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-3 py-1 rounded bg-white/20 text-white backdrop-blur-sm">
                  {course?.code}
                </span>
                <span className="text-xs text-blue-100">
                  {semester?.name} ({semester?.academic_year})
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold font-heading text-white">
                {course?.name}
              </h1>
              <p className="text-sm text-blue-100 max-w-2xl leading-relaxed">
                {course?.description || "Course presentation group formation"}
              </p>
            </div>

            <div className="flex flex-col items-end gap-2">
              <RegistrationStatusBadge status={currentOffering.registration_status} />
              <div className="text-xs text-blue-200 flex items-center gap-1.5 mt-1">
                <Clock className="w-3.5 h-3.5" />
                <span>Deadline: {formatDate(currentOffering.registration_deadline)}</span>
              </div>
            </div>
          </div>

          {/* Section Selector if course has multiple sections */}
          {offeringsForCourse.length > 1 && (
            <div className="mt-6 pt-4 border-t border-white/20 flex flex-wrap items-center gap-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-200">
                Course Sections:
              </span>
              <div className="flex flex-wrap gap-2">
                {offeringsForCourse.map((off) => {
                  const isCurrent = off.id === currentOffering.id;
                  return (
                    <Link
                      key={off.id}
                      href={`/courses/${course?.slug}?section=${encodeURIComponent(off.section)}`}
                    >
                      <button
                        className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                          isCurrent
                            ? "bg-white text-diu-navy shadow-sm"
                            : "bg-white/10 hover:bg-white/20 text-white"
                        }`}
                      >
                        Section {off.section}
                      </button>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Course Info & Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 bg-slate-50/50 p-4 sm:p-6 text-center">
          <div className="p-2">
            <span className="text-xs text-diu-slate block mb-1">Section</span>
            <span className="text-xl font-bold text-diu-navy font-heading">
              {currentOffering.section}
            </span>
          </div>
          <div className="p-2">
            <span className="text-xs text-diu-slate block mb-1">Registered Teams</span>
            <span className="text-xl font-bold text-diu-navy font-heading">
              {teams.length}
            </span>
          </div>
          <div className="p-2">
            <span className="text-xs text-diu-slate block mb-1">Total Students</span>
            <span className="text-xl font-bold text-diu-blue font-heading">
              {currentOffering.students_count || 0}
            </span>
          </div>
          <div className="p-2">
            <span className="text-xs text-diu-slate block mb-1">Team Capacity Bounds</span>
            <span className="text-sm font-bold text-slate-700">
              {currentOffering.min_team_capacity} – {currentOffering.max_team_capacity} members
            </span>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="p-6 bg-white border-t border-slate-200 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>
              Student privacy protected: Student IDs are confidential and never exposed publicly.
            </span>
          </div>

          <div className="flex flex-wrap gap-3 w-full sm:w-auto">
            {isOfferingOpen ? (
              <>
                <Link
                  href={`/courses/${course?.slug}/create-team?section=${encodeURIComponent(
                    currentOffering.section
                  )}`}
                  className="w-full sm:w-auto"
                >
                  <Button size="lg" className="w-full sm:w-auto gap-2 font-semibold">
                    <PlusCircle className="w-5 h-5" />
                    Create a Team
                  </Button>
                </Link>

                <a href="#teams-directory" className="w-full sm:w-auto">
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full sm:w-auto gap-2 font-medium"
                  >
                    <UserPlus className="w-4 h-4 text-diu-blue" />
                    Join an Existing Team
                  </Button>
                </a>
              </>
            ) : (
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-md text-sm font-medium border border-slate-200">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <span>
                  Registration is currently {currentOffering.registration_status.toLowerCase()}. New
                  team formation is locked.
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* PUBLIC TEAMS DIRECTORY */}
      <div id="teams-directory" className="space-y-6 pt-4">
        <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4">
          <div>
            <h2 className="text-2xl font-bold text-diu-navy font-heading">
              Registered Teams Directory
            </h2>
            <p className="text-sm text-diu-slate">
              Section {currentOffering.section} • Showing teams with active memberships and open slots
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="px-2.5 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
              {openTeamsCount} Open
            </span>
            <span className="px-2.5 py-1 rounded bg-amber-50 text-amber-700 border border-amber-200 font-medium">
              {fullTeamsCount} Full
            </span>
          </div>
        </div>

        {/* Directory Search & Filters */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-sm flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <Input
              type="text"
              placeholder="Search by team name or student name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-sm"
            />
          </div>

          <div className="sm:w-48">
            <select
              aria-label="Filter teams by status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full h-10 px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-diu-blue"
            >
              <option value="all">All Team Statuses</option>
              <option value="OPEN">Open (Has Available Slots)</option>
              <option value="FULL">Full</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>
        </div>

        {/* Teams List */}
        {filteredTeams.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-slate-200 p-8 space-y-4">
            <Users className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-lg font-semibold text-diu-navy">No teams found</h3>
            <p className="text-sm text-diu-slate max-w-md mx-auto">
              {teams.length === 0
                ? "Be the first to create a presentation team for this course offering!"
                : "No registered teams matched your search criteria."}
            </p>
            {isOfferingOpen && teams.length === 0 && (
              <Link
                href={`/courses/${course?.slug}/create-team?section=${encodeURIComponent(
                  currentOffering.section
                )}`}
              >
                <Button className="mt-2 font-semibold">
                  <PlusCircle className="w-4 h-4 mr-2" />
                  Create First Team
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredTeams.map((team) => {
              const activeMembers = team.memberships || [];
              const availableSlots = Math.max(0, team.capacity - activeMembers.length);
              const isJoinable = isOfferingOpen && team.status === "OPEN" && availableSlots > 0;

              return (
                <Card
                  key={team.id}
                  className="flex flex-col border border-slate-200/90 shadow-sm hover:shadow-md transition-shadow"
                >
                  <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <CardTitle className="text-lg text-diu-navy">
                          {team.team_name}
                        </CardTitle>
                        <div className="flex items-center gap-1.5 text-xs text-diu-slate mt-1">
                          <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span>
                            Leader:{" "}
                            <strong className="text-diu-navy">
                              {team.leader?.student?.full_name || "Assigned Leader"}
                            </strong>
                          </span>
                        </div>
                      </div>
                      <TeamStatusBadge status={team.status} />
                    </div>
                  </CardHeader>

                  <CardContent className="pt-4 flex-1 space-y-4 text-xs">
                    {/* Capacity and vacancy bar */}
                    <div>
                      <div className="flex justify-between items-center text-xs mb-1.5 font-medium">
                        <span className="text-slate-600">
                          Members: {activeMembers.length} / {team.capacity}
                        </span>
                        <span
                          className={`font-semibold ${
                            availableSlots > 0 ? "text-emerald-600" : "text-amber-600"
                          }`}
                        >
                          {availableSlots > 0
                            ? `${availableSlots} slot${availableSlots > 1 ? "s" : ""} available`
                            : "Team Full"}
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            team.status === "FULL"
                              ? "bg-amber-500"
                              : team.status === "CLOSED"
                              ? "bg-slate-400"
                              : "bg-emerald-500"
                          }`}
                          style={{
                            width: `${Math.min(
                              100,
                              (activeMembers.length / team.capacity) * 100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Member names roster (student IDs intentionally excluded for privacy) */}
                    <div>
                      <span className="text-slate-500 uppercase tracking-wider text-[10px] font-bold block mb-2">
                        Registered Team Members
                      </span>
                      <ul className="space-y-1.5">
                        {activeMembers.map((m, idx) => (
                          <li
                            key={m.id}
                            className="flex items-center justify-between p-2 rounded-md bg-slate-50 border border-slate-100 text-xs"
                          >
                            <span className="font-medium text-slate-800 flex items-center gap-2">
                              <span className="text-slate-400 text-[10px] w-4">{idx + 1}.</span>
                              {m.student?.full_name || "Registered Member"}
                            </span>
                            {m.role === "LEADER" ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                <Crown className="w-3 h-3" />
                                Leader
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                                Member
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="pt-2 flex justify-between items-center text-[11px] text-slate-400 border-t border-slate-100">
                      <span>Formed: {formatDate(team.created_at)}</span>
                      <Link
                        href={`/teams/${team.id}`}
                        className="text-diu-blue hover:underline font-medium"
                      >
                        Team Info
                      </Link>
                    </div>
                  </CardContent>

                  <div className="p-4 bg-slate-50/70 border-t border-slate-100">
                    {isJoinable ? (
                      <Link href={`/teams/${team.id}/join`} className="w-full block">
                        <Button
                          variant="success"
                          className="w-full text-xs font-semibold gap-1.5"
                        >
                          <UserPlus className="w-4 h-4" />
                          Join This Team ({availableSlots} slot{availableSlots > 1 ? "s" : ""} left)
                        </Button>
                      </Link>
                    ) : team.status === "FULL" ? (
                      <Button
                        disabled
                        variant="secondary"
                        className="w-full text-xs text-slate-500 cursor-not-allowed"
                      >
                        Team is Full
                      </Button>
                    ) : (
                      <Button
                        disabled
                        variant="secondary"
                        className="w-full text-xs text-slate-500 cursor-not-allowed"
                      >
                        {team.status === "CLOSED" ? "Team Closed" : "Registration Not Open"}
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
