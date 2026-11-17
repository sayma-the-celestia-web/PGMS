import React from "react";
import { DataService } from "@/lib/services/data-service";
import { RegistrationsClient } from "./registrations-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Course Offerings | PGMS Superadmin",
};

export default async function RegistrationsPage() {
  const [offerings, courses, semesters] = await Promise.all([
    DataService.getCourseOfferings(),
    DataService.getCourses(),
    DataService.getSemesters(),
  ]);

  return (
    <RegistrationsClient
      initialOfferings={offerings}
      courses={courses}
      semesters={semesters}
    />
  );
}
