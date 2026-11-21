"use client";

import React, { useState } from "react";
import { Course } from "@/types";
import {
  createCourseAction,
  updateCourseAction,
  deleteCourseAction,
} from "@/lib/actions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  PlusCircle,
  BookOpen,
  AlertTriangle,
  Trash2,
  Edit2,
  CheckCircle,
} from "lucide-react";

interface Props {
  initialCourses: Course[];
}

export function CoursesClient({ initialCourses }: Props) {
  const [courses, setCourses] = useState<Course[]>(initialCourses);
  const [showModal, setShowModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);

  // Form states for creation
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [slug, setSlug] = useState("");

  // Form states for editing
  const [editCode, setEditCode] = useState("");
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editSlug, setEditSlug] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCode(val);
    setSlug(val.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-"));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const res = await createCourseAction({
        code,
        name,
        description,
        slug,
      });

      if (!res.success || !res.data) {
        setError(res.error || "Failed to create course");
      } else {
        setCourses([res.data, ...courses]);
        setShowModal(false);
        setCode("");
        setName("");
        setDescription("");
        setSlug("");
        setSuccess(`Course "${res.data.code} — ${res.data.name}" created successfully.`);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to create course");
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (c: Course) => {
    setEditingCourse(c);
    setEditCode(c.code);
    setEditName(c.name);
    setEditSlug(c.slug);
    setEditDescription(c.description || "");
    setError(null);
    setSuccess(null);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCourse) return;
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const res = await updateCourseAction(editingCourse.id, {
        code: editCode,
        name: editName,
        slug: editSlug,
        description: editDescription,
      });

      if (!res.success || !res.data) {
        setError(res.error || "Failed to update course");
      } else {
        setCourses(courses.map((c) => (c.id === editingCourse.id ? res.data! : c)));
        setEditingCourse(null);
        setSuccess(`Course "${res.data.code}" updated successfully.`);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to update course");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCourse = async (courseId: string, courseCode: string) => {
    if (
      !confirm(
        `Are you sure you want to permanently delete course "${courseCode}"?\n\nThis will remove the course and all associated section offerings, teams, and registrations.`
      )
    ) {
      return;
    }
    setError(null);
    setSuccess(null);
    try {
      const res = await deleteCourseAction(courseId);
      if (res.success) {
        setCourses((prev) => prev.filter((c) => c.id !== courseId));
        setSuccess(`Course "${courseCode}" and its offerings were permanently deleted.`);
      } else {
        setError("Failed to delete course.");
      }
    } catch (err: any) {
      setError(err?.message || "Failed to delete course.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-diu-navy font-heading">
            Course Catalog
          </h1>
          <p className="text-xs text-diu-slate">
            Full CRUD management of academic courses in the Department of Software Engineering.
          </p>
        </div>

        <Button onClick={() => setShowModal(true)} size="sm" className="gap-1.5 font-medium bg-diu-blue hover:bg-diu-navy text-white text-xs">
          <PlusCircle className="w-4 h-4" />
          Add Course
        </Button>
      </div>

      {success && (
        <div className="p-3 rounded-lg bg-emerald-50 text-emerald-800 text-xs flex items-center justify-between border border-emerald-200">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess(null)} className="text-slate-400 hover:text-slate-600 text-base">
            &times;
          </button>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-lg bg-red-50 text-red-800 text-xs flex items-center justify-between border border-red-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-slate-400 hover:text-slate-600 text-base">
            &times;
          </button>
        </div>
      )}

      {/* CREATE COURSE MODAL */}
      {showModal && (
        <Card className="border border-diu-blue/30 shadow-lg bg-white">
          <CardHeader className="bg-slate-50 border-b border-slate-100 pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base text-diu-navy flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-diu-blue" />
              Add Academic Course
            </CardTitle>
            <button
              onClick={() => setShowModal(false)}
              className="text-slate-400 hover:text-slate-600 text-lg leading-none"
            >
              &times;
            </button>
          </CardHeader>
          <form onSubmit={handleCreate}>
            <CardContent className="pt-4 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Course Code *</Label>
                  <Input
                    placeholder="e.g. SE214"
                    value={code}
                    onChange={handleCodeChange}
                    required
                    className="text-xs font-mono uppercase"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Course Slug *</Label>
                  <Input
                    placeholder="se214"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    required
                    className="text-xs font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Course Name *</Label>
                <Input
                  placeholder="e.g. Algorithm Design and Analysis"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Description (Optional)</Label>
                <textarea
                  placeholder="Course outline, syllabus, and objectives..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-md text-xs text-slate-700"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading} size="sm" className="bg-diu-blue hover:bg-diu-navy text-white">
                  {loading ? "Creating..." : "Create Course"}
                </Button>
              </div>
            </CardContent>
          </form>
        </Card>
      )}

      {/* EDIT COURSE MODAL */}
      {editingCourse && (
        <Card className="border border-diu-blue shadow-lg bg-white">
          <CardHeader className="bg-blue-50/50 border-b border-slate-100 pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base text-diu-navy flex items-center gap-2">
              <Edit2 className="w-4 h-4 text-diu-blue" />
              Edit Course: {editingCourse.code}
            </CardTitle>
            <button
              onClick={() => setEditingCourse(null)}
              className="text-slate-400 hover:text-slate-600 text-lg leading-none"
            >
              &times;
            </button>
          </CardHeader>
          <form onSubmit={handleUpdate}>
            <CardContent className="pt-4 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Course Code *</Label>
                  <Input
                    value={editCode}
                    onChange={(e) => setEditCode(e.target.value)}
                    required
                    className="text-xs font-mono uppercase"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Course Slug *</Label>
                  <Input
                    value={editSlug}
                    onChange={(e) => setEditSlug(e.target.value)}
                    required
                    className="text-xs font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Course Name *</Label>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Description</Label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-md text-xs text-slate-700"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingCourse(null)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading} size="sm" className="bg-diu-blue hover:bg-diu-navy text-white">
                  {loading ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </CardContent>
          </form>
        </Card>
      )}

      {/* COURSES TABLE */}
      <Card className="border border-slate-200 shadow-sm bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-3.5">Course Code</th>
                <th className="p-3.5">Course Name</th>
                <th className="p-3.5">Slug</th>
                <th className="p-3.5">Description</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {courses.map((course) => (
                <tr key={course.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3.5 font-bold text-diu-navy font-mono">{course.code}</td>
                  <td className="p-3.5 font-medium text-slate-800">{course.name}</td>
                  <td className="p-3.5 text-slate-500 font-mono">{course.slug}</td>
                  <td className="p-3.5 text-slate-500 max-w-xs truncate">
                    {course.description || "N/A"}
                  </td>
                  <td className="p-3.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditModal(course)}
                        className="text-slate-700 border-slate-200 hover:bg-slate-100 text-xs h-7 px-2.5 gap-1"
                        title="Edit Course"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteCourse(course.id, course.code)}
                        className="text-red-600 border-red-200 hover:bg-red-50 text-xs h-7 px-2.5 gap-1"
                        title="Remove Course"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Remove
                      </Button>
                    </div>
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
