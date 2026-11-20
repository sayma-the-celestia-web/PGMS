import React from "react";
import { DataService } from "@/lib/services/data-service";
import { TeamsManagementClient } from "./teams-management-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Teams Management | PGMS Superadmin",
};

interface Props {
  searchParams?: Promise<{ offeringId?: string; status?: string }>;
}

export default async function TeamsManagementPage({ searchParams }: Props) {
  const resolvedParams = searchParams ? await searchParams : {};
  const [teams, offerings, semesters] = await Promise.all([
    DataService.getAllTeams(),
    DataService.getCourseOfferings(),
    DataService.getSemesters(),
  ]);

  return (
    <TeamsManagementClient
      initialTeams={teams}
      offerings={offerings}
      semesters={semesters}
      initialOfferingId={resolvedParams.offeringId}
      initialStatus={resolvedParams.status}
    />
  );
}
