"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { Team, CourseOffering, Semester, Course } from "@/types";
import {
  adminUpdateTeamAction,
  adminRemoveMemberAction,
  adminDeleteTeamAction,
} from "@/lib/actions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TeamStatusBadge } from "@/components/ui/status-badge";
import { formatDate } from "@/lib/utils";
import {
  Users,
  Search,
  Filter,
  Crown,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Presentation,
  FileText,
  Link as LinkIcon,
  Layers,
  Sparkles,
} from "lucide-react";

interface Props {
  initialTeams: Team[];
  offerings: CourseOffering[];
  semesters: Semester[];
  initialOfferingId?: string;
  initialStatus?: string;
}

export function TeamsManagementClient({
  initialTeams,
  offerings,
  semesters,
  initialOfferingId,
  initialStatus,
}: Props) {
  const [teams, setTeams] = useState<Team[]>(initialTeams);
  const [search, setSearch] = useState("");
  const [selectedOffering, setSelectedOffering] = useState(initialOfferingId || "all");
  const [selectedStatus, setSelectedStatus] = useState(initialStatus || "all");

  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);

  // Edit form states
  const [editName, setEditName] = useState("");
  const [editCap, setEditCap] = useState(4);
  const [editStatus, setEditStatus] = useState<"OPEN" | "FULL" | "CLOSED">("OPEN");
  const [editLeaderId, setEditLeaderId] = useState("");

  const [loading, setLoading] = useState(false);
  const [deleteLoadingId, setDeleteLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Filtering
  const filteredTeams = useMemo(() => {
    return teams.filter((t) => {
      if (selectedOffering !== "all" && t.course_offering_id !== selectedOffering) {
        return false;
      }
      if (selectedStatus !== "all" && t.status !== selectedStatus) {
        return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesName = t.team_name.toLowerCase().includes(q);
        const matchesLeader = t.leader?.student?.full_name?.toLowerCase().includes(q) || false;
        const matchesCourse = t.course_offering?.course?.code?.toLowerCase().includes(q) || false;
        const matchesSec = t.course_offering?.section?.toLowerCase().includes(q) || false;
        const matchesTopic = t.topic?.toLowerCase().includes(q) || false;
        const matchesNumber = String(t.presentation_number || "").includes(q);
        if (!matchesName && !matchesLeader && !matchesCourse && !matchesSec && !matchesTopic && !matchesNumber) {
          return false;
        }
      }
      return true;
    });
  }, [teams, selectedOffering, selectedStatus, search]);

  const openEditModal = (t: Team) => {
    setEditingTeam(t);
    setEditName(t.team_name);
    setEditCap(t.capacity);
    setEditStatus(t.status);
    setEditLeaderId(t.leader_membership_id || "");
    setError(null);
    setSuccess(null);
  };

  const handleSaveTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeam) return;
    setError(null);
    setLoading(true);

    try {
      const res = await adminUpdateTeamAction(editingTeam.id, {
        team_name: editName,
        capacity: Number(editCap),
        status: editStatus,
        leader_membership_id: editLeaderId,
      });

      if (!res.success || !res.data) {
        setError(res.error || "Failed to update team");
      } else {
        setTeams(teams.map((t) => (t.id === editingTeam.id ? res.data : t)));
        setEditingTeam(null);
        setSuccess("Team updated successfully");
      }
    } catch (err: any) {
      setError(err?.message || "Failed to update team");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (membershipId: string, memberName: string) => {
    const confirm = window.confirm(
      `Remove ${memberName} from this team? Active roster counts will be recalculated.`
    );
    if (!confirm) return;

    setLoading(true);
    try {
      const res = await adminRemoveMemberAction(membershipId, "Removed by Superadmin");
      if (res.success) {
        setTeams(
          teams.map((t) => {
            const updatedMembers = t.memberships?.filter((m) => m.id !== membershipId) || [];
            return {
              ...t,
              memberships: updatedMembers,
              registered_count: updatedMembers.length,
              available_slots: Math.max(0, t.capacity - updatedMembers.length),
              status: updatedMembers.length >= t.capacity ? "FULL" : "OPEN",
            };
          })
        );
        setSuccess(`Member ${memberName} removed successfully.`);
      } else {
        setError(res.error || "Failed to remove member");
      }
    } catch (err: any) {
      setError(err?.message || "Action failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTeam = async (teamId: string, teamName: string) => {
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete team "${teamName}"?\n\nThis will remove the team, dissolve all its memberships, and release its presentation slot.`
    );
    if (!confirmed) return;

    setDeleteLoadingId(teamId);
    setError(null);
    setSuccess(null);

    try {
      const res = await adminDeleteTeamAction(teamId);
      if (res.success) {
        setTeams((prev) => prev.filter((t) => t.id !== teamId));
        setSuccess(`Team "${teamName}" has been deleted successfully.`);
      } else {
        setError(res.error || "Failed to delete team.");
      }
    } catch (err: any) {
      setError(err?.message || "Error deleting team.");
    } finally {
      setDeleteLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-diu-navy font-heading">
            Teams Administration
          </h1>
          <p className="text-xs text-diu-slate">
            Oversight of registered presentation teams, slot allocations, topics, and rosters.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/superadmin/exports">
            <Button variant="outline" size="sm" className="text-xs gap-1.5">
              <FileText className="w-3.5 h-3.5 text-emerald-600" />
              Export Excel
            </Button>
          </Link>
          <Link href="/register-team">
            <Button size="sm" className="text-xs gap-1.5 bg-diu-blue hover:bg-diu-navy">
              <Sparkles className="w-3.5 h-3.5" />
              Register New Team
            </Button>
          </Link>
        </div>
      </div>

      {success && (
        <div className="p-3 rounded-lg bg-emerald-50 text-emerald-800 text-xs flex items-center justify-between border border-emerald-200">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess(null)} className="text-slate-400 hover:text-slate-600 text-base">
            &times;
          </button>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-lg bg-red-50 text-red-800 text-xs flex items-center justify-between border border-red-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-slate-400 hover:text-slate-600 text-base">
            &times;
          </button>
        </div>
      )}

      {/* FILTER BAR */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <Input
            placeholder="Search teams, leaders, topics, slots..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-xs"
          />
        </div>

        <div>
          <select
            aria-label="Filter teams by course section"
            value={selectedOffering}
            onChange={(e) => setSelectedOffering(e.target.value)}
            className="w-full h-10 px-3 py-2 bg-white border border-slate-300 rounded-md text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-diu-blue"
          >
            <option value="all">All Course Offerings / Sections</option>
            {offerings.map((o) => (
              <option key={o.id} value={o.id}>
                {o.course?.code} (Sec {o.section}) — {o.semester?.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <select
            aria-label="Filter teams by team status"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full h-10 px-3 py-2 bg-white border border-slate-300 rounded-md text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-diu-blue"
          >
            <option value="all">All Statuses</option>
            <option value="OPEN">OPEN</option>
            <option value="FULL">FULL</option>
            <option value="CLOSED">CLOSED</option>
          </select>
        </div>
      </div>

      {/* EDIT MODAL */}
      {editingTeam && (
        <Card className="border border-diu-blue/40 shadow-lg bg-white">
          <CardHeader className="bg-blue-50/50 pb-3 border-b border-slate-100">
            <CardTitle className="text-base text-diu-navy">
              Edit Team: {editingTeam.team_name}
            </CardTitle>
          </CardHeader>
          <form onSubmit={handleSaveTeam}>
            <CardContent className="pt-4 space-y-4 text-xs">
              {error && (
                <div className="p-2.5 rounded bg-red-50 text-red-700 border border-red-200">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Team Name</Label>
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Capacity</Label>
                  <Input
                    type="number"
                    min={editingTeam.memberships?.length || 1}
                    value={editCap}
                    onChange={(e) => setEditCap(Number(e.target.value))}
                    required
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Status</Label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                    className="w-full h-10 px-3 bg-white border border-slate-300 rounded-md text-xs text-slate-700"
                  >
                    <option value="OPEN">OPEN</option>
                    <option value="FULL">FULL</option>
                    <option value="CLOSED">CLOSED</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Assign Leader</Label>
                <select
                  value={editLeaderId}
                  onChange={(e) => setEditLeaderId(e.target.value)}
                  className="w-full h-10 px-3 bg-white border border-slate-300 rounded-md text-xs text-slate-700"
                >
                  {editingTeam.memberships?.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.student?.full_name} ({m.student?.student_id})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingTeam(null)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading} size="sm">
                  {loading ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </CardContent>
          </form>
        </Card>
      )}

      {/* TEAMS TABLE */}
      <Card className="border border-slate-200 shadow-sm bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-3.5">Slot &amp; Team Name</th>
                <th className="p-3.5">Course / Section</th>
                <th className="p-3.5">Topic &amp; Slides</th>
                <th className="p-3.5">Leader</th>
                <th className="p-3.5">Roster Count</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTeams.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    No teams found matching your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredTeams.map((team) => {
                  const isExpanded = expandedTeamId === team.id;
                  const members = team.memberships || [];
                  const slotLabel = team.presentation_number
                    ? `Team #${team.presentation_number}`
                    : "No Slot";

                  return (
                    <React.Fragment key={team.id}>
                      <tr className="hover:bg-slate-50 transition-colors">
                        <td className="p-3.5 font-semibold text-diu-navy">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-diu-blue border border-blue-200">
                              {slotLabel}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedTeamId(isExpanded ? null : team.id)
                              }
                              className="flex items-center gap-1.5 hover:text-diu-blue text-left font-semibold"
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                              )}
                              <span>{team.team_name}</span>
                            </button>
                          </div>
                        </td>

                        <td className="p-3.5 text-slate-600">
                          <div>
                            <span className="font-semibold text-slate-800">
                              {team.course_offering?.course?.code}
                            </span>
                            <span className="text-[11px] text-slate-400 block">
                              Section {team.course_offering?.section}
                            </span>
                          </div>
                        </td>

                        <td className="p-3.5 text-slate-600 max-w-xs">
                          <div className="space-y-1">
                            {team.topic ? (
                              <p className="truncate text-slate-700 font-medium" title={team.topic}>
                                {team.topic}
                              </p>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">No topic specified</span>
                            )}

                            <div className="flex items-center gap-2">
                              {team.slide_link && (
                                <a
                                  href={team.slide_link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[11px] text-diu-blue hover:underline"
                                >
                                  <LinkIcon className="w-3 h-3" />
                                  Slide Link
                                </a>
                              )}
                              {team.slide_file_name && (
                                <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                  <FileText className="w-3 h-3 text-slate-400" />
                                  {team.slide_file_name}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="p-3.5 text-slate-700 font-medium">
                          {team.leader?.student?.full_name ? (
                            <div>
                              <span className="flex items-center gap-1 font-semibold text-slate-800">
                                <Crown className="w-3 h-3 text-amber-500" />
                                {team.leader.student.full_name}
                              </span>
                              <span className="font-mono text-slate-400 text-[11px]">
                                {team.leader.student.student_id}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Unassigned</span>
                          )}
                        </td>

                        <td className="p-3.5 text-slate-600">
                          <span className="font-semibold">{members.length}</span> / {team.capacity}
                        </td>

                        <td className="p-3.5">
                          <TeamStatusBadge status={team.status} />
                        </td>

                        <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                          <Link href={`/teams/${team.id}`} target="_blank">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-slate-600 hover:text-diu-blue text-xs h-7 px-2 gap-1"
                              title="View Public Team Page"
                            >
                              <ExternalLink className="w-3 h-3" />
                              View
                            </Button>
                          </Link>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditModal(team)}
                            className="text-diu-blue text-xs h-7 px-2 gap-1"
                            title="Edit Team"
                          >
                            <Edit2 className="w-3 h-3" />
                            Edit
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={deleteLoadingId === team.id}
                            onClick={() => handleDeleteTeam(team.id, team.team_name)}
                            className="text-red-600 hover:bg-red-50 text-xs h-7 px-2 gap-1"
                            title="Delete Team"
                          >
                            <Trash2 className="w-3 h-3" />
                            {deleteLoadingId === team.id ? "..." : "Delete"}
                          </Button>
                        </td>
                      </tr>

                      {/* EXPANDED ROSTER ROW */}
                      {isExpanded && (
                        <tr className="bg-slate-50/70">
                          <td colSpan={7} className="p-4 border-b border-slate-200">
                            <div className="space-y-3">
                              <div className="flex justify-between items-center">
                                <span className="font-bold text-[11px] uppercase tracking-wider text-slate-500 block">
                                  Active Student Members ({members.length} of {team.capacity})
                                </span>
                                {team.slide_link && (
                                  <a
                                    href={team.slide_link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-diu-blue hover:underline flex items-center gap-1 font-medium"
                                  >
                                    <Presentation className="w-3.5 h-3.5" />
                                    Open Slides: {team.slide_link}
                                  </a>
                                )}
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                {members.map((m) => (
                                  <div
                                    key={m.id}
                                    className="p-2.5 rounded bg-white border border-slate-200 flex justify-between items-center text-xs"
                                  >
                                    <div>
                                      <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                                        {m.student?.full_name}
                                        {m.role === "LEADER" && (
                                          <Crown className="w-3 h-3 text-amber-500" />
                                        )}
                                      </div>
                                      <span className="font-mono text-slate-500 text-[11px]">
                                        ID: {m.student?.student_id}
                                      </span>
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleRemoveMember(
                                          m.id,
                                          m.student?.full_name || "Member"
                                        )
                                      }
                                      title="Remove student from team"
                                      className="p-1 rounded text-red-600 hover:bg-red-50"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
