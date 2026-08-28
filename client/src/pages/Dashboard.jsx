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
    <div className="min-h-screen bg-slate-50 text-slate-800 p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            R A Creations / R A Constructions
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Enterprise Construction Management System | Executive Multi-Role Dashboard
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">View as Role:</span>
          <select 
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="bg-slate-100 border border-slate-200 text-sky-700 text-sm font-medium rounded-xl px-4 py-2 focus:ring-2 focus:ring-sky-500 focus:outline-none"
          >
            {['Admin', 'CEO', 'Project Manager', 'Engineer', 'Supervisor', 'Accountant', 'Client'].map((role) => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((item, index) => {
          const IconComponent = item.icon;
          return (
            <div key={index} className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{item.label}</span>
                <div className={`p-2.5 rounded-xl bg-gradient-to-r ${item.color} text-white shadow-sm`}>
                  <IconComponent size={20} />
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-bold text-slate-900">{item.value}</div>
                <div className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                  <TrendingUp size={12} />
                  {item.change}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Grid: Projects & Stock Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Projects Table */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Building2 size={20} className="text-sky-600" />
              Active Construction Sites
            </h2>
            <button className="text-xs font-semibold text-sky-600 hover:underline">View All Sites →</button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-semibold text-slate-400 uppercase">
                  <th className="py-3 px-2">Project</th>
                  <th className="py-3 px-2">Service Type</th>
                  <th className="py-3 px-2">Progress</th>
                  <th className="py-3 px-2">Budget</th>
                  <th className="py-3 px-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentProjects.map((p) => (
                  <tr key={p.code} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-2">
                      <div className="font-semibold text-slate-800">{p.name}</div>
                      <div className="text-xs text-slate-400">{p.code}</div>
                    </td>
                    <td className="py-3 px-2 text-slate-600 text-xs">{p.type}</td>
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div className="bg-sky-600 h-full rounded-full" style={{ width: `${p.progress}%` }}></div>
                        </div>
                        <span className="text-xs font-bold text-slate-700">{p.progress}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-xs font-medium text-slate-700">{p.budget}</td>
                    <td className="py-3 px-2">
                      <span className="px-2.5 py-1 text-[11px] font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <AlertTriangle size={20} className="text-amber-500" />
              Low Stock Warnings
            </h2>
            <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-bold">
              2 Items
            </span>
          </div>

          <div className="space-y-3">
            {lowStockItems.map((item) => (
              <div key={item.code} className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800 text-sm">{item.item}</span>
                  <span className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">Reorder</span>
                </div>
                <div className="text-xs text-slate-500">{item.site}</div>
                <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
                  <span>Current: <strong className="text-slate-900">{item.qty} {item.unit}</strong></span>
                  <span>Min Threshold: {item.min} {item.unit}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
