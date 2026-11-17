import React from "react";
import { DataService } from "@/lib/services/data-service";
import { CoursesClient } from "./courses-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Courses Management | PGMS Superadmin",
};

export default async function CoursesPage() {
  const courses = await DataService.getCourses();

  return <CoursesClient initialCourses={courses} />;
}
