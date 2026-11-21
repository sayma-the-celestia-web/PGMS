import React from "react";
import Link from "next/link";
import { DataService } from "@/lib/services/data-service";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RegistrationStatusBadge, TeamStatusBadge } from "@/components/ui/status-badge";
import { formatDate } from "@/lib/utils";
import {
  Calendar,
  BookOpen,
  Layers,
  Users,
  GraduationCap,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  ArrowRight,
  TrendingUp,
  Shield,
} from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Superadmin Overview | PGMS DIU",
};

export default async function SuperadminOverviewPage() {
  const stats = await DataService.getDashboardStats();
  const recentTeams = (await DataService.getAllTeams()).slice(0, 5);
  const recentLogs = await DataService.getAuditLogs(5);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-diu-navy font-heading">
            Department Overview
          </h1>
          <p className="text-xs sm:text-sm text-diu-slate">
            Real-time presentation group formation metrics and course section administration.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link href="/superadmin/registrations">
            <Button size="sm" className="gap-1.5 font-medium">
              <PlusCircle className="w-4 h-4" />
              New Offering
            </Button>
          </Link>
          <Link href="/superadmin/exports">
            <Button variant="outline" size="sm" className="gap-1.5 font-medium">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              Export Workbooks
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <Card className="border border-slate-200 shadow-sm bg-white p-4 space-y-2">
          <div className="flex justify-between items-center text-slate-500">
            <span className="text-xs font-medium">Active Offerings</span>
            <Layers className="w-4 h-4 text-diu-blue" />
          </div>
          <p className="text-2xl font-bold text-diu-navy font-heading">
            {stats.activeOfferings}
          </p>
          <span className="text-[11px] text-slate-400">
            Across {stats.totalSemesters} semesters
          </span>
        </Card>

        {/* Metric 2 */}
        <Card className="border border-slate-200 shadow-sm bg-white p-4 space-y-2">
          <div className="flex justify-between items-center text-slate-500">
            <span className="text-xs font-medium">Total Teams</span>
            <Users className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-diu-navy font-heading">
            {stats.totalTeams}
          </p>
          <span className="text-[11px] text-emerald-600 font-medium">
            {stats.openTeams} Open • {stats.fullTeams} Full
          </span>
        </Card>

        {/* Metric 3 */}
        <Card className="border border-slate-200 shadow-sm bg-white p-4 space-y-2">
          <div className="flex justify-between items-center text-slate-500">
            <span className="text-xs font-medium">Enrolled Students</span>
            <GraduationCap className="w-4 h-4 text-diu-accent" />
          </div>
          <p className="text-2xl font-bold text-diu-navy font-heading">
            {stats.totalStudents}
          </p>
          <span className="text-[11px] text-slate-400">
            Active team memberships
          </span>
        </Card>

        {/* Metric 4 */}
        <Card className="border border-slate-200 shadow-sm bg-white p-4 space-y-2">
          <div className="flex justify-between items-center text-slate-500">
            <span className="text-xs font-medium">Available Slots</span>
            <CheckCircle2 className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-diu-navy font-heading">
            {stats.availableSlots}
          </p>
          <span className="text-[11px] text-slate-400">
            Open student vacancies
          </span>
        </Card>
      </div>

      {/* Main split: Recent Teams & Audit Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Recent Teams */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-diu-navy font-heading">
              Recently Formed Teams
            </h2>
            <Link
              href="/superadmin/teams"
              className="text-xs text-diu-blue hover:underline font-semibold flex items-center gap-1"
            >
              View All Teams ({stats.totalTeams})
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <Card className="border border-slate-200 shadow-sm bg-white overflow-hidden">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">Team Name</th>
                    <th className="p-3.5">Course &amp; Sec</th>
                    <th className="p-3.5">Leader</th>
                    <th className="p-3.5">Roster</th>
                    <th className="p-3.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentTeams.map((team) => (
                    <tr key={team.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3.5 font-semibold text-diu-navy">
                        {team.team_name}
                      </td>
                      <td className="p-3.5 text-slate-600">
                        {team.course_offering?.course?.code} ({team.course_offering?.section})
                      </td>
                      <td className="p-3.5 text-slate-700 font-medium">
                        {team.leader?.student?.full_name || "Unassigned"}
                      </td>
                      <td className="p-3.5 text-slate-600">
                        {team.registered_count} / {team.capacity}
                      </td>
                      <td className="p-3.5">
                        <TeamStatusBadge status={team.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Responsive Teams Cards */}
            <div className="md:hidden divide-y divide-slate-100">
              {recentTeams.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs">No teams registered yet.</div>
              ) : (
                recentTeams.map((team) => (
                  <div key={team.id} className="p-3.5 space-y-2 bg-white">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <span className="font-bold text-xs text-diu-navy block">
                          {team.team_name}
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium">
                          {team.course_offering?.course?.code} (Sec {team.course_offering?.section})
                        </span>
                      </div>
                      <TeamStatusBadge status={team.status} />
                    </div>
                    <div className="flex justify-between items-center text-xs text-slate-600 bg-slate-50 p-2 rounded border border-slate-100">
                      <span>Leader: <strong>{team.leader?.student?.full_name || "Unassigned"}</strong></span>
                      <span className="font-semibold text-diu-blue">
                        {team.registered_count} / {team.capacity} members
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Right: Administrative Audit Log */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-diu-navy font-heading">
              Recent Admin Events
            </h2>
            <Link
              href="/superadmin/audit-logs"
              className="text-xs text-diu-blue hover:underline font-semibold"
            >
              All Logs
            </Link>
          </div>

          <Card className="border border-slate-200 shadow-sm bg-white p-4 space-y-3">
            {recentLogs.map((log) => (
              <div
                key={log.id}
                className="p-3 rounded-lg bg-slate-50 border border-slate-100 text-xs space-y-1"
              >
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-diu-navy font-mono text-[11px]">
                    {log.action}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {formatDate(log.created_at)}
                  </span>
                </div>
                <p className="text-slate-600 text-[11px] truncate">
                  Target: {log.target_type} ({log.target_id || "N/A"})
                </p>
                <span className="text-[10px] text-slate-400 block">
                  By: {log.actor_email || "System"}
                </span>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}
