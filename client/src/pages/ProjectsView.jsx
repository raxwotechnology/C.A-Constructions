import React, { useState } from 'react';
import { Building2, Layers, DollarSign, Image, AlertCircle, Plus, CheckCircle } from 'lucide-react';
import { PROJECT_SERVICE_TYPES } from '../config/categories';

export default function ProjectsView() {
  const [selectedSubTab, setSelectedSubTab] = useState('boq');

  const boqItems = [
    { code: '1.1', bill: 'Bill 01 - Earthwork & Excavation', desc: 'Site clearance and top soil excavation up to 150mm depth', unit: 'm2', qty: 450, rate: 850, amount: 382500, actualQty: 420, actualCost: 357000 },
    { code: '1.2', bill: 'Bill 01 - Earthwork & Excavation', desc: 'Excavation for column footings in ordinary soil exceeding 1.5m depth', unit: 'm3', qty: 180, rate: 3200, amount: 576000, actualQty: 185, actualCost: 592000 },
    { code: '2.1', bill: 'Bill 02 - Concrete Work', desc: 'Grade 30 reinforced concrete in column footings (SLS 573)', unit: 'm3', qty: 65, rate: 48500, amount: 3152500, actualQty: 65, actualCost: 3217500 },
    { code: '2.2', bill: 'Bill 02 - Concrete Work', desc: 'High yield deformed steel bar reinforcement (Tor Steel 16mm)', unit: 'Tons', qty: 8.5, rate: 340000, amount: 2890000, actualQty: 8.2, actualCost: 2788000 },
  ];

  const snagList = [
    { id: 1, item: 'Micro-crack on east balcony plastering', location: 'Floor 02 Balcony', severity: 'Low', status: 'Pending' },
    { id: 2, item: 'DB box wiring label verification missing', location: 'Main Entrance Panel', severity: 'Medium', status: 'In Progress' },
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-800/60 backdrop-blur-xl border border-slate-700/50 p-6 rounded-2xl shadow-xl">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            Project & SLS 573 BOQ Management
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Standard SLS 573 Bill of Quantities, Budget vs Actual Tracker & Handover Snag Lists
          </p>
        </div>
        <button className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold px-4 py-2.5 rounded-xl shadow-lg transition-all text-sm">
          <Plus size={18} />
          Create New Project
        </button>
      </div>

      {/* View Sub-Tabs */}
      <div className="flex border-b border-slate-700/60 gap-4 text-sm font-medium">
        {['boq', 'budget', 'gallery', 'snag'].map((t) => (
          <button
            key={t}
            onClick={() => setSelectedSubTab(t)}
            className={`pb-3 px-2 border-b-2 capitalize transition-colors ${
              selectedSubTab === t
                ? 'border-cyan-400 text-cyan-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {t === 'boq' && 'SLS 573 BOQ Breakdown'}
            {t === 'budget' && 'Budget vs Actual Cost Tracker'}
            {t === 'gallery' && 'Site Photo Gallery'}
            {t === 'snag' && 'Handover Snag List'}
          </button>
        ))}
      </div>

      {/* SLS 573 BOQ Breakdown Table */}
      {selectedSubTab === 'boq' && (
        <div className="bg-slate-800/50 backdrop-blur-lg border border-slate-700/50 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-100">Bill of Quantities (SLS 573 Standard)</h2>
            <span className="text-xs bg-slate-700 px-3 py-1 rounded-full text-slate-300">Project: Lotus Luxury Villa (PRJ-2026-001)</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900/60 text-slate-400 uppercase text-xs">
                <tr>
                  <th className="p-3">Item</th>
                  <th className="p-3">Bill Section</th>
                  <th className="p-3">Description</th>
                  <th className="p-3">Unit</th>
                  <th className="p-3">Est. Qty</th>
                  <th className="p-3">Unit Rate (LKR)</th>
                  <th className="p-3">Total Est. (LKR)</th>
                  <th className="p-3">Actual Cost (LKR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/40">
                {boqItems.map((item) => (
                  <tr key={item.code} className="hover:bg-slate-700/30 transition-colors">
                    <td className="p-3 font-mono text-cyan-400 font-bold">{item.code}</td>
                    <td className="p-3 text-xs text-slate-400">{item.bill}</td>
                    <td className="p-3 text-slate-200">{item.desc}</td>
                    <td className="p-3 text-xs font-semibold">{item.unit}</td>
                    <td className="p-3 font-mono">{item.qty}</td>
                    <td className="p-3 font-mono">{item.rate.toLocaleString()}</td>
                    <td className="p-3 font-mono text-cyan-400 font-semibold">{item.amount.toLocaleString()}</td>
                    <td className="p-3 font-mono text-emerald-400">{item.actualCost.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Handover Snag List */}
      {selectedSubTab === 'snag' && (
        <div className="bg-slate-800/50 backdrop-blur-lg border border-slate-700/50 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
            <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
              <AlertCircle size={20} className="text-amber-400" />
              Handover Defect & Snag List
            </h2>
            <button className="text-xs bg-cyan-600 hover:bg-cyan-500 text-white font-semibold px-3 py-1.5 rounded-lg">
              Add Snag Item
            </button>
          </div>

          <div className="space-y-3">
            {snagList.map((snag) => (
              <div key={snag.id} className="bg-slate-900/60 border border-slate-700 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-200">{snag.item}</div>
                  <div className="text-xs text-slate-400 mt-1">Location: {snag.location}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-950/60 text-amber-400 border border-amber-800">
                    {snag.severity}
                  </span>
                  <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-800 text-slate-300">
                    {snag.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
