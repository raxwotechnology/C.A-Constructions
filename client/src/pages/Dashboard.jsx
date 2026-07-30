import React, { useState } from 'react';
import { 
  Building2, TrendingUp, Users, AlertTriangle, Wallet, 
  CheckCircle2, Clock, FileText, HardHat, DollarSign 
} from 'lucide-react';
import { PROJECT_SERVICE_TYPES } from '../config/categories';

export default function Dashboard() {
  const [selectedRole, setSelectedRole] = useState('Admin');

  const stats = [
    { label: 'Active Projects', value: '12', icon: Building2, change: '+2 this month', color: 'from-blue-600 to-indigo-600' },
    { label: 'Monthly Cashflow', value: 'LKR 14.5M', icon: Wallet, change: '+18.2%', color: 'from-emerald-600 to-teal-600' },
    { label: 'Active Labour Force', value: '148', icon: HardHat, change: '94% On Site', color: 'from-amber-500 to-orange-600' },
    { label: 'Pending Approvals', value: '7', icon: Clock, change: '3 POs, 4 Leaves', color: 'from-purple-600 to-pink-600' },
  ];

  const recentProjects = [
    { code: 'PRJ-2026-001', name: 'Lotus Luxury Villa - Colombo 07', type: 'Residential Construction', progress: 78, status: 'Active', budget: 'LKR 45,000,000' },
    { code: 'PRJ-2026-003', name: 'Apex Commercial Complex - Rajagiriya', type: 'Commercial Construction', progress: 42, status: 'Active', budget: 'LKR 120,000,000' },
    { code: 'PRJ-2026-005', name: 'Heritage Boutique Hotel Fitout - Kandy', type: 'Interior Design & Fit-out', progress: 95, status: 'Handover', budget: 'LKR 28,000,000' },
  ];

  const lowStockItems = [
    { code: 'MAT-CEM-001', item: 'Tokyo Super Cement 50kg', site: 'Colombo 07 Site', qty: 25, unit: 'Bags', min: 50 },
    { code: 'MAT-STL-012', item: 'Tor Steel 12mm TMT', site: 'Rajagiriya Site', qty: 1.2, unit: 'Tons', min: 3.0 },
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-800/60 backdrop-blur-xl border border-slate-700/50 p-6 rounded-2xl shadow-xl">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            R A Creations / R A Constructions
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Enterprise Construction Management System | Executive Multi-Role Dashboard
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">View as Role:</span>
          <select 
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-cyan-400 text-sm font-medium rounded-xl px-4 py-2 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
          >
            {['Admin', 'CEO', 'Project Manager', 'Engineer', 'Supervisor', 'Accountant', 'Client'].map((role) => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div key={idx} className="bg-slate-800/50 backdrop-blur-lg border border-slate-700/50 p-5 rounded-2xl hover:border-slate-600 transition-all duration-300 shadow-lg group">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{stat.label}</p>
                  <p className="text-2xl font-bold text-slate-100 mt-2">{stat.value}</p>
                  <span className="inline-block mt-2 text-xs font-semibold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-800/50">
                    {stat.change}
                  </span>
                </div>
                <div className={`p-3.5 rounded-xl bg-gradient-to-br ${stat.color} shadow-lg text-white group-hover:scale-110 transition-transform`}>
                  <Icon size={24} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Content Split: Active Projects & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Projects Monitor (2 Columns) */}
        <div className="lg:col-span-2 bg-slate-800/50 backdrop-blur-lg border border-slate-700/50 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-700/60 pb-4">
            <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
              <Building2 className="text-cyan-400" size={20} />
              Active Construction Projects
            </h2>
            <span className="text-xs text-slate-400">SLS 573 & SBD-03 Compliant</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900/60 text-slate-400 uppercase text-xs">
                <tr>
                  <th className="p-3">Project</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Budget</th>
                  <th className="p-3">Progress</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/40">
                {recentProjects.map((prj, i) => (
                  <tr key={i} className="hover:bg-slate-700/30 transition-colors">
                    <td className="p-3 font-medium text-slate-100">
                      <div>{prj.name}</div>
                      <div className="text-xs text-cyan-400 font-mono">{prj.code}</div>
                    </td>
                    <td className="p-3 text-xs text-slate-300">{prj.type}</td>
                    <td className="p-3 text-slate-200 font-semibold">{prj.budget}</td>
                    <td className="p-3">
                      <div className="w-32 bg-slate-700 rounded-full h-2 overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-cyan-500 to-emerald-500 h-full rounded-full"
                          style={{ width: `${prj.progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-400 mt-1 inline-block">{prj.progress}%</span>
                    </td>
                    <td className="p-3">
                      <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${
                        prj.status === 'Handover' ? 'bg-purple-950/60 text-purple-400 border-purple-800' : 'bg-emerald-950/60 text-emerald-400 border-emerald-800'
                      }`}>
                        {prj.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Low Stock & Site Alerts (1 Column) */}
        <div className="bg-slate-800/50 backdrop-blur-lg border border-slate-700/50 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-700/60 pb-4">
            <h2 className="text-lg font-semibold text-amber-400 flex items-center gap-2">
              <AlertTriangle size={20} />
              Low Stock & Site Reorder Alerts
            </h2>
          </div>

          <div className="space-y-3">
            {lowStockItems.map((item, idx) => (
              <div key={idx} className="bg-slate-900/70 border border-amber-500/30 p-3.5 rounded-xl space-y-1">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-mono text-cyan-400">{item.code}</span>
                  <span>{item.site}</span>
                </div>
                <div className="text-sm font-semibold text-slate-200">{item.item}</div>
                <div className="flex items-center justify-between text-xs mt-2">
                  <span className="text-amber-400 font-bold">Current: {item.qty} {item.unit}</span>
                  <span className="text-slate-400">Min Threshold: {item.min} {item.unit}</span>
                </div>
              </div>
            ))}
          </div>

          <button className="w-full mt-4 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-semibold py-2.5 rounded-xl text-sm transition-all shadow-lg">
            Create Auto Material Requisition (PO)
          </button>
        </div>
      </div>
    </div>
  );
}
