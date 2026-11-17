import React from "react";
import { DataService } from "@/lib/services/data-service";
import { TeamsManagementClient } from "./teams-management-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Teams Management | PGMS Superadmin",
};

export default async function TeamsManagementPage() {
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
    />
  );
}
