"use client";

import React, { useState } from "react";
import { Student, TeamMembership, Team } from "@/types";
import { adminUpdateStudentAction } from "@/lib/actions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/utils";
import { Search, GraduationCap, Edit2, AlertTriangle, CheckCircle } from "lucide-react";

interface StudentWithMemberships extends Student {
  active_teams_count: number;
  memberships: (TeamMembership & { team?: Team })[];
}

interface Props {
  initialStudents: StudentWithMemberships[];
}

export function StudentsClient({ initialStudents }: Props) {
  const [students, setStudents] = useState<StudentWithMemberships[]>(initialStudents);
  const [search, setSearch] = useState("");
  const [editingStudent, setEditingStudent] = useState<StudentWithMemberships | null>(null);

  const [editName, setEditName] = useState("");
  const [editId, setEditId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const filtered = students.filter((s) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return s.full_name.toLowerCase().includes(q) || s.student_id.toLowerCase().includes(q);
  });

  const openEdit = (s: StudentWithMemberships) => {
    setEditingStudent(s);
    setEditName(s.full_name);
    setEditId(s.student_id);
    setError(null);
    setSuccess(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    setError(null);
    setLoading(true);

    try {
      const res = await adminUpdateStudentAction(editingStudent.id, {
        full_name: editName,
        student_id: editId,
      });

      if (!res.success || !res.data) {
        setError(res.error || "Failed to update student");
      } else {
        setStudents(
          students.map((s) =>
            s.id === editingStudent.id
              ? { ...s, full_name: res.data.full_name, student_id: res.data.student_id }
              : s
          )
        );
        setEditingStudent(null);
        setSuccess("Student records updated successfully.");
      }
    } catch (err: any) {
      setError(err?.message || "Failed to update student");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-diu-navy font-heading">
            Student Registry &amp; Enrollments
          </h1>
          <p className="text-xs text-diu-slate">
            Search students across the department and audit presentation team enrollments.
          </p>
        </div>
      </div>

      {success && (
        <div className="p-3 rounded bg-emerald-50 text-emerald-800 text-xs flex items-center justify-between border border-emerald-200">
          <span>{success}</span>
          <button onClick={() => setSuccess(null)} className="text-slate-400 hover:text-slate-600">
            &times;
          </button>
        </div>
      )}

      {/* SEARCH BAR */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm max-w-md">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <Input
            placeholder="Search by student ID or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-xs"
          />
        </div>
      </div>

      {/* EDIT MODAL */}
      {editingStudent && (
        <Card className="border border-diu-blue/40 shadow-lg bg-white max-w-lg">
          <CardHeader className="bg-blue-50/50 pb-3 border-b border-slate-100">
            <CardTitle className="text-base text-diu-navy">
              Correct Student Academic Record
            </CardTitle>
          </CardHeader>
          <form onSubmit={handleSave}>
            <CardContent className="pt-4 space-y-4 text-xs">
              {error && (
                <div className="p-2.5 rounded bg-red-50 text-red-700 border border-red-200">
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs">Full Name</Label>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Student ID</Label>
                <Input
                  value={editId}
                  onChange={(e) => setEditId(e.target.value)}
                  required
                  className="text-xs font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingStudent(null)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading} size="sm">
                  {loading ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </CardContent>
          </form>
        </Card>
      )}

      {/* TABLE */}
      <Card className="border border-slate-200 shadow-sm bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-3.5">Student ID</th>
                <th className="p-3.5">Full Name</th>
                <th className="p-3.5">Active Teams</th>
                <th className="p-3.5">Registered On</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3.5 font-bold font-mono text-diu-navy">{s.student_id}</td>
                  <td className="p-3.5 font-medium text-slate-800">{s.full_name}</td>
                  <td className="p-3.5 text-slate-600">
                    {s.memberships.length === 0 ? (
                      <span className="text-slate-400">None</span>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {s.memberships.map((m) => (
                          <span
                            key={m.id}
                            className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-medium border border-slate-200"
                          >
                            {m.team?.team_name} ({m.role})
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="p-3.5 text-slate-500">{formatDate(s.created_at)}</td>
                  <td className="p-3.5 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(s)}
                      className="text-diu-blue text-xs h-7 px-2"
                    >
                      <Edit2 className="w-3.5 h-3.5 mr-1" />
                      Correct
                    </Button>
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
