import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { 
  Building2, TrendingUp, Users, AlertTriangle, Wallet, 
  CheckCircle2, Clock, FileText, HardHat, DollarSign 
} from 'lucide-react';
import { PROJECT_SERVICE_TYPES } from '../config/categories';

export default function Dashboard() {
  const [selectedRole, setSelectedRole] = useState('Admin');

  const { data: projectsData } = useQuery({
    queryKey: ['dashboard-projects'],
    queryFn: () => api.get('/projects').then(r => r.data).catch(() => ({ projects: [] })),
  });

  const { data: stockData } = useQuery({
    queryKey: ['dashboard-stock'],
    queryFn: () => api.get('/inventory/stock').then(r => r.data).catch(() => ({ stock: [] })),
  });

  const { data: financeData } = useQuery({
    queryKey: ['dashboard-finance'],
    queryFn: () => api.get('/finance/overview').then(r => r.data).catch(() => ({ totalIncome: 0, totalExpenses: 0 })),
  });

  const projectsList = Array.isArray(projectsData?.projects) ? projectsData.projects : (Array.isArray(projectsData) ? projectsData : []);
  const stockList = Array.isArray(stockData?.stock) ? stockData.stock : [];

  const activeProjects = projectsList.filter(p => p.status === 'active' || p.status === 'in-progress');
  const lowStockItems = stockList.filter(s => (s.quantity !== undefined ? s.quantity : (s.centralStockQty || 0)) <= (s.reorderLevel || 10));

  const stats = [
    { label: 'Active Projects', value: String(activeProjects.length || projectsList.length || 0), icon: Building2, change: 'Realtime active', color: 'from-blue-600 to-indigo-600' },
    { label: 'Monthly Cashflow', value: `LKR ${((financeData?.totalIncome || 0) / 1000000).toFixed(2)}M`, icon: Wallet, change: 'Net inflow', color: 'from-emerald-600 to-teal-600' },
    { label: 'Active Labour Force', value: '0', icon: HardHat, change: '0 On Site', color: 'from-amber-500 to-orange-600' },
    { label: 'Pending Approvals', value: '0', icon: Clock, change: '0 POs, 0 Leaves', color: 'from-purple-600 to-pink-600' },
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
              Active Construction Sites ({projectsList.length})
            </h2>
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
                {projectsList.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400 text-xs font-medium">
                      No active construction sites found in database.
                    </td>
                  </tr>
                ) : (
                  projectsList.map((p) => (
                    <tr key={p._id || p.code} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-2">
                        <div className="font-semibold text-slate-800">{p.title || p.name}</div>
                        <div className="text-xs text-slate-400">{p.code || p.projectCode || 'PRJ'}</div>
                      </td>
                      <td className="py-3 px-2 text-slate-600 text-xs">{p.serviceType || p.type || 'Construction'}</td>
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div className="bg-sky-600 h-full rounded-full" style={{ width: `${p.progress || 0}%` }}></div>
                          </div>
                          <span className="text-xs font-bold text-slate-700">{p.progress || 0}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-xs font-medium text-slate-700">LKR {(p.budget || 0).toLocaleString()}</td>
                      <td className="py-3 px-2">
                        <span className="px-2.5 py-1 text-[11px] font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
                          {p.status || 'Active'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
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
              {lowStockItems.length} Items
            </span>
          </div>

          <div className="space-y-3">
            {lowStockItems.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs font-medium bg-slate-50 rounded-xl border border-slate-100">
                No low stock warnings detected.
              </div>
            ) : (
              lowStockItems.map((item) => (
                <div key={item._id || item.code} className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800 text-sm">{item.itemName || item.item}</span>
                    <span className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">Reorder</span>
                  </div>
                  <div className="text-xs text-slate-500">{item.isCentralWarehouse ? 'Central Warehouse' : 'Site Stock'}</div>
                  <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
                    <span>Current: <strong className="text-slate-900">{(item.quantity !== undefined ? item.quantity : item.centralStockQty) || 0} {item.unit || 'units'}</strong></span>
                    <span>Min Threshold: {item.reorderLevel || 10} {item.unit || 'units'}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
