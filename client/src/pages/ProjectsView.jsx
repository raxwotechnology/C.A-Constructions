import React, { useState } from 'react';
import { Layers, Calendar, CheckSquare, Camera, FileCheck, Plus, X } from 'lucide-react';
import { PROJECT_SERVICE_TYPES } from '../config/categories';
import toast from 'react-hot-toast';

export default function ProjectsView() {
  const [activeTab, setActiveTab] = useState('boq');
  const [showProjectModal, setShowProjectModal] = useState(false);

  const [projectForm, setProjectForm] = useState({
    title: '',
    serviceType: 'Residential Construction',
    contractValue: '',
    location: '',
  });

  const boqItems = [
    { code: 'DIV-03-01', division: 'Earthworks & Excavation', item: 'Site clearing, topsoil stripping & foundation trench excavation', unit: 'm3', qty: 450, rate: 3500, amount: 1575000 },
    { code: 'DIV-04-02', division: 'Concrete & Formwork', item: 'Grade 30 ReadyMix Concrete for Columns & Beams including shuttering', unit: 'm3', qty: 180, rate: 48000, amount: 8640000 },
    { code: 'DIV-05-01', division: 'Reinforcement Steel', item: 'High yield Tor Steel (12mm & 16mm TMT) cut, bend & place', unit: 'kg', qty: 12500, rate: 340, amount: 4250000 },
  ];

  const handleCreateProject = (e) => {
    e.preventDefault();
    if (!projectForm.title.trim()) {
      toast.error('Please enter project title!');
      return;
    }
    toast.success(`Project "${projectForm.title}" registered successfully!`);
    setShowProjectModal(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Project Management & SLS 573 Standard BOQ
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            BOQ Measurement, Timeline Gantt Chart, Task Assignment & Snag List
          </p>
        </div>
        <button 
          onClick={() => setShowProjectModal(true)}
          className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold px-4 py-2.5 rounded-xl shadow-sm transition-all text-sm cursor-pointer"
        >
          <Plus size={18} />
          Create New Project
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-4 text-sm font-medium">
        {['boq', 'timeline', 'snag'].map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`pb-3 px-2 border-b-2 capitalize transition-colors ${
              activeTab === t
                ? 'border-orange-600 text-orange-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {t === 'boq' && 'SLS 573 BOQ Breakdown'}
            {t === 'timeline' && 'Milestone Timeline (Gantt)'}
            {t === 'snag' && 'Snag List & Quality Inspection'}
          </button>
        ))}
      </div>

      {/* BOQ View */}
      {activeTab === 'boq' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Layers size={20} className="text-orange-600" />
              SLS 573 Standard Bill of Quantities (BOQ)
            </h2>
            <span className="text-xs text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
              Total BOQ Value: LKR 14,465,000.00
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-semibold text-slate-400 uppercase">
                  <th className="py-3 px-2">Code</th>
                  <th className="py-3 px-2">SLS 573 Division</th>
                  <th className="py-3 px-2">Description</th>
                  <th className="py-3 px-2">Unit</th>
                  <th className="py-3 px-2 text-right">Quantity</th>
                  <th className="py-3 px-2 text-right">Unit Rate (LKR)</th>
                  <th className="py-3 px-2 text-right">Total Amount (LKR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {boqItems.map((item) => (
                  <tr key={item.code} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-2 font-mono text-xs font-bold text-orange-600">{item.code}</td>
                    <td className="py-3 px-2 text-xs font-semibold text-slate-700">{item.division}</td>
                    <td className="py-3 px-2 text-xs text-slate-600 max-w-xs">{item.item}</td>
                    <td className="py-3 px-2 text-xs text-slate-500">{item.unit}</td>
                    <td className="py-3 px-2 text-xs text-right font-medium text-slate-700">{item.qty.toLocaleString()}</td>
                    <td className="py-3 px-2 text-xs text-right font-medium text-slate-700">{item.rate.toLocaleString()}</td>
                    <td className="py-3 px-2 text-xs text-right font-bold text-slate-900">{item.amount.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Project Modal */}
      {showProjectModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900">Create New Project</h3>
              <button onClick={() => setShowProjectModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateProject} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Project Name / Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Luxury Residence - Nugegoda"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  value={projectForm.title}
                  onChange={(e) => setProjectForm({ ...projectForm, title: e.target.value })}
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Service Category</label>
                <select
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800"
                  value={projectForm.serviceType}
                  onChange={(e) => setProjectForm({ ...projectForm, serviceType: e.target.value })}
                >
                  {PROJECT_SERVICE_TYPES.map((s) => (
                    <option key={s.id} value={s.labelEn}>{s.labelEn} ({s.labelSi})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Estimated Budget / Contract Value (LKR)</label>
                <input
                  type="number"
                  placeholder="e.g. 45000000"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800"
                  value={projectForm.contractValue}
                  onChange={(e) => setProjectForm({ ...projectForm, contractValue: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowProjectModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold shadow-sm"
                >
                  Save Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
