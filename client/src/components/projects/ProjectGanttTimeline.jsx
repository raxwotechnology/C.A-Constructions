import React from 'react';
import { Calendar, CheckCircle, Clock } from 'lucide-react';

export default function ProjectGanttTimeline() {
  const milestones = [
    { phase: 'Phase 01: Earthwork & Excavation', start: 'Month 01', end: 'Month 02', progress: 100, status: 'Completed', color: 'from-emerald-500 to-teal-500' },
    { phase: 'Phase 02: Column Footings & Substructure', start: 'Month 02', end: 'Month 04', progress: 90, status: 'Active', color: 'from-orange-500 to-amber-500' },
    { phase: 'Phase 03: Superstructure Beam & Slab', start: 'Month 04', end: 'Month 07', progress: 45, status: 'In Progress', color: 'from-amber-500 to-orange-600' },
    { phase: 'Phase 04: MEP Electrical & Plumbing Fit-out', start: 'Month 07', end: 'Month 09', progress: 10, status: 'Upcoming', color: 'from-purple-500 to-pink-500' },
    { phase: 'Phase 05: Plastering, Painting & Handover', start: 'Month 09', end: 'Month 12', progress: 0, status: 'Scheduled', color: 'from-slate-400 to-slate-500' },
  ];

  return (
    <div className="bg-white text-slate-800 p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
      <div className="flex justify-between items-center border-b border-slate-100 pb-3">
        <div>
          <span className="text-xs font-bold text-orange-600 uppercase">PROJECT TIMELINE</span>
          <h2 className="text-lg font-bold text-slate-900">Gantt Milestone Progress Chart</h2>
        </div>
      </div>

      <div className="space-y-4">
        {milestones.map((m, idx) => (
          <div key={idx} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-800">{m.phase}</span>
              <span className="text-slate-500 font-mono">{m.start} → {m.end}</span>
            </div>
            <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden">
              <div
                className={`h-full bg-gradient-to-r ${m.color} rounded-full transition-all duration-500`}
                style={{ width: `${m.progress}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-[11px] text-slate-500">
              <span>Status: <b className="text-orange-600 font-semibold">{m.status}</b></span>
              <span className="font-bold text-emerald-700 font-mono">{m.progress}% Complete</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
