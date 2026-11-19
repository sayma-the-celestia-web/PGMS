import React from "react";
import Link from "next/link";
import { DataService } from "@/lib/services/data-service";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { RegistrationStatusBadge } from "@/components/ui/status-badge";
import { formatDate } from "@/lib/utils";
import {
  ArrowRight,
  BookOpen,
  Users,
  ShieldCheck,
  CheckCircle,
  Clock,
  Sparkles,
  Layers,
  FileSpreadsheet,
  GraduationCap,
  KeyRound,
  UserPlus,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const offerings = await DataService.getCourseOfferings();
  const stats = await DataService.getDashboardStats();

  return (
    <div className="flex flex-col min-h-screen">
      {/* SECTION 1: HERO */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#073763] via-[#0066B3] to-[#005291] text-white pt-16 pb-24 md:pt-24 md:pb-32">
        {/* Subtle decorative background grids and glow */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_50%)] pointer-events-none" />
        <div className="absolute bottom-0 inset-x-0 h-12 bg-[#F5F8FC] [clip-path:polygon(0_100%,100%_100%,100%_0)]" />

        <div className="container max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
          <div className="max-w-3xl space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-semibold uppercase tracking-wider text-blue-100">
              <GraduationCap className="w-4 h-4 text-emerald-300" />
              <span>Daffodil International University</span>
              <span className="text-white/40">•</span>
              <span>Dept. of Software Engineering</span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-white font-heading leading-tight">
              Organize Your Presentation Teams,{" "}
              <span className="text-blue-200 underline decoration-emerald-400 decoration-wavy decoration-2 underline-offset-8">
                The Smarter Way.
              </span>
            </h1>

            <p className="text-base sm:text-lg md:text-xl text-blue-100/90 leading-relaxed max-w-2xl font-light">
              Create your presentation team, find available groups, and manage registrations
              through one simple platform designed specifically for Software Engineering students.
            </p>

            {/* CTA Buttons */}
            <div className="pt-2 flex flex-wrap gap-4 items-center">
              <Link href="/register-team">
                <Button
                  size="lg"
                  className="bg-white text-diu-navy hover:bg-blue-50 font-semibold shadow-lg shadow-black/15 gap-2 h-12 px-6"
                >
                  <UserPlus className="w-5 h-5 text-diu-blue" />
                  Register Team
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>

              <Link href="/courses">
                <Button
                  variant="outline"
                  size="lg"
                  className="border-white/30 bg-white/10 text-white hover:bg-white/20 h-12 px-6 font-medium backdrop-blur-sm gap-2"
                >
                  <Users className="w-4 h-4" />
                  Find Team
                </Button>
              </Link>

              <Link href="/manage">
                <Button
                  variant="ghost"
                  size="lg"
                  className="text-white/90 hover:text-white hover:bg-white/10 h-12 px-4 gap-2 text-sm"
                >
                  <KeyRound className="w-4 h-4 text-emerald-300" />
                  Team Login
                </Button>
              </Link>
            </div>

            {/* Quick trust metrics */}
            <div className="pt-8 grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-white/15">
              <div>
                <p className="text-2xl sm:text-3xl font-bold font-heading text-white">
                  {stats.activeOfferings}
                </p>
                <p className="text-xs text-blue-200">Active Course Sections</p>
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-bold font-heading text-white">
                  {stats.totalTeams}
                </p>
                <p className="text-xs text-blue-200">Registered Teams</p>
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-bold font-heading text-white">
                  {stats.totalStudents}
                </p>
                <p className="text-xs text-blue-200">Enrolled Students</p>
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-bold font-heading text-emerald-300">
                  Zero
                </p>
                <p className="text-xs text-blue-200">Account Logins Needed</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: DEPARTMENT IDENTITY */}
      <section className="py-16 md:py-20 bg-[#F5F8FC]">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6">
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs font-semibold text-diu-blue uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              Academic Excellence
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-diu-navy font-heading">
              Empowering Future Software Engineers
            </h2>
            <p className="text-base text-diu-slate leading-relaxed">
              The Department of Software Engineering at Daffodil International University provides
              industry-standard project-based learning. PGMS was created as a reliable academic utility
              to eliminate chaotic messaging threads and spreadsheet mix-ups during course group
              formation.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200/90 shadow-sm space-y-3">
              <div className="w-12 h-12 rounded-lg bg-blue-50 text-diu-blue flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="font-heading font-semibold text-lg text-diu-navy">
                Autonomous Student Formation
              </h3>
              <p className="text-sm text-diu-slate leading-relaxed">
                Students can create their own team as leader or join an open group with available
                slots immediately without requiring teacher intervention.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200/90 shadow-sm space-y-3">
              <div className="w-12 h-12 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="font-heading font-semibold text-lg text-diu-navy">
                Privacy By Design
              </h3>
              <p className="text-sm text-diu-slate leading-relaxed">
                Student IDs and reference tokens remain confidential. Public directories only display
                names, capacity, and vacancy to protect student privacy.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200/90 shadow-sm space-y-3">
              <div className="w-12 h-12 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="font-heading font-semibold text-lg text-diu-navy">
                Enforced Capacity &amp; Integrity
              </h3>
              <p className="text-sm text-diu-slate leading-relaxed">
                Strict database-level constraints ensure no duplicate registrations within a
                section and atomic locks prevent over-capacity team joins.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: AVAILABLE COURSE REGISTRATIONS */}
      <section className="py-16 md:py-20 bg-white border-y border-slate-200">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs font-semibold text-diu-blue uppercase tracking-wider mb-2">
                <BookOpen className="w-3.5 h-3.5" />
                Course Registrations
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-diu-navy font-heading">
                Current Course Offerings
              </h2>
              <p className="text-sm text-diu-slate mt-1">
                Browse available course sections and register your presentation group before the deadline.
              </p>
            </div>

            <Link href="/courses">
              <Button variant="outline" className="gap-2 font-medium">
                View All Courses
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {offerings.length === 0 ? (
              <div className="col-span-full text-center py-16 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <Clock className="w-12 h-12 text-slate-300 mx-auto" />
                <h3 className="text-lg font-semibold text-diu-navy">Registration Coming Soon</h3>
                <p className="text-sm text-diu-slate max-w-sm mx-auto">
                  Course registration for <strong>SE214 — Algorithm Design and Analysis</strong> (Batch 45, Section H)
                  is being configured. Check back once the Superadmin opens registration.
                </p>
              </div>
            ) : (
              offerings.slice(0, 6).map((offering) => (
              <Card
                key={offering.id}
                className="flex flex-col h-full hover:border-diu-blue/50 hover:shadow-md transition-all group"
              >
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-diu-navy text-white">
                      {offering.course?.code}
                    </span>
                    <RegistrationStatusBadge status={offering.registration_status} />
                  </div>
                  <CardTitle className="text-lg group-hover:text-diu-blue transition-colors line-clamp-1 mt-2">
                    {offering.course?.name}
                  </CardTitle>
                  <CardDescription className="line-clamp-2 text-xs">
                    {offering.course?.description || "Course presentation group formation"}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-3 flex-1 pb-4 text-xs">
                  <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <div>
                      <span className="text-slate-500 block">Semester</span>
                      <span className="font-semibold text-diu-navy">
                        {offering.semester?.name || "Active"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Section</span>
                      <span className="font-semibold text-diu-blue">
                        {offering.section}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                    <span className="text-slate-500 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      Teams:
                    </span>
                    <span className="font-semibold text-slate-700">
                      {offering.teams_count} registered
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      Deadline:
                    </span>
                    <span className="font-medium text-slate-700">
                      {formatDate(offering.registration_deadline)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Allowed Team Size:</span>
                    <span className="font-medium text-slate-700">
                      {offering.min_team_capacity} – {offering.max_team_capacity} members
                    </span>
                  </div>
                </CardContent>

                <CardFooter className="pt-3">
                  <Link
                    href={`/courses/${offering.course?.slug || offering.id}`}
                    className="w-full"
                  >
                    <Button
                      variant={offering.registration_status === "OPEN" ? "default" : "secondary"}
                      className="w-full text-xs font-semibold gap-1.5"
                    >
                      View Teams &amp; Register
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            ))
            )}
          </div>
        </div>
      </section>

      {/* SECTION 4: HOW IT WORKS */}
      <section id="how-it-works" className="py-16 md:py-24 bg-[#F5F8FC]">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6">
          <div className="max-w-2xl mx-auto text-center space-y-3 mb-14">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs font-semibold text-diu-blue uppercase tracking-wider">
              Four Easy Steps
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-diu-navy font-heading">
              How It Works
            </h2>
            <p className="text-sm sm:text-base text-diu-slate">
              Forming your course presentation team is quick and straightforward.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
            {/* Step 1 */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative">
              <div className="w-10 h-10 rounded-full bg-diu-navy text-white font-bold flex items-center justify-center font-heading text-lg mb-4 shadow-sm">
                1
              </div>
              <h3 className="font-heading font-semibold text-base text-diu-navy mb-2">
                Choose Your Course
              </h3>
              <p className="text-xs text-diu-slate leading-relaxed">
                Browse current offerings by course code (e.g. SE214) and select your enrolled section.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative">
              <div className="w-10 h-10 rounded-full bg-diu-blue text-white font-bold flex items-center justify-center font-heading text-lg mb-4 shadow-sm">
                2
              </div>
              <h3 className="font-heading font-semibold text-base text-diu-navy mb-2">
                Create or Join a Team
              </h3>
              <p className="text-xs text-diu-slate leading-relaxed">
                Start a new team as group leader, or view existing teams with open seats and join independently.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative">
              <div className="w-10 h-10 rounded-full bg-diu-accent text-white font-bold flex items-center justify-center font-heading text-lg mb-4 shadow-sm">
                3
              </div>
              <h3 className="font-heading font-semibold text-base text-diu-navy mb-2">
                Save Your Reference
              </h3>
              <p className="text-xs text-diu-slate leading-relaxed">
                Receive your private reference token upon registration. Use it anytime to manage or adjust details.
              </p>
            </div>

            {/* Step 4 */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative">
              <div className="w-10 h-10 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center font-heading text-lg mb-4 shadow-sm">
                4
              </div>
              <h3 className="font-heading font-semibold text-base text-diu-navy mb-2">
                Get Ready to Present
              </h3>
              <p className="text-xs text-diu-slate leading-relaxed">
                When your team reaches full capacity or registration closes, your roster is finalized for defense.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 5: WHY PGMS */}
      <section className="py-16 md:py-20 bg-white">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-700 uppercase tracking-wider">
                Built For Students &amp; Faculty
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-diu-navy font-heading">
                Why Department of Software Engineering Uses PGMS
              </h2>
              <p className="text-sm sm:text-base text-diu-slate leading-relaxed">
                Traditional group formation often leads to duplicate student enrollments,
                exceeded member quotas, and unorganized communication. PGMS provides a structured,
                transparent, and privacy-respecting workflow.
              </p>

              <div className="space-y-3 pt-2">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-diu-navy">
                      No Student Account Required
                    </h4>
                    <p className="text-xs text-diu-slate">
                      Skip password setups and reset emails. High-entropy cryptographic reference
                      tokens provide seamless self-service.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-diu-navy">
                      Real-Time Seat Availability
                    </h4>
                    <p className="text-xs text-diu-slate">
                      Transparent directories show open vs full groups so students can immediately
                      find open spots.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-diu-navy">
                      Accurate Multi-Sheet Excel Reports
                    </h4>
                    <p className="text-xs text-diu-slate">
                      Course coordinators can export team lists, student enrollments, and status
                      overviews in formatted .xlsx files with a single click.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Visual card mockup */}
            <div className="bg-gradient-to-br from-diu-navy to-diu-blue p-8 rounded-2xl text-white shadow-xl space-y-6">
              <div className="flex items-center justify-between border-b border-white/20 pb-4">
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-6 h-6 text-emerald-300" />
                  <span className="font-heading font-bold text-lg">DIU SWE Portal</span>
                </div>
                <span className="text-xs px-2.5 py-1 bg-white/20 rounded-full font-medium">
                  Batch 45
                </span>
              </div>

              <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/15 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-blue-100 font-semibold">SE214 • Section H</span>
                  <span className="bg-amber-500/30 text-amber-300 px-2 py-0.5 rounded text-[10px] font-bold">
                    UPCOMING
                  </span>
                </div>
                <h4 className="font-heading font-bold text-base text-white">
                  Algorithm Design and Analysis
                </h4>
                <p className="text-xs text-blue-100/80">Registration opens when configured by admin</p>
                <div className="w-full bg-white/20 rounded-full h-1.5 mt-2">
                  <div className="bg-emerald-400 h-1.5 rounded-full w-0" />
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs text-blue-100 bg-white/5 p-3 rounded-lg border border-white/10">
                <FileSpreadsheet className="w-5 h-5 text-emerald-300 shrink-0" />
                <span>
                  Ready for presentation defenses and grading evaluation matrices.
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 6: CALL TO ACTION */}
      <section className="py-16 md:py-20 bg-gradient-to-r from-diu-navy to-diu-blue text-white text-center">
        <div className="container max-w-4xl mx-auto px-4 sm:px-6 space-y-6">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold font-heading">
            Ready to form your presentation team?
          </h2>
          <p className="text-sm sm:text-base text-blue-100 max-w-2xl mx-auto leading-relaxed">
            Browse currently active courses, check real-time open slots, and complete your
            registration in under two minutes.
          </p>
          <div className="pt-2 flex flex-wrap justify-center gap-4">
            <Link href="/courses">
              <Button
                size="lg"
                className="bg-white text-diu-navy hover:bg-blue-50 font-semibold shadow-md gap-2"
              >
                <Users className="w-4 h-4 text-diu-blue" />
                Explore Team
              </Button>
            </Link>
            <Link href="/manage">
              <Button
                size="lg"
                className="bg-white text-black hover:bg-slate-100 hover:text-black border border-white font-semibold shadow-md gap-2"
                style={{ color: "#000000" }}
              >
                <KeyRound className="w-4 h-4 text-black" />
                Access My Team Reference
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
