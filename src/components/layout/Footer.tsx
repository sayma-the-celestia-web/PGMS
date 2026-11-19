import React from "react";
import Link from "next/link";
import { GraduationCap, ShieldCheck, Mail, MapPin, Globe, ExternalLink } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-diu-navy text-white pt-12 pb-8 border-t border-slate-800">
      <div className="container max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-slate-700/60">
          {/* Col 1: Brand & Department info */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-diu-blue flex items-center justify-center text-white">
                <GraduationCap className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-lg text-white">
                  PGMS — Software Engineering
                </h3>
                <p className="text-xs text-slate-300">
                  Presentation Group Management System
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-300 max-w-md leading-relaxed">
              An official academic registration utility built for students and faculty of the
              Department of Software Engineering at Daffodil International University.
              Streamlining group formations, capacity compliance, and team directories.
            </p>

            <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 px-3 py-2 rounded-lg max-w-md">
              <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>
                Privacy First: Student IDs &amp; private references are never displayed publicly.
              </span>
            </div>
          </div>

          {/* Col 2: Navigation */}
          <div>
            <h4 className="font-semibold text-sm uppercase tracking-wider text-slate-200 mb-3">
              Quick Links
            </h4>
            <ul className="space-y-2 text-sm text-slate-300">
              <li>
                <Link href="/" className="hover:text-white transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/courses" className="hover:text-white transition-colors">
                  Explore Teams
                </Link>
              </li>
              <li>
                <Link href="/manage" className="hover:text-white transition-colors">
                  Team Login
                </Link>
              </li>
              <li>
                <Link href="/register-team" className="hover:text-white transition-colors">
                  Register Team
                </Link>
              </li>
              <li>
                <Link href="/superadmin/login" className="hover:text-emerald-400 text-slate-400 transition-colors">
                  Superadmin Portal
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: University Info */}
          <div>
            <h4 className="font-semibold text-sm uppercase tracking-wider text-slate-200 mb-3">
              Daffodil International University
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-300">
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-diu-accent shrink-0 mt-0.5" />
                <span>Daffodil Smart City (DSC), Birulia, Savar, Dhaka-1216</span>
              </li>
              <li className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-diu-accent shrink-0" />
                <a
                  href="https://daffodilvarsity.edu.bd/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline flex items-center gap-1 text-slate-200"
                >
                  daffodilvarsity.edu.bd
                  <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-diu-accent shrink-0" />
                <span>sweoffice@daffodilvarsity.edu.bd</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-6 flex flex-col sm:flex-row justify-between items-center text-xs text-slate-400 gap-2">
          <p>
            &copy; {new Date().getFullYear()} Department of Software Engineering, Daffodil
            International University. All rights reserved.
          </p>
          <p className="text-slate-400">
            Presentation Group Management System v1.3 • Next.js &amp; PostgreSQL
          </p>
        </div>
      </div>
    </footer>
  );
}
