import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  BarChart3,
  Download,
  FolderKanban,
  Users2,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';

export default function Reports() {
  const [projectsReport, setProjectsReport] = useState([]);
  const [workloadReport, setWorkloadReport] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadReports = async () => {
    setLoading(true);
    try {
      const [projRes, workRes] = await Promise.all([
        api.reports.getProjectsReport(),
        api.reports.getTeamWorkloadReport(),
      ]);

      if (projRes.success) setProjectsReport(projRes.projects_report || []);
      if (workRes.success) setWorkloadReport(workRes.workload_report || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const handleExportCsv = () => {
    window.location.href = api.reports.downloadCsvUrl();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-zinc-900" />
            <h1 className="text-2xl font-bold text-zinc-900 font-heading tracking-tight">
              Reports & Analytics
            </h1>
          </div>
          <p className="text-sm text-zinc-500 mt-1">
            Exportable analytics on project velocity, team workloads, and delivery milestones.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={loadReports}
            className="p-2.5 text-zinc-600 hover:text-zinc-900 bg-white border border-zinc-200 rounded-xl hover:bg-zinc-100 transition-colors shadow-2xs"
            title="Refresh reports"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={handleExportCsv}
            className="px-4 py-2.5 bg-zinc-900 hover:bg-black text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>Export Tasks (CSV)</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-24 text-center text-zinc-400 text-sm">Generating reports...</div>
      ) : (
        <div className="space-y-6">
          {/* Table 1: Projects Progress Report */}
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between bg-zinc-100">
              <div className="flex items-center gap-2">
                <FolderKanban className="w-4 h-4 text-zinc-900" />
                <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider font-heading">
                  Project Delivery Progress Matrix
                </h3>
              </div>
              <span className="text-[11px] text-zinc-500 font-medium">
                {projectsReport.length} Initiatives Active
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-semibold text-[10px] uppercase">
                  <tr>
                    <th className="px-5 py-3">Project</th>
                    <th className="px-5 py-3">Manager</th>
                    <th className="px-5 py-3">Team</th>
                    <th className="px-5 py-3 text-center">Tasks</th>
                    <th className="px-5 py-3 text-center">Completed</th>
                    <th className="px-5 py-3 text-center">In Progress</th>
                    <th className="px-5 py-3 text-center">Overdue</th>
                    <th className="px-5 py-3">Completion Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {projectsReport.map((p) => (
                    <tr key={p.id} className="hover:bg-zinc-50 transition-colors">
                      <td className="px-5 py-3.5 font-bold text-zinc-900">{p.name}</td>
                      <td className="px-5 py-3.5 text-zinc-600">{p.manager_name}</td>
                      <td className="px-5 py-3.5 text-zinc-600">{p.team_name}</td>
                      <td className="px-5 py-3.5 text-center font-bold text-zinc-800">{p.total_tasks}</td>
                      <td className="px-5 py-3.5 text-center font-bold text-emerald-600">{p.completed_tasks}</td>
                      <td className="px-5 py-3.5 text-center font-bold text-blue-600">{p.in_progress_tasks}</td>
                      <td className="px-5 py-3.5 text-center font-bold text-red-600">
                        {p.overdue_tasks > 0 ? (
                          <span className="inline-flex items-center gap-1 bg-red-600 text-white px-2 py-0.5 rounded text-[10px]">
                            {p.overdue_tasks}
                          </span>
                        ) : (
                          '0'
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-zinc-100 rounded-full overflow-hidden">
                            <div
                              style={{ width: `${p.progress_percentage}%` }}
                              className="h-full bg-zinc-900 rounded-full"
                            />
                          </div>
                          <span className="font-bold text-zinc-800 text-[11px]">
                            {p.progress_percentage}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Table 2: Team Workload & Velocity Matrix */}
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between bg-zinc-100">
              <div className="flex items-center gap-2">
                <Users2 className="w-4 h-4 text-zinc-900" />
                <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider font-heading">
                  Member Workload & Velocity Matrix
                </h3>
              </div>
              <span className="text-[11px] text-zinc-500 font-medium">
                {workloadReport.length} Members
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-semibold text-[10px] uppercase">
                  <tr>
                    <th className="px-5 py-3">Team Member</th>
                    <th className="px-5 py-3">Role</th>
                    <th className="px-5 py-3 text-center">Assigned Tasks</th>
                    <th className="px-5 py-3 text-center">In Progress</th>
                    <th className="px-5 py-3 text-center">Completed</th>
                    <th className="px-5 py-3 text-center">Overdue</th>
                    <th className="px-5 py-3">Velocity & Completion</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {workloadReport.map((m) => (
                    <tr key={m.user_id} className="hover:bg-zinc-50 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-brand-100 text-brand-700 font-bold text-xs flex items-center justify-center">
                            {m.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{m.name}</p>
                            <p className="text-[10px] text-slate-400">{m.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 capitalize font-medium text-slate-600">
                        {m.role.replace('_', ' ')}
                      </td>
                      <td className="px-5 py-3.5 text-center font-bold text-slate-800">{m.total_tasks}</td>
                      <td className="px-5 py-3.5 text-center font-bold text-blue-600">{m.in_progress_tasks}</td>
                      <td className="px-5 py-3.5 text-center font-bold text-emerald-600">{m.completed_tasks}</td>
                      <td className="px-5 py-3.5 text-center font-bold text-red-600">
                        {m.overdue_tasks > 0 ? (
                          <span className="bg-red-100 px-2 py-0.5 rounded-full text-[10px]">
                            {m.overdue_tasks}
                          </span>
                        ) : (
                          '0'
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              style={{ width: `${m.completion_rate}%` }}
                              className="h-full bg-emerald-500 rounded-full"
                            />
                          </div>
                          <span className="font-bold text-slate-800 text-[11px]">
                            {m.completion_rate}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
