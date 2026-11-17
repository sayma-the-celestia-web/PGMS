"use client";

import React, { useState } from "react";
import { Course } from "@/types";
import { createCourseAction } from "@/lib/actions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle, BookOpen, AlertTriangle } from "lucide-react";

interface Props {
  initialCourses: Course[];
}

export function CoursesClient({ initialCourses }: Props) {
  const [courses, setCourses] = useState<Course[]>(initialCourses);
  const [showModal, setShowModal] = useState(false);

  // Form
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [slug, setSlug] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCode(val);
    // Auto generate slug
    setSlug(val.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-"));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
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
      }
    } catch (err: any) {
      setError(err?.message || "Failed to create course");
    } finally {
      setLoading(false);
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
            Manage academic courses in the Department of Software Engineering.
          </p>
        </div>

        <Button onClick={() => setShowModal(true)} size="sm" className="gap-1.5 font-medium">
          <PlusCircle className="w-4 h-4" />
          Add Course
        </Button>
      </div>

      {showModal && (
        <Card className="border border-diu-blue/30 shadow-md bg-white">
          <CardHeader className="bg-blue-50/50 pb-3 border-b border-slate-100">
            <CardTitle className="text-base text-diu-navy">Add Academic Course</CardTitle>
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
                  <Label htmlFor="code" className="text-xs font-semibold">
                    Course Code (e.g. SWE 411) *
                  </Label>
                  <Input
                    id="code"
                    value={code}
                    onChange={handleCodeChange}
                    required
                    placeholder="SWE 411"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="slug" className="text-xs font-semibold">
                    URL Slug (e.g. swe-411) *
                  </Label>
                  <Input
                    id="slug"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    required
                    placeholder="swe-411"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="courseName" className="text-xs font-semibold">
                  Course Name *
                </Label>
                <Input
                  id="courseName"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Software Architecture and Design"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="desc" className="text-xs font-semibold">
                  Description
                </Label>
                <Input
                  id="desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Course presentation and group formation objectives..."
                />
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
                  {loading ? "Adding..." : "Save Course"}
                </Button>
              </div>
            </CardContent>
          </form>
        </Card>
      )}

      <Card className="border border-slate-200 shadow-sm bg-white overflow-hidden">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200">
            <tr>
              <th className="p-3.5">Course Code</th>
              <th className="p-3.5">Course Name</th>
              <th className="p-3.5">Slug</th>
              <th className="p-3.5">Description</th>
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
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
