"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { Team, CourseOffering, Semester } from "@/types";
import {
  adminUpdateTeamAction,
  adminRemoveMemberAction,
  adminDeleteTeamAction,
  adminAddMemberAction,
  registerTeamMultiStepAction,
  getAvailablePresentationNumbersAction,
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
  Sparkles,
  PlusCircle,
  UserPlus,
  Hash,
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

  // Edit Team state
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [editName, setEditName] = useState("");
  const [editCap, setEditCap] = useState(5);
  const [editStatus, setEditStatus] = useState<"OPEN" | "FULL" | "CLOSED">("OPEN");
  const [editLeaderId, setEditLeaderId] = useState("");
  const [editPresentationNum, setEditPresentationNum] = useState<number>(1);
  const [editTopic, setEditTopic] = useState("");
  const [editSlideLink, setEditSlideLink] = useState("");

  // Inline Add Member state inside Edit modal
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberId, setNewMemberId] = useState("");
  const [addingMember, setAddingMember] = useState(false);

  // Create Team modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createOfferingId, setCreateOfferingId] = useState(offerings[0]?.id || "");
  const [createTeamName, setCreateTeamName] = useState("");
  const [createPresentationNum, setCreatePresentationNum] = useState<number>(1);
  const [createTopic, setCreateTopic] = useState("");
  const [createCapacity, setCreateCapacity] = useState(5);
  const [createLeaderName, setCreateLeaderName] = useState("");
  const [createLeaderId, setCreateLeaderId] = useState("");
  const [createCreating, setCreateCreating] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<{ number: number; label: string; isTaken: boolean }[]>([]);

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

  const openCreateModal = async () => {
    const targetOffId = selectedOffering !== "all" ? selectedOffering : offerings[0]?.id || "";
    setCreateOfferingId(targetOffId);
    setCreateTeamName("");
    setCreateTopic("");
    setCreateLeaderName("");
    setCreateLeaderId("");
    setError(null);
    setSuccess(null);

    const off = offerings.find((o) => o.id === targetOffId);
    setCreateCapacity(off?.max_team_capacity || 5);

    try {
      const slotsRes = await getAvailablePresentationNumbersAction(targetOffId);
      if (slotsRes.success && slotsRes.data) {
        setAvailableSlots(slotsRes.data);
        const firstFree = slotsRes.data.find((s) => !s.isTaken);
        const nextSlot = firstFree ? firstFree.number : 1;
        setCreatePresentationNum(nextSlot);
        setCreateTeamName(`Team ${nextSlot}`);
      }
    } catch {}

    setShowCreateModal(true);
  };

  const handleCreateOfferingChange = async (offId: string) => {
    setCreateOfferingId(offId);
    const off = offerings.find((o) => o.id === offId);
    setCreateCapacity(off?.max_team_capacity || 5);

    try {
      const slotsRes = await getAvailablePresentationNumbersAction(offId);
      if (slotsRes.success && slotsRes.data) {
        setAvailableSlots(slotsRes.data);
        const firstFree = slotsRes.data.find((s) => !s.isTaken);
        const nextSlot = firstFree ? firstFree.number : 1;
        setCreatePresentationNum(nextSlot);
        setCreateTeamName(`Team ${nextSlot}`);
      }
    } catch {}
  };

  const handleCreateTeamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setCreateCreating(true);

    try {
      const res = await registerTeamMultiStepAction({
        courseOfferingId: createOfferingId,
        teamName: createTeamName.trim() || `Team ${createPresentationNum}`,
        capacity: Number(createCapacity),
        presentation_number: Number(createPresentationNum),
        topic: createTopic.trim() || undefined,
        leaderName: createLeaderName.trim(),
        leaderStudentId: createLeaderId.trim(),
        members: [],
        isOpenForMembers: true,
      });

      if (!res.success || !res.data) {
        setError(res.error || "Failed to create team.");
      } else {
        const off = offerings.find((o) => o.id === createOfferingId);
        const newTeam: Team = {
          id: res.data.teamId,
          course_offering_id: createOfferingId,
          team_name: res.data.teamName,
          presentation_number: res.data.presentationNumber,
          capacity: Number(createCapacity),
          topic: createTopic.trim() || null,
          leader_membership_id: res.data.membershipId,
          status: "OPEN",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          course_offering: off,
          registered_count: 1,
          available_slots: Math.max(0, Number(createCapacity) - 1),
          leader: {
            id: res.data.membershipId,
            team_id: res.data.teamId,
            student_id: "leader-stu",
            course_offering_id: createOfferingId,
            role: "LEADER",
            status: "ACTIVE",
            joined_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            student: {
              id: "leader-stu",
              full_name: createLeaderName.trim(),
              student_id: createLeaderId.trim(),
              normalized_student_id: createLeaderId.trim().toLowerCase(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          },
          memberships: [
            {
              id: res.data.membershipId,
              team_id: res.data.teamId,
              student_id: "leader-stu",
              course_offering_id: createOfferingId,
              role: "LEADER",
              status: "ACTIVE",
              joined_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              student: {
                id: "leader-stu",
                full_name: createLeaderName.trim(),
                student_id: createLeaderId.trim(),
                normalized_student_id: createLeaderId.trim().toLowerCase(),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            },
          ],
        };

        setTeams((prev) => [newTeam, ...prev]);
        setShowCreateModal(false);
        setSuccess(`Team "${newTeam.team_name}" registered successfully at Slot #${newTeam.presentation_number}!`);
      }
    } catch (err: any) {
      setError(err?.message || "Error creating team.");
    } finally {
      setCreateCreating(false);
    }
  };

  const openEditModal = (t: Team) => {
    setEditingTeam(t);
    setEditName(t.team_name);
    setEditCap(t.capacity);
    setEditStatus(t.status);
    setEditLeaderId(t.leader_membership_id || "");
    setEditPresentationNum(t.presentation_number || 1);
    setEditTopic(t.topic || "");
    setEditSlideLink(t.slide_link || "");
    setNewMemberName("");
    setNewMemberId("");
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
        presentation_number: Number(editPresentationNum),
        topic: editTopic.trim() || null,
        slide_link: editSlideLink.trim() || null,
      });

      if (!res.success || !res.data) {
        setError(res.error || "Failed to update team");
      } else {
        setTeams((prev) => prev.map((t) => (t.id === editingTeam.id ? res.data! : t)));
        setEditingTeam(null);
        setSuccess(`Team "${res.data.team_name}" updated successfully.`);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to update team");
    } finally {
      setLoading(false);
    }
  };

  const handleAddMemberToTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeam || !newMemberName.trim() || !newMemberId.trim()) return;

    setAddingMember(true);
    setError(null);

    try {
      const res = await adminAddMemberAction({
        teamId: editingTeam.id,
        studentName: newMemberName.trim(),
        studentId: newMemberId.trim(),
      });

      if (!res.success || !res.data) {
        setError(res.error || "Failed to add member to team.");
      } else {
        setEditingTeam(res.data);
        setTeams((prev) => prev.map((t) => (t.id === editingTeam.id ? res.data! : t)));
        setNewMemberName("");
        setNewMemberId("");
        setSuccess(`Student "${newMemberName}" added to team!`);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to add member.");
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveMember = async (membershipId: string, memberName: string) => {
    const confirm = window.confirm(
      `Remove ${memberName} from this team? Active roster counts will be recalculated.`
    );
    if (!confirm) return;

    setLoading(true);
    setError(null);
    try {
      const res = await adminRemoveMemberAction(membershipId, "Removed by Superadmin");
      if (res.success) {
        setTeams((prev) =>
          prev.map((t) => {
            if (t.id === editingTeam?.id || t.memberships?.some((m) => m.id === membershipId)) {
              const updatedMembers = t.memberships?.filter((m) => m.id !== membershipId) || [];
              const updatedTeam = {
                ...t,
                memberships: updatedMembers,
                registered_count: updatedMembers.length,
                available_slots: Math.max(0, t.capacity - updatedMembers.length),
                status: (updatedMembers.length >= t.capacity ? "FULL" : "OPEN") as any,
              };
              if (editingTeam?.id === t.id) {
                setEditingTeam(updatedTeam);
              }
              return updatedTeam;
            }
            return t;
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
      `Are you sure you want to permanently delete team "${teamName}"?\n\nThis will remove the team, dissolve all memberships, and release presentation slot.`
    );
    if (!confirmed) return;

    setDeleteLoadingId(teamId);
    setError(null);
    setSuccess(null);

    try {
      const res = await adminDeleteTeamAction(teamId);
      if (res.success) {
        setTeams((prev) => prev.filter((t) => t.id !== teamId));
        setSuccess(`Team "${teamName}" has been deleted permanently.`);
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
            Full CRUD management of registered presentation teams, slots, topics, and rosters in DBMS.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/superadmin/exports">
            <Button variant="outline" size="sm" className="text-xs gap-1.5">
              <FileText className="w-3.5 h-3.5 text-emerald-600" />
              Export Excel
            </Button>
          </Link>
          <Button
            size="sm"
            onClick={openCreateModal}
            className="text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Add Team (Admin)
          </Button>
          <Link href="/register-team">
            <Button size="sm" className="text-xs gap-1.5 bg-diu-blue hover:bg-diu-navy">
              <Sparkles className="w-3.5 h-3.5" />
              Student Wizard
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

      {/* CREATE TEAM MODAL */}
      {showCreateModal && (
        <Card className="border border-emerald-500 shadow-xl bg-white">
          <CardHeader className="bg-emerald-50 pb-3 border-b border-emerald-100 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <PlusCircle className="w-4 h-4 text-emerald-600" />
              <CardTitle className="text-base text-emerald-900">
                Register New Presentation Team (Admin)
              </CardTitle>
            </div>
            <button
              onClick={() => setShowCreateModal(false)}
              className="text-slate-400 hover:text-slate-600 text-lg leading-none"
            >
              &times;
            </button>
          </CardHeader>
          <form onSubmit={handleCreateTeamSubmit}>
            <CardContent className="pt-4 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs font-semibold">Course Offering &amp; Section *</Label>
                  <select
                    value={createOfferingId}
                    onChange={(e) => handleCreateOfferingChange(e.target.value)}
                    required
                    className="w-full h-10 px-3 bg-white border border-slate-300 rounded-md text-xs text-slate-800"
                  >
                    {offerings.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.course?.code} — Sec {o.section} ({o.semester?.name})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Presentation Team Slot *</Label>
                  <select
                    value={createPresentationNum}
                    onChange={(e) => {
                      const num = Number(e.target.value);
                      setCreatePresentationNum(num);
                      if (!createTeamName || createTeamName.startsWith("Team ")) {
                        setCreateTeamName(`Team ${num}`);
                      }
                    }}
                    required
                    className="w-full h-10 px-3 bg-white border border-slate-300 rounded-md text-xs text-slate-800"
                  >
                    {availableSlots.map((s) => (
                      <option key={s.number} value={s.number} disabled={s.isTaken}>
                        Slot #{s.number} {s.isTaken ? "(Taken)" : "(Available)"}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Team Capacity *</Label>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={createCapacity}
                    onChange={(e) => setCreateCapacity(Number(e.target.value))}
                    required
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Team Name *</Label>
                  <Input
                    value={createTeamName}
                    onChange={(e) => setCreateTeamName(e.target.value)}
                    placeholder="e.g. CodeCraft or Team 1"
                    required
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Presentation Topic (Optional)</Label>
                  <Input
                    value={createTopic}
                    onChange={(e) => setCreateTopic(e.target.value)}
                    placeholder="e.g. Graph Algorithms in Social Networks"
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
                <div className="flex items-center gap-2 text-slate-700 font-semibold text-xs">
                  <Crown className="w-4 h-4 text-amber-500" />
                  <span>Team Leader Details</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[11px] text-slate-600">Leader Full Name *</Label>
                    <Input
                      value={createLeaderName}
                      onChange={(e) => setCreateLeaderName(e.target.value)}
                      placeholder="e.g. Tanvir Ahmed"
                      required
                      className="text-xs bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-slate-600">Leader Student ID *</Label>
                    <Input
                      value={createLeaderId}
                      onChange={(e) => setCreateLeaderId(e.target.value)}
                      placeholder="e.g. 252-35-101"
                      required
                      className="text-xs bg-white"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createCreating}
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                >
                  {createCreating ? "Creating..." : "Create Team"}
                </Button>
              </div>
            </CardContent>
          </form>
        </Card>
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
            className="w-full h-10 px-3 bg-white border border-slate-300 rounded-md text-xs text-slate-700"
          >
            <option value="all">All Course Offerings</option>
            {offerings.map((o) => (
              <option key={o.id} value={o.id}>
                {o.course?.code} — Sec {o.section} ({o.semester?.name})
              </option>
            ))}
          </select>
        </div>

        <div>
          <select
            aria-label="Filter teams by registration status"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full h-10 px-3 bg-white border border-slate-300 rounded-md text-xs text-slate-700"
          >
            <option value="all">All Team Statuses</option>
            <option value="OPEN">Open for Members</option>
            <option value="FULL">Full Capacity</option>
            <option value="CLOSED">Closed</option>
          </select>
        </div>
      </div>

      {/* EDIT TEAM MODAL */}
      {editingTeam && (
        <Card className="border border-diu-blue/40 shadow-xl bg-white">
          <CardHeader className="bg-blue-50/50 pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
            <CardTitle className="text-base text-diu-navy flex items-center gap-2">
              <Edit2 className="w-4 h-4 text-diu-blue" />
              Edit Team: {editingTeam.team_name}
            </CardTitle>
            <button
              onClick={() => setEditingTeam(null)}
              className="text-slate-400 hover:text-slate-600 text-lg leading-none"
            >
              &times;
            </button>
          </CardHeader>
          <form onSubmit={handleSaveTeam}>
            <CardContent className="pt-4 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs font-semibold">Team Name *</Label>
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Presentation Slot # *</Label>
                  <Input
                    type="number"
                    min={1}
                    value={editPresentationNum}
                    onChange={(e) => setEditPresentationNum(Number(e.target.value))}
                    required
                    className="text-xs font-mono font-bold"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Capacity *</Label>
                  <Input
                    type="number"
                    min={editingTeam.memberships?.length || 1}
                    value={editCap}
                    onChange={(e) => setEditCap(Number(e.target.value))}
                    required
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Presentation Topic</Label>
                  <Input
                    value={editTopic}
                    onChange={(e) => setEditTopic(e.target.value)}
                    placeholder="Presentation topic"
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Presentation Slide Link (URL)</Label>
                  <Input
                    value={editSlideLink}
                    onChange={(e) => setEditSlideLink(e.target.value)}
                    placeholder="https://docs.google.com/presentation/..."
                    className="text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Registration Status</Label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                    className="w-full h-10 px-3 bg-white border border-slate-300 rounded-md text-xs text-slate-700"
                  >
                    <option value="OPEN">OPEN (Accepting Requests)</option>
                    <option value="FULL">FULL (At Capacity)</option>
                    <option value="CLOSED">CLOSED (Locked)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Assign Team Leader</Label>
                  <select
                    value={editLeaderId}
                    onChange={(e) => setEditLeaderId(e.target.value)}
                    className="w-full h-10 px-3 bg-white border border-slate-300 rounded-md text-xs text-slate-700"
                  >
                    {editingTeam.memberships?.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.student?.full_name} ({m.student?.student_id}) {m.role === "LEADER" ? "★ Current Leader" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* INLINE ADD MEMBER BOX */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700 text-xs flex items-center gap-1.5">
                    <UserPlus className="w-3.5 h-3.5 text-diu-blue" />
                    Add Student Member Directly
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Current roster: {editingTeam.memberships?.length || 0} / {editCap}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <Input
                    placeholder="Student Full Name"
                    value={newMemberName}
                    onChange={(e) => setNewMemberName(e.target.value)}
                    className="text-xs bg-white h-11 sm:h-9"
                  />
                  <Input
                    placeholder="Student ID (e.g. 252-35-102)"
                    value={newMemberId}
                    onChange={(e) => setNewMemberId(e.target.value)}
                    className="text-xs bg-white h-11 sm:h-9"
                  />
                  <Button
                    type="button"
                    onClick={handleAddMemberToTeam}
                    disabled={addingMember || !newMemberName.trim() || !newMemberId.trim()}
                    size="sm"
                    className="w-full sm:w-auto h-11 sm:h-9 bg-diu-blue hover:bg-diu-navy text-white text-xs gap-1"
                  >
                    <UserPlus className="w-3 h-3" />
                    {addingMember ? "Adding..." : "Add Member"}
                  </Button>
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingTeam(null)}
                  className="w-full sm:w-auto h-11 sm:h-9 text-xs"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading} size="sm" className="w-full sm:w-auto h-11 sm:h-9 bg-diu-blue hover:bg-diu-navy text-white font-semibold text-xs">
                  {loading ? "Saving Changes..." : "Save Changes"}
                </Button>
              </div>
            </CardContent>
          </form>
        </Card>
      )}

      {/* TEAMS DATA TABLE */}
      <Card className="border border-slate-200 shadow-sm bg-white overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-3.5 text-center w-14">Slot</th>
                <th className="p-3.5">Team &amp; Leader</th>
                <th className="p-3.5">Course &amp; Sec</th>
                <th className="p-3.5">Topic &amp; Slides</th>
                <th className="p-3.5">Members</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTeams.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    No presentation teams found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredTeams.map((team) => {
                  const isExpanded = expandedTeamId === team.id;
                  const members = team.memberships || [];
                  const activeCount = team.registered_count || members.length;
                  const availableSlots = team.available_slots !== undefined
                    ? team.available_slots
                    : Math.max(0, team.capacity - activeCount);

                  return (
                    <React.Fragment key={team.id}>
                      <tr className="hover:bg-slate-50 transition-colors">
                        <td className="p-3.5 text-center font-mono">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-diu-blue/10 text-diu-blue font-bold text-xs border border-diu-blue/20">
                            #{team.presentation_number || "—"}
                          </span>
                        </td>

                        <td className="p-3.5 font-medium text-slate-800">
                          <div className="space-y-1">
                            <span className="font-bold text-diu-navy text-sm block">
                              {team.team_name}
                            </span>
                            <div className="flex items-center gap-1.5 text-slate-500">
                              <Crown className="w-3 h-3 text-amber-500 shrink-0" />
                              <span>{team.leader?.student?.full_name || "No leader assigned"}</span>
                              {team.leader?.student?.student_id && (
                                <span className="font-mono text-[11px] text-slate-400">
                                  ({team.leader.student.student_id})
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="p-3.5 text-slate-600">
                          <div>
                            <span className="font-semibold text-diu-blue">
                              {team.course_offering?.course?.code || "N/A"}
                            </span>
                            <span className="text-slate-400 ml-1">
                              Sec {team.course_offering?.section || "N/A"}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400">
                            {team.course_offering?.semester?.name || "Semester"}
                          </span>
                        </td>

                        <td className="p-3.5 text-slate-600 max-w-xs">
                          <div className="space-y-1">
                            {team.topic ? (
                              <p className="truncate text-slate-700 font-medium" title={team.topic}>
                                {team.topic}
                              </p>
                            ) : team.course_offering?.topic_enabled === false ? (
                              <span className="text-slate-400 italic text-[11px]">Topic disabled</span>
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
                                  title={team.slide_link}
                                >
                                  <Presentation className="w-3 h-3 text-emerald-600" />
                                  <span>View Slides</span>
                                </a>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="p-3.5">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedTeamId(isExpanded ? null : team.id)
                            }
                            className="inline-flex items-center gap-1.5 text-xs text-diu-blue font-medium hover:underline"
                          >
                            <Users className="w-3.5 h-3.5" />
                            <span>
                              {activeCount} / {team.capacity}
                            </span>
                            {isExpanded ? (
                              <ChevronUp className="w-3 h-3 text-slate-400" />
                            ) : (
                              <ChevronDown className="w-3 h-3 text-slate-400" />
                            )}
                          </button>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {availableSlots} vacant slot{availableSlots === 1 ? "" : "s"}
                          </div>
                        </td>

                        <td className="p-3.5">
                          <TeamStatusBadge status={team.status} />
                        </td>

                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-slate-600 hover:text-diu-blue hover:bg-slate-100"
                              onClick={() => openEditModal(team)}
                              title="Edit Team"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                              disabled={deleteLoadingId === team.id}
                              onClick={() => handleDeleteTeam(team.id, team.team_name)}
                              title="Delete Team"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>

                      {/* EXPANDABLE MEMBER ROSTER */}
                      {isExpanded && (
                        <tr className="bg-slate-50/70 border-t border-slate-100">
                          <td colSpan={7} className="p-4 pl-12">
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

        {/* Mobile Responsive Teams Cards View */}
        <div className="md:hidden divide-y divide-slate-100">
          {filteredTeams.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No presentation teams found matching your filters.
            </div>
          ) : (
            filteredTeams.map((team) => {
              const isExpanded = expandedTeamId === team.id;
              const members = team.memberships || [];
              const activeCount = team.registered_count || members.length;
              const availableSlots = team.available_slots !== undefined
                ? team.available_slots
                : Math.max(0, team.capacity - activeCount);

              return (
                <div key={team.id} className="p-4 space-y-3 bg-white">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-diu-blue/10 text-diu-blue font-bold text-xs border border-diu-blue/20 font-mono">
                        #{team.presentation_number || "—"}
                      </span>
                      <div>
                        <span className="font-bold text-sm text-diu-navy block">
                          {team.team_name}
                        </span>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <span className="font-semibold text-diu-blue">
                            {team.course_offering?.course?.code || "N/A"}
                          </span>
                          <span>•</span>
                          <span>Sec {team.course_offering?.section || "N/A"}</span>
                        </div>
                      </div>
                    </div>
                    <TeamStatusBadge status={team.status} />
                  </div>

                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-500 flex items-center gap-1">
                        <Crown className="w-3 h-3 text-amber-500" />
                        Leader:
                      </span>
                      <span className="font-semibold text-slate-800">
                        {team.leader?.student?.full_name || "Unassigned"}{" "}
                        {team.leader?.student?.student_id && (
                          <span className="font-mono text-[10px] text-slate-500 font-normal">
                            ({team.leader.student.student_id})
                          </span>
                        )}
                      </span>
                    </div>

                    {team.topic && (
                      <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                        <span className="text-[11px] text-slate-500">Topic:</span>
                        <span className="font-medium text-slate-700 italic truncate max-w-[180px]">
                          {team.topic}
                        </span>
                      </div>
                    )}

                    {team.slide_link && (
                      <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                        <span className="text-[11px] text-slate-500">Slides:</span>
                        <a
                          href={team.slide_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-diu-blue hover:underline inline-flex items-center gap-1 font-semibold"
                        >
                          <Presentation className="w-3 h-3 text-emerald-600" />
                          View Presentation
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Members count & toggle */}
                  <div>
                    <button
                      type="button"
                      onClick={() => setExpandedTeamId(isExpanded ? null : team.id)}
                      className="w-full flex items-center justify-between p-2 rounded-lg bg-slate-100/80 hover:bg-slate-100 text-xs text-slate-700 transition-colors"
                    >
                      <span className="flex items-center gap-1.5 font-medium">
                        <Users className="w-3.5 h-3.5 text-diu-blue" />
                        Roster: {activeCount} / {team.capacity} members ({availableSlots} vacant)
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-500" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-500" />
                      )}
                    </button>

                    {isExpanded && (
                      <div className="mt-2 space-y-1.5 pl-1">
                        {members.map((m) => (
                          <div
                            key={m.id}
                            className="p-2 rounded bg-slate-50 border border-slate-200 flex justify-between items-center text-xs"
                          >
                            <div>
                              <div className="font-medium text-slate-800 flex items-center gap-1">
                                {m.student?.full_name}
                                {m.role === "LEADER" && (
                                  <Crown className="w-3 h-3 text-amber-500" />
                                )}
                              </div>
                              <span className="font-mono text-slate-500 text-[10px]">
                                {m.student?.student_id}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveMember(m.id, m.student?.full_name || "Member")}
                              className="p-1 rounded text-red-600 hover:bg-red-50"
                              title="Remove member"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Mobile Actions toolbar */}
                  <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => openEditModal(team)}
                      className="flex-1 h-9 text-xs font-semibold gap-1.5"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      Edit Team
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={deleteLoadingId === team.id}
                      onClick={() => handleDeleteTeam(team.id, team.team_name)}
                      className="h-9 px-3 text-red-600 border-red-200 hover:bg-red-50 text-xs gap-1.5"
                      title="Delete Team"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>
    </div>
  );
}
