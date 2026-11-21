"use client";

import React, { useState } from "react";
import Link from "next/link";
import { CourseOffering, Course, Semester, RegistrationStatus } from "@/types";
import { createCourseOfferingAction, updateCourseOfferingAction } from "@/lib/actions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RegistrationStatusBadge } from "@/components/ui/status-badge";
import { formatDate } from "@/lib/utils";
import { PlusCircle, Layers, AlertTriangle, Clock, ArrowRight } from "lucide-react";

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
  const [minCap, setMinCap] = useState(2);
  const [maxCap, setMaxCap] = useState(5);
  const [maxTeamsLimit, setMaxTeamsLimit] = useState(20);
  const [topicEnabled, setTopicEnabled] = useState(true);
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
        max_teams_limit: Number(maxTeamsLimit),
        topic_enabled: topicEnabled,
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

  // Instant toggle for Team Topic Requirement
  const handleTopicToggle = async (offeringId: string, currentEnabled: boolean) => {
    try {
      const res = await updateCourseOfferingAction(offeringId, {
        topic_enabled: !currentEnabled,
      });
      if (res.success && res.data) {
        setOfferings((prev) =>
          prev.map((o) =>
            o.id === offeringId ? { ...o, topic_enabled: !currentEnabled } : o
          )
        );
      }
    } catch (err) {
      console.error("Failed to toggle topic requirement:", err);
    }
  };

  // Edit Offering Modal States
  const [editingOffering, setEditingOffering] = useState<CourseOffering | null>(null);
  const [editSection, setEditSection] = useState("");
  const [editStatus, setEditStatus] = useState<RegistrationStatus>("OPEN");
  const [editMinCap, setEditMinCap] = useState(2);
  const [editMaxCap, setEditMaxCap] = useState(5);
  const [editMaxTeamsLimit, setEditMaxTeamsLimit] = useState(20);
  const [editTopicEnabled, setEditTopicEnabled] = useState(true);
  const [editDeadline, setEditDeadline] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const openEditModal = (off: CourseOffering) => {
    setEditingOffering(off);
    setEditSection(off.section);
    setEditStatus(off.registration_status);
    setEditMinCap(off.min_team_capacity);
    setEditMaxCap(off.max_team_capacity);
    setEditMaxTeamsLimit(off.max_teams_limit || 20);
    setEditTopicEnabled(off.topic_enabled !== false);
    setEditDeadline(
      off.registration_deadline
        ? new Date(off.registration_deadline).toISOString().slice(0, 16)
        : new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 16)
    );
    setEditError(null);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOffering) return;
    setEditLoading(true);
    setEditError(null);

    try {
      const res = await updateCourseOfferingAction(editingOffering.id, {
        section: editSection,
        registration_status: editStatus,
        registration_deadline: new Date(editDeadline).toISOString(),
        min_team_capacity: Number(editMinCap),
        max_team_capacity: Number(editMaxCap),
        max_teams_limit: Number(editMaxTeamsLimit),
        topic_enabled: editTopicEnabled,
      });

      if (!res.success || !res.data) {
        setEditError(res.error || "Failed to update offering");
      } else {
        const updated = res.data;
        setOfferings((prev) =>
          prev.map((o) => (o.id === editingOffering.id ? updated : o))
        );
        setEditingOffering(null);
      }
    } catch (err: any) {
      setEditError(err?.message || "Failed to update offering");
    } finally {
      setEditLoading(false);
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-100 pt-3">
                <div className="space-y-1.5">
                  <Label htmlFor="maxTeams" className="text-xs font-semibold">
                    Max Allowed Presentation Teams (Slots Limit) *
                  </Label>
                  <Input
                    id="maxTeams"
                    type="number"
                    min={1}
                    max={100}
                    value={maxTeamsLimit}
                    onChange={(e) => setMaxTeamsLimit(Number(e.target.value))}
                    required
                  />
                  <p className="text-[11px] text-slate-400">
                    Students will choose from 1st to {maxTeamsLimit}th team slot dropdown.
                  </p>
                </div>

                <div className="space-y-1.5 flex flex-col justify-center">
                  <Label className="text-xs font-semibold">Team Topic Requirement</Label>
                  <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={topicEnabled}
                      onChange={(e) => setTopicEnabled(e.target.checked)}
                      className="rounded border-slate-300 text-diu-blue focus:ring-diu-blue h-4 w-4"
                    />
                    <span>Enable presentation topic input for students</span>
                  </label>
                  <p className="text-[11px] text-slate-400">
                    If disabled, topic input will be turned off for this subject.
                  </p>
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

      {/* EDIT OFFERING MODAL */}
      {editingOffering && (
        <Card className="border-2 border-diu-blue/40 shadow-lg bg-white">
          <CardHeader className="bg-blue-50/50 pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base text-diu-navy font-heading">
                Edit Section Offering — {editingOffering.course?.code} Sec {editingOffering.section}
              </CardTitle>
              <p className="text-xs text-diu-slate mt-0.5">
                Update section capacity, presentation topic requirement, and deadlines.
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditingOffering(null)}
              className="text-xs h-8 text-slate-500"
            >
              Close
            </Button>
          </CardHeader>
          <form onSubmit={handleEditSubmit}>
            <CardContent className="pt-4 space-y-4">
              {editError && (
                <div className="p-3 rounded bg-red-50 text-red-700 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  <span>{editError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="editSec" className="text-xs font-semibold">
                    Section Code *
                  </Label>
                  <Input
                    id="editSec"
                    value={editSection}
                    onChange={(e) => setEditSection(e.target.value)}
                    required
                    placeholder="e.g. H, 61_A"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Registration Status</Label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as RegistrationStatus)}
                    className="w-full h-10 px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-diu-blue"
                  >
                    <option value="OPEN">OPEN</option>
                    <option value="PAUSED">PAUSED</option>
                    <option value="UPCOMING">UPCOMING</option>
                    <option value="CLOSED">CLOSED</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="editMinC" className="text-xs font-semibold">
                    Min Capacity *
                  </Label>
                  <Input
                    id="editMinC"
                    type="number"
                    min={1}
                    value={editMinCap}
                    onChange={(e) => setEditMinCap(Number(e.target.value))}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="editMaxC" className="text-xs font-semibold">
                    Max Capacity *
                  </Label>
                  <Input
                    id="editMaxC"
                    type="number"
                    min={1}
                    value={editMaxCap}
                    onChange={(e) => setEditMaxCap(Number(e.target.value))}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="editDeadline" className="text-xs font-semibold">
                    Registration Deadline *
                  </Label>
                  <Input
                    id="editDeadline"
                    type="datetime-local"
                    value={editDeadline}
                    onChange={(e) => setEditDeadline(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-100 pt-3">
                <div className="space-y-1.5">
                  <Label htmlFor="editMaxTeams" className="text-xs font-semibold">
                    Max Allowed Presentation Teams (Slots Limit) *
                  </Label>
                  <Input
                    id="editMaxTeams"
                    type="number"
                    min={1}
                    max={100}
                    value={editMaxTeamsLimit}
                    onChange={(e) => setEditMaxTeamsLimit(Number(e.target.value))}
                    required
                  />
                </div>

                <div className="space-y-1.5 flex flex-col justify-center p-3 rounded-lg bg-blue-50/50 border border-blue-200">
                  <Label className="text-xs font-bold text-diu-navy">Team Topic Requirement</Label>
                  <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={editTopicEnabled}
                      onChange={(e) => setEditTopicEnabled(e.target.checked)}
                      className="rounded border-slate-300 text-diu-blue focus:ring-diu-blue h-4 w-4"
                    />
                    <span className="font-medium">Enable presentation topic input for students</span>
                  </label>
                  <p className="text-[11px] text-slate-500">
                    If disabled, topic input will be turned off for this subject.
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingOffering(null)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={editLoading} size="sm" className="bg-diu-blue hover:bg-diu-navy">
                  {editLoading ? "Saving Changes..." : "Save Changes"}
                </Button>
              </div>
            </CardContent>
          </form>
        </Card>
      )}

      {/* OFFERINGS LIST */}
      <Card className="border border-slate-200 shadow-sm bg-white overflow-hidden">
        <div className="overflow-x-auto">
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
                  <td className="p-3.5 text-slate-600 space-y-1">
                    <span className="block font-medium">{off.min_team_capacity} – {off.max_team_capacity} members</span>
                    <span className="text-[11px] text-diu-blue font-semibold block">Max {off.max_teams_limit || 20} teams</span>
                    <div>
                      <button
                        type="button"
                        onClick={() => handleTopicToggle(off.id, off.topic_enabled !== false)}
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border transition-all cursor-pointer ${
                          off.topic_enabled !== false
                            ? "bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100"
                            : "bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200"
                        }`}
                        title="Click to toggle Team Topic Requirement"
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            off.topic_enabled !== false ? "bg-emerald-600" : "bg-slate-400"
                          }`}
                        />
                        <span>Topic: {off.topic_enabled !== false ? "Enabled" : "Disabled"}</span>
                        <span className="text-[9px] text-slate-400 font-normal underline">toggle</span>
                      </button>
                    </div>
                  </td>
                  <td className="p-3.5 text-slate-600">
                    <Link
                      href={`/superadmin/teams?offeringId=${off.id}`}
                      className="font-semibold text-diu-blue hover:underline inline-flex items-center gap-1"
                      title="Manage teams for this offering"
                    >
                      {off.teams_count} teams ({off.students_count} students)
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </td>
                  <td className="p-3.5 text-slate-600">
                    {formatDate(off.registration_deadline)}
                  </td>
                  <td className="p-3.5">
                    <RegistrationStatusBadge status={off.registration_status} />
                  </td>
                  <td className="p-3.5 text-right space-x-2 whitespace-nowrap">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => openEditModal(off)}
                      className="h-8 text-xs font-medium"
                    >
                      Edit
                    </Button>
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
        </div>
      </Card>
    </div>
  );
}
