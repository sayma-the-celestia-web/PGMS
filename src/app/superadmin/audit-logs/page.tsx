import React from "react";
import { DataService } from "@/lib/services/data-service";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { History, Shield } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Audit Logs | PGMS Superadmin",
};

export default async function AuditLogsPage() {
  const logs = await DataService.getAuditLogs(100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-diu-navy font-heading">
          Administrative Audit Logs
        </h1>
        <p className="text-xs text-diu-slate">
          Immutable history of administrative actions, course adjustments, and data modifications.
        </p>
      </div>

      <Card className="border border-slate-200 shadow-sm bg-white overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-3.5">Timestamp</th>
                <th className="p-3.5">Action</th>
                <th className="p-3.5">Target Type</th>
                <th className="p-3.5">Target ID</th>
                <th className="p-3.5">Actor</th>
                <th className="p-3.5">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3.5 text-slate-500 whitespace-nowrap">
                    {formatDate(log.created_at)}
                  </td>
                  <td className="p-3.5 font-bold text-diu-navy">{log.action}</td>
                  <td className="p-3.5 text-slate-700">{log.target_type}</td>
                  <td className="p-3.5 text-slate-500 truncate max-w-[120px]">
                    {log.target_id || "N/A"}
                  </td>
                  <td className="p-3.5 text-slate-600">{log.actor_email}</td>
                  <td className="p-3.5 text-slate-500 font-sans max-w-xs truncate">
                    {JSON.stringify(log.details)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card Feed */}
        <div className="md:hidden divide-y divide-slate-100">
          {logs.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">
              No audit logs recorded yet.
            </div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="p-4 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-diu-blue border border-blue-200">
                    {log.action}
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {formatDate(log.created_at)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Target</span>
                    <span className="font-semibold text-slate-800 font-mono">
                      {log.target_type} {log.target_id ? `(#${log.target_id})` : ""}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Actor</span>
                    <span className="text-slate-700 truncate block">
                      {log.actor_email}
                    </span>
                  </div>
                </div>

                {log.details && Object.keys(log.details).length > 0 && (
                  <div className="p-2.5 rounded bg-slate-50 border border-slate-100 font-mono text-[11px] text-slate-600 break-all">
                    {JSON.stringify(log.details)}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
