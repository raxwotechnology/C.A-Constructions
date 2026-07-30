import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../../lib/api'
import { FiCheckCircle, FiClock, FiDollarSign, FiCamera, FiSun, FiCheck, FiX } from 'react-icons/fi'

export default function ClientPortal() {
  const { data: sitesData } = useQuery({
    queryKey: ['client-sites'],
    queryFn: () => api.get('/projects').then(r => r.data),
  })

  const sites = sitesData?.projects || sitesData?.sites || []
  const site = sites[0] || {
    title: 'Kandy Commercial Plaza Construction',
    progress: 68,
    escrowBalance: 12500000,
    milestones: [
      { title: 'Foundation & Earthworks', completed: true, completedAt: '2026-03-15' },
      { title: 'Ground Floor & 1st Floor Slab', completed: true, completedAt: '2026-05-20' },
      { title: 'MEP Conduits & Plumbing Infrastructure', completed: false, dueDate: '2026-08-30' },
      { title: 'Finishing & Exterior Cladding', completed: false, dueDate: '2026-10-15' },
    ],
    variationRequests: [
      { id: 'VR-101', title: 'Additional Waterproofing Membrane for Basement', amount: 450000, requestedBy: 'pm', status: 'pending' },
      { id: 'VR-102', title: 'Upgraded Glass Balustrade for Balconies', amount: 820000, requestedBy: 'pm', status: 'pending' },
    ]
  }

  const [variations, setVariations] = useState(site.variationRequests || [])

  const handleApprove = (id) => {
    setVariations(prev => prev.map(v => v.id === id ? { ...v, status: 'approved' } : v))
  }

  const handleReject = (id) => {
    setVariations(prev => prev.map(v => v.id === id ? { ...v, status: 'rejected' } : v))
  }

  return (
    <div className="space-y-8 p-4 md:p-6 max-w-7xl mx-auto">
      {/* Client Header */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 p-6 rounded-2xl text-white shadow-xl">
        <span className="bg-blue-500/20 text-blue-300 text-xs font-semibold px-3 py-1 rounded-full border border-blue-400/30">
          Client & Property Owner Portal
        </span>
        <h1 className="text-2xl md:text-3xl font-bold mt-2 text-white">{site.title}</h1>
        <p className="text-blue-200 text-sm mt-1">Live construction progress, milestone photos & Escrow change request approvals.</p>
      </div>

      {/* Escrow Balance & Progress Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <p className="text-xs font-semibold text-slate-500 uppercase">Live Site Progress</p>
          <div className="flex items-center justify-between mt-3">
            <span className="text-3xl font-bold text-slate-900">{site.progress}%</span>
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              On Schedule
            </span>
          </div>
          <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden mt-3">
            <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${site.progress}%` }}></div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <p className="text-xs font-semibold text-slate-500 uppercase">Protected Escrow Balance</p>
          <p className="text-3xl font-bold text-indigo-900 mt-3">LKR {(site.escrowBalance || 12500000).toLocaleString()}</p>
          <p className="text-xs text-slate-500 mt-2">Funds released strictly upon milestone verification.</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <p className="text-xs font-semibold text-slate-500 uppercase">Live Weather at Site</p>
          <div className="flex items-center gap-3 mt-3">
            <FiSun className="text-amber-500 text-3xl" />
            <div>
              <p className="text-lg font-bold text-slate-900">32°C - Sunny</p>
              <p className="text-xs text-slate-500">Uninterrupted Concrete Pouring Weather</p>
            </div>
          </div>
        </div>
      </div>

      {/* Live Milestones */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h3 className="text-base font-bold text-slate-900 mb-4">Milestone Progress Pipeline</h3>
        <div className="space-y-4">
          {site.milestones.map((m, idx) => (
            <div key={idx} className={`p-4 rounded-xl border flex items-center justify-between gap-4 ${m.completed ? 'bg-emerald-50/50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center gap-3">
                {m.completed ? <FiCheckCircle className="text-emerald-600 text-xl flex-shrink-0" /> : <FiClock className="text-slate-400 text-xl flex-shrink-0" />}
                <div>
                  <h4 className={`text-sm font-bold ${m.completed ? 'text-emerald-950' : 'text-slate-900'}`}>{m.title}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">{m.completed ? `Completed on ${m.completedAt}` : `Target Due Date: ${m.dueDate}`}</p>
                </div>
              </div>
              <span className={`text-xs font-semibold px-3 py-1 rounded-full ${m.completed ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'}`}>
                {m.completed ? 'VERIFIED' : 'IN PROGRESS'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Escrow & Variation Change Request Approval Engine */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Escrow Variation Change Requests</h3>
            <p className="text-xs text-slate-500">No unexpected billing. Review and approve site variation requests before escrow release.</p>
          </div>
          <span className="bg-amber-100 text-amber-900 text-xs px-2.5 py-1 rounded-full font-bold">
            {variations.filter(v => v.status === 'pending').length} Pending Approval
          </span>
        </div>

        <div className="space-y-3">
          {variations.map(v => (
            <div key={v.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">{v.id}</span>
                  <h4 className="text-sm font-bold text-slate-900">{v.title}</h4>
                </div>
                <p className="text-sm font-bold text-emerald-700 mt-1">LKR {v.amount.toLocaleString()}</p>
              </div>

              {v.status === 'pending' ? (
                <div className="flex items-center gap-2">
                  <button onClick={() => handleApprove(v.id)} className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1">
                    <FiCheck /> Approve Escrow Release
                  </button>
                  <button onClick={() => handleReject(v.id)} className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl flex items-center gap-1">
                    <FiX /> Reject
                  </button>
                </div>
              ) : (
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${v.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                  {v.status.toUpperCase()}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
