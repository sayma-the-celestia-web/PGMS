"use client";

import React, { useState } from "react";
import { Semester } from "@/types";
import { createSemesterAction, updateSemesterAction } from "@/lib/actions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDateOnly } from "@/lib/utils";
import { PlusCircle, Calendar, CheckCircle, XCircle, RefreshCw, AlertTriangle } from "lucide-react";

interface Props {
  initialSemesters: Semester[];
}

export function SemestersClient({ initialSemesters }: Props) {
  const [semesters, setSemesters] = useState<Semester[]>(initialSemesters);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [academicYear, setAcademicYear] = useState("2026-2027");
  const [startDate, setStartDate] = useState("2026-07-01");
  const [endDate, setEndDate] = useState("2026-11-30");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await createSemesterAction({
        name,
        academic_year: academicYear,
        start_date: startDate,
        end_date: endDate,
        is_active: true,
      });

      if (!res.success || !res.data) {
        setError(res.error || "Failed to create semester");
      } else {
        setSemesters([res.data, ...semesters]);
        setShowCreateModal(false);
        setName("");
      }
    } catch (err: any) {
      setError(err?.message || "Failed to create semester");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (sem: Semester) => {
    try {
      const res = await updateSemesterAction(sem.id, { is_active: !sem.is_active });
      if (res.success && res.data) {
        const updated = res.data;
        setSemesters(semesters.map((s) => (s.id === sem.id ? updated : s)));
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
            Semester Management
          </h1>
          <p className="text-xs text-diu-slate">
            Configure academic semesters and define active registration terms.
          </p>
        </div>

        <Button onClick={() => setShowCreateModal(true)} size="sm" className="gap-1.5 font-medium">
          <PlusCircle className="w-4 h-4" />
          Create Semester
        </Button>
      </div>

      {/* CREATE MODAL / FORM */}
      {showCreateModal && (
        <Card className="border border-diu-blue/30 shadow-md bg-white">
          <CardHeader className="bg-blue-50/50 pb-3 border-b border-slate-100">
            <CardTitle className="text-base text-diu-navy">Create New Academic Semester</CardTitle>
          </CardHeader>
          <form onSubmit={handleCreate}>
            <CardContent className="pt-4 space-y-4">
              {error && (
                <div className="p-3 rounded bg-red-50 text-red-700 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  <span>{error}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="semName" className="text-xs font-semibold">
                    Semester Name (e.g. Summer 2026, Fall 2026) *
                  </Label>
                  <Input
                    id="semName"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="Fall 2026"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="acadYear" className="text-xs font-semibold">
                    Academic Year *
                  </Label>
                  <Input
                    id="acadYear"
                    value={academicYear}
                    onChange={(e) => setAcademicYear(e.target.value)}
                    required
                    placeholder="2026-2027"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="startDate" className="text-xs font-semibold">
                    Start Date *
                  </Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="endDate" className="text-xs font-semibold">
                    End Date *
                  </Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCreateModal(false)}
                  className="w-full sm:w-auto h-11 sm:h-9 text-xs"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading} size="sm" className="w-full sm:w-auto h-11 sm:h-9 text-xs">
                  {loading ? "Creating..." : "Save Semester"}
                </Button>
              </div>
            </CardContent>
          </form>
        </Card>
      )}

      {/* SEMESTERS LIST */}
      <Card className="border border-slate-200 shadow-sm bg-white overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-3.5">Semester Name</th>
                <th className="p-3.5">Academic Year</th>
                <th className="p-3.5">Term Dates</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {semesters.map((sem) => (
                <tr key={sem.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3.5 font-semibold text-diu-navy">{sem.name}</td>
                  <td className="p-3.5 text-slate-600">{sem.academic_year}</td>
                  <td className="p-3.5 text-slate-600">
                    {formatDateOnly(sem.start_date)} — {formatDateOnly(sem.end_date)}
                  </td>
                  <td className="p-3.5">
                    {sem.is_active ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        <CheckCircle className="w-3 h-3" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        <XCircle className="w-3 h-3" />
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="p-3.5 text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleActive(sem)}
                      className="text-xs text-diu-blue"
                    >
                      {sem.is_active ? "Deactivate" : "Activate"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Responsive Cards View */}
        <div className="md:hidden divide-y divide-slate-100">
          {semesters.map((sem) => (
            <div key={sem.id} className="p-4 space-y-2.5 bg-white">
              <div className="flex justify-between items-start gap-2">
                <div>
                  <h3 className="font-bold text-sm text-diu-navy">{sem.name}</h3>
                  <span className="text-xs text-slate-500">Year: {sem.academic_year}</span>
                </div>
                {sem.is_active ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    <CheckCircle className="w-3 h-3" />
                    Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                    <XCircle className="w-3 h-3" />
                    Inactive
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded border border-slate-100">
                Term: {formatDateOnly(sem.start_date)} — {formatDateOnly(sem.end_date)}
              </p>

              <div className="pt-1 flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleToggleActive(sem)}
                  className="w-full text-xs h-9 font-medium"
                >
                  {sem.is_active ? "Deactivate Semester" : "Activate Semester"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
