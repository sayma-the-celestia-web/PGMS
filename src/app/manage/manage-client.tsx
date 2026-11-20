"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Team, TeamMembership, Student, TeamJoinRequest } from "@/types";
import {
  leaderLoginAction,
  updateTeamNameAction,
  updateTeamSlideAction,
  toggleTeamStatusAction,
  handleJoinRequestAction,
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
  UploadCloud,
  Link as LinkIcon,
  FileText,
  UserCheck,
  UserX,
  Clock,
  Sparkles,
  ExternalLink,
  Save,
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

  const idRegex = /^\d{3}-\d{2}-\d{3}$/;

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
      }
    } catch (err: any) {
      setLoginError(err?.message || "An unexpected error occurred during login.");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    setTeam(null);
    setLeaderStudent(null);
    setLeaderName("");
    setLeaderId("");
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

  // Handle Slide File Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setSlideFileName(file.name);
    }
  };

  // Save Slides (Link and/or File)
  const handleSaveSlides = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!team) return;

    setSlidesSaving(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const res = await updateTeamSlideAction(team.id, {
        slideLink: slideLink.trim() || undefined,
        slideFileName: selectedFile ? selectedFile.name : slideFileName || undefined,
        slideFileUrl: selectedFile ? URL.createObjectURL(selectedFile) : undefined,
      });

      if (res.success && res.team) {
        setTeam(res.team);
        setActionSuccess("Presentation slides updated successfully!");
      } else {
        setActionError(res.error || "Failed to update slides.");
      }
    } catch (err: any) {
      setActionError(err?.message || "Error updating presentation slides.");
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
                  placeholder="e.g. 252-35-242"
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
                className="w-full gap-2 font-semibold text-xs shadow-sm bg-diu-blue hover:bg-diu-navy"
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
          className="bg-white/10 border-white/30 text-white hover:bg-white/20 text-xs gap-1.5 shrink-0"
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
              <CardTitle className="text-sm text-diu-navy flex items-center gap-2">
                <UploadCloud className="w-4 h-4 text-diu-blue" />
                Presentation Slides
              </CardTitle>
              <CardDescription className="text-xs">
                Paste presentation link or upload slide file (.pdf, .pptx, .docx).
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleSaveSlides}>
              <CardContent className="pt-4 space-y-4 text-xs">
                {/* Option 1: Paste Link */}
                <div className="space-y-1.5">
                  <Label htmlFor="slideLink" className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <LinkIcon className="w-3.5 h-3.5 text-diu-blue" />
                    Paste Slide Link
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
                      <span>Open current slides</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-slate-200"></div>
                  <span className="flex-shrink mx-2 text-[10px] text-slate-400 font-semibold uppercase">
                    OR
                  </span>
                  <div className="flex-grow border-t border-slate-200"></div>
                </div>

                {/* Option 2: File Upload (PDF, PPTX, DOCX) */}
                <div className="space-y-1.5">
                  <Label htmlFor="slideFile" className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-diu-blue" />
                    Upload File (.pdf / .pptx / .docx)
                  </Label>
                  <input
                    id="slideFile"
                    type="file"
                    accept=".pdf,.pptx,.docx,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={handleFileChange}
                    className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-diu-blue hover:file:bg-blue-100 cursor-pointer"
                  />
                  {(slideFileName || selectedFile) && (
                    <p className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded border border-slate-200 mt-1">
                      File: <strong>{selectedFile ? selectedFile.name : slideFileName}</strong>
                    </p>
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
                  {slidesSaving ? "Saving Slides..." : "Save / Update Slides"}
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
              <div className="flex justify-between items-center">
                <CardTitle className="text-base text-diu-navy flex items-center gap-2">
                  <Users className="w-4 h-4 text-diu-blue" />
                  Registered Team Members ({activeMembers.length} / {team.capacity})
                </CardTitle>
                <span className="text-xs font-medium text-slate-500">
                  {availableSlots} open slot{availableSlots !== 1 ? "s" : ""}
                </span>
              </div>
            </CardHeader>

            <div className="divide-y divide-slate-100">
              {activeMembers.map((m, idx) => (
                <div
                  key={m.id}
                  className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 hover:bg-slate-50/70 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-bold shrink-0">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                        {m.student?.full_name}
                        {m.role === "LEADER" && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
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

                  <div className="text-left sm:text-right text-[11px] text-slate-400">
                    <span>Joined: {formatDate(m.joined_at)}</span>
                  </div>
                </div>
              ))}

              {availableSlots > 0 && (
                <div className="p-4 bg-slate-50/50 text-center text-xs text-slate-500 border-dashed">
                  {availableSlots} vacancy slot{availableSlots > 1 ? "s" : ""} remaining in team. Other students can request to join from the courses directory.
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
    </div>
  );
}
