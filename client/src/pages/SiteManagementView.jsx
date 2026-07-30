import React, { useState } from 'react';
import { HardHat, ClipboardList, Truck, ShieldAlert, Sun, Plus } from 'lucide-react';
import { EXPENSE_CATEGORIES } from '../config/categories';

export default function SiteManagementView() {
  const [activeSubView, setActiveSubView] = useState('dsr');

  const attendance = [
    { type: 'Mason (Skilled)', count: 12, regHours: 8, otHours: 2 },
    { type: 'Helper (Unskilled)', count: 24, regHours: 8, otHours: 3 },
    { type: 'Bar Bender (Skilled)', count: 6, regHours: 8, otHours: 1.5 },
    { type: 'Carpenter (Skilled)', count: 8, regHours: 8, otHours: 2 },
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-800/60 backdrop-blur-xl border border-slate-700/50 p-6 rounded-2xl shadow-xl">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            Site Management & Daily Site Report (DSR)
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Labour Attendance, Material Requisitions (MR), Machinery Tracking & HSE Safety Incident Logs
          </p>
        </div>
        <button className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-semibold px-4 py-2.5 rounded-xl shadow-lg transition-all text-sm">
          <Plus size={18} />
          Submit Daily Diary (DSR)
        </button>
      </div>

      {/* Sub Tabs */}
      <div className="flex border-b border-slate-700/60 gap-4 text-sm font-medium">
        {['dsr', 'labour', 'mr', 'hse'].map((v) => (
          <button
            key={v}
            onClick={() => setActiveSubView(v)}
            className={`pb-3 px-2 border-b-2 capitalize transition-colors ${
              activeSubView === v
                ? 'border-cyan-400 text-cyan-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {v === 'dsr' && 'Daily Site Diary (DSR)'}
            {v === 'labour' && 'Labour Attendance'}
            {v === 'mr' && 'Material Requisitions (MR)'}
            {v === 'hse' && 'HSE Safety Incidents'}
          </button>
        ))}
      </div>

      {/* Daily Site Report Overview */}
      {activeSubView === 'dsr' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-slate-800/50 backdrop-blur-lg border border-slate-700/50 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
              <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
                <ClipboardList size={20} className="text-cyan-400" />
                Today's Site Progress Log (DSR-2026-0730)
              </h2>
              <span className="flex items-center gap-1 text-xs text-amber-400 font-semibold bg-amber-950/60 px-3 py-1 rounded-full border border-amber-800">
                <Sun size={14} /> Sunny (31°C)
              </span>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-semibold uppercase text-slate-400">Work Completed Summary:</label>
              <p className="text-sm bg-slate-900/60 p-4 rounded-xl text-slate-200 leading-relaxed border border-slate-700/50">
                Completed Grade 30 concrete pouring for 1st floor beam section B2-B5 (Total 18m3 poured). Installed column shuttering for 2nd floor columns C1-C6. Received 150 bags of Tokyo Super Cement via GRN-489.
              </p>
            </div>

            <div className="pt-2">
              <h3 className="text-sm font-semibold text-slate-300 mb-2">Daily Labour Breakdown</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {attendance.map((a, i) => (
                  <div key={i} className="bg-slate-900/60 p-3 rounded-xl border border-slate-700/40 text-center">
                    <div className="text-xl font-bold text-cyan-400">{a.count}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{a.type}</div>
                    <div className="text-[10px] text-slate-500 mt-1">OT: {a.otHours} hrs</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-lg border border-slate-700/50 rounded-2xl p-6 shadow-xl space-y-4">
            <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
              <ShieldAlert size={20} className="text-emerald-400" />
              HSE Site Safety Log
            </h2>
            <div className="bg-emerald-950/40 border border-emerald-800/50 p-4 rounded-xl text-xs text-emerald-300 space-y-1">
              <div className="font-bold">Zero Accidents Reported Today</div>
              <p className="text-slate-400">100% Safety Helmet & Harness Compliance verified during morning toolbox talk.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
