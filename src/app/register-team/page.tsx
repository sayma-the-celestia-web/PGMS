import React from "react";
import Link from "next/link";
import { DataService } from "@/lib/services/data-service";
import { TeamRegistrationWizard } from "@/components/teams/TeamRegistrationWizard";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Team Registration — PGMS Daffodil International University",
  description: "Register your presentation team, choose presentation slot, and submit team members.",
};

export default async function RegisterTeamPage({
  searchParams,
}: {
  searchParams: Promise<{ offeringId?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const offerings = await DataService.getCourseOfferings();
  const openOfferings = offerings.filter((o) => o.registration_status === "OPEN");

  if (openOfferings.length === 0) {
    return (
      <div className="container max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold text-diu-navy font-heading">
          No Course Registrations Currently Open
        </h1>
        <p className="text-sm text-diu-slate">
          Course registration is currently closed or has not yet opened for any sections. Please check back later or contact your course instructor.
        </p>
        <Link href="/courses">
          <Button variant="outline" className="text-xs">
            Browse All Courses
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto px-4 py-8 sm:py-12 space-y-6">
      <Link
        href="/courses"
        className="inline-flex items-center text-xs text-diu-slate hover:text-diu-blue font-medium transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5 mr-1" />
        Back to Courses &amp; Teams
      </Link>

      <TeamRegistrationWizard
        offerings={openOfferings}
        initialOfferingId={resolvedSearchParams.offeringId}
      />
    </div>
  );
}
