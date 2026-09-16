import { useQuery } from '@tanstack/react-query'
import api from '../../lib/api'
import { FiShield, FiDollarSign, FiFileText, FiCheckCircle } from 'react-icons/fi'

export default function SubcontractorPortal() {
  const claims = [
    { id: 'CLM-501', title: 'Phase 2 Electrical Conduits Claim', site: 'Colombo Commercial Tower', totalValue: 4200000, retention: 210000, status: 'approved', netPayout: 3990000 },
    { id: 'CLM-502', title: 'Phase 3 Plumbing Riser Stack Installation', site: 'Kandy Plaza', totalValue: 2800000, retention: 140000, status: 'under_verification', netPayout: 2660000 },
  ]

  return (
    <div className="space-y-8 p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 rounded-2xl text-white shadow-xl">
        <span className="bg-indigo-400/20 text-indigo-200 text-xs font-bold px-3 py-1 rounded-full border border-indigo-300/30">
          Sub-Contractor Portal
        </span>
        <h1 className="text-2xl md:text-3xl font-black mt-2">Subcontractor Claims & Court-Ready SBD-03 Agreements</h1>
        <p className="text-indigo-200 text-sm mt-1">Claim progress pipeline, retention balance tracking & legal protection.</p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <p className="text-xs font-bold text-slate-500 uppercase">Total Approved Claims</p>
          <p className="text-3xl font-black text-emerald-700 mt-2">LKR 4,200,000</p>
          <p className="text-xs text-slate-500 mt-1">Processed via PM Certification</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <p className="text-xs font-bold text-slate-500 uppercase">Total Retention Balance Held (5%)</p>
          <p className="text-3xl font-black text-indigo-900 mt-2">LKR 350,000</p>
          <p className="text-xs text-slate-500 mt-1">Released upon Defects Liability Period</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <p className="text-xs font-bold text-slate-500 uppercase">Legal Protection Status</p>
          <div className="flex items-center gap-2 mt-2 text-emerald-700 font-bold text-lg">
            <FiShield className="text-2xl" /> SBD-03 Court-Ready Compliant
          </div>
          <p className="text-xs text-slate-500 mt-1">Signed binding Sri Lankan Standard contract</p>
        </div>
      </div>

      {/* Claim Progress Pipeline */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h3 className="text-base font-bold text-slate-900 mb-4">Claim Progress Pipeline</h3>
        <div className="space-y-4">
          {claims.map(c => (
            <div key={c.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">{c.id}</span>
                  <h4 className="text-sm font-bold text-slate-900">{c.title}</h4>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{c.site}</p>
                <p className="text-xs font-semibold text-slate-700 mt-1">
                  Claim Value: LKR {c.totalValue.toLocaleString()} | Retention (5%): LKR {c.retention.toLocaleString()}
                </p>
              </div>

              <div className="text-right">
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${c.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                  {c.status.toUpperCase().replace('_', ' ')}
                </span>
                <p className="text-sm font-black text-slate-900 mt-2">Net Payout: LKR {c.netPayout.toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
