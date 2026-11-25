"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Team, TeamMembership, Student, TeamJoinRequest } from "@/types";
import {
  leaderLoginAction,
  updateTeamNameAction,
  updateTeamSlideAction,
  toggleTeamStatusAction,
  handleJoinRequestAction,
  leaderUpdateMemberAction,
  leaderRemoveMemberAction,
  leaderAddMemberAction,
} from "@/lib/actions";
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
import { Label } from "@/components/ui/label";
import { TeamStatusBadge } from "@/components/ui/status-badge";
import { formatDate, formatStudentId } from "@/lib/utils";
import {
  KeyRound,
  ShieldCheck,
  Crown,
  Users,
  Settings,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  LogOut,
  RefreshCw,
  Edit2,
  Trash2,
  UploadCloud,
  Link as LinkIcon,
  FileText,
  UserCheck,
  UserPlus,
  UserX,
  Clock,
  Sparkles,
  ExternalLink,
  Save,
  X,
  Download,
  Eye,
  Presentation,
  Check,
} from "lucide-react";

export function ManageClient() {
  // Login Form States
  const [leaderName, setLeaderName] = useState("");
  const [leaderId, setLeaderId] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Authenticated State
  const [team, setTeam] = useState<Team | null>(null);
  const [leaderStudent, setLeaderStudent] = useState<Student | null>(null);

  // Edit Team Name State
  const [editingName, setEditingName] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [nameSaving, setNameSaving] = useState(false);

  // Slides State
  const [slideLink, setSlideLink] = useState("");
  const [slideFileName, setSlideFileName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [slidesSaving, setSlidesSaving] = useState(false);

  // General Notification
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);

  // Edit Member Modal State
  const [editingMember, setEditingMember] = useState<TeamMembership | null>(null);
  const [editMemberName, setEditMemberName] = useState("");
  const [editMemberStudentId, setEditMemberStudentId] = useState("");
  const [memberSaving, setMemberSaving] = useState(false);
  const [memberError, setMemberError] = useState<string | null>(null);

  // Remove Member Modal State
  const [memberToRemove, setMemberToRemove] = useState<TeamMembership | null>(null);
  const [removeLoading, setRemoveLoading] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);

  // Direct Add Member State
  const [showAddMemberForm, setShowAddMemberForm] = useState(false);
  const [directMemberName, setDirectMemberName] = useState("");
  const [directMemberId, setDirectMemberId] = useState("");
  const [directAddLoading, setDirectAddLoading] = useState(false);

  const idRegex = /^\d{3}-\d{2}-\d{3}$/;

  // Restore authenticated leader session across page reloads
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("pgms_leader_session");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.name && parsed?.id) {
          setLeaderName(parsed.name);
          setLeaderId(parsed.id);
          leaderLoginAction(parsed.name, parsed.id)
            .then((res) => {
              if (res.success && res.team) {
                setTeam(res.team);
                setLeaderStudent(res.leaderStudent || null);
                setNewTeamName(res.team.team_name);
                setSlideLink(res.team.slide_link || "");
                setSlideFileName(res.team.slide_file_name || "");
              }
            })
            .catch(() => { });
        }
      }
    } catch { }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setActionSuccess(null);
    setActionError(null);

    if (!leaderName.trim()) {
      setLoginError("Please enter your Leader Full Name.");
      return;
    }
    const formattedId = formatStudentId(leaderId);
    setLeaderId(formattedId);
    if (!idRegex.test(formattedId)) {
      setLoginError("Student ID must follow DIU pattern: XXX-XX-XXX (e.g. 252-35-242).");
      return;
    }

    setLoginLoading(true);
    try {
      const res = await leaderLoginAction(leaderName.trim(), formattedId);
      if (!res.success || !res.team) {
        setLoginError(res.error || "Login credentials not recognized.");
      } else {
        setTeam(res.team);
        setLeaderStudent(res.leaderStudent || null);
        setNewTeamName(res.team.team_name);
        setSlideLink(res.team.slide_link || "");
        setSlideFileName(res.team.slide_file_name || "");
        try {
          sessionStorage.setItem(
            "pgms_leader_session",
            JSON.stringify({ name: leaderName.trim(), id: formattedId })
          );
        } catch { }
      }
    } catch (err: any) {
      setLoginError(err?.message || "An unexpected error occurred during login.");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    try {
      sessionStorage.removeItem("pgms_leader_session");
    } catch { }
    setTeam(null);
    setLeaderStudent(null);
    setLeaderName("");
    setLeaderId("");
    setEditingMember(null);
    setMemberToRemove(null);
    setRemoveError(null);
    setShowAddMemberForm(false);
    setActionSuccess(null);
    setActionError(null);
  };

  // Save Team Name
  const handleSaveTeamName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!team) return;
    if (!newTeamName.trim()) {
      setActionError("Team name cannot be empty.");
      return;
    }

    setNameSaving(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const res = await updateTeamNameAction(team.id, newTeamName.trim());
      if (res.success && res.team) {
        setTeam(res.team);
        setEditingName(false);
        setActionSuccess("Team name updated successfully!");
      } else {
        setActionError(res.error || "Failed to update team name.");
      }
    } catch (err: any) {
      setActionError(err?.message || "Error updating team name.");
    } finally {
      setNameSaving(false);
    }
  };

  // Toggle Team Status (Open / Closed)
  const handleToggleStatus = async () => {
    if (!team) return;
    const targetStatus = team.status === "OPEN" ? "CLOSED" : "OPEN";

    setStatusLoading(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const res = await toggleTeamStatusAction(team.id, targetStatus);
      if (res.success && res.team) {
        setTeam(res.team);
        setActionSuccess(
          targetStatus === "OPEN"
            ? "Team registration opened! Students can now request to join."
            : "Team registration closed for new requests."
        );
      } else {
        setActionError(res.error || "Failed to change team status.");
      }
    } catch (err: any) {
      setActionError(err?.message || "Error updating team status.");
    } finally {
      setStatusLoading(false);
    }
  };

  // Handle Slide File Selection (max 15MB, .pdf, .pptx only)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setActionError(null);
    const file = e.target.files?.[0];
    if (!file) {
      setSelectedFile(null);
      return;
    }

    const maxBytes = 15 * 1024 * 1024;
    if (file.size > maxBytes) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      setActionError(`File size (${sizeMb} MB) exceeds the 15 MB limit. Please select a PDF or PPTX file under 15 MB.`);
      e.target.value = "";
      setSelectedFile(null);
      return;
    }

    const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
    if (![".pdf", ".pptx", ".ppt"].includes(ext)) {
      setActionError(`Invalid file format "${ext}". Only PDF (.pdf) and PowerPoint (.pptx) presentations are allowed.`);
      e.target.value = "";
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    setSlideFileName(file.name);
  };

  // Save Slides (Cloudinary file upload and/or link)
  const handleSaveSlides = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!team) return;

    setSlidesSaving(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      if (selectedFile) {
        // Upload to Cloudinary through API route
        const formData = new FormData();
        formData.append("teamId", team.id);
        formData.append("file", selectedFile);
        if (slideLink.trim()) {
          formData.append("slideLink", slideLink.trim());
        }

        const res = await fetch("/api/slides/upload", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || "Failed to upload presentation slides to Cloudinary.");
        }

        if (data.team) {
          setTeam(data.team);
          setSlideFileName(data.fileName || data.team.slide_file_name || "");
          setSelectedFile(null);
        } else if (data.fileUrl) {
          setTeam((prev) =>
            prev
              ? {
                  ...prev,
                  slide_file_url: data.fileUrl,
                  slide_file_name: data.fileName || slideFileName,
                }
              : null
          );
          setSlideFileName(data.fileName || "");
          setSelectedFile(null);
        }
        setActionSuccess("Presentation slides uploaded and stored in Cloudinary successfully!");
      } else {
        // Only updating slide link
        const res = await updateTeamSlideAction(team.id, {
          slideLink: slideLink.trim() || undefined,
          slideFileName: slideFileName || undefined,
          slideFileUrl: team.slide_file_url || undefined,
        });

        if (res.success && res.team) {
          setTeam(res.team);
          setActionSuccess("Presentation slides link updated successfully!");
        } else {
          setActionError(res.error || "Failed to update slides link.");
        }
      }
    } catch (err: any) {
      setActionError(err?.message || "Error saving presentation slides.");
    } finally {
      setSlidesSaving(false);
    }
  };

  // Handle Join Request Action (Accept / Reject)
  const handleRequestAction = async (requestId: string, action: "ACCEPT" | "REJECT") => {
    setActionError(null);
    setActionSuccess(null);

    try {
      const res = await handleJoinRequestAction(requestId, action);
      if (res.success) {
        setActionSuccess(res.message || "Request updated successfully");
        // Refresh team data
        const loginRes = await leaderLoginAction(leaderName.trim(), leaderId.trim());
        if (loginRes.success && loginRes.team) {
          setTeam(loginRes.team);
        }
      } else {
        setActionError(res.error || "Failed to process join request.");
      }
    } catch (err: any) {
      setActionError(err?.message || "Error processing request.");
    }
  };

  // Open Edit Member Modal
  const openEditMemberModal = (m: TeamMembership) => {
    setEditingMember(m);
    setEditMemberName(m.student?.full_name || "");
    setEditMemberStudentId(m.student?.student_id || "");
    setMemberError(null);
  };

  // Save Edited Member
  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!team || !editingMember) return;

    if (!editMemberName.trim()) {
      setMemberError("Please enter member full name.");
      return;
    }

    const formattedId = formatStudentId(editMemberStudentId);
    setEditMemberStudentId(formattedId);
    if (!idRegex.test(formattedId)) {
      setMemberError("Student ID must follow DIU pattern: XXX-XX-XXX (e.g. 252-35-242).");
      return;
    }

    setMemberSaving(true);
    setMemberError(null);
    setActionSuccess(null);
    setActionError(null);

    try {
      const res = await leaderUpdateMemberAction({
        teamId: team.id,
        membershipId: editingMember.id,
        fullName: editMemberName.trim(),
        studentId: formattedId,
      });

      if (!res.success || !res.team) {
        setMemberError(res.error || "Failed to update member.");
      } else {
        setTeam(res.team);
        // If the edited member was the logged-in leader, keep state synchronized
        if (editingMember.role === "LEADER" || editingMember.student_id === leaderStudent?.id) {
          setLeaderName(editMemberName.trim());
          setLeaderId(formattedId);
          if (res.team.leader?.student) {
            setLeaderStudent(res.team.leader.student);
          }
        }
        setEditingMember(null);
        setActionSuccess(`Member "${editMemberName.trim()}" updated successfully!`);
      }
    } catch (err: any) {
      setMemberError(err?.message || "An unexpected error occurred.");
    } finally {
      setMemberSaving(false);
    }
  };

  // Confirm and Remove Member
  const handleConfirmRemoveMember = async () => {
    if (!team || !memberToRemove) return;

    setRemoveLoading(true);
    setRemoveError(null);
    setActionError(null);
    setActionSuccess(null);

    const removingId = memberToRemove.id;
    const memberName = memberToRemove.student?.full_name || "Member";

    try {
      const res = await leaderRemoveMemberAction(team.id, removingId);

      if (!res.success || !res.team) {
        setRemoveError(res.error || "Failed to remove member.");
      } else {
        setTeam(res.team);

        // If leader removed themselves, refresh leader credentials
        if (memberToRemove.role === "LEADER") {
          if (res.team.leader?.student) {
            setLeaderStudent(res.team.leader.student);
            setLeaderName(res.team.leader.student.full_name);
            setLeaderId(res.team.leader.student.student_id);
            try {
              sessionStorage.setItem("pgms_leader_session", JSON.stringify({
                name: res.team.leader.student.full_name,
                id: res.team.leader.student.student_id,
              }));
            } catch { }
          }
        }
        setMemberToRemove(null);
        setRemoveError(null);
        setActionSuccess(`Member "${memberName}" has been removed from the team.`);
      }
    } catch (err: any) {
      setRemoveError(err?.message || "An unexpected error occurred.");
    } finally {
      setRemoveLoading(false);
    }
  };

  // Direct Add Member
  const handleDirectAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!team) return;

    if (!directMemberName.trim()) {
      setActionError("Please enter member full name.");
      return;
    }

    const formattedId = formatStudentId(directMemberId);
    setDirectMemberId(formattedId);
    if (!idRegex.test(formattedId)) {
      setActionError("Student ID must follow DIU pattern: XXX-XX-XXX (e.g. 252-35-242).");
      return;
    }

    setDirectAddLoading(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const res = await leaderAddMemberAction({
        teamId: team.id,
        studentName: directMemberName.trim(),
        studentId: formattedId,
      });

      if (!res.success || !res.team) {
        setActionError(res.error || "Failed to add member.");
      } else {
        setTeam(res.team);
        setDirectMemberName("");
        setDirectMemberId("");
        setShowAddMemberForm(false);
        setActionSuccess(`Student "${directMemberName.trim()}" added to the team!`);
      }
    } catch (err: any) {
      setActionError(err?.message || "An unexpected error occurred.");
    } finally {
      setDirectAddLoading(false);
    }
  };

  // -------------------------------------------------------------
  // VIEW: LOGIN FORM
  // -------------------------------------------------------------
  if (!team) {
    return (
      <div className="max-w-md mx-auto space-y-6">
        <Card className="border border-slate-200/90 shadow-sm bg-white overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-diu-navy to-diu-blue text-white pb-6 pt-6">
            <div className="flex items-center gap-2 mb-1">
              <Crown className="w-5 h-5 text-amber-300" />
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-100">
                Team Leader Portal
              </span>
            </div>
            <CardTitle className="text-xl font-bold font-heading text-white">
              Team Login
            </CardTitle>
            <CardDescription className="text-xs text-blue-100/90 leading-relaxed">
              Login with your Team Leader Name &amp; Student ID to manage team members, slide links, and join requests.
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleLogin}>
            <CardContent className="pt-6 space-y-4">
              {loginError && (
                <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{loginError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="leadName" className="text-xs font-semibold text-slate-700">
                  Team Leader Name *
                </Label>
                <Input
                  id="leadName"
                  type="text"
                  placeholder="e.g. Tanvir Ahmed"
                  value={leaderName}
                  onChange={(e) => setLeaderName(e.target.value)}
                  required
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="leadId" className="text-xs font-semibold text-slate-700">
                  Leader Student ID *
                </Label>
                <Input
                  id="leadId"
                  type="text"
                  placeholder="Student ID"
                  value={leaderId}
                  onChange={(e) => setLeaderId(e.target.value)}
                  onBlur={() => {
                    if (leaderId) setLeaderId(formatStudentId(leaderId));
                  }}
                  required
                  className="text-xs font-mono"
                />
                {leaderId && !idRegex.test(formatStudentId(leaderId)) && (
                  <p className="text-[11px] text-red-600 font-medium mt-1">
                    ID must follow DIU pattern: XXX-XX-XXX (e.g. 252-35-242)
                  </p>
                )}
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-3 pt-2 pb-6 border-t border-slate-100 bg-slate-50/50">
              <Button
                type="submit"
                disabled={loginLoading}
                className="w-full h-11 sm:h-10 gap-2 font-semibold text-sm sm:text-xs shadow-sm bg-diu-blue hover:bg-diu-navy"
              >
                {loginLoading ? (
                  "Verifying Leader Credentials..."
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    Login to Team Console
                  </>
                )}
              </Button>

              <div className="text-center">
                <Link
                  href="/register-team"
                  className="text-xs text-diu-blue hover:underline font-medium"
                >
                  Need to register a new team? Click here
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW: AUTHENTICATED TEAM LEADER DASHBOARD
  // -------------------------------------------------------------
  const activeMembers = team.memberships || [];
  const availableSlots = Math.max(0, team.capacity - activeMembers.length);
  const isFull = activeMembers.length >= team.capacity;
  const pendingRequests = team.join_requests || [];

  const formattedTeamNumber = team.presentation_number
    ? team.presentation_number === 1
      ? "1st Team"
      : team.presentation_number === 2
        ? "2nd Team"
        : team.presentation_number === 3
          ? "3rd Team"
          : `${team.presentation_number}th Team`
    : "Registered Team";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-diu-navy to-diu-blue rounded-2xl p-6 text-white shadow-md flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[11px] font-bold tracking-wider">
              {formattedTeamNumber} (Slot #{team.presentation_number})
            </span>
            <span className="text-xs text-blue-100 font-medium">
              {team.course_offering?.course?.code} Section {team.course_offering?.section}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-heading text-white">
            {team.team_name}
          </h1>
          <p className="text-xs text-blue-100 flex items-center gap-1.5 pt-0.5">
            <Crown className="w-3.5 h-3.5 text-amber-300" />
            <span>
              Team Leader: <strong>{leaderStudent?.full_name}</strong> ({leaderStudent?.student_id})
            </span>
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleLogout}
          className="w-full sm:w-auto bg-white/10 border-white/30 text-white hover:bg-white/20 text-xs gap-1.5 shrink-0 h-9 sm:h-8"
        >
          <LogOut className="w-3.5 h-3.5" />
          Log Out
        </Button>
      </div>

      {/* Global Action Messages */}
      {actionSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2.5 shadow-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">{actionSuccess}</span>
        </div>
      )}

      {actionError && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2.5 shadow-sm">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          <span className="font-semibold">{actionError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Team Settings & Presentation Slides */}
        <div className="md:col-span-1 space-y-6">
          {/* TEAM SETTINGS CARD */}
          <Card className="border border-slate-200 shadow-sm bg-white">
            <CardHeader className="bg-slate-50 border-b border-slate-100 pb-3">
              <CardTitle className="text-sm text-diu-navy flex items-center gap-2">
                <Settings className="w-4 h-4 text-diu-blue" />
                Team Configuration
              </CardTitle>
            </CardHeader>

            <CardContent className="pt-4 space-y-4 text-xs">
              {/* Edit Team Name */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Team Name</Label>
                {editingName ? (
                  <form onSubmit={handleSaveTeamName} className="space-y-2">
                    <Input
                      type="text"
                      value={newTeamName}
                      onChange={(e) => setNewTeamName(e.target.value)}
                      className="text-xs"
                      maxLength={50}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <Button
                        type="submit"
                        size="sm"
                        disabled={nameSaving}
                        className="text-xs h-8 px-3"
                      >
                        {nameSaving ? "Saving..." : "Save"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingName(false);
                          setNewTeamName(team.team_name);
                        }}
                        className="text-xs h-8 px-3"
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="flex items-center justify-between p-2 bg-slate-50 border border-slate-200 rounded-md">
                    <span className="font-semibold text-slate-800">{team.team_name}</span>
                    <button
                      type="button"
                      onClick={() => setEditingName(true)}
                      className="text-diu-blue hover:text-diu-navy p-1 rounded hover:bg-slate-200/50"
                      title="Edit Team Name"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Topic */}
              {team.topic && (
                <div className="space-y-1 border-t border-slate-100 pt-3">
                  <Label className="text-xs font-semibold text-slate-700">Topic</Label>
                  <p className="text-slate-700 italic bg-slate-50 p-2 rounded border border-slate-200">
                    {team.topic}
                  </p>
                </div>
              )}

              {/* Status & Open/Close Toggle */}
              <div className="space-y-2 border-t border-slate-100 pt-3">
                <div className="flex justify-between items-center">
                  <Label className="text-xs font-semibold text-slate-700">Registration Status</Label>
                  <TeamStatusBadge status={team.status} />
                </div>

                {isFull ? (
                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-md text-amber-800 text-[11px] leading-relaxed">
                    Team is full ({activeMembers.length}/{team.capacity} members). Registration is automatically closed.
                  </div>
                ) : (
                  <div className="space-y-2 pt-1">
                    <p className="text-[11px] text-diu-slate">
                      {team.status === "OPEN"
                        ? "Team is open. Other students can submit join requests."
                        : "Team is closed. No new join requests will be accepted."}
                    </p>
                    <Button
                      type="button"
                      variant={team.status === "OPEN" ? "outline" : "default"}
                      size="sm"
                      onClick={handleToggleStatus}
                      disabled={statusLoading}
                      className="w-full text-xs h-8 font-semibold"
                    >
                      {statusLoading
                        ? "Updating..."
                        : team.status === "OPEN"
                          ? "Close Registration"
                          : "Open Registration"}
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* SLIDES UPLOAD / LINK CARD */}
          <Card className="border border-slate-200 shadow-sm bg-white">
            <CardHeader className="bg-slate-50 border-b border-slate-100 pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm text-diu-navy flex items-center gap-2">
                  <UploadCloud className="w-4 h-4 text-diu-blue" />
                  Presentation Slides
                </CardTitle>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-diu-blue">
                  Max 15 MB
                </span>
              </div>
              <CardDescription className="text-xs">
                Upload your team presentation slides (.pdf, .pptx) stored in Cloudinary.
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleSaveSlides}>
              <CardContent className="pt-4 space-y-4 text-xs">
                {/* Current Uploaded Slide File if present */}
                {team.slide_file_url && (
                  <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-lg space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Presentation className="w-4 h-4 text-diu-blue shrink-0" />
                        <span className="font-semibold text-slate-800 truncate text-xs">
                          {team.slide_file_name || "Uploaded Presentation"}
                        </span>
                      </div>
                      <span className="text-[10px] font-medium bg-white text-emerald-700 px-2 py-0.5 rounded border border-emerald-200 shrink-0">
                        Cloudinary CDN
                      </span>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <a
                        href={
                          team.slide_file_name?.toLowerCase().endsWith(".pptx") || team.slide_file_name?.toLowerCase().endsWith(".ppt")
                            ? `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(team.slide_file_url)}`
                            : team.slide_file_url
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-diu-blue hover:text-diu-navy bg-white px-2.5 py-1 rounded border border-slate-200 shadow-xs transition-colors"
                      >
                        <Eye className="w-3 h-3" />
                        <span>View Slides</span>
                      </a>
                      <a
                        href={team.slide_file_url}
                        download={team.slide_file_name || "presentation-slides"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 hover:text-slate-900 bg-white px-2.5 py-1 rounded border border-slate-200 shadow-xs transition-colors"
                      >
                        <Download className="w-3 h-3" />
                        <span>Download</span>
                      </a>
                    </div>

                    {/* Link to public section slides repository */}
                    <div className="pt-1 border-t border-blue-200/50">
                      <Link
                        href={`/slides/${team.course_offering?.course?.slug || team.course_offering?.course?.code?.toLowerCase() || "se214"}?section=${team.course_offering?.section || "H"}`}
                        target="_blank"
                        className="text-[11px] text-diu-blue hover:underline inline-flex items-center gap-1 font-medium"
                      >
                        <span>View in Section Slides Repository</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                )}

                {/* Option 1: File Upload to Cloudinary (PDF or PPTX, max 15MB) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="slideFile" className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-diu-blue" />
                      Upload Slide File (.pdf / .pptx)
                    </Label>
                    <span className="text-[10px] text-slate-500 font-mono">Max 15MB</span>
                  </div>
                  <input
                    id="slideFile"
                    type="file"
                    accept=".pdf,.pptx,.ppt,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.ms-powerpoint"
                    onChange={handleFileChange}
                    className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-diu-blue hover:file:bg-blue-100 cursor-pointer border border-slate-200 rounded-md p-1"
                  />
                  {selectedFile ? (
                    <div className="text-[11px] text-slate-700 bg-emerald-50 p-2 rounded border border-emerald-200 mt-1 flex items-center justify-between">
                      <span className="truncate">
                        Selected: <strong>{selectedFile.name}</strong> ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedFile(null);
                          setSlideFileName(team.slide_file_name || "");
                        }}
                        className="text-slate-400 hover:text-rose-500 ml-2"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <p className="text-[10px] text-slate-500">
                      Uploads will be saved directly to Cloudinary storage.
                    </p>
                  )}
                </div>

                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-slate-200"></div>
                  <span className="flex-shrink mx-2 text-[10px] text-slate-400 font-semibold uppercase">
                    OR
                  </span>
                  <div className="flex-grow border-t border-slate-200"></div>
                </div>

                {/* Option 2: Paste Link */}
                <div className="space-y-1.5">
                  <Label htmlFor="slideLink" className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <LinkIcon className="w-3.5 h-3.5 text-diu-blue" />
                    Paste Slide Link (Optional)
                  </Label>
                  <Input
                    id="slideLink"
                    type="url"
                    placeholder="https://docs.google.com/presentation/d/..."
                    value={slideLink}
                    onChange={(e) => setSlideLink(e.target.value)}
                    className="text-xs"
                  />
                  {team.slide_link && (
                    <a
                      href={team.slide_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-diu-blue hover:underline font-medium mt-1"
                    >
                      <span>Open presentation link</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </CardContent>

              <CardFooter className="pt-2 pb-4 border-t border-slate-100 bg-slate-50/50">
                <Button
                  type="submit"
                  size="sm"
                  disabled={slidesSaving}
                  className="w-full text-xs font-semibold gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  {slidesSaving
                    ? selectedFile
                      ? "Uploading to Cloudinary..."
                      : "Saving Slides..."
                    : selectedFile
                    ? "Upload Slides (Cloudinary)"
                    : "Save / Update Slides"}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>

        {/* Right Column: Members Roster & Pending Join Requests */}
        <div className="md:col-span-2 space-y-6">
          {/* MEMBERS ROSTER CARD */}
          <Card className="border border-slate-200 shadow-sm bg-white overflow-hidden">
            <CardHeader className="bg-slate-50 border-b border-slate-100 pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <CardTitle className="text-base text-diu-navy flex items-center gap-2">
                  <Users className="w-4 h-4 text-diu-blue" />
                  Registered Team Members ({activeMembers.length} / {team.capacity})
                </CardTitle>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-500">
                    {availableSlots} open slot{availableSlots !== 1 ? "s" : ""}
                  </span>
                  {availableSlots > 0 && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setShowAddMemberForm(!showAddMemberForm)}
                      className="h-8 px-2.5 text-xs text-diu-blue border-blue-200 hover:bg-blue-50 gap-1.5 font-semibold"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>{showAddMemberForm ? "Cancel Add" : "Add Member"}</span>
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>

            {/* Direct Add Member Form */}
            {showAddMemberForm && availableSlots > 0 && (
              <form onSubmit={handleDirectAddMember} className="p-4 bg-blue-50/50 border-b border-blue-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-diu-navy flex items-center gap-1.5">
                    <UserPlus className="w-3.5 h-3.5 text-diu-blue" />
                    Add Student Member Directly
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">
                    {availableSlots} slot{availableSlots > 1 ? "s" : ""} left
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <Input
                    placeholder="Student Full Name"
                    value={directMemberName}
                    onChange={(e) => setDirectMemberName(e.target.value)}
                    required
                    className="h-9 text-xs bg-white"
                  />
                  <Input
                    placeholder="Student ID (e.g. 252-35-102)"
                    value={directMemberId}
                    onChange={(e) => setDirectMemberId(e.target.value)}
                    onBlur={() => {
                      if (directMemberId) setDirectMemberId(formatStudentId(directMemberId));
                    }}
                    required
                    className="h-9 text-xs font-mono bg-white"
                  />
                  <Button
                    type="submit"
                    disabled={directAddLoading || !directMemberName.trim() || !directMemberId.trim()}
                    size="sm"
                    className="h-9 bg-diu-blue hover:bg-diu-navy text-white text-xs gap-1 font-semibold"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    {directAddLoading ? "Adding..." : "Add to Team"}
                  </Button>
                </div>
              </form>
            )}

            <div className="divide-y divide-slate-100">
              {activeMembers.map((m, idx) => (
                <div
                  key={m.id}
                  className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 hover:bg-slate-50/70 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-bold shrink-0">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800 text-sm flex items-center gap-2 truncate">
                        <span className="truncate">{m.student?.full_name}</span>
                        {m.role === "LEADER" && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 shrink-0">
                            <Crown className="w-3 h-3" />
                            Team Leader
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-diu-slate font-mono">
                        Student ID: <strong>{m.student?.student_id}</strong>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <span className="text-[11px] text-slate-400 hidden xl:inline mr-1">
                      Joined {formatDate(m.joined_at)}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => openEditMemberModal(m)}
                      className="h-8 px-2.5 text-xs text-slate-700 hover:text-diu-blue hover:bg-blue-50/50 border-slate-200 gap-1.5 font-medium"
                      title="Edit Member Name or ID"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-diu-blue" />
                      <span>Edit</span>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setMemberToRemove(m);
                        setRemoveError(null);
                      }}
                      className="h-8 px-2.5 text-xs text-red-600 hover:bg-red-50 border-red-200 gap-1.5 font-medium"
                      title="Remove Member from Team"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </Button>
                  </div>
                </div>
              ))}

              {availableSlots > 0 && (
                <div className="p-4 bg-slate-50/50 text-center text-xs text-slate-500 border-dashed">
                  {availableSlots} vacancy slot{availableSlots > 1 ? "s" : ""} remaining in team. Other students can request to join from the courses directory or you can add them directly above.
                </div>
              )}
            </div>
          </Card>

          {/* PENDING JOIN REQUESTS CARD */}
          <Card className="border border-slate-200 shadow-sm bg-white overflow-hidden">
            <CardHeader className="bg-slate-50 border-b border-slate-100 pb-3">
              <div className="flex justify-between items-center">
                <CardTitle className="text-base text-diu-navy flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-emerald-600" />
                  Join Requests ({pendingRequests.length})
                </CardTitle>
                <span className="text-[11px] text-slate-500">
                  Students requesting to join this team
                </span>
              </div>
            </CardHeader>

            <div className="divide-y divide-slate-100">
              {pendingRequests.length === 0 ? (
                <div className="p-8 text-center space-y-2 text-xs text-slate-400">
                  <Users className="w-8 h-8 mx-auto text-slate-300" />
                  <p>No pending join requests.</p>
                  <p className="text-[11px] text-slate-400">
                    When students request to join your team from the course page, they will appear here for you to accept or reject.
                  </p>
                </div>
              ) : (
                pendingRequests.map((req) => (
                  <div
                    key={req.id}
                    className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white hover:bg-slate-50 transition-colors"
                  >
                    <div className="space-y-0.5">
                      <p className="font-semibold text-slate-800 text-sm">
                        {req.student_name}
                      </p>
                      <p className="text-xs text-slate-500 font-mono">
                        Student ID: <strong>{req.student_id}</strong>
                      </p>
                      <p className="text-[10px] text-slate-400">
                        Requested: {formatDate(req.created_at)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleRequestAction(req.id, "ACCEPT")}
                        disabled={isFull}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 px-3 gap-1"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRequestAction(req.id, "REJECT")}
                        className="text-red-600 border-red-200 hover:bg-red-50 text-xs h-8 px-3 gap-1"
                      >
                        <UserX className="w-3.5 h-3.5" />
                        Reject
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* EDIT MEMBER MODAL */}
      {editingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <Card className="w-full max-w-md bg-white border border-slate-200 shadow-xl overflow-hidden">
            <CardHeader className="bg-slate-50 border-b border-slate-100 pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base text-diu-navy font-heading flex items-center gap-2">
                  <Edit2 className="w-4 h-4 text-diu-blue" />
                  Edit Team Member
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Update student details for {editingMember.student?.full_name}
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditingMember(null)}
                className="h-8 w-8 p-0 text-slate-400 hover:text-slate-600 rounded-full"
              >
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>

            <form onSubmit={handleSaveMember}>
              <CardContent className="pt-4 space-y-4 text-xs">
                {memberError && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>{memberError}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="memberName" className="text-xs font-semibold text-slate-700">
                    Student Full Name *
                  </Label>
                  <Input
                    id="memberName"
                    type="text"
                    placeholder="e.g. Shakib Al Hasan"
                    value={editMemberName}
                    onChange={(e) => setEditMemberName(e.target.value)}
                    required
                    className="h-10 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="memberStudentId" className="text-xs font-semibold text-slate-700">
                    Student ID *
                  </Label>
                  <Input
                    id="memberStudentId"
                    type="text"
                    placeholder="252-35-XXX"
                    value={editMemberStudentId}
                    onChange={(e) => setEditMemberStudentId(e.target.value)}
                    onBlur={() => {
                      if (editMemberStudentId) {
                        setEditMemberStudentId(formatStudentId(editMemberStudentId));
                      }
                    }}
                    required
                    className="h-10 text-xs font-mono"
                  />
                  <p className="text-[11px] text-slate-400">
                    Standard DIU pattern: XXX-XX-XXX (e.g. 252-35-242).
                  </p>
                </div>

                {editingMember.role === "LEADER" && (
                  <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] flex items-center gap-2">
                    <Crown className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      You are editing your own Leader account profile. Changes will update your active credentials.
                    </span>
                  </div>
                )}
              </CardContent>

              <CardFooter className="flex flex-col-reverse sm:flex-row justify-end gap-2 border-t border-slate-100 bg-slate-50/50 pt-3 pb-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingMember(null)}
                  className="w-full sm:w-auto h-10 sm:h-9 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={memberSaving}
                  size="sm"
                  className="w-full sm:w-auto h-10 sm:h-9 bg-diu-blue hover:bg-diu-navy text-white text-xs font-semibold gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  {memberSaving ? "Saving..." : "Save Changes"}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      )}

      {/* REMOVE MEMBER CONFIRMATION MODAL */}
      {memberToRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <Card className="w-full max-w-md bg-white border border-slate-200 shadow-xl overflow-hidden">
            <CardHeader className="bg-red-50/70 border-b border-red-100 pb-3">
              <CardTitle className="text-base text-red-900 font-heading flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-red-600" />
                Remove Team Member
              </CardTitle>
            </CardHeader>

            <CardContent className="pt-4 space-y-3 text-xs text-slate-600">
              {removeError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                  <span className="font-semibold">{removeError}</span>
                </div>
              )}

              <p className="text-sm text-slate-800 font-medium">
                Are you sure you want to remove{" "}
                <strong className="text-diu-navy">{memberToRemove.student?.full_name}</strong>{" "}
                (ID: <span className="font-mono font-semibold">{memberToRemove.student?.student_id}</span>) from the team?
              </p>

              {memberToRemove.role === "LEADER" ? (
                <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[11px] space-y-1">
                  <p className="font-bold flex items-center gap-1.5 text-amber-800">
                    <Crown className="w-3.5 h-3.5" /> Warning: Removing Team Leader
                  </p>
                  <p>
                    Removing yourself will automatically promote the next active member to Team Leader. If you are the only member, this will close the team.
                  </p>
                </div>
              ) : (
                <p className="text-[11px] text-slate-500">
                  This will immediately free up a slot in your team. New students will be able to request to join or be added directly.
                </p>
              )}
            </CardContent>

            <CardFooter className="flex flex-col-reverse sm:flex-row justify-end gap-2 border-t border-slate-100 bg-slate-50/50 pt-3 pb-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setMemberToRemove(null)}
                disabled={removeLoading}
                className="w-full sm:w-auto h-10 sm:h-9 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleConfirmRemoveMember}
                disabled={removeLoading}
                className="w-full sm:w-auto h-10 sm:h-9 text-xs font-semibold gap-1.5 bg-red-600 hover:bg-red-700"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {removeLoading ? "Removing Member..." : "Yes, Remove Member"}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
}
