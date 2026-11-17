"use client";

import React, { useState } from "react";
import Link from "next/link";
import { CourseOffering, TeamCreationResult } from "@/types";
import { createTeamAction } from "@/lib/actions";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Users,
  KeyRound,
  Copy,
  Check,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

interface Props {
  offering: CourseOffering;
}

export function CreateTeamClient({ offering }: Props) {
  const [teamName, setTeamName] = useState("");
  const [capacity, setCapacity] = useState(offering.min_team_capacity);
  const [leaderName, setLeaderName] = useState("");
  const [leaderStudentId, setLeaderStudentId] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TeamCreationResult | null>(null);

  const [copiedTm, setCopiedTm] = useState(false);
  const [copiedMem, setCopiedMem] = useState(false);

  const course = offering.course;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await createTeamAction({
        courseOfferingId: offering.id,
        teamName,
        capacity: Number(capacity),
        leaderName,
        leaderStudentId,
      });

      if (!res.success || !res.data) {
        setError(res.error || "Failed to create team. Please verify details.");
      } else {
        setResult(res.data);
      }
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, type: "tm" | "mem") => {
    navigator.clipboard.writeText(text);
    if (type === "tm") {
      setCopiedTm(true);
      setTimeout(() => setCopiedTm(false), 2500);
    } else {
      setCopiedMem(true);
      setTimeout(() => setCopiedMem(false), 2500);
    }
  };

  // SUCCESS CONFIRMATION STATE
  if (result) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-diu-navy font-heading">
            Team Successfully Registered!
          </h1>
          <p className="text-sm text-diu-slate max-w-md mx-auto">
            Your team <strong className="text-diu-navy">{result.teamName}</strong> has been
            created for {course?.code} ({course?.name}) Section {offering.section}.
          </p>
        </div>

        {/* SECURITY WARNING */}
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-900 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-semibold text-amber-950">
              IMPORTANT: Save Your Private Reference Credentials Now!
            </p>
            <p className="text-amber-800 leading-relaxed">
              These secret tokens are your <strong>only key</strong> to manage your team or edit your
              registration without an account. For security, PGMS stores only cryptographic hashes;
              these tokens will <strong>never be shown again</strong>.
            </p>
          </div>
        </div>

        {/* CREDENTIAL 1: Team Management Reference */}
        <Card className="border-2 border-diu-blue/30 shadow-md bg-white">
          <CardHeader className="pb-3 bg-blue-50/50">
            <div className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-diu-blue" />
              <CardTitle className="text-base text-diu-navy">
                Team Management Reference (Leader Only)
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-slate-600">
              Use this secret reference to edit team settings, change capacity, close/reopen, or
              transfer leadership.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-center gap-2">
              <code className="flex-1 p-3 bg-slate-900 text-emerald-400 rounded-lg font-mono text-xs break-all select-all border border-slate-800">
                {result.teamManagementToken}
              </code>
              <Button
                type="button"
                variant={copiedTm ? "success" : "outline"}
                size="sm"
                onClick={() => copyToClipboard(result.teamManagementToken, "tm")}
                className="shrink-0 h-10 px-3 text-xs gap-1.5"
              >
                {copiedTm ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copiedTm ? "Copied!" : "Copy"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* CREDENTIAL 2: Individual Membership Reference */}
        <Card className="border border-slate-200 shadow-sm bg-white">
          <CardHeader className="pb-3 bg-slate-50">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <CardTitle className="text-base text-diu-navy">
                Your Individual Membership Reference
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-slate-600">
              Use this secret reference to view your personal enrollment or leave the group.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-center gap-2">
              <code className="flex-1 p-3 bg-slate-900 text-blue-300 rounded-lg font-mono text-xs break-all select-all border border-slate-800">
                {result.membershipToken}
              </code>
              <Button
                type="button"
                variant={copiedMem ? "success" : "outline"}
                size="sm"
                onClick={() => copyToClipboard(result.membershipToken, "mem")}
                className="shrink-0 h-10 px-3 text-xs gap-1.5"
              >
                {copiedMem ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copiedMem ? "Copied!" : "Copy"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="pt-4 flex flex-col sm:flex-row gap-3">
          <Link href={`/courses/${course?.slug || ""}?section=${encodeURIComponent(offering.section)}`} className="flex-1">
            <Button variant="outline" className="w-full">
              Back to Course Directory
            </Button>
          </Link>
          <Link href="/manage" className="flex-1">
            <Button className="w-full gap-2">
              Test Management Dashboard
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // TEAM CREATION FORM
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card className="border border-slate-200/90 shadow-sm bg-white">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-5">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-diu-blue">
            <Users className="w-4 h-4" />
            <span>Group Registration • Section {offering.section}</span>
          </div>
          <CardTitle className="text-2xl text-diu-navy font-heading mt-1">
            Create Presentation Team
          </CardTitle>
          <CardDescription className="text-xs text-diu-slate">
            Register your team for {course?.code} — {course?.name}. You will automatically be assigned
            as the group leader.
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="pt-6 space-y-5">
            {error && (
              <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Course Section Summary Box */}
            <div className="p-3 bg-blue-50/60 rounded-lg border border-blue-100 text-xs text-diu-navy flex justify-between items-center">
              <div>
                <span className="text-slate-500 block">Semester &amp; Section</span>
                <span className="font-semibold text-diu-navy">
                  {offering.semester?.name} • Section {offering.section}
                </span>
              </div>
              <div className="text-right">
                <span className="text-slate-500 block">Capacity Range</span>
                <span className="font-semibold text-diu-blue">
                  {offering.min_team_capacity} to {offering.max_team_capacity} members
                </span>
              </div>
            </div>

            {/* Field: Team Name */}
            <div className="space-y-1.5">
              <Label htmlFor="teamName" className="text-xs font-semibold">
                Team Name *
              </Label>
              <Input
                id="teamName"
                placeholder="e.g. Architecture Ninjas, Agile Pioneers..."
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                required
                maxLength={50}
                className="text-sm"
              />
              <p className="text-[11px] text-slate-500">
                Must be unique within Section {offering.section}.
              </p>
            </div>

            {/* Field: Capacity */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <Label htmlFor="capacity" className="text-xs font-semibold">
                  Total Team Capacity *
                </Label>
                <span className="text-[11px] font-medium text-diu-blue">
                  {capacity} members total
                </span>
              </div>
              <input
                id="capacity"
                type="range"
                min={offering.min_team_capacity}
                max={offering.max_team_capacity}
                value={capacity}
                onChange={(e) => setCapacity(Number(e.target.value))}
                className="w-full accent-diu-blue cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>Min: {offering.min_team_capacity}</span>
                <span>Max: {offering.max_team_capacity}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Team Leader Academic Information
              </h4>

              {/* Field: Leader Full Name */}
              <div className="space-y-1.5">
                <Label htmlFor="leaderName" className="text-xs font-semibold">
                  Leader Full Name (As registered in DIU Portal) *
                </Label>
                <Input
                  id="leaderName"
                  placeholder="e.g. Tanvir Ahmed"
                  value={leaderName}
                  onChange={(e) => setLeaderName(e.target.value)}
                  required
                  maxLength={100}
                  className="text-sm"
                />
              </div>

              {/* Field: Leader Student ID */}
              <div className="space-y-1.5">
                <Label htmlFor="leaderStudentId" className="text-xs font-semibold">
                  Student ID *
                </Label>
                <Input
                  id="leaderStudentId"
                  placeholder="e.g. 221-35-101"
                  value={leaderStudentId}
                  onChange={(e) => setLeaderStudentId(e.target.value)}
                  required
                  maxLength={30}
                  className="text-sm font-mono"
                />
                <p className="text-[11px] text-slate-500">
                  Used for academic registration verification. Kept strictly private and never displayed publicly.
                </p>
              </div>
            </div>
          </CardContent>

          <CardFooter className="pt-4 flex flex-col sm:flex-row gap-3 border-t border-slate-100">
            <Link
              href={`/courses/${course?.slug || ""}?section=${encodeURIComponent(offering.section)}`}
              className="w-full sm:w-auto"
            >
              <Button type="button" variant="outline" className="w-full sm:w-auto">
                Cancel
              </Button>
            </Link>

            <Button
              type="submit"
              disabled={loading}
              className="w-full sm:flex-1 font-semibold"
            >
              {loading ? "Registering Team..." : "Create Team & Generate References"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
