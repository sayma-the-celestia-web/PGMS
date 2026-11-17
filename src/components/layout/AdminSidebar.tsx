"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  BookOpen,
  Layers,
  Users,
  GraduationCap,
  FileSpreadsheet,
  History,
  Settings,
  LogOut,
  ExternalLink,
  Shield,
} from "lucide-react";
import { superadminLogoutAction } from "@/lib/actions";

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === "/superadmin/login") {
    return null;
  }

  const navItems = [
    { href: "/superadmin", label: "Overview", icon: LayoutDashboard },
    { href: "/superadmin/semesters", label: "Semesters", icon: Calendar },
    { href: "/superadmin/courses", label: "Courses", icon: BookOpen },
    { href: "/superadmin/registrations", label: "Course Offerings", icon: Layers },
    { href: "/superadmin/teams", label: "Teams Management", icon: Users },
    { href: "/superadmin/students", label: "Students Registry", icon: GraduationCap },
    { href: "/superadmin/exports", label: "Excel Exports", icon: FileSpreadsheet },
    { href: "/superadmin/audit-logs", label: "Audit Logs", icon: History },
  ];

  const handleLogout = async () => {
    await superadminLogoutAction();
    router.push("/superadmin/login");
    router.refresh();
  };

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 min-h-screen border-r border-slate-800">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800 bg-slate-950/60">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-diu-blue flex items-center justify-center text-white">
            <Shield className="h-4 w-4" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-sm text-white tracking-tight">
              PGMS Superadmin
            </h2>
            <p className="text-[10px] text-slate-400">DIU Software Engineering</p>
          </div>
        </div>
      </div>

      {/* Nav List */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider px-3 pt-3 pb-1">
          Academic Administration
        </div>

        {navItems.map((item) => {
          const isActive =
            item.href === "/superadmin"
              ? pathname === "/superadmin"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                isActive
                  ? "bg-diu-blue text-white shadow-sm font-semibold"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}

        <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider px-3 pt-6 pb-1">
          External Navigation
        </div>
        <Link
          href="/"
          target="_blank"
          className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
        >
          <span className="flex items-center gap-2.5">
            <ExternalLink className="w-4 h-4 shrink-0" />
            Public Website
          </span>
          <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">
            Open
          </span>
        </Link>
      </nav>

      {/* Admin Profile & Logout */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/40 space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-diu-blue/30 text-diu-accent border border-diu-blue/40 flex items-center justify-center text-xs font-bold">
            SA
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-semibold text-white truncate">Superadmin</p>
            <p className="text-[10px] text-slate-400 truncate">sweadmin@daffodilvarsity.edu.bd</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-1.5 px-3 rounded-md bg-slate-800 hover:bg-red-950/60 hover:text-red-300 text-slate-300 text-xs font-medium transition-colors border border-slate-700/60"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
