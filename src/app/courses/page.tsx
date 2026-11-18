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
  const [offerings, semesters, allTeams] = await Promise.all([
    DataService.getCourseOfferings(),
    DataService.getSemesters(),
    DataService.getAllTeams(),
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
            Course Offerings &amp; Teams Directory
          </h1>
          <p className="text-sm sm:text-base text-diu-slate max-w-2xl">
            Browse course offerings, find teams looking for members, or register a new presentation group.
          </p>
        </div>

        {/* Directory Client with Interactive Filters and Find & Join Open Teams */}
        <CourseDirectoryClient
          initialOfferings={offerings}
          semesters={semesters}
          initialTeams={allTeams}
        />
      </div>
    </div>
  );
}
