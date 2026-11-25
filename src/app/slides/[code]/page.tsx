import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DataService } from "@/lib/services/data-service";
import { SlidesViewClient } from "./slides-view-client";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ section?: string }>;
}

export async function generateMetadata({ params, searchParams }: Props) {
  const { code } = await params;
  const resolvedSearchParams = await searchParams;
  const section = resolvedSearchParams.section
    ? resolvedSearchParams.section.replace(/\/+$/, "").trim().toUpperCase()
    : "H";

  const course = await DataService.getCourseBySlug(code);
  const courseCode = course ? course.code : code.toUpperCase();

  return {
    title: `${courseCode} Section ${section} - Presentation Slides | PGMS DIU`,
    description: `Official presentation slides, PDFs, and PPTX slide decks repository for ${courseCode} Section ${section} at Daffodil International University.`,
  };
}

export default async function CourseSlidesPage({ params, searchParams }: Props) {
  const { code } = await params;
  const resolvedSearchParams = await searchParams;

  // Find course by slug or code
  let course = await DataService.getCourseBySlug(code);
  if (!course) {
    // Also try looking up courses matching code
    const allCourses = await DataService.getCourses();
    course =
      allCourses.find(
        (c) =>
          c.code.toLowerCase() === code.toLowerCase() ||
          c.slug.toLowerCase() === code.toLowerCase()
      ) || null;
  }

  if (!course) {
    notFound();
  }

  // Get all offerings for this course
  const allOfferings = await DataService.getCourseOfferings({ courseId: course.id });
  if (allOfferings.length === 0) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <h1 className="text-2xl font-bold text-diu-navy font-heading">
          {course.code}: {course.name}
        </h1>
        <p className="text-slate-600">
          No active course offerings or sections are currently scheduled for this course.
        </p>
        <Link
          href="/courses"
          className="inline-flex items-center text-diu-blue hover:underline gap-1 text-sm font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Course Directory
        </Link>
      </div>
    );
  }

  // Determine section offering (strip trailing slashes from query like section=H/)
  let currentOffering = allOfferings[0];
  if (resolvedSearchParams.section) {
    const rawSection = resolvedSearchParams.section.replace(/\/+$/, "").trim().toLowerCase();
    const match = allOfferings.find((o) => o.section.toLowerCase() === rawSection);
    if (match) currentOffering = match;
  }

  // Fetch teams for this offering
  const teams = await DataService.getTeamsByOffering(currentOffering.id);

  return (
    <div className="py-8 md:py-12 bg-slate-50/60 min-h-screen">
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 space-y-6">
        {/* Navigation Breadcrumbs */}
        <div className="flex items-center justify-between">
          <Link
            href={`/courses/${course.slug}?section=${currentOffering.section}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-diu-slate hover:text-diu-blue transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Course Details
          </Link>
          <Link
            href="/manage"
            className="text-xs font-semibold text-diu-blue hover:underline"
          >
            Team Leader Login &rarr;
          </Link>
        </div>

        {/* Client Component */}
        <SlidesViewClient
          course={course}
          offerings={allOfferings}
          currentOffering={currentOffering}
          teams={teams}
        />
      </div>
    </div>
  );
}
