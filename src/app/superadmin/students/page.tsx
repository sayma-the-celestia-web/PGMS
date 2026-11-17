import React from "react";
import { DataService } from "@/lib/services/data-service";
import { StudentsClient } from "./students-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Student Registry | PGMS Superadmin",
};

export default async function StudentsPage() {
  const students = await DataService.getAllStudents();

  return <StudentsClient initialStudents={students} />;
}
