import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DataService } from "@/lib/services/data-service";
import { CreateTeamClient } from "./create-team-client";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ section?: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const course = await DataService.getCourseBySlug(slug);
  return {
    title: `Create Team — ${course ? course.code : "Course"} | PGMS DIU`,
  };
}

export default async function CreateTeamPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;
  const course = await DataService.getCourseBySlug(slug);
  if (!course) {
    notFound();
  }

  const offerings = await DataService.getCourseOfferings({ courseId: course.id });
  if (offerings.length === 0) {
    notFound();
  }

  let offering = offerings[0];
  if (resolvedSearchParams.section) {
    const match = offerings.find(
      (o) => o.section.toLowerCase() === resolvedSearchParams.section?.toLowerCase()
    );
    if (match) offering = match;
  }

  if (offering.registration_status !== "OPEN") {
    return (
      <div className="container max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold text-diu-navy font-heading">
          Registration is Closed
        </h1>
        <p className="text-sm text-slate-600">
          Registration for {course.code} Section {offering.section} is currently{" "}
          <strong>{offering.registration_status.toLowerCase()}</strong>. New team creation is disabled.
        </p>
        <div className="pt-2">
          <Link href={`/courses/${course.slug}`}>
            <Button variant="outline">Back to Course Details</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="py-10 md:py-14">
      <div className="container max-w-4xl mx-auto px-4 sm:px-6 space-y-6">
        <Link
          href={`/courses/${course.slug}?section=${encodeURIComponent(offering.section)}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-diu-slate hover:text-diu-blue transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Section {offering.section}
        </Link>

        <CreateTeamClient offering={offering} />
      </div>
    </div>
  );
}
