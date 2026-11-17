"use client";

import React, { useState } from "react";
import { CourseOffering, Course, Semester, RegistrationStatus } from "@/types";
import { createCourseOfferingAction, updateCourseOfferingAction } from "@/lib/actions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RegistrationStatusBadge } from "@/components/ui/status-badge";
import { formatDate } from "@/lib/utils";
import { PlusCircle, Layers, AlertTriangle, Clock } from "lucide-react";

interface Props {
  initialOfferings: CourseOffering[];
  courses: Course[];
  semesters: Semester[];
}

export function RegistrationsClient({
  initialOfferings,
  courses,
  semesters,
}: Props) {
  const [offerings, setOfferings] = useState<CourseOffering[]>(initialOfferings);
  const [showModal, setShowModal] = useState(false);

  // Form states
  const [courseId, setCourseId] = useState(courses[0]?.id || "");
  const [semesterId, setSemesterId] = useState(semesters[0]?.id || "");
  const [section, setSection] = useState("H");
  const [status, setStatus] = useState<RegistrationStatus>("OPEN");
  const [minCap, setMinCap] = useState(3);
  const [maxCap, setMaxCap] = useState(5);
  const [deadline, setDeadline] = useState(
    new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 16)
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseId) {
      setError("Please select a course or create one first.");
      return;
    }
    if (!semesterId) {
      setError("Please create a semester first under the Semesters tab before adding an offering.");
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const res = await createCourseOfferingAction({
        course_id: courseId,
        semester_id: semesterId,
        section,
        registration_status: status,
        registration_start: new Date().toISOString(),
        registration_deadline: new Date(deadline).toISOString(),
        min_team_capacity: Number(minCap),
        max_team_capacity: Number(maxCap),
      });

      if (!res.success || !res.data) {
        setError(res.error || "Failed to create offering");
      } else {
        setOfferings([res.data, ...offerings]);
        setShowModal(false);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to create course offering");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (
    offeringId: string,
    newStatus: RegistrationStatus
  ) => {
    try {
      const res = await updateCourseOfferingAction(offeringId, {
        registration_status: newStatus,
      });
      if (res.success && res.data) {
        const updated = res.data;
        setOfferings(offerings.map((o) => (o.id === offeringId ? updated : o)));
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-diu-navy font-heading">
            Course Registrations &amp; Sections
          </h1>
          <p className="text-xs text-diu-slate">
            Configure section offerings, registration deadlines, and team size boundaries.
          </p>
        </div>

        <Button onClick={() => setShowModal(true)} size="sm" className="gap-1.5 font-medium">
          <PlusCircle className="w-4 h-4" />
          New Offering
        </Button>
      </div>

      {showModal && (
        <Card className="border border-diu-blue/30 shadow-md bg-white">
          <CardHeader className="bg-blue-50/50 pb-3 border-b border-slate-100">
            <CardTitle className="text-base text-diu-navy">
              Create Course Section Offering
            </CardTitle>
          </CardHeader>
          <form onSubmit={handleCreate}>
            <CardContent className="pt-4 space-y-4">
              {error && (
                <div className="p-3 rounded bg-red-50 text-red-700 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  <span>{error}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Course *</Label>
                  {courses.length === 0 ? (
                    <p className="text-xs text-amber-600 py-2">No courses available. Please add a course first.</p>
                  ) : (
                    <select
                      value={courseId}
                      onChange={(e) => setCourseId(e.target.value)}
                      className="w-full h-10 px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-diu-blue"
                    >
                      {courses.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.code} — {c.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Semester *</Label>
                  {semesters.length === 0 ? (
                    <p className="text-xs text-amber-600 py-2">
                      No semester configured. Go to <strong className="underline">Semesters</strong> tab and create one first.
                    </p>
                  ) : (
                    <select
                      value={semesterId}
                      onChange={(e) => setSemesterId(e.target.value)}
                      className="w-full h-10 px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-diu-blue"
                    >
                      {semesters.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.academic_year})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="sec" className="text-xs font-semibold">
                    Section Code *
                  </Label>
                  <Input
                    id="sec"
                    value={section}
                    onChange={(e) => setSection(e.target.value)}
                    required
                    placeholder="e.g. 61_A"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Registration Status</Label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as RegistrationStatus)}
                    className="w-full h-10 px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-diu-blue"
                  >
                    <option value="OPEN">OPEN</option>
                    <option value="PAUSED">PAUSED</option>
                    <option value="UPCOMING">UPCOMING</option>
                    <option value="CLOSED">CLOSED</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="minC" className="text-xs font-semibold">
                    Min Capacity *
                  </Label>
                  <Input
                    id="minC"
                    type="number"
                    min={1}
                    value={minCap}
                    onChange={(e) => setMinCap(Number(e.target.value))}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="maxC" className="text-xs font-semibold">
                    Max Capacity *
                  </Label>
                  <Input
                    id="maxC"
                    type="number"
                    min={1}
                    value={maxCap}
                    onChange={(e) => setMaxCap(Number(e.target.value))}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="deadline" className="text-xs font-semibold">
                    Registration Deadline *
                  </Label>
                  <Input
                    id="deadline"
                    type="datetime-local"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading} size="sm">
                  {loading ? "Creating..." : "Save Offering"}
                </Button>
              </div>
            </CardContent>
          </form>
        </Card>
      )}

      {/* OFFERINGS LIST */}
      <Card className="border border-slate-200 shadow-sm bg-white overflow-hidden">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200">
            <tr>
              <th className="p-3.5">Course</th>
              <th className="p-3.5">Semester &amp; Sec</th>
              <th className="p-3.5">Team Size Bounds</th>
              <th className="p-3.5">Registered</th>
              <th className="p-3.5">Deadline</th>
              <th className="p-3.5">Status</th>
              <th className="p-3.5 text-right">Quick Status Control</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {offerings.map((off) => (
              <tr key={off.id} className="hover:bg-slate-50 transition-colors">
                <td className="p-3.5">
                  <span className="font-bold text-diu-navy block">{off.course?.code}</span>
                  <span className="text-slate-500 text-[11px]">{off.course?.name}</span>
                </td>
                <td className="p-3.5">
                  <span className="font-semibold text-slate-800 block">
                    {off.semester?.name}
                  </span>
                  <span className="text-diu-blue font-bold">Sec {off.section}</span>
                </td>
                <td className="p-3.5 text-slate-600">
                  {off.min_team_capacity} – {off.max_team_capacity} members
                </td>
                <td className="p-3.5 text-slate-600">
                  {off.teams_count} teams ({off.students_count} students)
                </td>
                <td className="p-3.5 text-slate-600">
                  {formatDate(off.registration_deadline)}
                </td>
                <td className="p-3.5">
                  <RegistrationStatusBadge status={off.registration_status} />
                </td>
                <td className="p-3.5 text-right">
                  <select
                    aria-label={`Change status for ${off.course?.code || "course"} section ${off.section}`}
                    value={off.registration_status}
                    onChange={(e) =>
                      handleStatusChange(off.id, e.target.value as RegistrationStatus)
                    }
                    className="h-8 px-2 bg-white border border-slate-300 rounded text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-diu-blue"
                  >
                    <option value="OPEN">OPEN</option>
                    <option value="PAUSED">PAUSED</option>
                    <option value="UPCOMING">UPCOMING</option>
                    <option value="CLOSED">CLOSED</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
