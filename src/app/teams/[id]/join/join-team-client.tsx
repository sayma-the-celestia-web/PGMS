"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Team, JoinTeamResult } from "@/types";
import { joinTeamAction } from "@/lib/actions";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  UserPlus,
  Crown,
  KeyRound,
  Copy,
  Check,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Users,
} from "lucide-react";

interface Props {
  team: Team;
}

export function JoinTeamClient({ team }: Props) {
  const [fullName, setFullName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<JoinTeamResult | null>(null);
  const [copiedMem, setCopiedMem] = useState(false);

  const offering = team.course_offering;
  const course = offering?.course;
  const activeMembers = team.memberships || [];
  const availableSlots = Math.max(0, team.capacity - activeMembers.length);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await joinTeamAction({
        teamId: team.id,
        fullName,
        studentId,
      });

      if (!res.success || !res.data) {
        setError(res.error || "Failed to join team. The last slot may have just been claimed.");
      } else {
        setResult(res.data);
      }
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMem(true);
    setTimeout(() => setCopiedMem(false), 2500);
  };

  // SUCCESS CONFIRMATION STATE
  if (result) {
    return (
      <div className="max-w-xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-diu-navy font-heading">
            Successfully Joined Team!
          </h1>
          <p className="text-sm text-diu-slate max-w-md mx-auto">
            You are now registered as an active member of{" "}
            <strong className="text-diu-navy">{result.teamName}</strong> for {course?.code}{" "}
            Section {offering?.section}.
          </p>
        </div>

        {/* SECURITY REMINDER */}
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-semibold text-amber-950">
              Save Your Individual Membership Reference
            </p>
            <p className="text-amber-800 leading-relaxed">
              This secret reference is your key to manage your registration or leave the team. We
              store only cryptographic hashes, so this token will <strong>never be shown again</strong>.
            </p>
          </div>
        </div>

        {/* CREDENTIAL CARD */}
        <Card className="border-2 border-emerald-500/40 shadow-md bg-white">
          <CardHeader className="pb-3 bg-emerald-50/50">
            <div className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-emerald-700" />
              <CardTitle className="text-base text-diu-navy">
                Your Individual Membership Reference
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-slate-600">
              Keep this token secure to view or manage your registration status.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-center gap-2">
              <code className="flex-1 p-3 bg-slate-900 text-emerald-400 rounded-lg font-mono text-xs break-all select-all border border-slate-800">
                {result.membershipToken}
              </code>
              <Button
                type="button"
                variant={copiedMem ? "success" : "outline"}
                size="sm"
                onClick={() => copyToClipboard(result.membershipToken)}
                className="shrink-0 h-10 px-3 text-xs gap-1.5"
              >
                {copiedMem ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copiedMem ? "Copied!" : "Copy"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Action links */}
        <div className="pt-4 flex flex-col sm:flex-row gap-3">
          <Link href={`/teams/${team.id}`} className="flex-1">
            <Button variant="outline" className="w-full">
              View Team Roster
            </Button>
          </Link>
          <Link href="/manage" className="flex-1">
            <Button className="w-full gap-2">
              Go to Reference Manager
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // JOIN TEAM FORM
  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Team Details Preview Card */}
      <Card className="border border-slate-200/90 shadow-sm bg-white">
        <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4">
          <div className="flex justify-between items-start gap-2">
            <div>
              <span className="text-xs font-semibold text-diu-blue uppercase tracking-wider block">
                {course?.code} • Section {offering?.section}
              </span>
              <CardTitle className="text-xl text-diu-navy mt-1">
                Join {team.team_name}
              </CardTitle>
            </div>
            <span className="px-2.5 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
              {availableSlots} Slot{availableSlots > 1 ? "s" : ""} Available
            </span>
          </div>
        </CardHeader>

        <CardContent className="pt-4 space-y-4 text-xs">
          <div className="flex items-center gap-2 text-slate-700 bg-blue-50/50 p-2.5 rounded-lg border border-blue-100">
            <Crown className="w-4 h-4 text-amber-500 shrink-0" />
            <span>
              Team Leader:{" "}
              <strong className="text-diu-navy font-semibold">
                {team.leader?.student?.full_name || "Assigned Leader"}
              </strong>
            </span>
          </div>

          <div>
            <span className="text-slate-500 uppercase tracking-wider text-[10px] font-bold block mb-1.5">
              Current Members ({activeMembers.length} of {team.capacity})
            </span>
            <ul className="space-y-1">
              {activeMembers.map((m, idx) => (
                <li
                  key={m.id}
                  className="flex items-center gap-2 p-1.5 rounded bg-slate-50 text-slate-700 text-xs"
                >
                  <span className="text-slate-400 font-mono text-[10px] w-3">
                    {idx + 1}.
                  </span>
                  <span>{m.student?.full_name}</span>
                  {m.role === "LEADER" && (
                    <span className="text-[10px] text-amber-700 font-semibold ml-auto">
                      (Leader)
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </CardContent>

        <form onSubmit={handleSubmit}>
          <div className="p-6 pt-2 space-y-4 border-t border-slate-100">
            <h4 className="text-xs font-bold uppercase tracking-wider text-diu-navy">
              Enter Your Academic Credentials
            </h4>

            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="fullName" className="text-xs font-semibold">
                Full Name (As registered in DIU Portal) *
              </Label>
              <Input
                id="fullName"
                placeholder="e.g. Fatima Tuz Zohra"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                maxLength={100}
                className="text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="studentId" className="text-xs font-semibold">
                Student ID *
              </Label>
              <Input
                id="studentId"
                placeholder="e.g. 221-35-102"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                required
                maxLength={30}
                className="text-sm font-mono"
              />
              <p className="text-[11px] text-slate-500">
                You can only join one team per course section. Your Student ID is kept confidential.
              </p>
            </div>
          </div>

          <CardFooter className="pt-4 flex flex-col sm:flex-row gap-3 border-t border-slate-100">
            <Link href={`/teams/${team.id}`} className="w-full sm:w-auto">
              <Button type="button" variant="outline" className="w-full sm:w-auto">
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              variant="success"
              disabled={loading || availableSlots <= 0}
              className="w-full sm:flex-1 font-semibold"
            >
              {loading ? "Joining Team..." : "Confirm & Join Team"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
