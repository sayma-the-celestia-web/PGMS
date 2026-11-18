import React from "react";
import { ManageClient } from "./manage-client";
import { KeyRound, ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Team Login & Management | PGMS DIU",
  description: "Team leader management console for presentation teams, slide uploads, and join requests.",
};

export default function ManagePage() {
  return (
    <div className="py-10 md:py-14">
      <div className="container max-w-4xl mx-auto px-4 sm:px-6 space-y-8">
        <div className="space-y-2 text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs font-semibold text-diu-blue uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Team Leader Portal</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-diu-navy font-heading">
            Team Login &amp; Management
          </h1>
          <p className="text-sm text-diu-slate">
            Login with your Team Leader Name and Student ID (252-35-242) to edit your team name, upload presentation slides, and manage member requests.
          </p>
        </div>

        <ManageClient />
      </div>
    </div>
  );
}
