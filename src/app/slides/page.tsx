import React from "react";
import Link from "next/link";
import { DataService } from "@/lib/services/data-service";
import { SlidesAllClient } from "./slides-all-client";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Presentation Slides Repository | PGMS DIU",
  description:
    "Official presentation slides, PDFs, and PowerPoint slide decks repository for all courses and sections at Daffodil International University.",
};

interface Props {
  searchParams: Promise<{ course?: string; section?: string }>;
}

export default async function SlidesRootPage({ searchParams }: Props) {
  const resolvedSearchParams = await searchParams;
  const initialCourse = resolvedSearchParams.course ? resolvedSearchParams.course.trim().toLowerCase() : "all";
  const initialSection = resolvedSearchParams.section ? resolvedSearchParams.section.replace(/\/+$/, "").trim().toLowerCase() : "all";

  // Fetch all courses, offerings, and teams
  const [courses, offerings, allTeams] = await Promise.all([
    DataService.getCourses(),
    DataService.getCourseOfferings(),
    DataService.getAllTeams(),
  ]);

  return (
    <div className="py-8 md:py-12 bg-slate-50/60 min-h-screen">
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 space-y-6">
        {/* Navigation Breadcrumbs */}
        <div className="flex items-center justify-between">
          <Link
            href="/courses"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-diu-slate hover:text-diu-blue transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Course Directory
          </Link>
          <Link
            href="/manage"
            className="text-xs font-semibold text-diu-blue hover:underline"
          >
            Team Leader Login &rarr;
          </Link>
        </div>

        {/* Client Component */}
        <SlidesAllClient
          courses={courses}
          offerings={offerings}
          teams={allTeams}
          initialCourse={initialCourse}
          initialSection={initialSection}
        />
      </div>
    </div>
  );
}
