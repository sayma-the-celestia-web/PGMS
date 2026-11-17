import React from "react";
import { DataService } from "@/lib/services/data-service";
import { ExportsClient } from "./exports-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Excel Exports | PGMS Superadmin",
};

export default async function ExportsPage() {
  const [semesters, courses, offerings] = await Promise.all([
    DataService.getSemesters(),
    DataService.getCourses(),
    DataService.getCourseOfferings(),
  ]);

  return (
    <ExportsClient
      semesters={semesters}
      courses={courses}
      offerings={offerings}
    />
  );
}
