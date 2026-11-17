import React from "react";
import { DataService } from "@/lib/services/data-service";
import { CourseDirectoryClient } from "./course-directory-client";
import { GraduationCap } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Course Directory | PGMS — Daffodil International University",
  description:
    "Browse presentation group offerings and sections for the Department of Software Engineering.",
};

export default async function CoursesPage() {
  const [offerings, semesters] = await Promise.all([
    DataService.getCourseOfferings(),
    DataService.getSemesters(),
  ]);

  return (
    <div className="py-10 md:py-14">
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 space-y-8">
        {/* Header Breadcrumb & Title */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-diu-blue uppercase tracking-wider">
            <GraduationCap className="w-4 h-4" />
            <span>DIU SWE • Academic Registration</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-diu-navy font-heading">
            Course Offerings Directory
          </h1>
          <p className="text-sm sm:text-base text-diu-slate max-w-2xl">
            Select your course and enrolled section to create a new presentation group or join an
            existing open team.
          </p>
        </div>

        {/* Directory Client with Interactive Filters */}
        <CourseDirectoryClient
          initialOfferings={offerings}
          semesters={semesters}
        />
      </div>
    </div>
  );
}
