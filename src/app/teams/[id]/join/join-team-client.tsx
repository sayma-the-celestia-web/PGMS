"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Team, JoinTeamResult } from "@/types";
import { requestJoinTeamAction } from "@/lib/actions";
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
import {
  UserPlus,
  Crown,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Users,
  Clock,
  Sparkles,
} from "lucide-react";
import { formatStudentId } from "@/lib/utils";

interface Props {
  team: Team;
}

export function JoinTeamClient({ team }: Props) {
  const [fullName, setFullName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<JoinTeamResult | null>(null);

  const offering = team.course_offering;
  const course = offering?.course;
  const activeMembers = team.memberships || [];
  const availableSlots = Math.max(0, team.capacity - activeMembers.length);
  const isJoinable = team.status === "OPEN" && availableSlots > 0;

  const idRegex = /^\d{3}-\d{2}-\d{3}$/;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim()) {
      setError("Please enter your full name.");
      return;
    }

    const formattedId = formatStudentId(studentId);
    setStudentId(formattedId);

    if (!idRegex.test(formattedId)) {
      setError("Student ID must follow DIU pattern: XXX-XX-XXX (e.g. 252-35-242).");
      return;
    }

    setLoading(true);

    try {
      const res = await requestJoinTeamAction({
        teamId: team.id,
        studentName: fullName.trim(),
        studentId: formattedId,
      });

      if (!res.success || !res.data) {
        setError(res.error || "Failed to submit request.");
      } else {
        setResult(res.data);
      }
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  // SUCCESS CONFIRMATION STATE
  if (result) {
    return (
      <div className="max-w-xl mx-auto space-y-6 animate-in fade-in">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-diu-navy font-heading">
            Join Request Submitted!
          </h1>
          <p className="text-sm text-diu-slate max-w-md mx-auto">
            Your request to join <strong className="text-diu-navy">{result.teamName}</strong> has been sent to the team leader.
          </p>
        </div>

        <Card className="border border-slate-200/90 shadow-sm bg-white p-5 space-y-3 text-xs">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-900 space-y-1">
            <p className="font-semibold text-diu-navy">What happens next?</p>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              The team leader will see your request in their <strong>Team Management Console</strong> and can accept you into the team. Once accepted, you will be officially registered with this team.
            </p>
          </div>

          <div className="space-y-1.5 pt-2 text-slate-600 border-t border-slate-100">
            <div className="flex justify-between">
              <span>Student Name:</span>
              <strong className="text-diu-navy">{fullName}</strong>
            </div>
            <div className="flex justify-between">
              <span>Student ID:</span>
              <strong className="text-diu-navy font-mono">{studentId}</strong>
            </div>
            <div className="flex justify-between">
              <span>Course &amp; Section:</span>
              <strong className="text-diu-navy">
                {course?.code} Sec {offering?.section}
              </strong>
            </div>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row gap-2">
            <Link href={`/courses/${course?.slug}`} className="w-full">
              <Button className="w-full text-xs">Back to Course Roster</Button>
            </Link>
            <Link href="/courses" className="w-full sm:w-auto">
              <Button variant="outline" className="w-full text-xs">
                Browse Courses
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <Link
        href={`/courses/${course?.slug}?section=${encodeURIComponent(offering?.section || "")}`}
        className="inline-flex items-center text-xs text-diu-slate hover:text-diu-blue font-medium transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5 mr-1" />
        Back to {course?.code} Roster
      </Link>

      <Card className="border border-slate-200 shadow-sm bg-white overflow-hidden">
        <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-diu-blue" />
            <CardTitle className="text-lg text-diu-navy font-heading">
              Request to Join Team
            </CardTitle>
          </div>
          <CardDescription className="text-xs">
            Submit a join request for{" "}
            <strong className="text-diu-navy">{team.team_name}</strong> in {course?.code} Section {offering?.section}.
          </CardDescription>
        </CardHeader>

        {/* Team Overview Mini-Card */}
        <div className="p-4 bg-blue-50/40 border-b border-slate-100 flex justify-between items-center text-xs">
          <div>
            <p className="font-semibold text-diu-navy">{team.team_name}</p>
            <p className="text-[11px] text-slate-500">
              Leader: {team.leader?.student?.full_name || "Assigned Leader"}
            </p>
          </div>
          <div className="text-right">
            <span className="font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 text-[11px]">
              {availableSlots} slot{availableSlots > 1 ? "s" : ""} open
            </span>
          </div>
        </div>

        {!isJoinable ? (
          <div className="p-8 text-center space-y-3">
            <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
            <p className="font-semibold text-slate-800 text-sm">
              This team is not currently accepting new members.
            </p>
            <p className="text-xs text-slate-500">
              {team.status === "FULL"
                ? "The team has reached its maximum member capacity."
                : "The team leader has closed registration for this team."}
            </p>
            <Link href={`/courses/${course?.slug}`}>
              <Button variant="outline" size="sm" className="text-xs mt-2">
                Find Another Open Team
              </Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <CardContent className="pt-6 space-y-4">
              {error && (
                <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs font-semibold text-slate-700">
                  Full Name *
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="e.g. Shakib Al Hasan"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="h-11 sm:h-9 text-sm sm:text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="id" className="text-xs font-semibold text-slate-700">
                  Student ID *
                </Label>
                <Input
                  id="id"
                  type="text"
                  placeholder="Student ID"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  onBlur={() => {
                    if (studentId) setStudentId(formatStudentId(studentId));
                  }}
                  required
                  className="h-11 sm:h-9 text-sm sm:text-xs font-mono"
                />
                {studentId && !idRegex.test(formatStudentId(studentId)) && (
                  <p className="text-[11px] text-red-600 font-medium mt-1">
                    ID must follow DIU pattern: XXX-XX-XXX (e.g. 252-35-242)
                  </p>
                )}
              </div>
            </CardContent>

            <CardFooter className="flex flex-col-reverse sm:flex-row gap-2.5 sm:gap-0 sm:justify-between items-stretch sm:items-center border-t border-slate-100 bg-slate-50/50 pt-4 pb-4">
              <Link href={`/courses/${course?.slug}`} className="w-full sm:w-auto">
                <Button variant="ghost" size="sm" type="button" className="w-full sm:w-auto h-11 sm:h-8 text-xs">
                  Cancel
                </Button>
              </Link>
              <Button
                type="submit"
                disabled={loading}
                size="sm"
                className="w-full sm:w-auto h-11 sm:h-8 gap-2 font-semibold text-xs shadow-sm bg-diu-blue hover:bg-diu-navy"
              >
                {loading ? "Submitting Request..." : "Submit Join Request"}
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </CardFooter>
          </form>
        )}
      </Card>
    </div>
  );
}
