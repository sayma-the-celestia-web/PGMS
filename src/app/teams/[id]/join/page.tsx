import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DataService } from "@/lib/services/data-service";
import { JoinTeamClient } from "./join-team-client";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const team = await DataService.getTeamById(id);
  return {
    title: `Join Team — ${team ? team.team_name : "Team"} | PGMS DIU`,
  };
}

export default async function JoinTeamPage({ params }: Props) {
  const { id } = await params;
  const team = await DataService.getTeamById(id);
  if (!team) {
    notFound();
  }

  const offering = team.course_offering;
  const activeMembers = team.memberships || [];
  const availableSlots = Math.max(0, team.capacity - activeMembers.length);

  if (offering?.registration_status !== "OPEN") {
    return (
      <div className="container max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold text-diu-navy font-heading">
          Registration Closed
        </h1>
        <p className="text-sm text-slate-600">
          Registration for this course section is currently{" "}
          <strong>{offering?.registration_status.toLowerCase()}</strong>.
        </p>
        <div className="pt-2">
          <Link href={`/teams/${team.id}`}>
            <Button variant="outline">Back to Team</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (team.status !== "OPEN" || availableSlots <= 0) {
    return (
      <div className="container max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold text-diu-navy font-heading">
          {team.status === "FULL" ? "Team is Full" : "Team is Closed"}
        </h1>
        <p className="text-sm text-slate-600">
          This team has reached its capacity limit or has been closed. Please choose another team
          with open slots.
        </p>
        <div className="pt-2">
          <Link href={`/courses/${offering?.course?.slug || ""}`}>
            <Button variant="outline">Browse Other Teams</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="py-10 md:py-14">
      <div className="container max-w-4xl mx-auto px-4 sm:px-6 space-y-6">
        <Link
          href={`/teams/${team.id}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-diu-slate hover:text-diu-blue transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to {team.team_name}
        </Link>

        <JoinTeamClient team={team} />
      </div>
    </div>
  );
}
