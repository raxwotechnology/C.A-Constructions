import { useQuery } from '@tanstack/react-query'
import api from '../../lib/api'
import { FiTruck, FiCheckCircle, FiFileText, FiAlertCircle } from 'react-icons/fi'

export default function SupplierPortal() {
  const { data: grnData } = useQuery({
    queryKey: ['supplier-grns'],
    queryFn: () => api.get('/inventory/grn').then(r => r.data),
  })

  const grns = grnData?.grns || []

  return (
    <div className="space-y-8 p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-900 via-slate-900 to-amber-950 p-6 rounded-2xl text-white shadow-xl">
        <span className="bg-amber-400/20 text-amber-200 text-xs font-bold px-3 py-1 rounded-full border border-amber-300/30">
          Supplier & Material Vendor Portal
        </span>
        <h1 className="text-2xl md:text-3xl font-black mt-2">Digital GRN Verification & PO Tracker</h1>
        <p className="text-amber-100 text-sm mt-1">Real-time site delivery signatures, Goods Received Notes & PO status.</p>
      </div>

      {/* Delivery GRN List */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h3 className="text-base font-bold text-slate-900 mb-4">Digital GRN Deliveries & Supervisor Signatures</h3>

        {grns.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200">
            <FiTruck className="text-amber-500 text-3xl mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-800">No Recent Deliveries Found</p>
            <p className="text-xs text-slate-500 mt-1">Deliveries logged by Site Supervisors will appear here automatically.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {grns.map(g => (
              <div key={g._id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded">{g.grnNo}</span>
                    <h4 className="text-sm font-bold text-slate-900">{g.itemName}</h4>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">Site: {g.site?.title || 'Site'}</p>
                  <p className="text-xs font-semibold text-slate-700 mt-1">
                    Ordered: {g.orderedQty} {g.unit} | Received: {g.receivedQty} {g.unit}
                  </p>
                </div>

                <div className="text-right">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${g.hasVariance ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}`}>
                    {g.hasVariance ? 'VARIANCE HOLD' : 'VERIFIED & SIGNED'}
                  </span>
                  <p className="text-xs text-slate-500 mt-2">Received Date: {new Date(g.receivedDate).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
