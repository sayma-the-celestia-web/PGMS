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
        <div className="overflow-x-auto">
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
      </Card>
    </div>
  );
}
