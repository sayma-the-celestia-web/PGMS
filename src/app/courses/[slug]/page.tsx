import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DataService } from "@/lib/services/data-service";
import { CourseDetailsClient } from "./course-details-client";
import { ArrowLeft, BookOpen } from "lucide-react";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ section?: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const course = await DataService.getCourseBySlug(slug);
  if (!course) return { title: "Course Details | PGMS DIU" };
  return {
    title: `${course.code} - ${course.name} | PGMS DIU`,
    description: `Presentation group formation and team registration for ${course.code} ${course.name}.`,
  };
}

export default async function CourseDetailPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;
  const course = await DataService.getCourseBySlug(slug);
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
        <Link href="/courses" className="inline-flex items-center text-diu-blue hover:underline gap-1">
          <ArrowLeft className="w-4 h-4" />
          Back to Course Directory
        </Link>
      </div>
    );
  }

  // Determine which section offering to display
  let currentOffering = allOfferings[0];
  if (resolvedSearchParams.section) {
    const rawSection = resolvedSearchParams.section.replace(/\/+$/, "").trim().toLowerCase();
    const match = allOfferings.find(
      (o) => o.section.toLowerCase() === rawSection
    );
    if (match) currentOffering = match;
  }

  // Fetch teams for this offering
  const teams = await DataService.getTeamsByOffering(currentOffering.id);

  return (
    <div className="py-8 md:py-12">
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 space-y-6">
        {/* Back Link */}
        <Link
          href="/courses"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-diu-slate hover:text-diu-blue transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to All Courses
        </Link>

        {/* Course Details Client */}
        <CourseDetailsClient
          offeringsForCourse={allOfferings}
          currentOffering={currentOffering}
          teams={teams}
        />
      </div>
    </div>
  );
}
