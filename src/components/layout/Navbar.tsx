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
      <div className="bg-diu-navy text-white text-xs py-1.5 px-4">
        <div className="container max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <span className="font-semibold tracking-wide">DAFFODIL INTERNATIONAL UNIVERSITY</span>
            <span className="text-slate-400">|</span>
            <span className="text-slate-200">Department of Software Engineering</span>
          </div>
        </div>
      </div>

      {/* Main navigation */}
      <div className="container max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="h-10 w-10 rounded-lg bg-diu-blue flex items-center justify-center text-white shadow-sm group-hover:bg-diu-navy transition-colors">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-heading font-bold text-xl text-diu-navy tracking-tight">
                PGMS
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider bg-blue-50 text-diu-blue px-2 py-0.5 rounded-full border border-blue-200">
                SWE
              </span>
            </div>
            <span className="text-xs text-diu-slate hidden sm:inline-block">
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
        <div className="md:hidden flex items-center gap-2">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
            className="p-2 rounded-md text-slate-700 hover:text-diu-blue hover:bg-slate-100"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-200 bg-white px-4 pt-2 pb-6 space-y-2 animate-in slide-in-from-top-2">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2.5 rounded-md text-base font-medium text-slate-800 hover:text-diu-blue hover:bg-slate-50"
            >
              {link.icon && <link.icon className="w-4 h-4 text-diu-blue" />}
              {link.label}
            </Link>
          ))}
          <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
            <Link href="/register-team" onClick={() => setMobileMenuOpen(false)}>
              <Button className="w-full bg-diu-blue hover:bg-diu-navy font-semibold text-xs gap-1.5">
                <UserPlus className="w-3.5 h-3.5" />
                Register New Team
              </Button>
            </Link>
            <Link href="/courses" onClick={() => setMobileMenuOpen(false)}>
              <Button variant="outline" className="w-full text-xs">
                Find Team
              </Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
