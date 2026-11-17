import React from "react";
import { ManageClient } from "./manage-client";
import { KeyRound } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Private Reference Manager | PGMS DIU",
  description: "Secure self-service portal to manage presentation groups and team memberships.",
};

export default function ManagePage() {
  return (
    <div className="py-10 md:py-14">
      <div className="container max-w-4xl mx-auto px-4 sm:px-6 space-y-8">
        <div className="space-y-2 text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs font-semibold text-diu-blue uppercase tracking-wider">
            <KeyRound className="w-3.5 h-3.5" />
            <span>Secure Student Self-Service</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-diu-navy font-heading">
            Team &amp; Registration Management
          </h1>
          <p className="text-sm text-diu-slate">
            Use your cryptographically generated reference token to modify your team roster, transfer
            leadership, or adjust your personal registration details.
          </p>
        </div>

        <ManageClient />
      </div>
    </div>
  );
}
