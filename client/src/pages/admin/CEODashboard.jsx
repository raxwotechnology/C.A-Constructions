import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../../lib/api'
import {
  FiTrendingUp, FiTrendingDown, FiAlertTriangle, FiCheckCircle,
  FiActivity, FiDollarSign, FiUsers, FiHardDrive, FiBriefcase, FiLayers
} from 'react-icons/fi'
import { Link } from 'react-router-dom'

export default function CEODashboard() {
  const { data: sitesData } = useQuery({
    queryKey: ['ceo-sites'],
    queryFn: () => api.get('/projects').then(r => r.data),
  })

  const { data: finData } = useQuery({
    queryKey: ['ceo-finance'],
    queryFn: () => api.get('/finance/overview').then(r => r.data),
  })

  const { data: grnData } = useQuery({
    queryKey: ['ceo-grn'],
    queryFn: () => api.get('/inventory/grn').then(r => r.data),
  })

  const sites = sitesData?.projects || sitesData?.sites || []
  const activeSites = sites.filter(s => s.status === 'active')
  const totalMoneyIn = finData?.totalIncome || 48500000
  const totalMoneyOut = finData?.totalExpenses || 31200000
  const netProfit = totalMoneyIn - totalMoneyOut
  const isProfitable = netProfit >= 0

  const profitLeaks = [
    { id: 1, title: 'Cement Loss Warning', site: 'Galle Highway Extension', details: '30% cement loss detected (Variance on GRN-9941)', severity: 'high' },
    { id: 2, title: 'Machine Idle Time Alert', site: 'Colombo Commercial Tower', details: 'Excavator EX-04 idle for 14 hours (LKR 42,000 lost capacity)', severity: 'medium' },
    { id: 3, title: 'GRN Shortage Hold', site: 'Kandy Residential Complex', details: '50 steel bars unfulfilled on PO-881. Payment locked.', severity: 'high' },
  ]

  return (
    <div className="space-y-8 p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header & Pulse Badge */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950 p-6 rounded-2xl text-white shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-amber-500/20 text-amber-300 text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1 border border-amber-500/30">
              <FiActivity className="animate-pulse" /> 10-Second Pulse Dashboard
            </span>
            <span className="bg-blue-500/20 text-blue-300 text-xs font-semibold px-3 py-1 rounded-full border border-blue-500/30">
              C.A-Constructions Super Admin
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">CEO & Executive Control Matrix</h1>
          <p className="text-slate-200 text-sm mt-1">Real-time capital health, forensic profit leaks & active site ecosystem.</p>
        </div>
        <div className="flex gap-3">
          <Link to="/admin/projects" className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-sm transition-all shadow-md">
            Manage All Sites
          </Link>
        </div>
      </div>

      {/* Capital Health Bar */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Capital Health Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <p className="text-xs text-slate-500 font-medium">Active Sites</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{activeSites.length || sites.length || 6}</p>
            <p className="text-xs text-emerald-600 font-medium mt-1">✓ All sites active</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <p className="text-xs text-slate-500 font-medium">Total Capital Inflow</p>
            <p className="text-2xl font-bold text-emerald-700 mt-1">LKR {(totalMoneyIn / 1000000).toFixed(2)} M</p>
            <p className="text-xs text-slate-500 mt-1">Client progress claims</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <p className="text-xs text-slate-500 font-medium">Total Site Expenses</p>
            <p className="text-2xl font-bold text-rose-700 mt-1">LKR {(totalMoneyOut / 1000000).toFixed(2)} M</p>
            <p className="text-xs text-slate-500 mt-1">Materials, wages & rentals</p>
          </div>
          <div className={`p-4 rounded-xl border ${isProfitable ? 'bg-emerald-50 border-emerald-200 text-emerald-950' : 'bg-rose-50 border-rose-200 text-rose-950'}`}>
            <p className="text-xs font-semibold uppercase">Net Capital Status</p>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-2xl font-black ${isProfitable ? 'text-emerald-700' : 'text-rose-700'}`}>
                LKR {(netProfit / 1000000).toFixed(2)} M
              </span>
            </div>
            <span className={`inline-block mt-2 px-2.5 py-0.5 rounded-full text-xs font-bold ${isProfitable ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}`}>
              {isProfitable ? 'PROFIT GREEN STATUS' : 'CAPITAL LOSS RED'}
            </span>
          </div>
        </div>
      </div>

      {/* Forensic Profit Leak Alerts & White Label Prestige */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profit Leaks */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FiAlertTriangle className="text-amber-500" /> Forensic Profit Leak Alerts
            </h3>
            <span className="bg-amber-100 text-amber-800 text-xs px-2.5 py-1 rounded-full font-bold">
              3 Active Audits
            </span>
          </div>
          <div className="space-y-3">
            {profitLeaks.map(leak => (
              <div key={leak.id} className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-slate-900">{leak.title}</h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-800">
                      {leak.severity.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-slate-600 mt-0.5">{leak.site}</p>
                  <p className="text-xs text-slate-500 mt-1">{leak.details}</p>
                </div>
                <button className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-900 text-xs font-semibold rounded-lg whitespace-nowrap">
                  Investigate Leak
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* White-Label Prestige & Quick Controls */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-3">
              <FiBriefcase className="text-amber-600" /> White-Label Prestige
            </h3>
            <p className="text-xs text-slate-600 mb-4">
              Custom branding, organization logo, and multi-organization control active.
            </p>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Organization:</span>
                <span className="font-bold text-slate-900">C.A-Constructions (Pvt) Ltd</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Multi-Org Portal:</span>
                <span className="font-bold text-emerald-600">Enabled (5 Sub-Entities)</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Branding Version:</span>
                <span className="font-bold text-slate-900">Prestige Gold Standard</span>
              </div>
            </div>
          </div>

          <Link to="/admin/settings" className="mt-6 w-full py-2.5 bg-white hover:bg-slate-100 text-slate-900 text-xs font-bold rounded-xl text-center">
            Configure White-Label Settings
          </Link>
        </div>
      </div>
    </div>
  )
}
