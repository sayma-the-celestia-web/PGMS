import React from "react";
import { DataService } from "@/lib/services/data-service";
import { SemestersClient } from "./semesters-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Semester Management | PGMS Superadmin",
};

export default async function SemestersPage() {
  const semesters = await DataService.getSemesters();

  return <SemestersClient initialSemesters={semesters} />;
}
