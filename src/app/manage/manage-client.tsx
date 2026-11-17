"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ReferenceAuthResult, Team, TeamMembership } from "@/types";
import {
  verifyReferenceAction,
  updateTeamSettingsAction,
  transferLeadershipAction,
  memberLeaveTeamAction,
  updateMemberProfileAction,
} from "@/lib/actions";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TeamStatusBadge } from "@/components/ui/status-badge";
import { formatDate } from "@/lib/utils";
import {
  KeyRound,
  ShieldCheck,
  Crown,
  Users,
  Settings,
  UserMinus,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  LogOut,
  RefreshCw,
  Edit2,
  Lock,
} from "lucide-react";

export function ManageClient() {
  const [tokenInput, setTokenInput] = useState("");
  const [verifiedToken, setVerifiedToken] = useState<string | null>(null);
  const [authResult, setAuthResult] = useState<ReferenceAuthResult | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Team Leader Form States
  const [editTeamName, setEditTeamName] = useState("");
  const [editCapacity, setEditCapacity] = useState<number>(3);
  const [selectedTargetLeader, setSelectedTargetLeader] = useState("");

  // Member Form States
  const [editFullName, setEditFullName] = useState("");

  // Handle Token Verification
  const handleVerify = async (e?: React.FormEvent, tokenToUse?: string) => {
    if (e) e.preventDefault();
    const token = (tokenToUse || tokenInput).trim();
    if (!token) return;

    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const res = await verifyReferenceAction(token);
      if (!res.success || !res.data?.valid) {
        setError(res.error || "Invalid, revoked or expired reference credential.");
        setAuthResult(null);
        setVerifiedToken(null);
      } else {
        setAuthResult(res.data);
        setVerifiedToken(token);
        if (res.data.team) {
          setEditTeamName(res.data.team.team_name);
          setEditCapacity(res.data.team.capacity);
        }
        if (res.data.membership?.student) {
          setEditFullName(res.data.membership.student.full_name);
        }
      }
    } catch (err: any) {
      setError(err?.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  // Team Leader: Save Settings
  const handleSaveTeamSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifiedToken) return;
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const res = await updateTeamSettingsAction(verifiedToken, {
        teamName: editTeamName,
        capacity: Number(editCapacity),
      });

      if (!res.success || !res.team) {
        setError(res.error || "Failed to update team settings.");
      } else {
        setSuccessMsg("Team settings successfully updated!");
        // Refresh team view
        await handleVerify(undefined, verifiedToken);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to update team.");
    } finally {
      setLoading(false);
    }
  };

  // Team Leader: Toggle Status (Close / Reopen)
  const handleToggleTeamStatus = async (newStatus: "OPEN" | "CLOSED") => {
    if (!verifiedToken) return;
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const res = await updateTeamSettingsAction(verifiedToken, {
        status: newStatus,
      });

      if (!res.success || !res.team) {
        setError(res.error || "Failed to change team status.");
      } else {
        setSuccessMsg(
          newStatus === "CLOSED"
            ? "Team closed. No new members can join."
            : "Team reopened for new registrations."
        );
        await handleVerify(undefined, verifiedToken);
      }
    } catch (err: any) {
      setError(err?.message || "Action failed");
    } finally {
      setLoading(false);
    }
  };

  // Team Leader: Transfer Leadership
  const handleTransferLeadership = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifiedToken || !selectedTargetLeader) return;
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const res = await transferLeadershipAction(verifiedToken, selectedTargetLeader);
      if (!res.success) {
        setError(res.error || "Failed to transfer leadership.");
      } else {
        setSuccessMsg("Leadership successfully transferred to new team member!");
        await handleVerify(undefined, verifiedToken);
      }
    } catch (err: any) {
      setError(err?.message || "Action failed");
    } finally {
      setLoading(false);
    }
  };

  // Member: Update Profile
  const handleUpdateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifiedToken) return;
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const res = await updateMemberProfileAction(verifiedToken, {
        fullName: editFullName,
      });

      if (!res.success) {
        setError(res.error || "Failed to update profile.");
      } else {
        setSuccessMsg("Your name has been updated successfully!");
        await handleVerify(undefined, verifiedToken);
      }
    } catch (err: any) {
      setError(err?.message || "Action failed");
    } finally {
      setLoading(false);
    }
  };

  // Member: Leave Team
  const handleLeaveTeam = async () => {
    if (!verifiedToken) return;
    const confirm = window.confirm(
      "Are you sure you want to leave this team? This action is permanent and revokes your reference."
    );
    if (!confirm) return;

    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const res = await memberLeaveTeamAction(verifiedToken);
      if (!res.success) {
        setError(res.error || "Failed to leave team.");
      } else {
        setSuccessMsg(res.data?.message || "You have successfully left the team.");
        setAuthResult(null);
        setVerifiedToken(null);
      }
    } catch (err: any) {
      setError(err?.message || "Action failed");
    } finally {
      setLoading(false);
    }
  };

  // Helper demo fill
  const fillDemoToken = (type: "leader" | "member") => {
    if (type === "leader") {
      setTokenInput("pgms_tm_demo1234567890abcdef123456");
      handleVerify(undefined, "pgms_tm_demo1234567890abcdef123456");
    } else {
      setTokenInput("pgms_mem_demo1234567890abcdef123456");
      handleVerify(undefined, "pgms_mem_demo1234567890abcdef123456");
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Search Header */}
      {!authResult && (
        <Card className="border border-slate-200 shadow-sm bg-white">
          <CardHeader className="bg-slate-50 border-b border-slate-100 pb-5">
            <div className="flex items-center gap-2 text-xs font-semibold text-diu-blue uppercase tracking-wider">
              <KeyRound className="w-4 h-4" />
              <span>Self-Service Portal</span>
            </div>
            <CardTitle className="text-2xl text-diu-navy font-heading mt-1">
              Private Reference Manager
            </CardTitle>
            <CardDescription className="text-xs text-diu-slate">
              Enter your secret Team Management Reference or Individual Membership Reference token
              to manage your registration without requiring a password.
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-6 space-y-4">
            {error && (
              <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={(e) => handleVerify(e)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="token" className="text-xs font-semibold">
                  Reference Token (pgms_tm_... or pgms_mem_...) *
                </Label>
                <Input
                  id="token"
                  placeholder="Paste your 48-character reference token here..."
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  required
                  className="font-mono text-sm"
                />
              </div>

              <Button type="submit" disabled={loading} className="w-full gap-2 font-semibold">
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                {loading ? "Verifying Reference..." : "Access Private Record"}
              </Button>
            </form>

            {/* Quick Demo Assist */}
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center text-xs text-slate-500 gap-2">
              <span>Quick Demo Tokens:</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => fillDemoToken("leader")}
                  className="text-diu-blue hover:underline bg-blue-50 px-2 py-1 rounded border border-blue-100"
                >
                  Test Team Leader
                </button>
                <button
                  type="button"
                  onClick={() => fillDemoToken("member")}
                  className="text-emerald-700 hover:underline bg-emerald-50 px-2 py-1 rounded border border-emerald-100"
                >
                  Test Member
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* SUCCESS / ERROR ALERTS WHEN AUTHENTICATED */}
      {authResult && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <button
              onClick={() => {
                setAuthResult(null);
                setVerifiedToken(null);
                setTokenInput("");
                setSuccessMsg(null);
                setError(null);
              }}
              className="text-xs font-semibold text-diu-blue hover:underline flex items-center gap-1"
            >
              &larr; Switch or Log Out Reference Token
            </button>

            <span className="text-xs text-slate-500">
              Session secured via cryptographic hash
            </span>
          </div>

          {error && (
            <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* VIEW 1: TEAM MANAGEMENT VIEW (LEADER ONLY) */}
          {authResult.credentialType === "TEAM_MANAGEMENT" && authResult.team && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-gradient-to-r from-diu-navy to-diu-blue text-white flex justify-between items-center">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-blue-200">
                    <Crown className="w-4 h-4 text-amber-400" />
                    <span>Leader Management Console</span>
                  </div>
                  <h2 className="text-2xl font-bold font-heading">
                    {authResult.team.team_name}
                  </h2>
                  <p className="text-xs text-blue-100">
                    {authResult.team.course_offering?.course?.code} • Section{" "}
                    {authResult.team.course_offering?.section}
                  </p>
                </div>
                <TeamStatusBadge status={authResult.team.status} />
              </div>

              {/* Roster & Members */}
              <Card className="border border-slate-200 shadow-sm bg-white">
                <CardHeader className="pb-3 border-b border-slate-100">
                  <CardTitle className="text-base text-diu-navy">
                    Team Members ({authResult.team.memberships?.length || 0} /{" "}
                    {authResult.team.capacity})
                  </CardTitle>
                  <CardDescription className="text-xs">
                    View active members enrolled in your presentation group.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  <ul className="divide-y divide-slate-100 text-xs">
                    {authResult.team.memberships?.map((m, idx) => (
                      <li key={m.id} className="py-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 text-[10px] w-4">{idx + 1}.</span>
                          <span className="font-semibold text-slate-800">
                            {m.student?.full_name}
                          </span>
                          <span className="font-mono text-slate-500 text-[11px]">
                            ({m.student?.student_id})
                          </span>
                        </div>
                        {m.role === "LEADER" ? (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            Leader (You)
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                            Member
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Settings Form */}
              <Card className="border border-slate-200 shadow-sm bg-white">
                <CardHeader className="pb-3 border-b border-slate-100">
                  <CardTitle className="text-base text-diu-navy flex items-center gap-2">
                    <Settings className="w-4 h-4 text-diu-blue" />
                    Team Settings &amp; Capacity
                  </CardTitle>
                </CardHeader>
                <form onSubmit={handleSaveTeamSettings}>
                  <CardContent className="pt-4 space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="editTeamName" className="text-xs font-semibold">
                        Team Name
                      </Label>
                      <Input
                        id="editTeamName"
                        value={editTeamName}
                        onChange={(e) => setEditTeamName(e.target.value)}
                        required
                        className="text-sm"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="editCapacity" className="text-xs font-semibold">
                        Team Capacity (Allowed range:{" "}
                        {authResult.team.course_offering?.min_team_capacity} -{" "}
                        {authResult.team.course_offering?.max_team_capacity})
                      </Label>
                      <Input
                        id="editCapacity"
                        type="number"
                        min={authResult.team.course_offering?.min_team_capacity}
                        max={authResult.team.course_offering?.max_team_capacity}
                        value={editCapacity}
                        onChange={(e) => setEditCapacity(Number(e.target.value))}
                        required
                        className="text-sm"
                      />
                      <p className="text-[11px] text-slate-500">
                        Cannot be set lower than the current number of registered active members.
                      </p>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <Button type="submit" disabled={loading} size="sm">
                        {loading ? "Saving..." : "Save Settings"}
                      </Button>
                    </div>
                  </CardContent>
                </form>
              </Card>

              {/* Transfer Leadership */}
              <Card className="border border-slate-200 shadow-sm bg-white">
                <CardHeader className="pb-3 border-b border-slate-100">
                  <CardTitle className="text-base text-diu-navy flex items-center gap-2">
                    <Crown className="w-4 h-4 text-amber-500" />
                    Transfer Leadership
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Select an active teammate to take over leadership of this group.
                  </CardDescription>
                </CardHeader>
                <form onSubmit={handleTransferLeadership}>
                  <CardContent className="pt-4 space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">New Team Leader</Label>
                      <select
                        aria-label="Select new team leader"
                        value={selectedTargetLeader}
                        onChange={(e) => setSelectedTargetLeader(e.target.value)}
                        className="w-full h-10 px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-diu-blue"
                      >
                        <option value="">Select a member...</option>
                        {authResult.team.memberships
                          ?.filter((m) => m.role !== "LEADER" && m.status === "ACTIVE")
                          .map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.student?.full_name} ({m.student?.student_id})
                            </option>
                          ))}
                      </select>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <Button
                        type="submit"
                        disabled={loading || !selectedTargetLeader}
                        variant="secondary"
                        size="sm"
                      >
                        Confirm Leadership Transfer
                      </Button>
                    </div>
                  </CardContent>
                </form>
              </Card>

              {/* Close or Reopen Team */}
              <Card className="border border-slate-200 shadow-sm bg-white">
                <CardHeader className="pb-3 border-b border-slate-100">
                  <CardTitle className="text-base text-diu-navy">Team Availability</CardTitle>
                  <CardDescription className="text-xs">
                    Manually close this team to prevent any new students from joining even if slots
                    remain.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4 flex items-center justify-between">
                  <div>
                    <span className="text-sm font-semibold text-slate-800 block">
                      Current Status: {authResult.team.status}
                    </span>
                    <span className="text-xs text-slate-500">
                      {authResult.team.status === "CLOSED"
                        ? "Team is manually closed to new members."
                        : "Team accepts new registrations while slots remain."}
                    </span>
                  </div>

                  {authResult.team.status === "CLOSED" ? (
                    <Button
                      type="button"
                      variant="success"
                      size="sm"
                      onClick={() => handleToggleTeamStatus("OPEN")}
                      disabled={loading}
                    >
                      Reopen Team
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => handleToggleTeamStatus("CLOSED")}
                      disabled={loading}
                    >
                      Close Team to New Members
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* VIEW 2: INDIVIDUAL MEMBERSHIP VIEW */}
          {authResult.credentialType === "MEMBERSHIP" && authResult.membership && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-gradient-to-r from-diu-navy to-diu-blue text-white flex justify-between items-center">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-blue-200">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Individual Registration Record</span>
                  </div>
                  <h2 className="text-2xl font-bold font-heading">
                    {authResult.membership.student?.full_name}
                  </h2>
                  <p className="text-xs text-blue-100">
                    Student ID: {authResult.membership.student?.student_id} • Role:{" "}
                    {authResult.membership.role}
                  </p>
                </div>

                <span className="px-3 py-1 bg-emerald-500 text-white rounded-full text-xs font-semibold">
                  Active
                </span>
              </div>

              {/* Team Association Card */}
              <Card className="border border-slate-200 shadow-sm bg-white">
                <CardHeader className="pb-3 border-b border-slate-100">
                  <CardTitle className="text-base text-diu-navy">Enrolled Team</CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <div>
                      <span className="text-slate-500 block">Team Name</span>
                      <span className="font-bold text-diu-navy text-sm">
                        {authResult.team?.team_name}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Course &amp; Section</span>
                      <span className="font-semibold text-slate-800">
                        {authResult.team?.course_offering?.course?.code} (Section{" "}
                        {authResult.team?.course_offering?.section})
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <span className="text-slate-500">Registered On:</span>
                    <span className="font-medium text-slate-700">
                      {formatDate(authResult.membership.joined_at)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Edit Full Name */}
              <Card className="border border-slate-200 shadow-sm bg-white">
                <CardHeader className="pb-3 border-b border-slate-100">
                  <CardTitle className="text-base text-diu-navy flex items-center gap-2">
                    <Edit2 className="w-4 h-4 text-diu-blue" />
                    Correct Personal Details
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Update your registered full name if misspelled.
                  </CardDescription>
                </CardHeader>
                <form onSubmit={handleUpdateMember}>
                  <CardContent className="pt-4 space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="editFullName" className="text-xs font-semibold">
                        Full Name *
                      </Label>
                      <Input
                        id="editFullName"
                        value={editFullName}
                        onChange={(e) => setEditFullName(e.target.value)}
                        required
                        className="text-sm"
                      />
                    </div>

                    <div className="flex justify-end">
                      <Button type="submit" disabled={loading} size="sm">
                        {loading ? "Updating..." : "Save Name"}
                      </Button>
                    </div>
                  </CardContent>
                </form>
              </Card>

              {/* Leave Team Zone */}
              <Card className="border border-red-200 shadow-sm bg-white">
                <CardHeader className="pb-3 bg-red-50/50 border-b border-red-100">
                  <CardTitle className="text-base text-red-900 flex items-center gap-2">
                    <LogOut className="w-4 h-4 text-red-600" />
                    Leave This Team
                  </CardTitle>
                  <CardDescription className="text-xs text-red-700">
                    Withdrawing will cancel your membership and open your slot for another student.
                    If you are the team leader with remaining members, you must transfer leadership
                    first.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4 flex justify-between items-center">
                  <span className="text-xs text-slate-500">
                    This action immediately revokes your membership reference.
                  </span>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={handleLeaveTeam}
                    disabled={loading}
                  >
                    Leave Team
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
