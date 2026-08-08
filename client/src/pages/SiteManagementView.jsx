import React, { useState } from 'react';
import { HardHat, ClipboardList, Truck, ShieldAlert, Sun, Plus, CheckCircle2, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SiteManagementView() {
  const [activeSubView, setActiveSubView] = useState('dsr');
  const [showDsrModal, setShowDsrModal] = useState(false);

  const [dsrForm, setDsrForm] = useState({
    siteName: 'Lotus Luxury Villa - Colombo 07',
    weather: 'Sunny (31°C)',
    workCompleted: '',
    skilledCount: 18,
    unskilledCount: 24,
    safetyIncidents: 'Zero Accidents Reported',
  });

  const attendance = [
    { type: 'Mason (Skilled)', count: 12, regHours: 8, otHours: 2 },
    { type: 'Helper (Unskilled)', count: 24, regHours: 8, otHours: 3 },
    { type: 'Bar Bender (Skilled)', count: 6, regHours: 8, otHours: 1.5 },
    { type: 'Carpenter (Skilled)', count: 8, regHours: 8, otHours: 2 },
  ];

  const handleDsrSubmit = (e) => {
    e.preventDefault();
    if (!dsrForm.workCompleted.trim()) {
      toast.error('Please enter today\'s work completed summary!');
      return;
    }
    toast.success('Daily Site Report (DSR-2026-0730) submitted successfully!');
    setShowDsrModal(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Site Management & Daily Site Report (DSR)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Labour Attendance, Material Requisitions (MR), Machinery Tracking & HSE Safety Incident Logs
          </p>
        </div>
        <button 
          onClick={() => setShowDsrModal(true)}
          className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold px-4 py-2.5 rounded-xl shadow-sm transition-all text-sm cursor-pointer"
        >
          <Plus size={18} />
          Submit Daily Diary (DSR)
        </button>
      </div>

      {/* Sub Tabs */}
      <div className="flex border-b border-slate-200 gap-4 text-sm font-medium">
        {['dsr', 'labour', 'mr', 'hse'].map((v) => (
          <button
            key={v}
            onClick={() => setActiveSubView(v)}
            className={`pb-3 px-2 border-b-2 capitalize transition-colors ${
              activeSubView === v
                ? 'border-orange-600 text-orange-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
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
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <ClipboardList size={20} className="text-orange-600" />
                Today's Site Progress Log (DSR-2026-0730)
              </h2>
              <span className="flex items-center gap-1 text-xs text-amber-700 font-semibold bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                <Sun size={14} className="text-amber-500" /> Sunny (31°C)
              </span>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-slate-500">Work Completed Summary:</label>
              <p className="text-sm bg-slate-50 p-4 rounded-xl text-slate-700 leading-relaxed border border-slate-200">
                Completed Grade 30 concrete pouring for 1st floor beam section B2-B5 (Total 18m3 poured). Installed column shuttering for 2nd floor columns C1-C6. Received 150 bags of Tokyo Super Cement via GRN-489.
              </p>
            </div>

            <div className="pt-2">
              <h3 className="text-sm font-semibold text-slate-800 mb-3">Daily Labour Breakdown</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {attendance.map((a, i) => (
                  <div key={i} className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-center">
                    <div className="text-2xl font-bold text-orange-600">{a.count}</div>
                    <div className="text-xs font-semibold text-slate-700 mt-0.5">{a.type}</div>
                    <div className="text-[10px] text-slate-500 mt-1">OT: {a.otHours} hrs</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <ShieldAlert size={20} className="text-emerald-600" />
              HSE Site Safety Log
            </h2>
            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl text-xs text-emerald-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-emerald-700">
                <CheckCircle2 size={16} /> Zero Accidents Reported Today
              </div>
              <p className="text-slate-600 mt-1">100% Safety Helmet & Harness Compliance verified during morning toolbox talk.</p>
            </div>
          </div>
        </div>
      )}

      {/* Interactive DSR Modal */}
      {showDsrModal && (
        <div className="fixed inset-0 bg-white/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900">Submit Daily Site Report (DSR)</h3>
              <button onClick={() => setShowDsrModal(false)} className="text-slate-500 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleDsrSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Construction Site</label>
                <input
                  type="text"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800"
                  value={dsrForm.siteName}
                  onChange={(e) => setDsrForm({ ...dsrForm, siteName: e.target.value })}
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Work Completed Summary</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Describe concrete pouring, shuttering, steel binding completed today..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  value={dsrForm.workCompleted}
                  onChange={(e) => setDsrForm({ ...dsrForm, workCompleted: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Skilled Labour Count</label>
                  <input
                    type="number"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800"
                    value={dsrForm.skilledCount}
                    onChange={(e) => setDsrForm({ ...dsrForm, skilledCount: e.target.value })}
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Unskilled Labour Count</label>
                  <input
                    type="number"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800"
                    value={dsrForm.unskilledCount}
                    onChange={(e) => setDsrForm({ ...dsrForm, unskilledCount: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDsrModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold shadow-sm"
                >
                  Submit DSR Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
