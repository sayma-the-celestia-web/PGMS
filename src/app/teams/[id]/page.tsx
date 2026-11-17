import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DataService } from "@/lib/services/data-service";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TeamStatusBadge } from "@/components/ui/status-badge";
import { formatDate } from "@/lib/utils";
import {
  Users,
  UserPlus,
  Crown,
  Calendar,
  ArrowLeft,
  ShieldCheck,
  Clock,
} from "lucide-react";

export const dynamic = "force-dynamic";

interface Props {
  params: { id: string };
}

export async function generateMetadata({ params }: Props) {
  const team = await DataService.getTeamById(params.id);
  return {
    title: `${team ? team.team_name : "Team Details"} | PGMS DIU`,
  };
}

export default async function TeamPage({ params }: Props) {
  const team = await DataService.getTeamById(params.id);
  if (!team) {
    notFound();
  }

  const offering = team.course_offering;
  const course = offering?.course;
  const activeMembers = team.memberships || [];
  const availableSlots = Math.max(0, team.capacity - activeMembers.length);
  const isJoinable =
    offering?.registration_status === "OPEN" &&
    team.status === "OPEN" &&
    availableSlots > 0;

  return (
    <div className="py-10 md:py-14">
      <div className="container max-w-4xl mx-auto px-4 sm:px-6 space-y-6">
        <Link
          href={`/courses/${course?.slug || ""}?section=${encodeURIComponent(
            offering?.section || ""
          )}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-diu-slate hover:text-diu-blue transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Course Teams
        </Link>

        <Card className="border border-slate-200/90 shadow-sm bg-white overflow-hidden">
          <div className="bg-gradient-to-r from-diu-navy to-diu-blue p-6 text-white">
            <div className="flex flex-wrap justify-between items-start gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-blue-200 font-semibold">
                  <span>{course?.code}</span>
                  <span>•</span>
                  <span>Section {offering?.section}</span>
                  <span>•</span>
                  <span>{offering?.semester?.name}</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold font-heading text-white">
                  {team.team_name}
                </h1>
                <p className="text-xs text-blue-100/90">
                  Formed {formatDate(team.created_at)}
                </p>
              </div>

              <TeamStatusBadge status={team.status} />
            </div>
          </div>

          <CardContent className="p-6 space-y-6">
            {/* Stats row */}
            <div className="grid grid-cols-3 gap-4 text-center p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div>
                <span className="text-xs text-slate-500 block">Total Capacity</span>
                <span className="text-xl font-bold text-diu-navy font-heading">
                  {team.capacity}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Active Members</span>
                <span className="text-xl font-bold text-diu-blue font-heading">
                  {activeMembers.length}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Available Slots</span>
                <span
                  className={`text-xl font-bold font-heading ${
                    availableSlots > 0 ? "text-emerald-600" : "text-amber-600"
                  }`}
                >
                  {availableSlots}
                </span>
              </div>
            </div>

            {/* Roster list */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Team Members ({activeMembers.length} of {team.capacity})
              </h3>
              <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200/80 bg-white overflow-hidden">
                {activeMembers.map((m, idx) => (
                  <li
                    key={m.id}
                    className="p-3.5 flex items-center justify-between text-sm"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-slate-400 font-mono text-xs w-4">
                        {idx + 1}.
                      </span>
                      <span className="font-medium text-slate-800">
                        {m.student?.full_name}
                      </span>
                    </div>

                    {m.role === "LEADER" ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                        <Crown className="w-3.5 h-3.5" />
                        Team Leader
                      </span>
                    ) : (
                      <span className="text-xs text-slate-500 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-200">
                        Member
                      </span>
                    )}
                  </li>
                ))}
              </ul>
              <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Student IDs are kept confidential and are omitted from public rosters.
              </p>
            </div>

            {/* Action button */}
            <div className="pt-4 border-t border-slate-100 flex flex-wrap gap-3">
              {isJoinable ? (
                <Link href={`/teams/${team.id}/join`} className="w-full sm:w-auto">
                  <Button variant="success" size="lg" className="w-full gap-2 font-semibold">
                    <UserPlus className="w-5 h-5" />
                    Join This Team ({availableSlots} slot{availableSlots > 1 ? "s" : ""} left)
                  </Button>
                </Link>
              ) : (
                <div className="w-full p-3 rounded-lg bg-slate-100 text-slate-600 text-xs text-center font-medium">
                  {team.status === "FULL"
                    ? "This team is currently full."
                    : team.status === "CLOSED"
                    ? "This team has been manually closed by its leader or coordinator."
                    : "Course registration is currently not open."}
                </div>
              )}

              <Link href="/manage" className="w-full sm:w-auto">
                <Button variant="outline" size="lg" className="w-full">
                  Manage With Reference Token
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
