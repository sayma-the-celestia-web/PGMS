"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { GraduationCap, KeyRound, BookOpen, Menu, X, Shield, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  // If in superadmin subpages, hide the public navbar (admin has its own sidebar/header)
  if (pathname.startsWith("/superadmin") && pathname !== "/superadmin/login") {
    return null;
  }

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/courses", label: "Courses & Teams" },
    { href: "/register-team", label: "Register Team", icon: UserPlus },
    { href: "/manage", label: "Team Login", icon: KeyRound },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/95 backdrop-blur-md">
      {/* Top institution bar */}
      <div className="bg-diu-navy text-white text-[11px] sm:text-xs py-1.5 px-3 sm:px-4">
        <div className="container max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-1.5 sm:space-x-2 truncate">
            <span className="font-semibold tracking-wide truncate">DAFFODIL INTERNATIONAL UNIVERSITY</span>
            <span className="text-slate-400 hidden xs:inline">|</span>
            <span className="text-slate-200 hidden sm:inline truncate">Dept. of Software Engineering</span>
          </div>
          <span className="text-[10px] text-blue-200 font-mono hidden md:inline shrink-0">DIU SWE</span>
        </div>
      </div>

      {/* Main navigation */}
      <div className="container max-w-7xl mx-auto flex h-14 sm:h-16 items-center justify-between px-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5 sm:gap-3 group min-w-0">
          <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg bg-diu-blue flex items-center justify-center text-white shadow-sm group-hover:bg-diu-navy transition-colors shrink-0">
            <GraduationCap className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-heading font-bold text-lg sm:text-xl text-diu-navy tracking-tight">
                PGMS
              </span>
              <span className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider bg-blue-50 text-diu-blue px-1.5 py-0.2 rounded border border-blue-200">
                SWE
              </span>
            </div>
            <span className="text-[11px] text-diu-slate hidden sm:inline-block truncate">
              Presentation Group Management System
            </span>
          </div>
        </Link>

        {/* Desktop nav links */}
        <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
          {navLinks.map((link) => {
            const isActive =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href) && !link.href.includes("#");

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  isActive
                    ? "text-diu-blue bg-blue-50/80 font-semibold"
                    : "text-diu-text hover:text-diu-blue hover:bg-slate-50"
                }`}
              >
                {link.icon && <link.icon className="w-4 h-4 text-diu-blue" />}
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Action button */}
        <div className="hidden md:flex items-center gap-2.5">
          <Link href="/courses">
            <Button variant="outline" size="sm" className="gap-1.5 font-medium text-xs">
              <BookOpen className="w-3.5 h-3.5" />
              Courses
            </Button>
          </Link>
          <Link href="/register-team">
            <Button variant="default" size="sm" className="gap-1.5 shadow-sm font-semibold text-xs bg-diu-blue hover:bg-diu-navy">
              <UserPlus className="w-3.5 h-3.5" />
              Register Team
            </Button>
          </Link>
        </div>

        {/* Mobile menu toggle */}
        <div className="md:hidden flex items-center gap-1.5">
          <Link href="/register-team" className="sm:hidden">
            <Button size="sm" className="h-8 px-2.5 text-[11px] bg-diu-blue hover:bg-diu-navy font-semibold gap-1">
              <UserPlus className="w-3 h-3" />
              Register
            </Button>
          </Link>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
            className="p-2 rounded-lg text-slate-700 hover:text-diu-blue hover:bg-slate-100 active:bg-slate-200 transition-colors"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-200 bg-white/98 backdrop-blur-lg px-4 pt-3 pb-6 space-y-2 animate-in slide-in-from-top-2 shadow-lg">
          <div className="space-y-1">
            {navLinks.map((link) => {
              const isActive =
                link.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(link.href) && !link.href.includes("#");

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-3 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "text-diu-blue bg-blue-50 font-bold"
                      : "text-slate-800 hover:text-diu-blue hover:bg-slate-50"
                  }`}
                >
                  {link.icon ? (
                    <link.icon className="w-4 h-4 text-diu-blue shrink-0" />
                  ) : (
                    <BookOpen className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </div>

          <div className="pt-3 border-t border-slate-100 flex flex-col gap-2.5">
            <Link href="/register-team" onClick={() => setMobileMenuOpen(false)}>
              <Button className="w-full h-11 bg-diu-blue hover:bg-diu-navy font-semibold text-xs gap-2 shadow-sm">
                <UserPlus className="w-4 h-4" />
                Register New Team
              </Button>
            </Link>
            <div className="grid grid-cols-2 gap-2">
              <Link href="/courses" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="outline" className="w-full h-10 text-xs gap-1.5 font-medium">
                  <BookOpen className="w-3.5 h-3.5 text-slate-500" />
                  Explore Teams
                </Button>
              </Link>
              <Link href="/manage" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="outline" className="w-full h-10 text-xs gap-1.5 font-medium border-diu-blue/40 text-diu-blue">
                  <KeyRound className="w-3.5 h-3.5" />
                  Team Login
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
